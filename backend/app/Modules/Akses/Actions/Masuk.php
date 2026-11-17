<?php

namespace App\Modules\Akses\Actions;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * AK-01: masuk dengan nomor HP atau username + kata sandi.
 * Token tidak kedaluwarsa, sehingga sales tetap masuk di HP sampai menekan Keluar.
 */
final class Masuk
{
    /**
     * @return array{pengguna: User, token: string}
     */
    public function jalankan(string $login, string $kataSandi, string $perangkat): array
    {
        $pengguna = $this->cariPengguna($login);

        if (! $pengguna || ! Hash::check($kataSandi, $pengguna->password)) {
            throw ValidationException::withMessages([
                'login' => 'Nomor HP/username atau kata sandi salah. Periksa lalu coba lagi.',
            ]);
        }

        if (! $pengguna->aktif) {
            throw ValidationException::withMessages([
                'login' => 'Akun ini tidak aktif. Hubungi admin kantor.',
            ]);
        }

        $pengguna->forceFill(['terakhir_masuk_at' => now()])->save();

        return [
            'pengguna' => $pengguna,
            'token' => $pengguna->createToken($perangkat)->plainTextToken,
        ];
    }

    private function cariPengguna(string $login): ?User
    {
        $login = trim($login);
        $noHp = self::normalisasiNoHp($login);

        return User::query()
            ->where('username', $login)
            ->when($noHp !== null, fn ($q) => $q->orWhere('no_hp', $noHp))
            ->first();
    }

    /**
     * Samakan penulisan nomor HP: "+62 812-3456", "62812…", "0812…" → "0812…".
     * Mengembalikan null bila masukan bukan nomor HP.
     */
    public static function normalisasiNoHp(string $masukan): ?string
    {
        $angka = preg_replace('/\D/', '', $masukan) ?? '';

        if (strlen($angka) < 9 || preg_match('/[a-z]/i', $masukan)) {
            return null;
        }

        if (str_starts_with($angka, '62')) {
            $angka = '0'.substr($angka, 2);
        } elseif (str_starts_with($angka, '8')) {
            $angka = '0'.$angka;
        }

        return $angka;
    }
}
