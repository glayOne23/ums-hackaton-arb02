<?php

namespace App\Modules\Product\Contracts;

use App\Models\User;
use App\Modules\Product\Models\Product;

/**
 * One module's part of merging a duplicate product into the one that is kept
 * (KR-08). Each module moves its own rows. Tagged with self::TAG
 * (AppServiceProvider).
 */
interface ProductMergeStep
{
    public const TAG = 'product.merge';

    /** What moves, in words for the confirmation, or null when nothing. */
    public function summary(Product $from): ?string;

    /** Why these two cannot be merged, or null. */
    public function blockingReason(Product $from, Product $into): ?string;

    /** Move everything of $from to $into. Runs inside the merge's DB transaction. */
    public function move(Product $from, Product $into, User $actor): void;
}
