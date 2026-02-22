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

        $paginator = Post::query()
            // načteme autora (username)
            ->with(['user:id,username'])
            // počet komentářů
            ->withCount('comments')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
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
            'body'  => 'required|string|min:5|max:8191',
        ]);


        $post = $request->user()->posts()->create($fields);
        #$post = Post::create([
        #    ...$fields,
        #    'user_id' => $request->user()->id, // autor = přihlášený user
        #]);

        // vrátíme i autora + comments_count, ať má frontend hned kompletní data
        $post->load('user:id,username')->loadCount('comments');

        return response()->json(['data' => $post], 201);
    }

    public function show(Post $post)
    {
        /**
         * Post detail bez komentářů (komentáře jsou zvlášť endpoint),
         * ale přidáme autora a počet komentářů.
         */
        $post->load('user:id,username')->loadCount('comments');

        return response()->json(['data' => $post]);
    }

    public function update(Request $request, Post $post)
    {
        /**
         * AUTORIZACE:
         * Jen autor může upravit svůj post.
         * (Později se to dá přesunout do Policy, ale pro začátečníka je to OK takhle.)
         */
        if ($post->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $fields = $request->validate([
            'title' => 'required|string|min:5|max:255',
            'body'  => 'required|string|min:5|max:8191',
        ]);

        $post->update($fields);

        $post->load('user:id,username')->loadCount('comments');

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
         */
        $post->delete();

        return response()->noContent();
    }


}
