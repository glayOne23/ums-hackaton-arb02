<?php

namespace App\Core\Http\Controllers;

use App\Core\Support\PhoneNumber;
use App\Http\Controllers\Controller;
use App\Modules\Setting\Setting;
use Illuminate\Http\JsonResponse;

/**
 * UX-09: where the "Bantuan" button goes — the admin's WhatsApp, for every
 * signed-in user (the Settings screen itself is for admins only).
 */
class HelpController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $number = Setting::string('help_whatsapp') ?: Setting::string('company_whatsapp');

        return response()->json(['data' => [
            'whatsapp' => $number !== '' ? PhoneNumber::normalize($number) : null,
            'company_name' => Setting::string('company_name'),
        ]]);
    }
}
