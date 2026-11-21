<?php

namespace App\Modules\Setting\Http\Controllers;

use App\Core\Models\Activity;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Setting\Actions\SaveSettings;
use App\Modules\Setting\Models\SettingValue;
use App\Modules\Setting\Setting;
use App\Modules\Setting\SettingDefinitions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /** W8: every rule with its current value, grouped by section. */
    public function index(): JsonResponse
    {
        return response()->json($this->payload());
    }

    public function update(Request $request, SaveSettings $save): JsonResponse
    {
        $request->validate(['values' => ['required', 'array', 'min:1']], ['values.required' => 'Tidak ada yang diubah.']);

        /** @var User $user */
        $user = $request->user();
        $changed = $save->handle((array) $request->input('values'), $user);

        return response()->json([...$this->payload(), 'changed' => $changed]);
    }

    /** KR-10: who changed which rule, from what to what. */
    public function history(Request $request): JsonResponse
    {
        $rows = Activity::query()
            ->where('log_name', 'setting')
            ->with('causer')
            ->latest('id')
            ->limit(min(max($request->integer('limit', 50), 1), 200))
            ->get();

        return response()->json(['data' => $rows->map(fn (Activity $activity) => [
            'id' => $activity->id,
            'label' => $activity->description,
            'key' => $activity->properties['key'] ?? null,
            'old' => $activity->properties['old'] ?? null,
            'new' => $activity->properties['new'] ?? null,
            'by' => $activity->causer instanceof User ? $activity->causer->name : null,
            'at' => $activity->created_at?->toIso8601String(),
        ])]);
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        $last = SettingValue::query()->with('updater')->latest('updated_at')->first();

        $sections = [];
        foreach (SettingDefinitions::SECTIONS as $section => $title) {
            $items = [];
            foreach (SettingDefinitions::ALL as $key => $definition) {
                if ($definition['section'] !== $section) {
                    continue;
                }
                $items[] = [
                    'key' => $key,
                    'label' => $definition['label'],
                    'help' => $definition['help'] ?? null,
                    'type' => $definition['type'],
                    'value' => Setting::value($key),
                    'default' => $definition['default'],
                    'min' => $definition['min'] ?? null,
                    'max' => $definition['max'] ?? null,
                    'max_length' => $definition['max_length'] ?? null,
                    'suffix' => $definition['suffix'] ?? null,
                    'options' => isset($definition['options'])
                        ? collect($definition['options'])->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])->values()
                        : null,
                    'editable' => $definition['editable'] ?? true,
                ];
            }
            $sections[] = ['key' => $section, 'title' => $title, 'items' => $items];
        }

        return [
            'data' => $sections,
            'last_change' => $last ? ['by' => $last->updater?->name, 'at' => $last->updated_at->toIso8601String()] : null,
        ];
    }
}
