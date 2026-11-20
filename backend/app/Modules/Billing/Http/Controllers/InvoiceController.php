<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Core\Support\Money;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Billing\Actions\RecordInvoicePayment;
use App\Modules\Billing\Enums\InvoiceStatus;
use App\Modules\Billing\Enums\PaymentMethod;
use App\Modules\Billing\Http\Resources\InvoiceResource;
use App\Modules\Billing\Http\Resources\PaymentResource;
use App\Modules\Billing\Models\Invoice;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    private const RELATIONS = ['outlet.region', 'salesUser'];

    /**
     * TG-01: unpaid invoices per outlet and per sales, oldest first, with the
     * total owed of the whole filter (for the printed collection list).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['open', 'paid', 'void', 'all'])],
            'sales_user_id' => ['nullable', 'integer'],
            'outlet_id' => ['nullable', 'string'],
            'overdue' => ['nullable', 'boolean'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);
        $status = $filters['status'] ?? 'open';

        $query = Invoice::query()
            ->when($status === 'open', fn (Builder $q) => $q->whereIn('status', InvoiceStatus::open()))
            ->when(in_array($status, ['paid', 'void'], true), fn (Builder $q) => $q->where('status', $status))
            ->when($filters['sales_user_id'] ?? null, fn (Builder $q, $id) => $q->where('sales_user_id', $id))
            ->when($filters['outlet_id'] ?? null, fn (Builder $q, $id) => $q->where('outlet_id', $id))
            ->when($request->boolean('overdue'), fn (Builder $q) => $q
                ->whereIn('status', InvoiceStatus::open())
                ->whereDate('due_date', '<', now()->toDateString()))
            ->when($filters['search'] ?? null, fn (Builder $q, string $search) => $q->where(fn (Builder $inner) => $inner
                ->where('number', 'like', "%{$search}%")
                ->orWhereHas('outlet', fn (Builder $outlet) => $outlet->withTrashed()->where('name', 'like', "%{$search}%"))));

        $summary = (clone $query)
            ->whereIn('status', InvoiceStatus::open())
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(amount - paid_amount), 0) as owed')
            ->toBase()
            ->first();

        $page = $query->with(self::RELATIONS)
            ->orderBy($status === 'open' ? 'invoice_date' : 'created_at', $status === 'open' ? 'asc' : 'desc')
            ->orderBy('number')
            ->paginate($filters['per_page'] ?? 50);

        return InvoiceResource::collection($page)->additional(['summary' => [
            'open_count' => (int) ($summary->count ?? 0),
            'owed' => Money::toCents((string) ($summary->owed ?? 0)) / 100,
        ]]);
    }

    public function show(Invoice $invoice): InvoiceResource
    {
        return new InvoiceResource($invoice->load([
            ...self::RELATIONS,
            'payments' => fn ($query) => $query->orderBy('paid_at')->orderBy('created_at'),
            'payments.receiver',
            'payments.voider',
        ]));
    }

    /**
     * TG-02: the office records any payment (invoice.manage); a sales only
     * for the invoices of their own sales (payment.record).
     */
    public function pay(Request $request, Invoice $invoice, RecordInvoicePayment $record): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        abort_unless(
            $user->can('invoice.manage') || ($user->can('payment.record') && $invoice->sales_user_id === $user->id),
            403,
        );

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999999'],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'paid_at' => ['nullable', 'date', 'before_or_equal:now'],
            'note' => ['nullable', 'string', 'max:255'],
            'client_uuid' => ['nullable', 'uuid'],
        ], [
            'amount.required' => 'Isi jumlah uang yang dibayar.',
            'amount.gt' => 'Jumlah harus lebih dari 0.',
            'method.required' => 'Pilih tunai atau transfer.',
            'paid_at.before_or_equal' => 'Tanggal bayar tidak boleh setelah hari ini.',
        ]);

        /** @var array{amount: int|float|string, method: string, paid_at?: ?string, note?: ?string, client_uuid?: ?string} $data */
        $payment = $record->handle($invoice, $data, $user);

        return (new PaymentResource($payment->load('receiver')))->response()->setStatusCode(201);
    }
}
