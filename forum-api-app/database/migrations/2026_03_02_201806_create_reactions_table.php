<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('reactions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->index()
                ->constrained()
                ->cascadeOnDelete();   // delete user => delete their reactions

            $table->morphs('reactable');            // reactable_id + reactable_type (indexed)
            $table->string('type');                  // 'upvote' | 'downvote'

            $table->unique(['user_id', 'reactable_id', 'reactable_type']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reactions');
    }
};
