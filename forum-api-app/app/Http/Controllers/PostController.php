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
        //Získat per_page z query (?per_page=...)
        $perPage = $request->query('per_page', 10);

        //Omezit rozsah 10–50
        $perPage = max(10, min(50, (int) $perPage));

        $paginator = Post::orderBy('created_at', 'desc')
            ->withCount('comments')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ]
        ]);

    }



    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $fields = $request->validate([
            'title' => 'required|max:255|min:5',
            'body' => 'required|min:5',
        ]);
        $post = Post::create($fields);
        return response()->json(['data' => $post], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Post $post)
    {
        //Po dodelani referencni integrity
        $post->load(['comments' => function ($q) {
            $q->orderBy('created_at', 'asc'); // nebo desc
        }]);
        return ['data' => $post];
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Post $post)
    {
        $fields = $request->validate([
            'title' => 'required|max:255|min:5',
            'body' => 'required|min:5',
        ]);
        $post->update($fields);
        return ['data' => $post];
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Post $post)
    {
        $post->delete();
        return response()->noContent();
    }


}
