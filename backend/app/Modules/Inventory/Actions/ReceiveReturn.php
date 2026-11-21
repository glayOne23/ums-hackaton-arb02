<?php

namespace App\Modules\Inventory\Actions;

use App\Core\Period\ClosedPeriods;
use App\Core\Support\ClientUuid;
use App\Core\Support\DocumentNumber;
use App\Models\User;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Enums\ReturnCondition;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockReturn;
use App\Modules\Product\Models\Product;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * GD-05 / P6: the warehouse takes goods back from a sales. The admin says
 * product, quantity, and condition; the batches come from what the sales
 * carries, nearest expiry first. Condition decides where they go (BR-07):
 * good → warehouse, damaged → returns (rework), expired → disposed.
 */
final class ReceiveReturn
{
    public function __construct(
        private readonly StockLocations $locations,
        private readonly AllocateStock $allocate,
        private readonly RecordStockMovement $move,
    ) {}

    /**
     * @param  array{client_uuid?: ?string, sales_user_id: int, received_date?: ?string, note?: ?string, items: list<array{product_id: string, qty: int, condition: string}>}  $data
     */
    public function handle(array $data, User $actor): StockReturn
    {
        // PW-06: sent again from a device that saved it without a signal → the same return
        return ClientUuid::once(StockReturn::class, $data['client_uuid'] ?? null, $actor, fn () => $this->receive($data, $actor));
    }

    /**
     * @param  array{client_uuid?: ?string, sales_user_id: int, received_date?: ?string, note?: ?string, items: list<array{product_id: string, qty: int, condition: string}>}  $data
     */
    private function receive(array $data, User $actor): StockReturn
    {
        return DB::transaction(function () use ($data, $actor) {
            $sales = User::query()->findOrFail($data['sales_user_id']);
            $date = isset($data['received_date']) ? Carbon::parse($data['received_date']) : now();
            app(ClosedPeriods::class)->assertOpen($date, 'Retur ini', 'received_date');
            $salesLocation = $this->locations->forSales($sales);

            $return = StockReturn::query()->create([
                'client_uuid' => $data['client_uuid'] ?? null,
                'number' => DocumentNumber::next('inv_returns', 'RT', $date),
                'sales_user_id' => $sales->id,
                'received_date' => $date->toDateString(),
                'note' => $data['note'] ?? null,
                'created_by' => $actor->id,
            ]);

            foreach ($data['items'] as $index => $line) {
                $product = Product::withTrashed()->findOrFail($line['product_id']);
                $condition = ReturnCondition::from($line['condition']);
                $destination = $this->locations->forType($condition->destination());
                $type = $condition === ReturnCondition::Expired ? MovementType::Disposal : MovementType::Return;

                foreach ($this->allocate->handle($product, $salesLocation, (int) $line['qty'], "items.{$index}.qty") as $allocation) {
                    $batch = Batch::query()->findOrFail($allocation['batch_id']);
                    $return->items()->create(['batch_id' => $batch->id, 'qty' => $allocation['qty'], 'condition' => $condition]);
                    $this->move->handle($batch, $salesLocation, $destination, $allocation['qty'], $type, $actor, $return);
                }
            }

            return $return;
        });
    }
}
