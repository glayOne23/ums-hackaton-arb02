<?php

namespace App\Modules\Import\Http\Controllers;

use App\Core\Models\ImportBatch;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Import\Actions\PreviewImport;
use App\Modules\Import\Actions\RevertImport;
use App\Modules\Import\Actions\RunImport;
use App\Modules\Import\Column;
use App\Modules\Import\Exports\TableExport;
use App\Modules\Import\Exports\TemplateExport;
use App\Modules\Import\ImportCatalog;
use App\Modules\Import\Types\ImportType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/** W10 — Impor Excel (IE-01, KR-14) and table exports (IE-02). */
class ImportController extends Controller
{
    public function __construct(private readonly ImportCatalog $catalog) {}

    /** The kinds of import, with their columns, and the latest sessions. */
    public function index(): JsonResponse
    {
        $batches = ImportBatch::query()->with(['creator', 'reverter'])->latest()->limit(50)->get();

        return response()->json([
            'types' => array_map(fn (ImportType $type) => [
                'key' => $type->key(),
                'title' => $type->title(),
                'description' => $type->description(),
                'columns' => array_map(fn (Column $c) => [
                    'key' => $c->key, 'label' => $c->label, 'required' => $c->required, 'help' => $c->help,
                ], $type->columns()),
            ], $this->catalog->all()),
            'batches' => $batches->map(fn (ImportBatch $batch) => [
                'id' => $batch->id,
                'type' => $batch->type,
                'type_title' => $this->catalog->find($batch->type)?->title() ?? $batch->type,
                'file_name' => $batch->file_name,
                'row_count' => $batch->row_count,
                'imported_count' => $batch->imported_count,
                'merged_count' => $batch->merged_count,
                'skipped_count' => $batch->skipped_count,
                'status' => $batch->status,
                'created_by' => $batch->creator?->name,
                'created_at' => $batch->created_at->toIso8601String(),
                'reverted_by' => $batch->reverter?->name,
                'reverted_at' => $batch->reverted_at?->toIso8601String(),
            ]),
        ]);
    }

    public function template(string $type): BinaryFileResponse
    {
        $importType = $this->type($type);

        return Excel::download(new TemplateExport($importType), "Template impor {$importType->title()}.xlsx");
    }

    public function preview(Request $request, string $type, PreviewImport $preview): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'max:10240', 'extensions:xlsx,xls,csv']], [
            'file.required' => 'Pilih file Excel dulu.',
            'file.max' => 'File terlalu besar (maks. 10 MB).',
            'file.extensions' => 'File harus Excel (.xlsx, .xls) atau CSV.',
            'file.*' => 'File tidak bisa dibaca. Pilih file Excel.',
        ]);

        return response()->json($preview->handle($this->type($type), $request->file('file'), $this->user($request)));
    }

    public function store(Request $request, string $type, RunImport $run): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'include_similar' => ['sometimes', 'array'],
            'include_similar.*' => ['integer'],
            // W10 [Gabung]: line => id of the existing record the row joins
            'merge' => ['sometimes', 'array'],
            'merge.*' => ['string'],
        ]);

        $merge = [];
        foreach ($data['merge'] ?? [] as $line => $id) {
            $merge[(int) $line] = (string) $id;
        }
        $batch = $run->handle($this->type($type), $data['token'], array_map('intval', $data['include_similar'] ?? []), $this->user($request), $merge);

        return response()->json(['data' => [
            'id' => $batch->id,
            'imported_count' => $batch->imported_count,
            'merged_count' => $batch->merged_count,
            'skipped_count' => $batch->skipped_count,
        ]], 201);
    }

    public function revert(Request $request, ImportBatch $batch, RevertImport $revert): JsonResponse
    {
        $revert->handle($this->type($batch->type), $batch, $this->user($request));

        return response()->json(['message' => 'Impor dibatalkan.']);
    }

    /** IE-02: the table in the same columns as its template. */
    public function export(Request $request, string $type): BinaryFileResponse
    {
        $importType = $this->type($type);
        abort_unless($this->user($request)->can($importType->exportPermission()), 403);
        $rows = $importType->exportRows();
        abort_if($rows === null, 404);

        return Excel::download(
            new TableExport($importType->title(), array_map(fn (Column $c) => $c->label, $importType->columns()), $rows),
            "SIGAP {$importType->title()} ".now()->format('Y-m-d').'.xlsx',
        );
    }

    private function type(string $key): ImportType
    {
        $type = $this->catalog->find($key);
        abort_if($type === null, 404, 'Jenis impor tidak dikenal.');

        return $type;
    }

    private function user(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
