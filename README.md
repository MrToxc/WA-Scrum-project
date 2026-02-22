# Ječná Fórum -- API Specifikace (v1)

## Base URL

    /api/v1

------------------------------------------------------------------------

# 📌 POSTS

## GET /posts

Vrátí seznam příspěvků (paginovaný).

### Query parametry

-   per_page (10--50, default 10)
-   page (číslo stránky)

### Response

``` json
{
  "data": [
    {
      "id": 1,
      "title": "Nadpis",
      "body": "Text příspěvku",
      "created_at": "2026-02-21T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "last_page": 3,
    "per_page": 10,
    "total": 25
  }
}
```

------------------------------------------------------------------------

## GET /posts/{id}

Vrátí detail příspěvku + všechny komentáře.

### Response

``` json
{
  "post": {
    "id": 1,
    "title": "Nadpis",
    "body": "Text příspěvku",
    "created_at": "2026-02-21T12:00:00Z"
  },
  "comments": [
    {
      "id": 5,
      "body": "Odpověď",
      "created_at": "2026-02-21T12:10:00Z"
    }
  ]
}
```

------------------------------------------------------------------------

## POST /posts

Vytvoří nový příspěvek.

### Request

``` json
{
  "title": "Nadpis",
  "body": "Text příspěvku"
}
```

------------------------------------------------------------------------

## PUT /posts/{id}

Upraví příspěvek.

------------------------------------------------------------------------

## DELETE /posts/{id}

Smaže příspěvek.

------------------------------------------------------------------------

# 📌 COMMENTS

## POST /posts/{id}/comments

Vytvoří komentář k danému příspěvku.

### Request

``` json
{
  "body": "Moje odpověď"
}
```

------------------------------------------------------------------------

## PUT /comments/{id}

Upraví komentář.

------------------------------------------------------------------------

## DELETE /comments/{id}

Smaže komentář.

------------------------------------------------------------------------

# 📌 Databázová struktura

## Tabulka: posts

  Sloupec      Typ           Popis
  ------------ ------------- ---------------------
  id           bigint (PK)   ID příspěvku
  title        string        Nadpis
  body         text          Text příspěvku
  created_at   timestamp     Datum vytvoření
  updated_at   timestamp     Laravel automaticky

------------------------------------------------------------------------

## Tabulka: comments

  Sloupec      Typ           Popis
  ------------ ------------- ---------------------
  id           bigint (PK)   ID komentáře
  post_id      bigint (FK)   Vazba na post
  body         text          Text komentáře
  created_at   timestamp     Datum vytvoření
  updated_at   timestamp     Laravel automaticky

------------------------------------------------------------------------

# 📌 Vztahy

## Post.php

``` php
public function comments()
{
    return $this->hasMany(Comment::class);
}
```

## Comment.php

``` php
public function post()
{
    return $this->belongsTo(Post::class);
}
```
