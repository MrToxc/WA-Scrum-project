<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();


            $table->foreignId('user_id')
                ->index()            // index = rychlejší JOIN/filtry
                ->constrained()          // references id on users
                ->cascadeOnDelete();      // když se smaže user, smažou se jeho posty


            $table->string('title', 255);
            $table->text('body');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
