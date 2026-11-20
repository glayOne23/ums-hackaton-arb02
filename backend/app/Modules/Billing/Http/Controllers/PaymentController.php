<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Billing\Actions\VoidPayment;
use App\Modules\Billing\Http\Resources\PaymentResource;
use App\Modules\Billing\Models\Payment;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    /** KR-06: void a wrong payment with a reason. */
    public function void(Request $request, Payment $payment, VoidPayment $void): PaymentResource
    {
        $data = $request->validate(
            ['reason' => ['required', 'string', 'max:255']],
            ['reason.required' => 'Tulis alasan pembatalan.'],
        );

        /** @var User $user */
        $user = $request->user();

        return new PaymentResource($void->handle($payment, $data['reason'], $user)->load(['receiver', 'voider']));
    }
}
