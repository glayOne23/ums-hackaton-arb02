<?php

namespace App\Modules\Sales\Http\Controllers;

use App\Core\Support\Money;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Sales\Actions\SaveSalesTargets;
use App\Modules\Sales\Models\SalesTarget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/** PG-10: monthly targets per sales. */
class SalesTargetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['month' => ['required', 'date_format:Y-m']], ['month.*' => 'Pilih bulan.']);

        return response()->json(['data' => $this->rows(Carbon::createFromFormat('Y-m-d', $request->query('month').'-01'))]);
    }

    public function update(Request $request, SaveSalesTargets $save): JsonResponse
    {
        $data = $request->validate([
            'month' => ['required', 'date_format:Y-m'],
            'targets' => ['required', 'array', 'min:1'],
            'targets.*.sales_user_id' => ['required', 'integer', Rule::exists('auth_users', 'id')],
            'targets.*.visit_target' => ['required', 'integer', 'min:0', 'max:10000'],
            'targets.*.revenue_target' => ['required', 'numeric', 'min:0', 'max:100000000000'],
        ], [
            'targets.*.visit_target.*' => 'Target kunjungan berupa angka 0–10.000.',
            'targets.*.revenue_target.*' => 'Target omzet berupa angka rupiah, tidak minus.',
        ]);

        $month = Carbon::createFromFormat('Y-m-d', $data['month'].'-01');
        /** @var User $actor */
        $actor = $request->user();
        $changed = $save->handle($month, $data['targets'], $actor);

        return response()->json(['data' => $this->rows($month), 'changed' => $changed]);
    }

    /**
     * Every active sales (anyone who records visits), with this month's target or 0.
     *
     * @return list<array<string, mixed>>
     */
    private function rows(Carbon $month): array
    {
        $targets = SalesTarget::query()->where('month', $month->format('Y-m'))->get()->keyBy('sales_user_id');

        return User::permission('visit.create')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $user) => [
                'sales_user_id' => $user->id,
                'name' => $user->name,
                'visit_target' => $targets[$user->id]->visit_target ?? 0,
                'revenue_target' => isset($targets[$user->id]) ? Money::toCents($targets[$user->id]->revenue_target) / 100 : 0,
            ])
            ->values()
            ->all();
    }
}
