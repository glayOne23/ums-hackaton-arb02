<?php

use App\Modules\Akses\Actions\Masuk;
use App\Modules\Akses\Izin;

it('menyamakan format nomor HP ke awalan 0', function (string $masukan, ?string $hasil) {
    expect(Masuk::normalisasiNoHp($masukan))->toBe($hasil);
})->with([
    ['081234567890', '081234567890'],
    ['+62 812-3456-7890', '081234567890'],
    ['6281234567890', '081234567890'],
    ['81234567890', '081234567890'],
    ['sales1', null],
    ['1234', null],
]);

it('setiap izin di peran bawaan terdaftar di katalog', function () {
    $semua = array_keys(Izin::SEMUA);

    foreach (Izin::peranBawaan() as $izin) {
        expect(array_diff($izin, $semua))->toBeEmpty();
    }
});
