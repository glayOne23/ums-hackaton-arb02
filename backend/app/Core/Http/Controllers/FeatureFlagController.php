<?php

namespace App\Core\Http\Controllers;

use App\Core\Features\Flags;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Laravel\Pennant\Feature;

/** FP-07: Settings → Fitur bertahap. */
class FeatureFlagController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => collect(Flags::ALL)->map(fn (array $flag, string $key) => [
                'key' => $key,
                'label' => $flag['label'],
                'help' => $flag['help'],
                ...Flags::rule($key),
            ])->values(),
            'roles' => Role::query()->orderBy('id')->get()->map(fn (Role $r) => ['name' => $r->name, 'label' => $r->displayName()]),
        ]);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        abort_unless(isset(Flags::ALL[$key]), 404);
        $data = $request->validate([
            'audience' => ['required', Rule::in(['all', 'roles', 'none'])],
            'roles' => ['required_if:audience,roles', 'array'],
            'roles.*' => ['string', Rule::exists('auth_roles', 'name')],
            'users' => ['present', 'array', 'max:50'],
            'users.*' => ['string', Rule::exists('auth_users', 'username')],
        ], [
            'roles.required_if' => 'Pilih paling sedikit satu peran.',
            'users.*.exists' => 'Username :input tidak ada.',
        ]);

        /** @var User $actor */
        $actor = $request->user();
        $before = Flags::rule($key);
        DB::table('cfg_feature_flags')->updateOrInsert(['key' => $key], [
            'audience' => $data['audience'],
            'roles' => json_encode($data['audience'] === 'roles' ? array_values($data['roles']) : []),
            'users' => json_encode(array_values(array_unique($data['users']))),
            'updated_by' => $actor->id,
            'updated_at' => now(),
            'created_at' => now(),
        ]);
        Feature::flushCache();
        activity('setting')->causedBy($actor)->event('updated')
            ->withProperties(['key' => "feature:{$key}", 'old' => $before['audience'], 'new' => $data['audience']])
            ->log('Fitur bertahap: '.Flags::ALL[$key]['label']);

        return response()->json(['data' => ['key' => $key, ...Flags::rule($key)]]);
    }
}
