<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Core\Support\ClientUuid;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Inventory\Actions\RecordExpiryCheck;
use App\Modules\Inventory\Actions\StockLocations;
use App\Modules\Inventory\Enums\ExpiryCheckTrigger;
use App\Modules\Inventory\Models\ExpiryCheck;
use App\Modules\Inventory\Models\StockRequest;
use App\Modules\Product\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Doc 11: a sales counts what they carry per expiry month, for example when
 * goods come from the warehouse ("Cocokkan ED"). The batches in the bag are
 * corrected to the count; the totals stay as they are.
 */
class ExpiryCheckController extends Controller
{
    public function store(Request $request, RecordExpiryCheck $record, StockLocations $locations): JsonResponse
    {
        /** @var User $sales */
        $sales = $request->user();
        abort_unless($sales->can('visit.create'), 403);

        $month = 'regex:/^\d{4}-(0[1-9]|1[0-2])$/';
        $data = $request->validate([
            'client_uuid' => ['nullable', 'uuid'],
            'trigger' => ['nullable', Rule::in([ExpiryCheckTrigger::Receipt->value, ExpiryCheckTrigger::Manual->value])],
            'stock_request_id' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1', 'max:300'],
            'items.*.product_id' => ['required', 'string', 'distinct', Rule::exists('prd_products', 'id')],
            'items.*.expiry' => ['present', 'array', 'max:24'],
            'items.*.expiry.*.month' => ['required', 'string', $month],
            'items.*.expiry.*.qty' => ['required', 'integer', 'min:0'],
        ], [
            'items.required' => 'Pilih minimal satu produk.',
            'items.*.expiry.*.month.regex' => 'Bulan ED tidak dikenali.',
        ]);

        $source = isset($data['stock_request_id'])
            ? StockRequest::query()->where('sales_user_id', $sales->id)->find($data['stock_request_id'])
            : null;

        $check = ClientUuid::once(ExpiryCheck::class, $data['client_uuid'] ?? null, $sales, fn () => DB::transaction(function () use ($data, $sales, $source, $record, $locations) {
            $bag = $locations->forSales($sales);
            $trigger = ExpiryCheckTrigger::tryFrom((string) ($data['trigger'] ?? '')) ?? ExpiryCheckTrigger::Manual;
            $check = $record->start($bag, $trigger, $sales, $source, $data['client_uuid'] ?? null);

            foreach ($data['items'] as $index => $item) {
                $found = [];
                foreach ($item['expiry'] as $row) {
                    $found[$row['month']] = ($found[$row['month']] ?? 0) + (int) $row['qty'];
                }
                $record->apply($check, $bag, Product::withTrashed()->findOrFail($item['product_id']), $found, $sales, [$locations->warehouse()], "items.{$index}.expiry");
            }

            return $check;
        }));

        /** @var ExpiryCheck $check */
        return response()->json(['data' => [
            'id' => $check->id,
            'number' => $check->number,
            'is_match' => $check->is_match,
            'corrected_qty' => $check->corrected_qty,
        ]], $check->wasRecentlyCreated ? 201 : 200);
    }
}
