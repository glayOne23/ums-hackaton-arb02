<?php

namespace App\Modules\Report;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/** The filters every report understands (SRS 3.6): month, sales, region, outlet type. */
final readonly class ReportFilters
{
    public function __construct(
        public Carbon $month,
        public ?int $salesUserId = null,
        public ?string $regionId = null,
        public ?string $outletTypeId = null,
    ) {}

    public static function fromRequest(Request $request): self
    {
        $month = (string) $request->query('month', now()->format('Y-m'));
        if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
            throw ValidationException::withMessages(['month' => 'Pilih bulan.']);
        }

        return new self(
            Carbon::createFromFormat('Y-m-d', "{$month}-01")->startOfDay(),
            $request->filled('sales_user_id') ? $request->integer('sales_user_id') : null,
            $request->filled('region_id') ? (string) $request->query('region_id') : null,
            $request->filled('outlet_type_id') ? (string) $request->query('outlet_type_id') : null,
        );
    }

    public function from(): Carbon
    {
        return $this->month->copy()->startOfMonth();
    }

    public function to(): Carbon
    {
        return $this->month->copy()->endOfMonth();
    }

    /**
     * The day "now" reports look from: today for this month (or a later one),
     * the last day of the month for a past month.
     */
    public function asOf(): Carbon
    {
        return now()->lessThan($this->to()) ? now() : $this->to();
    }

    public function monthLabel(): string
    {
        return $this->month->locale('id')->translatedFormat('F Y');
    }
}
