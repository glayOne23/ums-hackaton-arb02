<?php

namespace App\Modules\Inventory\Actions;

use App\Core\Support\DocumentNumber;
use App\Models\User;
use App\Modules\Inventory\Enums\StockRequestStatus;
use App\Modules\Inventory\Models\StockRequest;
use Illuminate\Support\Facades\DB;

/**
 * GD-02 / P2: a sales asks the warehouse for goods from the phone. What they
 * still carry is shown on the screen, so they only ask for what is missing (GD-04).
 */
final class SubmitStockRequest
{
    /**
     * @param  list<array{product_id: string, qty: int}>  $items
     */
    public function handle(User $sales, array $items, ?string $note): StockRequest
    {
        return DB::transaction(function () use ($sales, $items, $note) {
            $request = StockRequest::query()->create([
                'number' => DocumentNumber::next('inv_stock_requests', 'PB'),
                'sales_user_id' => $sales->id,
                'status' => StockRequestStatus::Submitted,
                'note' => filled($note) ? trim((string) $note) : null,
            ]);

            // The same product twice becomes one line
            foreach (collect($items)->groupBy('product_id') as $productId => $lines) {
                $request->items()->create([
                    'product_id' => $productId,
                    'requested_qty' => (int) $lines->sum('qty'),
                ]);
            }

            return $request;
        });
    }
}
