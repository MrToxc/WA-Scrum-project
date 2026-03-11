<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;

class AdminController extends Controller
{
    /**
     * DELETE /api/v1/admin/users/{user}
     * Admin only — deletes a user and all their data.
     */
    public function destroyUser(User $user)
    {
        $user->delete();

        return response()->noContent();
    }

    /**
     * DELETE /api/v1/admin/posts/{post}
     * Admin only — deletes any post.
     */
    public function destroyPost(Post $post)
    {
        $post->delete();

        return response()->noContent();
    }

    /**
     * DELETE /api/v1/admin/comments/{comment}
     * Admin only — deletes any comment.
     */
    public function destroyComment(Comment $comment)
    {
        $comment->delete();

        return response()->noContent();
    }
}
