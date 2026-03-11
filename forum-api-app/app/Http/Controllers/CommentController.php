<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Post;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    /**
     * Display a listing of the resource.
     * CHATGPT code start
     */
    public function index(Post $post, Request $request)
    {
        $perPage = $request->query('per_page', 10);

        // bezpečný rozsah
        $perPage = max(10, min(50, (int) $perPage));

        $query = $post->comments()
            ->with(['user:id,username'])
            ->withCount([
                'reactions as upvotes_count' => fn($q) => $q->where('type', 'upvote'),
                'reactions as downvotes_count' => fn($q) => $q->where('type', 'downvote'),
            ])
            ->orderBy('created_at', 'desc');

        // if authenticated, eager-load only this user's reaction
        if ($user = $request->user()) {
            $query->with([
                'reactions' => fn($q) =>
                    $q->where('user_id', $user->id)
                        ->select('id', 'reactable_id', 'reactable_type', 'type')
            ]);
        }

        $paginator = $query->paginate($perPage);

        // map user_reaction onto each comment
        $items = collect($paginator->items())->map(function ($comment) use ($request) {
            $comment->user_reaction = $request->user()
                ? ($comment->reactions->first()?->type)
                : null;
            unset($comment->reactions);
            return $comment;
        });
        // CHATGPT code end
        return response()->json([
            'data' => $items,
            'meta' => [
                'page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
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
        // CHATGPT code start
        $comment->loadCount([
            'reactions as upvotes_count' => fn($q) => $q->where('type', 'upvote'),
            'reactions as downvotes_count' => fn($q) => $q->where('type', 'downvote'),
        ]);
        $comment->user_reaction = null; // new comment, no reactions yet
        // CHATGPT code end

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
        // CHATGPT code start
        $comment->load('user:id,username');
        $comment->loadCount([
            'reactions as upvotes_count' => fn($q) => $q->where('type', 'upvote'),
            'reactions as downvotes_count' => fn($q) => $q->where('type', 'downvote'),
        ]);

        // include authenticated user's own reaction
        $userReaction = $comment->reactions()
            ->where('user_id', $request->user()->id)
            ->first();
        $comment->user_reaction = $userReaction?->type;
        // CHATGPT code end
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
