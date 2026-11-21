<?php

namespace App\Core\Support;

use App\Models\User;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;

/**
 * A document sent from a device that may send it again (PW-05, PW-06): the
 * device's id makes the resend answer with the saved document instead of a
 * double. Mirrors what RecordTransaction does for notas (KS-11).
 */
final class ClientUuid
{
    /**
     * @template T of Model
     *
     * @param  class-string<T>  $model
     * @param  Closure(): T  $create  saves the document (inside its own transaction)
     * @return T the saved document; wasRecentlyCreated says whether it is new
     */
    public static function once(string $model, ?string $clientUuid, User $actor, Closure $create): Model
    {
        if ($clientUuid === null) {
            return $create();
        }
        if ($existing = self::find($model, $clientUuid, $actor)) {
            return $existing;
        }

        try {
            return $create();
        } catch (UniqueConstraintViolationException $e) {
            // The same device sent it twice at the same moment: the other request saved it
            return self::find($model, $clientUuid, $actor) ?? throw $e;
        }
    }

    /**
     * @template T of Model
     *
     * @param  class-string<T>  $model
     * @return T|null
     */
    private static function find(string $model, string $clientUuid, User $actor): ?Model
    {
        /** @var T|null $existing */
        $existing = $model::query()->where('client_uuid', $clientUuid)->first();
        if ($existing && (int) $existing->getAttribute('created_by') !== $actor->id) {
            throw ValidationException::withMessages(['client_uuid' => 'Data ini sudah dikirim oleh pengguna lain.']);
        }

        return $existing;
    }
}
