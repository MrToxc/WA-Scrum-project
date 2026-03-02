<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Post;
use App\Models\Reaction;
use Illuminate\Http\Request;

class ReactionController extends Controller
{
    /**
     * Toggle a reaction on a Post.
     */
    public function storeForPost(Post $post, Request $request)
    {
        return $this->toggleReaction($post, $request);
    }

    /**
     * Toggle a reaction on a Comment.
     */
    public function storeForComment(Comment $comment, Request $request)
    {
        return $this->toggleReaction($comment, $request);
    }

    /**
     * Shared toggle logic.
     *
     * - If no reaction exists      → create it (201)
     * - If same type already exists → remove it / un-react (200)
     * - If opposite type exists     → switch it (200)
     */
    private function toggleReaction($reactable, Request $request)
    {
        $fields = $request->validate([
            'type' => 'required|string|in:upvote,downvote',
        ]);

        $existing = $reactable->reactions()
            ->where('user_id', $request->user()->id)
            ->first();

        // same type already exists → un-react (toggle off)
        if ($existing && $existing->type === $fields['type']) {
            $existing->delete();
            return response()->json(['message' => 'Reaction removed.', 'data' => null]);
        }

        // opposite type exists → switch
        if ($existing) {
            $existing->update(['type' => $fields['type']]);
            return response()->json(['message' => 'Reaction updated.', 'data' => $existing]);
        }

        // no reaction → create
        $reaction = new Reaction([
            'type' => $fields['type'],
        ]);
        $reaction->user_id = $request->user()->id;
        $reaction->reactable_id = $reactable->id;
        $reaction->reactable_type = get_class($reactable);
        $reaction->save();

        return response()->json(['message' => 'Reaction created.', 'data' => $reaction], 201);
    }
}
