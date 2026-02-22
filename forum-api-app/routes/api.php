<?php

use App\Http\Controllers\CommentController;
use App\Http\Controllers\PostController;
use Illuminate\Http\Request;
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
    |--------------------------------------------------------------------------
    | POSTS
    |--------------------------------------------------------------------------
    */

    // List posts (paginace + per_page)
    Route::get('/posts', [PostController::class, 'index']);

    // Detail postu + komentáře
    Route::get('/posts/{post}', [PostController::class, 'show']);

    // Vytvořit post
    Route::post('/posts', [PostController::class, 'store']);

    // Upravit post
    Route::put('/posts/{post}', [PostController::class, 'update']);

    // Smazat post
    Route::delete('/posts/{post}', [PostController::class, 'destroy']);


    /*
    |--------------------------------------------------------------------------
    | COMMENTS
    |--------------------------------------------------------------------------
    */

    // Vytvořit komentář k postu
    Route::post('/posts/{post}/comments', [CommentController::class, 'store']);

    // komentare k postu
    Route::get('/posts/{post}/comments', [CommentController::class, 'index']);

    // Upravit komentář
    Route::put('/comments/{comment}', [CommentController::class, 'update']);

    // Smazat komentář
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);
});
