<?php

namespace App\Modules\Report\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Report\Exports\ReportExport;
use App\Modules\Report\Queries\ManagerSummary;
use App\Modules\Report\ReportCatalog;
use App\Modules\Report\ReportFilters;
use App\Modules\Report\Reports\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/** W1 and W7 (SRS 3.6). */
class ReportController extends Controller
{
    public function __construct(private readonly ReportCatalog $catalog) {}

    /** W7 menu: the reports this user may open, grouped. */
    public function index(Request $request): JsonResponse
    {
        $user = $this->user($request);
        abort_unless($user->can('report.view'), 403);

        $groups = [];
        foreach (ReportCatalog::GROUPS as $group => $title) {
            $items = array_values(array_filter(
                $this->catalog->all(),
                fn (Report $report) => $report->group() === $group && $this->catalog->allows($user, $report),
            ));
            if ($items !== []) {
                $groups[] = ['key' => $group, 'title' => $title, 'items' => array_map(fn (Report $report) => [
                    'code' => $report->code(),
                    'title' => $report->title(),
                    'description' => $report->description(),
                    'filters' => $report->filters(),
                ], $items)];
            }
        }

        return response()->json(['data' => $groups]);
    }

    /** Choices for the filter bar. */
    public function options(Request $request): JsonResponse
    {
        $user = $this->user($request);
        abort_unless($user->can('report.view') || $user->can('dashboard.view'), 403);

        return response()->json([
            'sales' => User::permission('visit.create')->orderByDesc('is_active')->orderBy('name')->get(['id', 'name', 'is_active']),
            'regions' => DB::table('crm_regions')->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'outlet_types' => DB::table('crm_outlet_types')->where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /** LP-01 / W1. */
    public function summary(Request $request, ManagerSummary $summary): JsonResponse
    {
        abort_unless($this->user($request)->can('dashboard.view'), 403);

        return response()->json(['data' => $summary->for(ReportFilters::fromRequest($request))]);
    }

    public function show(Request $request, string $code): JsonResponse|BinaryFileResponse
    {
        $report = $this->catalog->find($code);
        abort_if($report === null, 404, 'Laporan tidak ditemukan.');
        abort_unless($this->catalog->allows($this->user($request), $report), 403);

        $filters = ReportFilters::fromRequest($request);
        $rows = $report->rows($filters);
        $totals = $report->totals($rows);

        if ($request->query('format') === 'xlsx') {
            $suffix = in_array('month', $report->filters(), true) ? $filters->month->format('Y-m') : now()->format('Y-m-d');

            // File names cannot hold "/" ("J/R/L")
            $name = str_replace(['/', '\\'], ' ', $report->title());

            return Excel::download(new ReportExport($report, $rows, $totals), "SIGAP {$name} {$suffix}.xlsx");
        }

        return response()->json([
            'code' => $report->code(),
            'title' => $report->title(),
            'description' => $report->description(),
            'filters' => $report->filters(),
            'month_label' => $filters->monthLabel(),
            'as_of' => $filters->asOf()->toIso8601String(),
            'columns' => collect($report->columns())->map(fn (array $column, string $key) => [
                'key' => $key,
                'label' => $column['label'],
                'type' => $column['type'],
            ])->values(),
            'rows' => $rows,
            'totals' => $totals,
        ]);
    }

    private function user(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
