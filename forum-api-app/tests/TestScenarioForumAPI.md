# Testovací scénáře: Forum API

## 1. Autentizace (/auth)

### 1.1 Registrace (POST /auth/register)

**TC-AUTH-01: Úspěšná registrace nového uživatele.**\
Vstup: { "username": "valid_user123" }\
Očekávaný výsledek: Status 201 Created. Vrací username, vygenerované
heslo (ověřit délku a složitost), token a is_admin: false.

**TC-AUTH-02: Registrace s existujícím uživatelským jménem.**\
Vstup: Uživatelské jméno, které už je v DB.\
Očekávaný výsledek: Status 422 Unprocessable Entity.

**TC-AUTH-03: Registrace s nevalidním jménem.**\
Vstup: ab (krátké), uživatel@! (nepovolené znaky).\
Očekávaný výsledek: Status 422 Unprocessable Entity s příslušnou
chybovou hláškou.

### 1.2 Přihlášení (POST /auth/login)

**TC-AUTH-04: Úspěšné přihlášení s validním heslem.**\
Vstup: { "password": "`<validni_heslo>`{=html}" }\
Očekávaný výsledek: Status 200 OK. Vrací nový token a objekt uživatele.

**TC-AUTH-05: Invalidace předchozích tokenů při novém přihlášení.**\
Kroky: Přihlásit se (Token A), znovu (Token B), použít Token A.\
Očekávaný výsledek: Token A → 401, Token B → 200.

**TC-AUTH-06: Přihlášení s neplatným heslem.**\
Vstup: { "password": "spatneheslo123" }\
Očekávaný výsledek: Status 422 Unprocessable Entity.

### 1.3 Odhlášení a profil

**TC-AUTH-07: Úspěšné odhlášení.**\
Očekávaný výsledek: Logout 200 OK, následně /auth/me → 401.

**TC-AUTH-08: Profil bez tokenu.**\
Očekávaný výsledek: 401 Unauthorized.

------------------------------------------------------------------------

## 2. Příspěvky (Posts)

### 2.1 Čtení

**TC-POST-01:** Seznam bez autentizace → 200 OK, user_reaction = null\
**TC-POST-02:** Seznam s autentizací → obsahuje reakce\
**TC-POST-03:** Neexistující příspěvek → 404

### 2.2 Vytváření a úpravy

**TC-POST-04:** Vytvoření → 201, countery = 0\
**TC-POST-05:** Validace → 422\
**TC-POST-06:** Úprava autorem → 200\
**TC-POST-07:** Úprava cizím → 403

### 2.3 Mazání

**TC-POST-08:** Smazání cizím → 403\
**TC-POST-09:** Smazání autorem → 204 + kaskáda

------------------------------------------------------------------------

## 3. Komentáře (Comments)

### 3.1 Čtení a vytváření

**TC-COM-01:** 200 / 404\
**TC-COM-02:** Vytvoření → 201 + zvýšení countu\
**TC-COM-03:** Bez auth → 401

### 3.2 Úpravy a mazání

**TC-COM-04:** Vlastník vs cizí → 200/204 vs 403\
**TC-COM-05:** Kaskádové smazání reakcí

------------------------------------------------------------------------

## 4. Reakce (Reactions)

### 4.1 Toggle logika

**TC-REACT-01:** Upvote → 201\
**TC-REACT-02:** Odebrání → 200\
**TC-REACT-03:** Změna → 200 + změna counterů

### 4.2 Validace

**TC-REACT-04:** Nevalidní typ → 422\
**TC-REACT-05:** Reakce na komentář → stejné chování

------------------------------------------------------------------------

## 5. Administrace

**TC-ADMIN-01:** User bez role → 403\
**TC-ADMIN-02:** Smazání usera → 204 + kaskáda\
**TC-ADMIN-03:** Smazání postu → 204\
**TC-ADMIN-04:** Neexistující → 404

------------------------------------------------------------------------

## 6. Systémové scénáře

**TC-SYS-01:** Accept header → JSON chyba\
**TC-SYS-02:** Rate limit registrace → 429 + Retry-After\
**TC-SYS-03:** Rate limit akcí → 429
