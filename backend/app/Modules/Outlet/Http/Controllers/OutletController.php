<?php

namespace App\Modules\Outlet\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Outlet\Actions\DeleteOutlet;
use App\Modules\Outlet\Actions\FindSimilarOutlets;
use App\Modules\Outlet\Actions\RestoreOutlet;
use App\Modules\Outlet\Actions\SaveOutlet;
use App\Modules\Outlet\Http\Requests\SaveOutletRequest;
use App\Modules\Outlet\Http\Resources\OutletResource;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class OutletController extends Controller
{
    /** Without this permission a user only sees the outlets assigned to them (sales). */
    public const VIEW_ALL_PERMISSION = 'outlet.view_all';

    /** sales_user_id value for outlets that no sales holds yet. */
    public const NO_SALES = 'none';

    private const SORTABLE = ['name', 'code', 'district', 'created_at'];

    private const MAX_PER_PAGE = 500;

    /**
     * W3 outlet list / M1 my outlets. Filters: search, region_id, outlet_type_id,
     * sale_mode, district, sales_user_id (a user id, or "none" = no sales yet),
     * status (active|inactive|all|deleted), sort, per_page.
     * status=deleted lists the trash and needs outlet.manage.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $status = $request->string('status', 'active')->toString();

        if ($status === 'deleted') {
            abort_unless($request->user()?->can('outlet.manage'), 403);
        }

        $query = $this->visibleOutlets($request->user())
            ->with(['outletType', 'region', 'activeAssignments.salesUser'])
            ->when($status === 'deleted', fn (Builder $q) => $q->onlyTrashed()->whereNull('merged_into_id')->with('deleter'));

        $this->applyFilters($query, $request, $status);

        $sales = $request->string('sales_user_id')->toString();
        $query->when($sales === self::NO_SALES, fn (Builder $q) => $q->whereDoesntHave('activeAssignments'))
            ->when(ctype_digit($sales), fn (Builder $q) => $q->assignedTo((int) $sales));

        $sort = $request->string('sort', 'name')->toString();
        $column = ltrim($sort, '-');
        $query->orderBy(in_array($column, self::SORTABLE, true) ? $column : 'name', str_starts_with($sort, '-') ? 'desc' : 'asc');

        $perPage = min(max($request->integer('per_page', 25), 1), self::MAX_PER_PAGE);

        return OutletResource::collection($query->paginate($perPage)->withQueryString());
    }

    /** W2 outlet profile. Sales can only open outlets assigned to them. */
    public function show(Request $request, Outlet $outlet): OutletResource
    {
        abort_unless($this->visibleOutlets($request->user())->whereKey($outlet->getKey())->exists(), 404);

        return new OutletResource($outlet->load([
            'outletType',
            'region',
            'activeAssignments.salesUser',
            'assignments' => fn ($query) => $query->latest('start_date')->latest(),
            'assignments.salesUser',
        ]));
    }

    public function store(SaveOutletRequest $request, SaveOutlet $save): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $outlet = $save->handle($request->validated(), $user);

        return (new OutletResource($outlet->load(['outletType', 'region', 'activeAssignments.salesUser'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(SaveOutletRequest $request, Outlet $outlet, SaveOutlet $save): OutletResource
    {
        /** @var User $user */
        $user = $request->user();
        $outlet = $save->handle($request->validated(), $user, $outlet);

        return new OutletResource($outlet->load(['outletType', 'region', 'activeAssignments.salesUser']));
    }

    /** Move to the trash (soft delete). Refused when another module still uses the outlet. */
    public function destroy(Request $request, Outlet $outlet, DeleteOutlet $delete): Response
    {
        /** @var User $user */
        $user = $request->user();
        $delete->handle($outlet, $user);

        return response()->noContent();
    }

    /** Take an outlet out of the trash. */
    public function restore(Request $request, Outlet $outlet, RestoreOutlet $restore): OutletResource
    {
        /** @var User $user */
        $user = $request->user();
        $outlet = $restore->handle($outlet, $user);

        return new OutletResource($outlet->load(['outletType', 'region', 'activeAssignments.salesUser']));
    }

    /** OT-02: outlets with a similar name in the same district, shown while filling the form. */
    public function similar(Request $request, FindSimilarOutlets $find): AnonymousResourceCollection
    {
        $input = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'region_id' => ['required', 'string'],
            'district' => ['nullable', 'string', 'max:100'],
            'except_id' => ['nullable', 'string'],
        ]);

        $outlets = $find->handle($input['name'], $input['region_id'], $input['district'] ?? null, $input['except_id'] ?? null);

        return OutletResource::collection($outlets->take(10));
    }

    /**
     * @return Builder<Outlet>
     */
    /**
     * OT-04: how many outlets each sales holds and how many have no sales yet,
     * under the same filters as the list (except sales). An outlet held by two
     * sales counts for both. Needs outlet.view_all (route).
     */
    public function salesSummary(Request $request): JsonResponse
    {
        $status = $request->string('status', 'active')->toString();
        $status = $status === 'deleted' ? 'active' : $status;

        $outlets = $this->applyFilters(Outlet::query(), $request, $status);

        /** @var Collection<int, int> $counts sales_user_id => outlet count */
        $counts = DB::table('crm_assignments')
            ->whereNull('end_date')
            ->whereIn('outlet_id', (clone $outlets)->select('crm_outlets.id'))
            ->groupBy('sales_user_id')
            ->selectRaw('sales_user_id, COUNT(DISTINCT outlet_id) as outlet_count')
            ->pluck('outlet_count', 'sales_user_id')
            ->map(fn ($count) => (int) $count);

        // Every active sales (also with 0 outlets), plus anyone else still holding outlets
        $sales = User::query()
            ->where(fn (Builder $q) => $q
                ->whereIn('id', $counts->keys()->all())
                ->orWhere(fn (Builder $active) => $active->permission('visit.create')->where('is_active', true)))
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get(['id', 'name', 'is_active'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'is_active' => $user->is_active,
                'outlet_count' => $counts->get($user->id, 0),
            ])
            ->values();

        return response()->json(['data' => [
            'total' => (clone $outlets)->count(),
            'without_sales' => (clone $outlets)->whereDoesntHave('activeAssignments')->count(),
            'sales' => $sales,
        ]]);
    }

    /**
     * The list filters shared by index and salesSummary: search, region_id,
     * outlet_type_id, sale_mode, district, and status (not the sales filter).
     *
     * @param  Builder<Outlet>  $query
     * @return Builder<Outlet>
     */
    private function applyFilters(Builder $query, Request $request, string $status): Builder
    {
        $search = trim($request->string('search')->toString());
        if ($search !== '') {
            $query->where(fn (Builder $q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%"));
        }

        foreach (['region_id', 'outlet_type_id', 'sale_mode'] as $filter) {
            $query->when($request->filled($filter), fn (Builder $q) => $q->where($filter, $request->string($filter)->toString()));
        }

        $query->when($request->filled('district'), fn (Builder $q) => $q
            ->whereRaw('LOWER(district) = ?', [mb_strtolower(trim($request->string('district')->toString()))]));

        match ($status) {
            'inactive' => $query->where('is_active', false),
            'all', 'deleted' => null,
            default => $query->where('is_active', true),
        };

        return $query;
    }

    /** @return Builder<Outlet> */
    private function visibleOutlets(?User $user): Builder
    {
        $query = Outlet::query();

        if ($user && ! $user->can(self::VIEW_ALL_PERMISSION)) {
            $query->assignedTo($user->id);
        }

        return $query;
    }
}
