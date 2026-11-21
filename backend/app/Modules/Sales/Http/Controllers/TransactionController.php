<?php

namespace App\Modules\Sales\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Sales\Actions\RecordTransaction;
use App\Modules\Sales\Enums\TransactionType;
use App\Modules\Sales\Http\Requests\RecordTransactionRequest;
use App\Modules\Sales\Http\Resources\TransactionResource;
use App\Modules\Sales\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TransactionController extends Controller
{
    private const RELATIONS = ['items', 'outlet', 'salesUser', 'invoice', 'payments'];

    /** Form photos are private: shown only through this API, never by a public URL */
    private const PHOTO_DISK = 'local';

    /**
     * Office list (visit.view: everyone's) or the sales' own history.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
            'sales_user_id' => ['nullable', 'integer'],
            'outlet_id' => ['nullable', 'string'],
            'type' => ['nullable', Rule::enum(TransactionType::class)],
            'needs_review' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $query = Transaction::query()->with(self::RELATIONS)->latest('transacted_at');

        if (! $user->can('visit.view')) {
            abort_unless($user->can('visit.create'), 403);
            $query->where('sales_user_id', $user->id);
        } elseif (isset($filters['sales_user_id'])) {
            $query->where('sales_user_id', $filters['sales_user_id']);
        }

        $query
            ->when($filters['from'] ?? null, fn ($q, $from) => $q->where('transacted_at', '>=', now()->parse($from)->startOfDay()))
            ->when($filters['to'] ?? null, fn ($q, $to) => $q->where('transacted_at', '<=', now()->parse($to)->endOfDay()))
            ->when($filters['outlet_id'] ?? null, fn ($q, $outletId) => $q->where('outlet_id', $outletId))
            ->when($filters['type'] ?? null, fn ($q, $type) => $q->where('type', $type))
            ->when($request->boolean('needs_review'), fn ($q) => $q->where('needs_review', true)->where('status', 'active'));

        return TransactionResource::collection($query->paginate($filters['per_page'] ?? 25));
    }

    /**
     * KS-11: idempotent. 201 when saved now, 200 when this client_uuid was
     * already saved (the phone sent it again after losing the answer).
     */
    public function store(RecordTransactionRequest $request, RecordTransaction $record): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        /** @var array{client_uuid: string, type: string, outlet_id: string, transacted_at: string, items: list<array{product_id: string}>, payment?: array{amount?: int|float|string|null, method?: ?string}} $data */
        $data = $request->validated();
        [$transaction, $created] = $record->handle($data, $user);

        return (new TransactionResource($transaction->load(self::RELATIONS)))
            ->response()
            ->setStatusCode($created ? 201 : 200);
    }

    public function show(Request $request, Transaction $transaction): TransactionResource
    {
        $this->authorizeView($request, $transaction);

        return new TransactionResource($transaction->load([
            ...self::RELATIONS, 'corrects', 'replacement', 'voider', 'reviewer',
            'corrections.requester', 'corrections.decider', 'corrections.outlet',
        ]));
    }

    /** KS-10: photo of the stamped visit form, compressed on the phone (≤ 200 KB). */
    public function storePhoto(Request $request, Transaction $transaction): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        abort_unless($transaction->sales_user_id === $user->id, 403);

        $request->validate(
            ['photo' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:1024']],
            [
                'photo.required' => 'Ambil foto form dulu.',
                'photo.image' => 'File harus berupa foto.',
                'photo.max' => 'Foto terlalu besar (maksimal 1 MB).',
            ],
        );

        $old = $transaction->form_photo_path;
        $path = $request->file('photo')?->store(
            'sales/forms/'.$transaction->transacted_at->format('Y/m'),
            self::PHOTO_DISK,
        );
        $transaction->forceFill(['form_photo_path' => $path])->save();
        if ($old && $old !== $path) {
            Storage::disk(self::PHOTO_DISK)->delete($old);
        }

        return response()->json(['data' => ['has_photo' => true]]);
    }

    public function photo(Request $request, Transaction $transaction): StreamedResponse
    {
        $this->authorizeView($request, $transaction);
        abort_if($transaction->form_photo_path === null, 404);

        return Storage::disk(self::PHOTO_DISK)->response($transaction->form_photo_path);
    }

    private function authorizeView(Request $request, Transaction $transaction): void
    {
        /** @var User $user */
        $user = $request->user();
        abort_unless($user->can('visit.view') || $transaction->sales_user_id === $user->id, 403);
    }
}
