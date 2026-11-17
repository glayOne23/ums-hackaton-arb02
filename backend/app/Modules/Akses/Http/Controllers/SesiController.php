<?php

namespace App\Modules\Akses\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Akses\Actions\Masuk;
use App\Modules\Akses\Http\Requests\MasukRequest;
use App\Modules\Akses\Http\Resources\PenggunaResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Laravel\Sanctum\PersonalAccessToken;

class SesiController extends Controller
{
    /** Masuk dan dapatkan token (AK-01). */
    public function masuk(MasukRequest $request, Masuk $masuk): JsonResponse
    {
        $hasil = $masuk->jalankan(
            $request->string('login')->toString(),
            $request->string('kata_sandi')->toString(),
            $request->string('perangkat')->toString() ?: 'Perangkat tanpa nama',
        );

        return response()->json([
            'token' => $hasil['token'],
            'pengguna' => new PenggunaResource($hasil['pengguna']),
        ]);
    }

    /** Data pengguna yang sedang masuk beserta peran dan izinnya. */
    public function saya(Request $request): PenggunaResource
    {
        /** @var User $pengguna */
        $pengguna = $request->user();

        return new PenggunaResource($pengguna);
    }

    /** Keluar: hanya mencabut token perangkat ini. */
    public function keluar(Request $request): Response
    {
        PersonalAccessToken::findToken((string) $request->bearerToken())?->delete();

        return response()->noContent();
    }
}
