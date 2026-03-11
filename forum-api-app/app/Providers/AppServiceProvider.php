<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
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
            'User' => \App\Models\User::class,
        ]);

        /*
        |----------------------------------------------------------------------
        | Rate Limiters
        |----------------------------------------------------------------------
        */

        // Registrace: 5 pokusů za minutu (podle IP)
        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // Login: 30 pokusů za minutu (podle IP)
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        // Čtení (GET): 60 za minutu (podle user ID nebo IP)
        RateLimiter::for('reads', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        // Zápis (POST/PUT): 20 za minutu (podle user ID)
        RateLimiter::for('writes', function (Request $request) {
            return Limit::perMinute(20)->by($request->user()?->id ?: $request->ip());
        });

        // Mazání (DELETE): 40 za minutu (podle user ID)
        RateLimiter::for('deletes', function (Request $request) {
            return Limit::perMinute(40)->by($request->user()?->id ?: $request->ip());
        });
    }
}
