<?php

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Outlet\Models\Outlet;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['name' => 'Admin Rina'])->assignRole(Roles::OFFICE_ADMIN);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);
    Outlet::factory()->create(['name' => 'Apotek Ekspor Contoh']);
});

/** Opens the downloaded ZIP and returns file name => contents. */
function unzipped(string $path): array
{
    $zip = new ZipArchive;
    $zip->open($path);
    $files = [];
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $files[$zip->getNameIndex($i)] = $zip->getFromIndex($i);
    }
    $zip->close();

    return $files;
}

it('exports every business table as JSON, without secrets (FP-11)', function () {
    $response = $this->actingAs($this->admin)->get('/api/v1/data-export?format=json')->assertOk();
    $files = unzipped($response->getFile()->getPathname());

    expect($files)->toHaveKeys(['manifest.json', 'crm_outlets.json', 'prd_products.json', 'sys_activity_log.json', 'auth_users.json'])
        ->not->toHaveKey('auth_personal_access_tokens.json')
        ->not->toHaveKey('sys_jobs.json');
    expect(json_decode($files['crm_outlets.json'], true)[0]['name'])->toBe('Apotek Ekspor Contoh');
    $user = json_decode($files['auth_users.json'], true)[0];
    expect($user)->toHaveKey('name')->not->toHaveKey('password')->not->toHaveKey('remember_token');
    expect(json_decode($files['manifest.json'], true))
        ->toMatchArray(['format' => 'json', 'exported_by' => 'Admin Rina'])
        ->and(json_decode($files['manifest.json'], true)['rows']['crm_outlets'])->toBe(1);
});

it('exports CSV with a header row, and only for setting.manage (FP-11)', function () {
    $files = unzipped($this->actingAs($this->admin)->get('/api/v1/data-export?format=csv')->assertOk()->getFile()->getPathname());
    $lines = preg_split('/\R/', trim($files['crm_outlets.csv']));
    expect($lines[0])->toContain('name')->and($lines[1])->toContain('Apotek Ekspor Contoh')
        ->and($files['auth_users.csv'])->not->toContain('password');

    $this->actingAs($this->admin)->getJson('/api/v1/data-export?format=xml')->assertJsonValidationErrors('format');
    $this->actingAs($this->sales)->get('/api/v1/data-export?format=json')->assertForbidden();
});
