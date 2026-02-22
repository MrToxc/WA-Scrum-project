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
            ->with(['user:id,username'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $comments]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Post $post, Request $request)
    {
        $fields = $request->validate([
            'body' => 'required|string|min:2|max:2000',
        ]);

        $comment = $post->comments()->make([
            'body' => $fields['body'],
        ]);

        $comment->user()->associate($request->user()); // nastaví user_id bezpečně
        $comment->save();

        $comment->load('user:id,username');

        return response()->json(['data' => $comment], 201);
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
        if ($comment->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $fields = $request->validate([
            'body' => 'required|string|min:2|max:2000',
        ]);

        $comment->update($fields);

        $comment->load('user:id,username');

        return response()->json(['data' => $comment]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Comment $comment)
    {
        if ($comment->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $comment->delete();

        return response()->noContent();
    }
}
