<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ReactionController;
use App\Http\Controllers\UtmVisitController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    /*
    |----------------------------------------------------------------------
    | AUTH
    |----------------------------------------------------------------------
    */
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register'])
            ->middleware('throttle:register');                              // 5/min by IP

        Route::post('/login', [AuthController::class, 'login'])
            ->middleware('throttle:login');                                 // 30/min by IP

        // chráněné (token musí být poslaný)
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout'])
                ->middleware('throttle:writes');                            // 20/min
            Route::get('/me', [AuthController::class, 'me'])
                ->middleware('throttle:reads');                             // 60/min
        });
    });

    /*
    |----------------------------------------------------------------------
    | POSTS
    |----------------------------------------------------------------------
    */

    // veřejné čtení
    Route::middleware('throttle:reads')->group(function () {                // 60/min
        Route::get('/posts', [PostController::class, 'index']);
        Route::get('/posts/{post}', [PostController::class, 'show']);
    });

    // chráněný zápis
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/posts', [PostController::class, 'store'])
            ->middleware('throttle:writes');                                // 20/min
        Route::put('/posts/{post}', [PostController::class, 'update'])
            ->middleware('throttle:writes');                                // 20/min
        Route::delete('/posts/{post}', [PostController::class, 'destroy'])
            ->middleware('throttle:deletes');                               // 40/min
    });

    /*
    |----------------------------------------------------------------------
    | COMMENTS
    |----------------------------------------------------------------------
    */

    // veřejné čtení komentářů k postu
    Route::get('/posts/{post}/comments', [CommentController::class, 'index'])
        ->middleware('throttle:reads');                                     // 60/min

    // chráněný zápis/edit/smazání
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/posts/{post}/comments', [CommentController::class, 'store'])
            ->middleware('throttle:writes');                                // 20/min
        Route::put('/comments/{comment}', [CommentController::class, 'update'])
            ->middleware('throttle:writes');                                // 20/min
        Route::delete('/comments/{comment}', [CommentController::class, 'destroy'])
            ->middleware('throttle:deletes');                               // 40/min
    });

    /*
    |----------------------------------------------------------------------
    | REACTIONS
    |----------------------------------------------------------------------
    */

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/posts/{post}/reactions', [ReactionController::class, 'storeForPost'])
            ->middleware('throttle:writes');                                // 20/min
        Route::post('/comments/{comment}/reactions', [ReactionController::class, 'storeForComment'])
            ->middleware('throttle:writes');                                // 20/min
    });

    /*
    |----------------------------------------------------------------------
    | UTM TRACKING
    |----------------------------------------------------------------------
    */

    // public – no auth required
    Route::post('/track', [UtmVisitController::class, 'track'])
        ->middleware('throttle:writes');                                    // 20/min

    // protected – analytics dashboard
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/analytics/utm', [UtmVisitController::class, 'stats'])
            ->middleware('throttle:reads');                                 // 60/min
    });

    /*
    |----------------------------------------------------------------------
    | ADMIN
    |----------------------------------------------------------------------
    */

    Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
        Route::delete('/users/{user}', [AdminController::class, 'destroyUser'])
            ->middleware('throttle:deletes');                               // 40/min
        Route::delete('/posts/{post}', [AdminController::class, 'destroyPost'])
            ->middleware('throttle:deletes');                               // 40/min
        Route::delete('/comments/{comment}', [AdminController::class, 'destroyComment'])
            ->middleware('throttle:deletes');                               // 40/min
    });

});
