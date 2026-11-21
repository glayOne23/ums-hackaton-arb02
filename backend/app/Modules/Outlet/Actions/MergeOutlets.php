<?php

namespace App\Modules\Outlet\Actions;

use App\Core\History\History;
use App\Models\User;
use App\Modules\Outlet\Contracts\OutletMergeStep;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Contracts\Container\Container;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * OT-06 / KR-08: two outlets that are really one shop. Everything of the
 * duplicate ($from) moves to the outlet that is kept ($into) in one DB
 * transaction: visits, invoices, shelf stock, discounts (each module's
 * OutletMergeStep), and the sales assignments. Empty address or WhatsApp on
 * the kept outlet are filled from the duplicate.
 *
 * The duplicate is not removed: it is switched off and soft-deleted with
 * merged_into_id pointing at the kept outlet, so its code is never reused,
 * old links still lead somewhere, and a phone that still sends visits for it
 * gets them recorded on the kept outlet (RecordTransaction). It does not
 * appear in the Tempat Sampah: a merge is not undone by restoring.
 */
final class MergeOutlets
{
    private const FILL = ['address' => 'Alamat', 'whatsapp_number' => 'WhatsApp'];

    public function __construct(private readonly Container $container) {}

    /**
     * What will happen, for the confirmation.
     *
     * @return array{moves: list<string>, notes: list<string>, blocked: string|null}
     */
    public function preview(Outlet $into, Outlet $from): array
    {
        $moves = [];
        foreach ($this->steps() as $step) {
            if ($line = $step->summary($from)) {
                $moves[] = $line;
            }
        }
        $assignments = $from->activeAssignments()->count();
        if ($assignments > 0) {
            $moves[] = "{$assignments} penugasan sales";
        }

        $notes = [];
        foreach (self::FILL as $field => $label) {
            if (blank($into->{$field}) && filled($from->{$field})) {
                $notes[] = "{$label} {$into->name} yang kosong diisi dari {$from->name}: {$from->{$field}}.";
            }
        }
        $notes[] = "{$from->name} ({$from->code}) dinonaktifkan dan tidak bisa dipulihkan; namanya tetap tercatat di riwayat.";
        $notes[] = "Kunjungan dari HP yang masih memakai {$from->name} otomatis dicatat ke {$into->name}.";

        return ['moves' => $moves, 'notes' => $notes, 'blocked' => $this->blockingReason($into, $from)];
    }

    public function handle(Outlet $into, Outlet $from, ?string $reason, User $actor): Outlet
    {
        $reason = filled($reason) ? trim((string) $reason) : null;

        return DB::transaction(function () use ($into, $from, $reason, $actor) {
            $into = Outlet::withTrashed()->lockForUpdate()->findOrFail($into->id);
            $from = Outlet::withTrashed()->lockForUpdate()->findOrFail($from->id);
            if ($blocked = $this->blockingReason($into, $from)) {
                throw ValidationException::withMessages(['from_id' => $blocked]);
            }

            $moves = $this->preview($into, $from)['moves'];

            foreach ($this->steps() as $step) {
                $step->move($from, $into, $actor);
            }
            $this->moveAssignments($from, $into);

            $filled = [];
            foreach (self::FILL as $field => $label) {
                if (blank($into->{$field}) && filled($from->{$field})) {
                    $into->{$field} = $from->{$field};
                    $filled[] = "{$label}: (kosong) → {$from->{$field}}";
                }
            }
            $into->forceFill(['updated_by' => $actor->id])->save();

            $from->forceFill([
                'merged_into_id' => $into->id,
                'is_active' => false,
                'deleted_by' => $actor->id,
                'updated_by' => $actor->id,
            ])->save();
            $from->delete();

            $moved = $moves === [] ? [] : ['Pindah ke sini: '.implode(', ', $moves)];
            History::record($into, "Menggabungkan outlet dobel {$from->name} ({$from->code})", [...$moved, ...$filled], $reason, $actor);
            History::record($from, "Digabung ke {$into->name} ({$into->code})", $moved, $reason, $actor);

            return $into;
        });
    }

    private function blockingReason(Outlet $into, Outlet $from): ?string
    {
        if ($into->id === $from->id) {
            return 'Pilih outlet lain: outlet tidak bisa digabung dengan dirinya sendiri.';
        }
        foreach ([$into, $from] as $outlet) {
            if ($outlet->merged_into_id !== null) {
                return "{$outlet->name} sudah digabung ke outlet lain.";
            }
            if ($outlet->trashed()) {
                return "{$outlet->name} ada di Tempat Sampah. Pulihkan dulu.";
            }
        }
        if ($into->sale_mode !== $from->sale_mode) {
            return "Cara jual {$into->name} {$into->sale_mode->label()}, {$from->name} {$from->sale_mode->label()}. Samakan dulu cara jualnya lewat Ubah data.";
        }
        foreach ($this->steps() as $step) {
            if ($reason = $step->blockingReason($from, $into)) {
                return $reason;
            }
        }

        return null;
    }

    /**
     * Sales of the duplicate now hold the kept outlet; a sales who already
     * holds it keeps one assignment. Ended assignments move as history.
     */
    private function moveAssignments(Outlet $from, Outlet $into): void
    {
        $holding = $into->activeAssignments()->pluck('sales_user_id')->all();

        foreach (Assignment::query()->where('outlet_id', $from->id)->get() as $assignment) {
            $double = $assignment->end_date === null && in_array($assignment->sales_user_id, $holding, true);
            $assignment->forceFill([
                'outlet_id' => $into->id,
                ...($double ? ['end_date' => now()->toDateString(), 'reason' => 'Gabung outlet dobel'] : []),
            ])->save();
        }
    }

    /** @return iterable<OutletMergeStep> */
    private function steps(): iterable
    {
        /** @var iterable<OutletMergeStep> $steps */
        $steps = $this->container->tagged(OutletMergeStep::TAG);

        return $steps;
    }
}
