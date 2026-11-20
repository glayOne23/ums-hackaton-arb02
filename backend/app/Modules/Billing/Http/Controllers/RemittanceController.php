<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Billing\Actions\ReceiveRemittance;
use App\Modules\Billing\Http\Resources\RemittanceResource;
use App\Modules\Billing\Models\Remittance;
use App\Modules\Billing\Queries\PendingRemittances;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class RemittanceController extends Controller
{
    /** Cash each sales still holds (TG-03). */
    public function pending(PendingRemittances $pending): JsonResponse
    {
        return response()->json(['data' => $pending->bySales()]);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return RemittanceResource::collection(
            Remittance::query()->with(['salesUser', 'receiver'])->withCount('payments')
                ->latest('received_at')
                ->paginate(min(max($request->integer('per_page', 25), 1), 100)),
        );
    }

    /** "Uang diterima" (amount empty = as expected), or the amount received with a note. */
    public function store(Request $request, ReceiveRemittance $receive): JsonResponse
    {
        $data = $request->validate([
            'sales_user_id' => ['required', 'integer', Rule::exists('auth_users', 'id')],
            'amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999999'],
            'note' => ['nullable', 'string', 'max:255'],
        ], [
            'sales_user_id.required' => 'Pilih sales yang menyetor.',
            'amount.min' => 'Jumlah tidak boleh kurang dari 0.',
        ]);

        /** @var User $user */
        $user = $request->user();
        $sales = User::query()->findOrFail($data['sales_user_id']);
        /** @var array{amount?: int|float|string|null, note?: ?string} $data */
        $remittance = $receive->handle($sales, $data, $user);

        return (new RemittanceResource($remittance->load(['salesUser', 'receiver'])->loadCount('payments')))
            ->response()->setStatusCode(201);
    }
}
