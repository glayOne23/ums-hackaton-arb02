<?php

namespace App\Core\Http\Controllers;

use App\Core\Models\Activity;
use App\Core\Models\ClosedPeriod;
use App\Core\Period\ClosedPeriods;
use App\Core\Period\ClosePeriod;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Setting\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** KR-15 on the Settings screen (W8): which months are closed, close the next, reopen the last. */
class ClosedPeriodController extends Controller
{
    private const MONTHS_OFFERED = 12;

    public function index(ClosedPeriods $periods): JsonResponse
    {
        $through = ClosedPeriod::query()->max('period');
        $offered = [];
        for ($i = 1; $i <= self::MONTHS_OFFERED; $i++) {
            $month = now()->startOfMonth()->subMonths($i)->format('Y-m');
            if ($through !== null && $month <= $through) {
                break;
            }
            $offered[] = ['period' => $month, 'label' => ClosedPeriods::monthName($month)];
        }

        $history = Activity::query()->with('causer')->where('log_name', 'period')->latest('id')->limit(20)->get();

        return response()->json(['data' => [
            'enabled' => Setting::bool('period_closing_enabled'),
            'closed_through' => $through ? ['period' => $through, 'label' => ClosedPeriods::monthName($through)] : null,
            'offered' => $offered,
            'history' => $history->map(fn (Activity $a) => [
                'id' => $a->id,
                'title' => $a->description,
                'by' => $a->causer instanceof User ? $a->causer->name : null,
                'at' => $a->created_at?->toIso8601String(),
            ]),
        ]]);
    }

    public function preview(Request $request, ClosePeriod $close): JsonResponse
    {
        return response()->json(['data' => $close->preview($this->period($request))]);
    }

    public function store(Request $request, ClosePeriod $close): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $closed = $close->close($this->period($request), $user);

        return response()->json(['data' => ['period' => $closed->period, 'label' => ClosedPeriods::monthName($closed->period)]], 201);
    }

    public function reopen(Request $request, ClosePeriod $close): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $period = $close->reopen($user);

        return response()->json(['data' => ['period' => $period, 'label' => ClosedPeriods::monthName($period)]]);
    }

    private function period(Request $request): string
    {
        return (string) $request->validate(
            ['period' => ['required', 'date_format:Y-m']],
            ['period.required' => 'Pilih bulan.', 'period.date_format' => 'Bulan tidak dikenali.'],
        )['period'];
    }
}
