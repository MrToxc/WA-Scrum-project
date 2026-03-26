# Frontend část projektu

---

## 6. Rozhodnutí o technologiích (Tech Stack)

### Identifikace technologického rozhodnutí

Pro frontendovou část systému bylo nutné rozhodnout o technologii pro implementaci klientské aplikace.

Frontend musí:
- komunikovat s REST API backendem
- zobrazovat dynamická data
- být responzivní
- být snadno nasaditelný

---

### Možné technologie

Byly zvažovány následující varianty:

- Vanilla JavaScript
- React
- Vue

---

### Kritéria rozhodování

| Kritérium                     | Váha |
|------------------------------|------|
| Jednoduchost implementace    | 4    |
| Výkon                        | 3    |
| Zkušenost týmu               | 5    |
| Komunita a dokumentace       | 2    |
| Náročnost nasazení           | 3    |

---

### Rozhodovací matice

| Technologie         | Jednoduchost (4) | Výkon (3) | Zkušenost (5) | Komunita (2) | Nasazení (3) | Celkem |
|--------------------|------------------|----------|--------------|-------------|-------------|--------|
| Vanilla JS         | 5×4 = 20         | 5×3 = 15 | 5×5 = 25     | 3×2 = 6     | 5×3 = 15    | **81** |
| React              | 2×4 = 8          | 4×3 = 12 | 2×5 = 10     | 5×2 = 10    | 2×3 = 6     | 46     |
| Vue                | 3×4 = 12         | 4×3 = 12 | 3×5 = 15     | 4×2 = 8     | 3×3 = 9     | 56     |

---

### Finální rozhodnutí

Byla zvolena technologie **Vanilla JavaScript**, protože dosáhla nejvyššího skóre.

### Zdůvodnění výběru

- nejjednodušší implementace  
- nejlepší znalost týmu  
- minimální závislosti  
- rychlé nasazení  
- vhodné pro menší projekt  

Frontend plní pouze prezentační roli, proto není nutné používat framework.

---

## 7. Architektura systému (frontend)

### Přehled architektury

Frontend je klientská vrstva aplikace běžící v prohlížeči.

Architektura systému:
Frontend ⇄ Backend API ⇄ Databáze

---

### Komponenty systému

#### Frontend
- uživatelské rozhraní
- vykreslování dat
- odesílání požadavků

#### Backend API
- business logika
- validace
- autentizace

#### Databáze
- ukládání dat
- správa uživatelů, postů, komentářů

---

### Odpovědnosti frontendové vrstvy

Frontend zajišťuje:

- zobrazení příspěvků  
- zobrazení detailu příspěvku  
- zobrazení komentářů  
- formuláře (login, registrace, komentáře)  
- hlasování (upvote/downvote)  

Frontend neobsahuje business logiku.

---

### Komunikační rozhraní

Frontend komunikuje s backendem pomocí:

- REST API  
- HTTP (GET, POST, DELETE, ...)  
- JSON  

Autentizace:
Authorization: Bearer token

---

### Datové toky

1. Uživatel provede akci  
2. Frontend odešle HTTP request  
3. Backend zpracuje požadavek  
4. Backend vrátí JSON  
5. Frontend aktualizuje UI  

---

### Struktura frontendové aplikace

- `api.js` – komunikace s backendem  
- `app.js` – logika aplikace a renderování  
- `styles.css` – vzhled aplikace  

---

### Datový model (frontend pohled)

Frontend pracuje s těmito entitami:

- User  
- Post  
- Comment  

Příklad struktury:

Post:

- id
- title
- body
- user_id
- comments_count

Comment:

- id
- body
- post_id
- user_id
---

### Vztah k požadavkům

Architektura umožňuje implementaci všech frontend požadavků:

- zobrazení postů → renderPosts()  
- detail → renderPostDetail()  
- komentáře → comments section  
- hlasování → vote API  

---

### Vlastnosti architektury

Navržená architektura je:

- modulární  
- jednoduchá  
- rozšiřitelná  
- snadno udržovatelná  

---

## Předávací zpráva – frontend (Prokš)

### Role

Za frontend odpovídal **Prokš**.

---

### Náplň práce

- návrh UI  
- implementace frontend logiky  
- napojení na backend API  
- vykreslení postů a detailu  
- implementace komentářů  
- implementace hlasování  
- tvorba formulářů  
- styling a responzivita  

---

### Použitý přístup

Frontend byl vytvořen jako jednoduchá klientská aplikace bez frameworku.

- backend řeší logiku  
- frontend zobrazuje data  
- komunikace probíhá přes REST API  

---

### Shrnutí

Frontend:

- zpracovává JSON data  
- komunikuje s backendem  
- vykresluje UI  
- reaguje na akce uživatele  

Tento přístup umožňuje:

- snadnou údržbu  
- oddělení frontend/backend  
- možnost budoucího rozšíření  