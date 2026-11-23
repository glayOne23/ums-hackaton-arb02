<?php

namespace App\Modules\Product\Http\Requests;

use App\Modules\Product\Models\Product;
use App\Modules\Setting\CustomFields;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Add (POST) or change (PATCH) a product. Permission is checked by the route (product.manage). */
class SaveProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $this->merge(['code' => mb_strtoupper(trim((string) $this->input('code')))]);
        }
        if ($this->exists('min_stock_qty') && $this->input('min_stock_qty') === null) {
            $this->merge(['min_stock_qty' => 0]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Product|null $product */
        $product = $this->route('product');
        $required = $this->isMethod('patch') ? 'sometimes' : 'required';

        $aliasUnique = Rule::unique('prd_product_aliases', 'alias');
        if ($product) {
            $aliasUnique->where(fn ($query) => $query->where('product_id', '!=', $product->getKey()));
        }

        return [
            // Unique among deleted products too, so a code always points to one product
            'code' => [$required, 'string', 'max:30', 'regex:/^[A-Z0-9._-]+$/', Rule::unique('prd_products', 'code')->ignore($product?->getKey())],
            'name' => [$required, 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'category_id' => [$required, 'string', Rule::exists('prd_categories', 'id')],
            'bpom_number' => [$required, 'string', 'max:50'],
            'unit' => [$required, 'string', 'max:20'],
            'selling_price' => [$required, 'numeric', 'min:0', 'max:999999999', 'decimal:0,2'],
            'min_stock_qty' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'is_active' => ['sometimes', 'boolean'],
            'aliases' => ['sometimes', 'array', 'max:20'],
            'aliases.*' => ['string', 'max:150', 'distinct:ignore_case', $aliasUnique],
            // FP-06: the admin's extra fields
            ...CustomFields::rules('product'),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...CustomFields::messages('product'),
            'code.required' => 'Kode produk wajib diisi, misalnya MDK02.',
            'code.regex' => 'Kode hanya boleh huruf, angka, titik, garis bawah, atau tanda minus, tanpa spasi.',
            'code.unique' => 'Kode ini sudah dipakai produk lain (termasuk produk di tempat sampah).',
            'code.max' => 'Kode terlalu panjang (maks. 30 huruf).',
            'name.required' => 'Nama produk wajib diisi.',
            'name.max' => 'Nama produk terlalu panjang (maks. 150 huruf).',
            'description.max' => 'Deskripsi terlalu panjang (maks. 2.000 huruf).',
            'category_id.required' => 'Kategori wajib dipilih.',
            'category_id.exists' => 'Kategori tidak ada. Pilih dari daftar.',
            'bpom_number.required' => 'Nomor BPOM wajib diisi.',
            'bpom_number.max' => 'Nomor BPOM terlalu panjang (maks. 50 huruf).',
            'unit.required' => 'Satuan wajib diisi, misalnya pcs atau botol.',
            'selling_price.required' => 'Harga jual wajib diisi.',
            'selling_price.numeric' => 'Harga jual harus berupa angka.',
            'selling_price.min' => 'Harga jual tidak boleh minus.',
            'selling_price.decimal' => 'Harga jual paling banyak 2 angka di belakang koma.',
            'min_stock_qty.integer' => 'Stok minimum harus berupa angka bulat.',
            'min_stock_qty.min' => 'Stok minimum tidak boleh minus.',
            'aliases.max' => 'Paling banyak 20 nama lain.',
            'aliases.*.distinct' => 'Nama lain ini ditulis dua kali.',
            'aliases.*.unique' => 'Nama lain ini sudah dipakai produk lain.',
            'aliases.*.max' => 'Nama lain terlalu panjang (maks. 150 huruf).',
        ];
    }
}
