<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\PostController;
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
        Route::post('/login',    [AuthController::class, 'login']);    // POST /api/v1/auth/login

        // chráněné (token musí být poslaný)
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']); // POST /api/v1/auth/logout
            Route::get('/me',      [AuthController::class, 'me']);     // GET  /api/v1/auth/me
        });
    });

    /*
    |----------------------------------------------------------------------
    | POSTS
    |----------------------------------------------------------------------
    */

    // veřejné čtení
    Route::get('/posts',        [PostController::class, 'index']);
    Route::get('/posts/{post}', [PostController::class, 'show']);

    // doporučeně chránit zápis (pokud chceš veřejný zápis, middleware smaž)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/posts',        [PostController::class, 'store']);
        Route::put('/posts/{post}',  [PostController::class, 'update']);
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
        Route::put('/comments/{comment}',     [CommentController::class, 'update']);
        Route::delete('/comments/{comment}',  [CommentController::class, 'destroy']);
    });

});
