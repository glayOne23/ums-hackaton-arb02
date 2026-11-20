<?php

namespace App\Modules\Outlet\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Outlet\Http\Requests\SaveReferenceRequest;
use App\Modules\Outlet\Http\Resources\ReferenceResource;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Outlet\Models\Region;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Regions (kabupaten/kota) and outlet types (PG-05): lists admins can extend
 * without a programmer. Entries are deactivated, never deleted, because
 * outlets keep pointing to them.
 */
class ReferenceController extends Controller
{
    private const MODELS = [
        'crm_regions' => Region::class,
        'crm_outlet_types' => OutletType::class,
    ];

    /** Active entries only unless ?status=all (admin screens). */
    public function index(Request $request): AnonymousResourceCollection
    {
        $model = $this->model($request);

        $items = $model::query()
            ->when($request->string('status')->toString() !== 'all', fn ($query) => $query->where('is_active', true))
            ->orderBy('name')
            ->get();

        return ReferenceResource::collection($items);
    }

    public function store(SaveReferenceRequest $request): JsonResponse
    {
        $model = $this->model($request);
        $item = $model::query()->create($request->validated());

        return ReferenceResource::make($item)->response()->setStatusCode(201);
    }

    public function update(SaveReferenceRequest $request): ReferenceResource
    {
        $model = $this->model($request);
        $item = $model::query()->findOrFail((string) $request->route('id'));
        $item->update($request->validated());

        return ReferenceResource::make($item);
    }

    /**
     * @return class-string<Region|OutletType>
     */
    private function model(Request $request): string
    {
        return self::MODELS[(string) $request->route('reference_table')];
    }
}
