<?php

use App\Modules\Auth\Actions\Login;
use App\Modules\Auth\Permissions;
use App\Modules\Auth\Roles;

it('normalizes phone numbers to the 0 prefix', function (string $input, ?string $expected) {
    expect(Login::normalizePhone($input))->toBe($expected);
})->with([
    ['081234567890', '081234567890'],
    ['+62 812-3456-7890', '081234567890'],
    ['6281234567890', '081234567890'],
    ['81234567890', '081234567890'],
    ['sales1', null],
    ['1234', null],
]);

it('uses one rate-limit key for every format of the same login', function () {
    expect(Login::throttleKey('081234567890'))
        ->toBe(Login::throttleKey('+62 812-3456-7890'))
        ->toBe(Login::throttleKey(' 6281234567890 '))
        ->and(Login::throttleKey(' Sales1 '))->toBe('sales1');
});

it('only accepts usernames that contain a letter', function (string $username, bool $valid) {
    expect((bool) preg_match(Login::USERNAME_PATTERN, $username))->toBe($valid);
})->with([
    ['sales1', true],
    ['admin.kantor', true],
    ['081234567890', false],
    ['ab', false],
    ['nama spasi', false],
]);

it('only grants default roles permissions that exist in the catalog', function () {
    $all = array_keys(Permissions::ALL);

    foreach (Roles::defaultPermissions() as $permissions) {
        expect(array_diff($permissions, $all))->toBeEmpty();
    }
});

it('has a UI label for every default role', function () {
    expect(array_keys(Roles::LABELS))->toEqualCanonicalizing(array_keys(Roles::defaultPermissions()));
});
