<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Core\Approval\VoidApprovals;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Billing\Actions\VoidPayment;
use App\Modules\Billing\Http\Resources\PaymentResource;
use App\Modules\Billing\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    /** KR-06: void a wrong payment with a reason. */
    public function void(Request $request, Payment $payment, VoidPayment $void, VoidApprovals $approvals): PaymentResource|JsonResponse
    {
        $data = $request->validate(
            ['reason' => ['required', 'string', 'max:255']],
            ['reason.required' => 'Tulis alasan pembatalan.'],
        );

        /** @var User $user */
        $user = $request->user();

        // PG-12: after the direct-fix window the void waits for approval
        if ($approvals->needsApproval('payment', $payment, $user)) {
            $approvals->request('payment', $payment, $data['reason'], $user);

            return response()->json(['pending' => true, 'message' => 'Pembatalan diajukan dan menunggu persetujuan.'], 202);
        }

        return new PaymentResource($void->handle($payment, $data['reason'], $user)->load(['receiver', 'voider']));
    }
}
