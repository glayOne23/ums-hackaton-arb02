<?php

namespace App\Modules\Akses\Http\Resources;

use App\Models\User;
use App\Modules\Akses\Izin;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class PenggunaResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $peran = $this->getRoleNames()->values();

        return [
            'id' => $this->id,
            'nama' => $this->name,
            'username' => $this->username,
            'no_hp' => $this->no_hp,
            'peran' => $peran,
            'izin' => $this->getAllPermissions()->pluck('name')->sort()->values(),
            // Frontend memakai ini untuk membuka area yang tepat setelah masuk
            'area' => $peran->intersect(Izin::PERAN_LAPANGAN)->isNotEmpty() ? 'lapangan' : 'kantor',
        ];
    }
}
