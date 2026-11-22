<?php

namespace App\Core\Approval;

use App\Core\History\History;
use App\Core\Notify\Alert;
use App\Core\Notify\Notifier;
use App\Models\User;
use App\Modules\Billing\Actions\VoidPayment;
use App\Modules\Billing\Models\Payment;
use App\Modules\Inventory\Actions\VoidGoodsReceipt;
use App\Modules\Inventory\Actions\VoidStockReturn;
use App\Modules\Inventory\Models\GoodsReceipt;
use App\Modules\Inventory\Models\StockReturn;
use App\Modules\Setting\Setting;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * PG-12 / KR-02: "koreksi setelah batas waktu perlu persetujuan, per jenis transaksi".
 *
 * Notas have their own correction flow (Sales\CorrectionRules). This covers the
 * other documents that are voided rather than edited: payments (setting
 * approve_payment_void) and warehouse goods in / returns (approve_warehouse_void).
 *
 * Within edit_window_days the void happens at once, as before. After it, with
 * the rule on, the void becomes a request that waits for correction.approve;
 * an approver's own void is never held back.
 */
final class VoidApprovals
{
    public const APPROVE = 'correction.approve';

    /** @var array<string, array{setting: string, model: class-string<Model>, noun: string}> */
    public const TYPES = [
        'payment' => ['setting' => 'approve_payment_void', 'model' => Payment::class, 'noun' => 'Pembayaran'],
        'goods_receipt' => ['setting' => 'approve_warehouse_void', 'model' => GoodsReceipt::class, 'noun' => 'Barang masuk'],
        'stock_return' => ['setting' => 'approve_warehouse_void', 'model' => StockReturn::class, 'noun' => 'Retur'],
    ];

    public function __construct(private readonly Notifier $notifier) {}

    public function needsApproval(string $type, Model $subject, User $actor): bool
    {
        return Setting::bool(self::TYPES[$type]['setting'])
            && $actor->cannot(self::APPROVE)
            && $this->date($type, $subject)->copy()->startOfDay()->lessThan($this->windowStart());
    }

    /** Puts the void on hold until an approver decides. */
    public function request(string $type, Model $subject, string $reason, User $actor): VoidRequest
    {
        $reason = trim($reason);
        if ($reason === '') {
            throw ValidationException::withMessages(['reason' => 'Tulis alasan pembatalan.']);
        }
        if ($this->isVoid($subject)) {
            throw ValidationException::withMessages(['reason' => 'Dokumen ini sudah dibatalkan.']);
        }
        if (VoidRequest::pendingFor($type, (string) $subject->getKey())) {
            throw ValidationException::withMessages(['reason' => 'Pembatalan dokumen ini sudah diajukan dan masih menunggu persetujuan.']);
        }

        $request = VoidRequest::query()->create([
            'subject_type' => $type,
            'subject_id' => (string) $subject->getKey(),
            'subject_label' => $this->label($type, $subject),
            'reason' => $reason,
            'requested_by' => $actor->id,
        ]);
        History::record($subject, 'Mengajukan pembatalan', [], $reason, $actor);

        $this->notifier->toPermission(self::APPROVE, new Alert(
            'Pembatalan menunggu persetujuan',
            "{$request->subject_label}, diajukan {$actor->name}: {$reason}",
            '/office/corrections?tab=persetujuan',
            'approval',
        ), $actor);

        return $request;
    }

    /** Approve (the document is voided now) or reject (it stays). */
    public function decide(VoidRequest $request, bool $approve, ?string $note, User $actor): VoidRequest
    {
        $note = filled($note) ? trim((string) $note) : null;
        if (! $approve && $note === null) {
            throw ValidationException::withMessages(['note' => 'Tulis alasan menolak, supaya pengaju tahu apa yang harus dilakukan.']);
        }

        return DB::transaction(function () use ($request, $approve, $note, $actor) {
            $request = VoidRequest::query()->lockForUpdate()->findOrFail($request->id);
            if ($request->status !== VoidRequest::PENDING) {
                throw ValidationException::withMessages(['note' => 'Pengajuan ini sudah diputuskan.']);
            }

            $subject = $this->subject($request);
            if ($approve) {
                $this->carryOut($request->subject_type, $subject, "{$request->reason} (diajukan {$request->requester->name})", $actor);
            } else {
                History::record($subject, 'Pembatalan ditolak', [], $note, $actor);
            }

            $request->forceFill([
                'status' => $approve ? VoidRequest::APPROVED : VoidRequest::REJECTED,
                'decided_by' => $actor->id,
                'decided_at' => now(),
                'decision_note' => $note,
            ])->save();

            $this->notifier->toUser($request->requested_by, new Alert(
                $approve ? 'Pembatalan disetujui' : 'Pembatalan ditolak',
                $approve ? "{$request->subject_label} sudah dibatalkan." : "{$request->subject_label}: {$note}",
                $this->url($request->subject_type, $subject),
                'approval',
            ), $actor);

            return $request;
        });
    }

    /** The pending void of a document, for its screen. @return array<string, mixed>|null */
    public static function pendingSummary(string $type, string $id): ?array
    {
        $request = VoidRequest::pendingFor($type, $id);

        return $request ? [
            'id' => $request->id,
            'reason' => $request->reason,
            'requested_by' => $request->requester->name,
            'requested_at' => $request->created_at->toIso8601String(),
        ] : null;
    }

    public function subject(VoidRequest $request): Model
    {
        $model = self::TYPES[$request->subject_type]['model'];

        return $model::query()->findOrFail($request->subject_id);
    }

    public function url(string $type, Model $subject): string
    {
        return match ($type) {
            'payment' => '/office/billing/invoices/'.$subject->getAttribute('invoice_id'),
            'goods_receipt' => '/office/inventory/receipts',
            default => '/office/inventory/returns',
        };
    }

    private function carryOut(string $type, Model $subject, string $reason, User $actor): void
    {
        match (true) {
            $subject instanceof Payment => app(VoidPayment::class)->handle($subject, $reason, $actor),
            $subject instanceof GoodsReceipt => app(VoidGoodsReceipt::class)->handle($subject, $reason, $actor),
            $subject instanceof StockReturn => app(VoidStockReturn::class)->handle($subject, $reason, $actor),
            default => throw new \LogicException("Unknown void type [{$type}]"),
        };
    }

    private function date(string $type, Model $subject): CarbonInterface
    {
        /** @var CarbonInterface $date */
        $date = $type === 'payment' ? $subject->getAttribute('paid_at') : $subject->getAttribute('received_date');

        return $date;
    }

    private function isVoid(Model $subject): bool
    {
        $status = $subject->getAttribute('status');

        return ($status instanceof \BackedEnum ? $status->value : $status) === 'void';
    }

    private function label(string $type, Model $subject): string
    {
        if ($subject instanceof Payment) {
            $subject->loadMissing('invoice');
            $amount = 'Rp '.number_format((float) $subject->amount, 0, ',', '.');

            return "Pembayaran {$subject->invoice->number} · {$amount}";
        }

        return self::TYPES[$type]['noun'].' '.$subject->getAttribute('number');
    }

    private function windowStart(): CarbonInterface
    {
        return now()->startOfDay()->subDays(Setting::int('edit_window_days'));
    }
}
