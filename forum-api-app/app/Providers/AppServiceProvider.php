<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     * tohle mi udelal taky chat
     */
    public function boot(): void
    {
        Relation::enforceMorphMap([
            'Post' => \App\Models\Post::class,
            'Comment' => \App\Models\Comment::class,
        ]);
    }
}
