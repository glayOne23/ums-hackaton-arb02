<?php

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);
    $this->product = Product::factory()->create();
});

it('adds, shows, replaces, and removes a product photo (PR-01)', function () {
    $url = "/api/v1/products/{$this->product->id}/photo";

    $this->actingAs($this->admin)->getJson("/api/v1/products/{$this->product->id}")->assertJsonPath('data.has_photo', false);
    $this->actingAs($this->admin)->postJson($url, [])->assertJsonValidationErrors('photo');
    $this->actingAs($this->sales)->post($url, ['photo' => UploadedFile::fake()->image('madu.jpg')], ['Accept' => 'application/json'])->assertForbidden();

    $this->actingAs($this->admin)->post($url, ['photo' => UploadedFile::fake()->image('madu.jpg', 600, 600)], ['Accept' => 'application/json'])
        ->assertOk()->assertJsonPath('data.has_photo', true);
    $first = $this->product->refresh()->photo_path;
    Storage::disk('local')->assertExists($first);
    $this->actingAs($this->sales)->get($url)->assertOk();
    $this->actingAs($this->admin)->getJson("/api/v1/products/{$this->product->id}")->assertJsonPath('data.has_photo', true);

    // Replacing removes the old file
    $this->actingAs($this->admin)->post($url, ['photo' => UploadedFile::fake()->image('baru.png')], ['Accept' => 'application/json'])->assertOk();
    Storage::disk('local')->assertMissing($first);

    $this->actingAs($this->admin)->deleteJson($url)->assertNoContent();
    expect($this->product->refresh()->photo_path)->toBeNull();
    $this->actingAs($this->admin)->get($url)->assertNotFound();
});
