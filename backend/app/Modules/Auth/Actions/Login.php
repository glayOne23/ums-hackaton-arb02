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

        // Without a role the user has no area or permissions to work with
        if ($user->roles()->doesntExist()) {
            throw ValidationException::withMessages([
                'login' => 'Akun ini belum diberi peran. Hubungi admin kantor.',
            ]);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        return [
            'user' => $user,
            'token' => $user->createToken($deviceName)->plainTextToken,
        ];
    }

    /**
     * Username rule for the future user management form: 3–50 characters of
     * letters, digits, "." or "_", with at least one letter. Requiring a letter
     * keeps usernames from ever looking like a phone number.
     */
    public const USERNAME_PATTERN = '/^(?=.*[a-z])[a-z0-9._]{3,50}$/i';

    /**
     * An exact username match always wins over a phone match, so one input
     * can never resolve to two different accounts.
     */
    private function findUser(string $login): ?User
    {
        $login = trim($login);

        $user = User::query()->where('username', $login)->first();
        if ($user) {
            return $user;
        }

        $phone = self::normalizePhone($login);

        return $phone === null ? null : User::query()->where('phone', $phone)->first();
    }

    /**
     * Rate-limit key for a login input: the normalized phone number when the
     * input is one, otherwise the lowercased username.
     */
    public static function throttleKey(string $login): string
    {
        $login = trim($login);

        return self::normalizePhone($login) ?? mb_strtolower($login);
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
