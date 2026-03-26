# Frontend část projektu

---

## 1. Rozhodnutí o technologiích (Tech Stack)

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

## 2. Architektura systému (frontend)

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

## Předávací zpráva – frontend

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
## 3. Testování (analýza stavu)

### Cíl testování

Cílem testování frontendové části bylo ověřit, že uživatelské rozhraní správně komunikuje s backend API, korektně zobrazuje data a správně reaguje na akce uživatele.

Testování bylo zaměřeno především na:

- funkčnost hlavních uživatelských scénářů
- správné vykreslování dat z API
- správné odesílání formulářů
- zobrazení chybových stavů
- responzivitu uživatelského rozhraní

---

### Způsob testování

Frontend byl testován především **manuálně** v prostředí webového prohlížeče.

Byly prováděny tyto typy testů:

- funkční testování
- integrační testování frontend–backend
- testování uživatelského rozhraní
- testování chybových stavů
- základní responzivní testování

Automatizované unit testy nebyly ve frontendové části implementovány. Důvodem byl rozsah projektu a použití jednoduché klientské architektury bez frameworku.

---

### Testované scénáře

#### TS-FE-01: Zobrazení seznamu příspěvků
**Popis:** Po načtení hlavní stránky se zobrazí seznam příspěvků získaný z backend API.  
**Očekávaný výsledek:** Příspěvky se správně načtou a vykreslí v přehledném seznamu.  
**Výsledek:** Splněno.

#### TS-FE-02: Zobrazení detailu příspěvku
**Popis:** Po rozkliknutí příspěvku se zobrazí detail příspěvku.  
**Očekávaný výsledek:** Zobrazí se název, autor, čas vytvoření, počet komentářů a obsah příspěvku.  
**Výsledek:** Splněno.

#### TS-FE-03: Zobrazení komentářů
**Popis:** Po otevření detailu příspěvku se načtou komentáře k danému příspěvku.  
**Očekávaný výsledek:** Zobrazí se seznam komentářů vrácený backend API.  
**Výsledek:** Splněno po úpravě načítání komentářů přes správný endpoint.

#### TS-FE-04: Přidání komentáře
**Popis:** Přihlášený uživatel odešle nový komentář.  
**Očekávaný výsledek:** Komentář se uloží přes API a po obnovení detailu se zobrazí v seznamu komentářů.  
**Výsledek:** Splněno.

#### TS-FE-05: Přihlášení uživatele
**Popis:** Uživatel zadá přihlašovací údaje.  
**Očekávaný výsledek:** Po úspěšném přihlášení je uložen token a aplikace přepne rozhraní do přihlášeného stavu.  
**Výsledek:** Splněno.

#### TS-FE-06: Registrace uživatele
**Popis:** Nový uživatel odešle registrační formulář.  
**Očekávaný výsledek:** Backend vytvoří účet a frontend správně zobrazí výsledek operace.  
**Výsledek:** Splněno.

#### TS-FE-07: Hlasování u příspěvku
**Popis:** Uživatel použije upvote nebo downvote u příspěvku.  
**Očekávaný výsledek:** Hlas je odeslán na backend a změna se projeví v uživatelském rozhraní.  
**Výsledek:** Splněno.

#### TS-FE-08: Hlasování u komentáře
**Popis:** Uživatel použije upvote nebo downvote u komentáře.  
**Očekávaný výsledek:** Hlas je korektně odeslán a UI se aktualizuje.  
**Výsledek:** Splněno.

#### TS-FE-09: Chybový stav při nedostupném API
**Popis:** Backend API vrátí chybu nebo není dostupné.  
**Očekávaný výsledek:** Frontend zobrazí uživateli chybovou hlášku a nespadne.  
**Výsledek:** Splněno částečně – základní chybové zprávy jsou zobrazeny, ale prostor pro zlepšení zůstává.

#### TS-FE-10: Responzivita rozhraní
**Popis:** Aplikace je otevřena na menším rozlišení nebo mobilním zařízení.  
**Očekávaný výsledek:** Rozložení prvků zůstane čitelné a ovladatelné.  
**Výsledek:** Splněno po úpravách layoutu metadat a detailu příspěvků.

---

### Testování chybových stavů

Byly ověřovány také vybrané chybové situace:

- odeslání prázdného formuláře
- přístup k funkcím bez přihlášení
- neplatný nebo expirovaný token
- chyba při komunikaci s API
- neúspěšné načtení detailu příspěvku nebo komentářů

Frontend v těchto případech zobrazoval chybovou zprávu nebo nepovolil danou akci.


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
