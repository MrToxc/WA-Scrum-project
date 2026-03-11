<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
#CHATGPT code start
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => \App\Http\Middleware\IsAdmin::class,
        ]);

        // Strip HTML tagů ze všech API vstupů
        $middleware->api(append: [
            \App\Http\Middleware\StripTags::class,
        ]);

        // API nemá login stránku — bez tohoto Sanctum hledá route('login') a spadne
        $middleware->redirectGuestsTo(function ($request) {
            if ($request->is('api/*')) {
                return null; // nevracet redirect, vyhodit AuthenticationException
            }
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // všechny API chyby vracejí JSON místo HTML
        $exceptions->shouldRenderJsonWhen(function ($request) {
            return $request->is('api/*') || $request->expectsJson();
        });
    })->create();
#CHATGPT code end
