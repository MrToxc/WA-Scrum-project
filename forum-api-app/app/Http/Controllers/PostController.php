<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;

class PostController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {

        $perPage = $request->query('per_page', 10);

        // bezpečný rozsah
        $perPage = max(10, min(50, (int) $perPage));
        // CHATGPT code start
        $query = Post::query()
            // načteme autora (username)
            ->with(['user:id,username'])
            // počet komentářů
            ->withCount('comments')
            // reaction counts
            ->withCount([
                'reactions as upvotes_count' => fn($q) => $q->where('type', 'upvote'),
                'reactions as downvotes_count' => fn($q) => $q->where('type', 'downvote'),
            ])
            ->orderByDesc('created_at');

        // if authenticated, eager-load only this user's reaction
        if ($user = $request->user()) {
            $query->with([
                'reactions' => fn($q) =>
                    $q->where('user_id', $user->id)
                        ->select('id', 'reactable_id', 'reactable_type', 'type')
            ]);
        }

        $paginator = $query->paginate($perPage);

        // map user_reaction onto each post
        $items = collect($paginator->items())->map(function ($post) use ($request) {
            $post->user_reaction = $request->user()
                ? ($post->reactions->first()?->type)
                : null;
            unset($post->reactions); // don't expose the raw relation
            return $post;
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

    public function store(Request $request)
    {
        /**
         * DŮLEŽITÉ:
         * Route je chráněná auth:sanctum, takže $request->user() existuje.
         * Každý post musí mít autora => user_id je NOT NULL.
         */
        $fields = $request->validate([
            'title' => 'required|string|min:5|max:255',
            'body' => 'required|string|min:5|max:8191',
        ]);


        $post = $request->user()->posts()->create($fields);

        // vrátíme i autora + comments_count, ať má frontend hned kompletní data
        // CHATGPT code start
        $post->load('user:id,username')->loadCount('comments');
        $post->loadCount([
            'reactions as upvotes_count' => fn($q) => $q->where('type', 'upvote'),
            'reactions as downvotes_count' => fn($q) => $q->where('type', 'downvote'),
        ]);
        $post->user_reaction = null; // new post, no reactions yet
        // CHATGPT code end
        return response()->json(['data' => $post], 201);
    }

    public function show(Request $request, Post $post)
    {
        /**
         * Post detail bez komentářů (komentáře jsou zvlášť endpoint),
         * ale přidáme autora a počet komentářů.
         */
        // CHATGPT code start
        $post->load('user:id,username')->loadCount('comments');
        $post->loadCount([
            'reactions as upvotes_count' => fn($q) => $q->where('type', 'upvote'),
            'reactions as downvotes_count' => fn($q) => $q->where('type', 'downvote'),
        ]);


        // authenticated user's own reaction
        if ($user = $request->user()) {
            $userReaction = $post->reactions()
                ->where('user_id', $user->id)
                ->first();
            $post->user_reaction = $userReaction?->type;
        } else {
            $post->user_reaction = null;
        }
        // CHATGPT code end
        return response()->json(['data' => $post]);
    }

    public function update(Request $request, Post $post)
    {
        /**
         * AUTORIZACE:
         * Jen autor může upravit svůj post.
         */
        if ($post->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $fields = $request->validate([
            'title' => 'required|string|min:5|max:255',
            'body' => 'required|string|min:5|max:8191',
        ]);

        $post->update($fields);

        // CHATGPT code start
        $post->load('user:id,username')->loadCount('comments');
        $post->loadCount([
            'reactions as upvotes_count' => fn($q) => $q->where('type', 'upvote'),
            'reactions as downvotes_count' => fn($q) => $q->where('type', 'downvote'),
        ]);
        // CHATGPT code end

        // include authenticated user's own reaction
        $userReaction = $post->reactions()
            ->where('user_id', $request->user()->id)
            ->first();
        $post->user_reaction = $userReaction?->type;

        return response()->json(['data' => $post]);
    }

    public function destroy(Request $request, Post $post)
    {
        /**
         * AUTORIZACE:
         * Jen autor může smazat svůj post.
         */
        if ($post->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        /**
         * Díky migraci:
         * comments.post_id má cascadeOnDelete(),
         * takže smazání postu automaticky smaže i jeho komentáře.
         * Reactions are cascade-deleted via Post::booted().
         */
        $post->delete();

        return response()->noContent();
    }


}
