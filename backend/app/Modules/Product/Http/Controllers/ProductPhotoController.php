<?php

namespace App\Modules\Product\Http\Controllers;

use App\Core\History\History;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Product\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * PR-01: an optional photo per product, compressed on the device (≤ 300 KB).
 * Shown only through this API, like the form photos.
 */
class ProductPhotoController extends Controller
{
    private const DISK = 'local';

    public function show(Product $product): StreamedResponse
    {
        abort_if($product->photo_path === null, 404);

        return Storage::disk(self::DISK)->response($product->photo_path);
    }

    public function store(Request $request, Product $product): JsonResponse
    {
        $request->validate(
            ['photo' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:1024']],
            [
                'photo.required' => 'Pilih foto produk dulu.',
                'photo.image' => 'File harus berupa foto.',
                'photo.max' => 'Foto terlalu besar (maksimal 1 MB).',
            ],
        );

        $old = $product->photo_path;
        $path = $request->file('photo')?->store('products/photos', self::DISK);
        $product->forceFill(['photo_path' => $path])->save();
        if ($old && $old !== $path) {
            Storage::disk(self::DISK)->delete($old);
        }
        History::record($product, $old ? 'Mengganti foto produk' : 'Menambah foto produk', [], null, $this->actor($request));

        return response()->json(['data' => ['has_photo' => true, 'photo_version' => $product->updated_at?->getTimestamp()]]);
    }

    public function destroy(Request $request, Product $product): Response
    {
        if ($product->photo_path) {
            Storage::disk(self::DISK)->delete($product->photo_path);
            $product->forceFill(['photo_path' => null])->save();
            History::record($product, 'Menghapus foto produk', [], null, $this->actor($request));
        }

        return response()->noContent();
    }

    private function actor(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
