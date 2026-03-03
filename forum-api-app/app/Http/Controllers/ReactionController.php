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
        $data = $request->validate([
            'type' => ['required', 'in:upvote,downvote'],
        ]);
    
        $user = $request->user();
    
        // najdi existující reakci tohohle usera na TENHLE konkrétní objekt (včetně type)
        $existingSameType = $reactable->reactions()
            ->where('user_id', $user->id)
            ->where('type', $data['type'])
            ->first();
    
        // když už existuje stejný typ -> toggle OFF (smazat)
        if ($existingSameType) {
            $existingSameType->delete();
            return response()->json(['type' => null]);
        }
    
        // smaž případnou opačnou reakci (upvote vs downvote), ať je max 1
        $reactable->reactions()
            ->where('user_id', $user->id)
            ->delete();
    
        // vytvoř novou reakci (teď už nemůže nastat duplicate)
        $reactable->reactions()->create([
            'user_id' => $user->id,
            'type' => $data['type'],
        ]);
    
        return response()->json(['type' => $data['type']]);
    }
}
