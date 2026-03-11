<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ReactionController;
use App\Http\Controllers\UtmVisitController;
use Illuminate\Support\Facades\Route;

//Route::get('/user', function (Request $request) {
//    return $request->user();
//})->middleware('auth:sanctum');


/*
|--------------------------------------------------------------------------
| API Routes (Development version – without auth)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    /*
    |----------------------------------------------------------------------
    | AUTH
    |----------------------------------------------------------------------
    */
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']); // POST /api/v1/auth/register
        Route::post('/login', [AuthController::class, 'login']);    // POST /api/v1/auth/login

        // chráněné (token musí být poslaný)
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']); // POST /api/v1/auth/logout
            Route::get('/me', [AuthController::class, 'me']);     // GET  /api/v1/auth/me
        });
    });

    /*
    |----------------------------------------------------------------------
    | POSTS
    |----------------------------------------------------------------------
    */

    // veřejné čtení
    Route::get('/posts', [PostController::class, 'index']);
    Route::get('/posts/{post}', [PostController::class, 'show']);

    // doporučeně chránit zápis (pokud chceš veřejný zápis, middleware smaž)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/posts', [PostController::class, 'store']);
        Route::put('/posts/{post}', [PostController::class, 'update']);
        Route::delete('/posts/{post}', [PostController::class, 'destroy']);
    });

    /*
    |----------------------------------------------------------------------
    | COMMENTS
    |----------------------------------------------------------------------
    */

    // veřejné čtení komentářů k postu
    Route::get('/posts/{post}/comments', [CommentController::class, 'index']);

    // doporučeně chránit zápis/edit/smazání
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/posts/{post}/comments', [CommentController::class, 'store']);
        Route::put('/comments/{comment}', [CommentController::class, 'update']);
        Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);
    });

    /*
    |----------------------------------------------------------------------
    | REACTIONS
    |----------------------------------------------------------------------
    */

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/posts/{post}/reactions', [ReactionController::class, 'storeForPost']);       // POST /api/v1/posts/{id}/reactions
        Route::post('/comments/{comment}/reactions', [ReactionController::class, 'storeForComment']); // POST /api/v1/comments/{id}/reactions
    });

    /*
    |----------------------------------------------------------------------
    | UTM TRACKING
    |----------------------------------------------------------------------
    */

    // public – no auth required
    Route::post('/track', [UtmVisitController::class, 'track']);              // POST /api/v1/track

    // protected – analytics dashboard
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/analytics/utm', [UtmVisitController::class, 'stats']);   // GET  /api/v1/analytics/utm
    });

    /*
    |----------------------------------------------------------------------
    | ADMIN
    |----------------------------------------------------------------------
    */

    Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
        Route::delete('/users/{user}', [AdminController::class, 'destroyUser']);       // DELETE /api/v1/admin/users/{id}
        Route::delete('/posts/{post}', [AdminController::class, 'destroyPost']);       // DELETE /api/v1/admin/posts/{id}
        Route::delete('/comments/{comment}', [AdminController::class, 'destroyComment']); // DELETE /api/v1/admin/comments/{id}
    });

});
