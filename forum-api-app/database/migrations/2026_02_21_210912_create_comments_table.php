<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->id();


            $table->foreignId('user_id')
                ->index()
                ->constrained()
                ->cascadeOnDelete();  // delete user => delete his comments


            $table->foreignId('post_id')
                ->index()
                ->constrained()
                ->cascadeOnDelete();  // delete post => delete comments under it


            $table->text('body');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
