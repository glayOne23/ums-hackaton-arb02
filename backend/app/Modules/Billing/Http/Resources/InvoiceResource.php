<?php

namespace App\Modules\Billing\Http\Resources;

use App\Core\Support\Money;
use App\Modules\Billing\Enums\InvoiceStatus;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Setting\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Invoice
 */
class InvoiceResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $owed = Money::toCents($this->amount) - Money::toCents($this->paid_amount);
        $open = in_array($this->status, InvoiceStatus::open(), true);

        return [
            'id' => $this->id,
            'number' => $this->number,
            'type' => $this->type->value,
            'transaction_id' => $this->transaction_id,
            'outlet' => $this->whenLoaded('outlet', fn () => [
                'id' => $this->outlet->id,
                'code' => $this->outlet->code,
                'name' => $this->outlet->name,
                'address' => $this->outlet->address,
                'district' => $this->outlet->district,
                'region' => $this->outlet->region?->name,
                'whatsapp_number' => $this->outlet->whatsapp_number,
            ]),
            'sales' => $this->whenLoaded('salesUser', fn () => $this->salesUser ? ['id' => $this->salesUser->id, 'name' => $this->salesUser->name] : null),
            'invoice_date' => $this->invoice_date->toDateString(),
            'due_date' => $this->due_date->toDateString(),
            'amount' => (float) $this->amount,
            'paid_amount' => (float) $this->paid_amount,
            'owed' => $open ? $owed / 100 : 0,
            // TG-01: how long it has been unpaid
            'age_days' => (int) $this->invoice_date->diffInDays(now()->startOfDay()),
            'overdue' => $open && $this->due_date->lt(now()->startOfDay()),
            // TG-04: due within the reminder days (Pengaturan → Penagihan); 0 days = never
            'due_soon' => $open && Setting::int('due_reminder_days') > 0
                && $this->due_date->gte(now()->startOfDay())
                && $this->due_date->lte(now()->startOfDay()->addDays(Setting::int('due_reminder_days'))),
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
        ];
    }
}
