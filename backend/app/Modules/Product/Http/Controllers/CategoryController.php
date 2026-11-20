<?php

namespace App\Modules\Product\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Product\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Product categories (PG-05): admins add or deactivate them; never deleted. */
class CategoryController extends Controller
{
    /** Active only unless ?status=all. */
    public function index(Request $request): JsonResponse
    {
        $categories = Category::query()
            ->when($request->string('status')->toString() !== 'all', fn ($query) => $query->where('is_active', true))
            ->orderBy('name')
            ->get(['id', 'name', 'is_active']);

        return response()->json(['data' => $categories]);
    }

    public function store(Request $request): JsonResponse
    {
        $category = Category::query()->create($this->validated($request));

        return response()->json(['data' => $category->only(['id', 'name', 'is_active'])], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $category->update($this->validated($request, $category));

        return response()->json(['data' => $category->only(['id', 'name', 'is_active'])]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Category $category = null): array
    {
        return $request->validate([
            'name' => [$category ? 'sometimes' : 'required', 'string', 'max:100', Rule::unique('prd_categories', 'name')->ignore($category?->getKey())],
            'is_active' => ['sometimes', 'boolean'],
        ], [
            'name.required' => 'Nama kategori wajib diisi.',
            'name.max' => 'Nama kategori terlalu panjang (maks. 100 huruf).',
            'name.unique' => 'Kategori ini sudah ada.',
        ]);
    }
}
