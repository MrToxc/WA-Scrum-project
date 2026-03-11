# Forum API – Full Endpoint Documentation

Base URL: `http://localhost:8000/api/v1`

All requests should include `Accept: application/json` header.
Authenticated endpoints require `Authorization: Bearer <TOKEN>` header.

---

## 1. Authentication

### How auth works

- Registration only requires a `username`. The server **generates** a strong password and returns it **once** — this is the only time the user sees the plaintext password.
- Login uses **only the password** (no username needed). The system finds the user by a hashed lookup of the password.
- Login invalidates all previous tokens — only **1 active token** at a time.
- Tokens are Laravel Sanctum bearer tokens. Send them via `Authorization: Bearer <TOKEN>` header.
- If a token is invalid or missing on a protected route, the API returns `401 Unauthorized`.

---

### POST /auth/register

Creates a new user account with an auto-generated password.

**Body:**
```json
{ "username": "tester1" }
```

**Validation rules:**
- `username`: required, string, min 3, max 50, alpha_dash (letters, numbers, dashes, underscores), must be unique

**201 Response:**
```json
{
  "username": "tester1",
  "password": "aB3$kL9mNp2xQr7wYz",
  "token": "1|abc123def456...",
  "is_admin": false
}
```

**Errors:**
- `422` — username is invalid, too short/long, or already taken

---

### POST /auth/login

Logs in using **only the password**. Deletes all previous tokens (only 1 active session).

**Body:**
```json
{ "password": "aB3$kL9mNp2xQr7wYz" }
```

**200 Response:**
```json
{
  "token": "2|xyz789ghi012...",
  "user": {
    "id": 1,
    "username": "tester1",
    "is_admin": false
  }
}
```

**Errors:**
- `422` — invalid password (no matching user found)

---

### POST /auth/logout ⟵ auth required

Deletes all tokens for the authenticated user (logs out everywhere).

**Header:** `Authorization: Bearer <TOKEN>`

**200 Response:**
```json
{ "message": "Logged out." }
```

---

### GET /auth/me ⟵ auth required

Returns the currently authenticated user's info.

**Header:** `Authorization: Bearer <TOKEN>`

**200 Response:**
```json
{
  "id": 1,
  "username": "tester1",
  "is_admin": false
}
```

**Errors:**
- `401` — token is missing or invalid

---

## 2. Posts

Reading is public. Creating, updating, and deleting require authentication.

Every post response includes:
- `user` object (author info: `id`, `username`)
- `comments_count` (integer)
- `upvotes_count` (integer) — total upvotes from all users
- `downvotes_count` (integer) — total downvotes from all users
- `user_reaction` (string|null) — the authenticated user's reaction: `"upvote"`, `"downvote"`, or `null` if not reacted. Always `null` when not authenticated.

---

### GET /posts

Returns a paginated list of all posts, newest first.

**Query params:**
- `page` (optional, default: 1) — which page of results to return
- `per_page` (optional, default: 10, min: 10, max: 50)

**200 Response:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "title": "My first post",
      "body": "Hello world!",
      "created_at": "2026-03-02T20:00:00.000000Z",
      "updated_at": "2026-03-02T20:00:00.000000Z",
      "user": { "id": 1, "username": "tester1" },
      "comments_count": 3,
      "upvotes_count": 5,
      "downvotes_count": 1,
      "user_reaction": "upvote"
    }
  ],
  "meta": {
    "page": 1,
    "last_page": 1,
    "per_page": 10,
    "total": 1
  }
}
```

**Note:** If the request includes a valid `Authorization: Bearer <TOKEN>` header, `user_reaction` will show the authenticated user's reaction. If no token is sent, `user_reaction` is always `null`. The endpoint works both ways — no auth required, but auth enhances the response.

---

### GET /posts/{post}

Returns a single post by ID.

**200 Response:**
```json
{
  "data": {
    "id": 1,
    "user_id": 1,
    "title": "My first post",
    "body": "Hello world!",
    "created_at": "2026-03-02T20:00:00.000000Z",
    "updated_at": "2026-03-02T20:00:00.000000Z",
    "user": { "id": 1, "username": "tester1" },
    "comments_count": 3,
    "upvotes_count": 5,
    "downvotes_count": 1,
    "user_reaction": "upvote"
  }
}
```

**Errors:**
- `404` — post does not exist

**Note:** Same `user_reaction` behavior as GET /posts — works with or without auth token.

---

### POST /posts ⟵ auth required

Creates a new post. The authenticated user becomes the author.

**Body:**
```json
{
  "title": "My first post",
  "body": "This is the post content..."
}
```

**Validation rules:**
- `title`: required, string, min 5, max 255
- `body`: required, string, min 5, max 8191

**201 Response:**
```json
{
  "data": {
    "id": 1,
    "user_id": 1,
    "title": "My first post",
    "body": "This is the post content...",
    "created_at": "2026-03-02T20:00:00.000000Z",
    "updated_at": "2026-03-02T20:00:00.000000Z",
    "user": { "id": 1, "username": "tester1" },
    "comments_count": 0,
    "upvotes_count": 0,
    "downvotes_count": 0,
    "user_reaction": null
  }
}
```

**Errors:**
- `401` — not authenticated
- `422` — validation failed (title/body too short, too long, or missing)

---

### PUT /posts/{post} ⟵ auth required, author only

Updates an existing post. Only the original author can edit.

**Body:**
```json
{
  "title": "Updated title",
  "body": "Updated body content..."
}
```

**Validation rules:** same as POST /posts

**200 Response:** same structure as POST /posts response, with updated data and current reaction counts/user_reaction.

**Errors:**
- `401` — not authenticated
- `403` — authenticated but not the author of this post
- `404` — post does not exist
- `422` — validation failed

---

### DELETE /posts/{post} ⟵ auth required, author only

Deletes a post. Only the original author can delete.

**204 No Content** — empty response body on success.

**Cascade behavior:**
- All comments under this post are automatically deleted (DB cascade).
- All reactions on this post are automatically deleted (model event).
- All reactions on the deleted comments are also automatically deleted (model event).

**Errors:**
- `401` — not authenticated
- `403` — authenticated but not the author

---

## 3. Comments

Reading is public. Creating, updating, and deleting require authentication.

Every comment response includes:
- `user` object (author info: `id`, `username`)
- `upvotes_count` (integer)
- `downvotes_count` (integer)
- `user_reaction` (string|null) — same behavior as posts

---

### GET /posts/{post}/comments

Returns a paginated list of comments for a specific post, newest first.

**Query params:**
- `page` (optional, default: 1) — which page of results to return
- `per_page` (optional, default: 10, min: 10, max: 50)

**200 Response:**
```json
{
  "data": [
    {
      "id": 10,
      "post_id": 1,
      "user_id": 2,
      "body": "Great post!",
      "created_at": "2026-03-02T21:00:00.000000Z",
      "updated_at": "2026-03-02T21:00:00.000000Z",
      "user": { "id": 2, "username": "tester2" },
      "upvotes_count": 4,
      "downvotes_count": 0,
      "user_reaction": "upvote"
    }
  ],
  "meta": {
    "page": 1,
    "last_page": 1,
    "per_page": 10,
    "total": 1
  }
}
```

**Errors:**
- `404` — post does not exist

**Note:** Same `user_reaction` behavior — works with or without auth token.

---

### POST /posts/{post}/comments ⟵ auth required

Creates a comment on a specific post. The authenticated user becomes the author.

**Body:**
```json
{ "body": "This is my comment" }
```

**Validation rules:**
- `body`: required, string, min 2, max 2000

**201 Response:**
```json
{
  "data": {
    "id": 10,
    "post_id": 1,
    "user_id": 2,
    "body": "This is my comment",
    "created_at": "2026-03-02T21:00:00.000000Z",
    "updated_at": "2026-03-02T21:00:00.000000Z",
    "user": { "id": 2, "username": "tester2" },
    "upvotes_count": 0,
    "downvotes_count": 0,
    "user_reaction": null
  }
}
```

**Errors:**
- `401` — not authenticated
- `404` — post does not exist
- `422` — validation failed

---

### PUT /comments/{comment} ⟵ auth required, author only

Updates an existing comment. Only the original author can edit.

**Body:**
```json
{ "body": "Updated comment text" }
```

**Validation rules:** same as POST comment

**200 Response:** same structure as POST comment response, with updated data and current reaction counts/user_reaction.

**Errors:**
- `401` — not authenticated
- `403` — authenticated but not the author of this comment
- `404` — comment does not exist
- `422` — validation failed

---

### DELETE /comments/{comment} ⟵ auth required, author only

Deletes a comment. Only the original author can delete.

**204 No Content** — empty response body on success.

**Cascade behavior:**
- All reactions on this comment are automatically deleted (model event).

**Errors:**
- `401` — not authenticated
- `403` — authenticated but not the author

---

## 4. Reactions (Upvote / Downvote)

Reactions are a **polymorphic** system — the same reaction mechanism works for both posts and comments. A user can have at most **one reaction per entity** (enforced by unique constraint on `user_id + reactable_id + reactable_type`).

All reaction endpoints require authentication.

### How reactions work — toggle behavior

The POST endpoint uses **toggle logic**:

1. **No existing reaction** → creates a new reaction → returns `201`
2. **Same type already exists** (e.g., you upvote something you already upvoted) → **removes** the reaction (un-react) → returns `200` with `"data": null`
3. **Opposite type exists** (e.g., you upvote something you downvoted) → **switches** the reaction → returns `200` with updated reaction data

This means the frontend only needs **one button action per type**. Example:
- User clicks upvote → POST with `"type": "upvote"` → reaction created
- User clicks upvote again → POST with `"type": "upvote"` → reaction removed (toggle off)
- User clicks downvote → POST with `"type": "downvote"` → reaction created
- User clicks upvote → POST with `"type": "upvote"` → reaction switches from downvote to upvote

### How to display reactions on the frontend

Every post and comment response already includes these fields:
- `upvotes_count` — total number of upvotes from all users
- `downvotes_count` — total number of downvotes from all users
- `user_reaction` — the logged-in user's own reaction: `"upvote"`, `"downvote"`, or `null`

**You do NOT need a separate GET request to fetch reactions.** They are embedded directly in post and comment responses. Just read `user_reaction` from the post/comment object to know the current user's state.

**Frontend rendering logic:**
- If `user_reaction === "upvote"` → highlight the upvote button
- If `user_reaction === "downvote"` → highlight the downvote button
- If `user_reaction === null` → no button highlighted (user hasn't reacted)
- Display `upvotes_count` and `downvotes_count` next to the buttons

**After a reaction POST, re-fetch the post/comment** (or the post list / comment list) to get the updated counts and `user_reaction`. Alternatively, update the UI optimistically:
- If response message is `"Reaction created."` → increment the count for that type, set `user_reaction`
- If response message is `"Reaction removed."` → decrement the count, set `user_reaction` to `null`
- If response message is `"Reaction updated."` → decrement old type count, increment new type count, update `user_reaction`

---

### POST /posts/{post}/reactions ⟵ auth required

Toggle a reaction on a post.

**Body:**
```json
{ "type": "upvote" }
```

**Validation rules:**
- `type`: required, string, must be exactly `"upvote"` or `"downvote"`

**201 Response (reaction created):**
```json
{
  "message": "Reaction created.",
  "data": {
    "id": 1,
    "user_id": 1,
    "reactable_id": 1,
    "reactable_type": "Post",
    "type": "upvote",
    "created_at": "2026-03-02T22:00:00.000000Z",
    "updated_at": "2026-03-02T22:00:00.000000Z"
  }
}
```

**200 Response (reaction removed — toggled off):**
```json
{
  "message": "Reaction removed.",
  "data": null
}
```

**200 Response (reaction switched — e.g. downvote → upvote):**
```json
{
  "message": "Reaction updated.",
  "data": {
    "id": 1,
    "user_id": 1,
    "reactable_id": 1,
    "reactable_type": "Post",
    "type": "upvote",
    "created_at": "2026-03-02T22:00:00.000000Z",
    "updated_at": "2026-03-02T22:05:00.000000Z"
  }
}
```

**Errors:**
- `401` — not authenticated
- `404` — post does not exist
- `422` — invalid type (not "upvote" or "downvote")

---

### POST /comments/{comment}/reactions ⟵ auth required

Toggle a reaction on a comment. Exact same behavior and responses as POST /posts/{post}/reactions, but `reactable_type` will be `"Comment"`.

**Body:**
```json
{ "type": "downvote" }
```

**Responses:** identical structure to post reactions (201/200 with same message patterns).

**Errors:**
- `401` — not authenticated
- `404` — comment does not exist
- `422` — invalid type

---

## 5. Admin (Moderation)

Admin endpoints allow moderators to delete any user, post, or comment. All admin endpoints require authentication **and** admin privileges.

The `is_admin` field is included in all auth responses (`/auth/register`, `/auth/login`, `/auth/me`) so the frontend can conditionally show admin controls.

### How to grant admin rights

1. Open a terminal in the project directory
2. Run `php artisan tinker`
3. Grant admin by username:
```php
User::where('username', 'tester1')->first()->update(['is_admin' => true]);
```
4. Type `exit` to close tinker

To **revoke** admin rights:
```php
User::where('username', 'tester1')->first()->update(['is_admin' => false]);
```

---

### DELETE /admin/users/{user} ⟵ admin required

Deletes a user and all their data (posts, comments, reactions — cascade).

**204 No Content** — empty response body on success.

**Errors:**
- `401` — not authenticated
- `403` — not an admin
- `404` — user does not exist

---

### DELETE /admin/posts/{post} ⟵ admin required

Deletes any post (regardless of author). Same cascade behavior as regular post delete.

**204 No Content** — empty response body on success.

**Errors:**
- `401` — not authenticated
- `403` — not an admin
- `404` — post does not exist

---

### DELETE /admin/comments/{comment} ⟵ admin required

Deletes any comment (regardless of author). Same cascade behavior as regular comment delete.

**204 No Content** — empty response body on success.

**Errors:**
- `401` — not authenticated
- `403` — not an admin
- `404` — comment does not exist

---

## 6. Cascade Delete Summary

When entities are deleted, related data is automatically cleaned up:

| Deleted entity | What gets cascade-deleted |
|---|---|
| **User** | All their posts → all comments on those posts → all reactions on those posts and comments. Also all their comments, and all their reactions. |
| **Post** | All comments on the post (DB cascade). All reactions on the post (model event). All reactions on the deleted comments (model event). |
| **Comment** | All reactions on the comment (model event). |

---

## 7. Common Error Responses

### 401 Unauthorized
```json
{ "message": "Unauthenticated." }
```
Token is missing, expired, or invalid.

### 403 Forbidden
```json
{ "message": "Forbidden" }
```
Authenticated but not allowed (e.g., trying to edit/delete someone else's post/comment, or accessing admin endpoints without admin privileges).

### 404 Not Found
```json
{ "message": "Not Found" }
```
The requested resource (post, comment, reaction) does not exist. This is returned automatically by Laravel's route model binding — if the ID in the URL doesn't match any record, you get 404 before the controller code even runs.

### 422 Unprocessable Entity
```json
{
  "message": "The title field is required.",
  "errors": {
    "title": ["The title field is required."],
    "body": ["The body field must be at least 5 characters."]
  }
}
```
Validation failed. The `errors` object contains field-specific error messages.

### 429 Too Many Requests
```json
{ "message": "Too Many Attempts." }
```
Rate limit exceeded. Response includes a `Retry-After` header with the number of seconds to wait.

---

## 9. Rate Limiting

All endpoints are rate-limited to prevent abuse. Limits are applied **per IP address** (public routes) or **per user account** (authenticated routes).

| Limiter | Limit | Applies to | Keyed by |
|---------|-------|-----------|----------|
| `register` | 5/min | POST /auth/register | IP |
| `login` | 30/min | POST /auth/login | IP |
| `reads` | 60/min | All GET endpoints | User ID or IP |
| `writes` | 20/min | All POST/PUT endpoints | User ID or IP |
| `deletes` | 40/min | All DELETE endpoints | User ID or IP |

When a limit is exceeded, the API returns `429 Too Many Requests` with a `Retry-After` header.

---

## 10. Full Route Table

| Method | URI | Auth | Rate Limit | Description |
|--------|-----|:----:|:----------:|-------------|
| POST | /auth/register | ✗ | 5/min | Register new user |
| POST | /auth/login | ✗ | 30/min | Login with password |
| POST | /auth/logout | ✓ | 20/min | Logout (delete all tokens) |
| GET | /auth/me | ✓ | 60/min | Get current user info |
| GET | /posts | ✗ | 60/min | List posts (paginated) |
| GET | /posts/{post} | ✗ | 60/min | Get single post |
| POST | /posts | ✓ | 20/min | Create post |
| PUT | /posts/{post} | ✓ | 20/min | Update post (author only) |
| DELETE | /posts/{post} | ✓ | 40/min | Delete post (author only) |
| GET | /posts/{post}/comments | ✗ | 60/min | List comments for post (paginated) |
| POST | /posts/{post}/comments | ✓ | 20/min | Create comment on post |
| PUT | /comments/{comment} | ✓ | 20/min | Update comment (author only) |
| DELETE | /comments/{comment} | ✓ | 40/min | Delete comment (author only) |
| POST | /posts/{post}/reactions | ✓ | 20/min | Toggle reaction on post |
| POST | /comments/{comment}/reactions | ✓ | 20/min | Toggle reaction on comment |
| DELETE | /admin/users/{user} | ✓ admin | 40/min | Delete any user (admin only) |
| DELETE | /admin/posts/{post} | ✓ admin | 40/min | Delete any post (admin only) |
| DELETE | /admin/comments/{comment} | ✓ admin | 40/min | Delete any comment (admin only) |

**Auth column:** ✗ = public (no token needed, but sending a token enhances response with `user_reaction`). ✓ = token required, returns 401 without it.

**Note:** There is no separate DELETE endpoint for reactions. To remove a reaction, simply POST the same type again (toggle off).
