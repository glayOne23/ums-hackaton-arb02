<?php

namespace App\Modules\Auth\Actions;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * AK-01: sign in with phone number or username + password.
 * Tokens never expire, so sales staff stay signed in on their phone until they tap "Keluar".
 */
final class Login
{
    /**
     * @return array{user: User, token: string}
     */
    public function handle(string $login, string $password, string $deviceName): array
    {
        $user = $this->findUser($login);

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'login' => 'Nomor HP/username atau kata sandi salah. Periksa lalu coba lagi.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'login' => 'Akun ini tidak aktif. Hubungi admin kantor.',
            ]);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        return [
            'user' => $user,
            'token' => $user->createToken($deviceName)->plainTextToken,
        ];
    }

    private function findUser(string $login): ?User
    {
        $login = trim($login);
        $phone = self::normalizePhone($login);

        return User::query()
            ->where('username', $login)
            ->when($phone !== null, fn ($query) => $query->orWhere('phone', $phone))
            ->first();
    }

    /**
     * Normalize phone numbers: "+62 812-3456", "62812…", "0812…" → "0812…".
     * Returns null when the input is not a phone number.
     */
    public static function normalizePhone(string $input): ?string
    {
        $digits = preg_replace('/\D/', '', $input) ?? '';

        if (strlen($digits) < 9 || preg_match('/[a-z]/i', $input)) {
            return null;
        }

        if (str_starts_with($digits, '62')) {
            $digits = '0'.substr($digits, 2);
        } elseif (str_starts_with($digits, '8')) {
            $digits = '0'.$digits;
        }

        return $digits;
    }
}
