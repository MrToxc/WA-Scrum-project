<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Post;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Post $post, Request $request)
    {
        $comments = $post->comments()
            ->orderBy('created_at', 'desc')
            ->get();

        return ['data' => $comments];
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Post $post, Request $request)
    {
        $fields = $request->validate([
            'body' => 'required|min:2|max:1000',
        ]);

        $comment = $post->comments()->create($fields);

        return response()->json([
            'data' => $comment
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Comment $comment)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Comment $comment)
    {
        $fields = $request->validate([
            'body' => 'required|min:2|max:1000',
        ]);

        $comment->update($fields);

        return ['data' => $comment];
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Comment $comment)
    {
        $comment->delete();

        return response()->noContent();
    }
}
