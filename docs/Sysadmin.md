# Předávací zpráva – Sysadmin (Forum Ječná)

## 1) Předávací zpráva – sysadmin

### 1.1 Základní informace
- **Název projektu:** Forum Ječná
- **Provozovaná doména:** `https://forumjecna.app`
- **VPS:** Hetzner Cloud **CX23**, Ubuntu **24.04**, veřejná IP **23.88.97.231**
- **Repozitář:** `MrToxc/WA-Scrum-project`
- **Role:** Sysadmin – Tomáš Kopecký
- **Datum odevzdání:** 26.03.2026

### 1.2 Účel sysadmin části
Cílem sysadmin části je zajistit provoz aplikace na VPS, bezpečný přístup, nasazení (deploy), konfiguraci webserveru, provozní logy a jejich analýzu (GoAccess) a základní provozní postupy (restarty, kontrola logů, aktualizace).

### 1.3 Přístupy a účty
- Přístup na server přes SSH.
- Aktivní firewall (UFW), povolené pouze nezbytné porty (22/80/443).

### 1.4 Umístění aplikace na serveru
- **Repo (working copy):** `/srv/app/WA-Scrum-project`
- **Frontend (zdroj):** `/srv/app/WA-Scrum-project/frontend`
- **Nasazený frontend (static web root):** `/var/www/html`
- **Backend (Laravel API):** `/srv/app/WA-Scrum-project/forum-api-app`
- **MariaDB databáze:** `/srv/app/WA-Scrum-project/forum-api-app/database/`

### 1.5 Webserver a routování
- **nginx** obsluhuje:
  - `/` → statický frontend (SPA) z `/var/www/html`
  - `/api/*` → přeposílá na Laravel `public/index.php` přes PHP-FPM socket
- Ověření funkčnosti:
  - `curl -I https://forumjecna.app/`
  - `curl https://forumjecna.app/api/v1/posts`

### 1.6 Nasazení (deploy)
- Deploy probíhá skriptem `deploy.sh` v repozitáři.
- Deploy provede:
  1) synchronizaci repozitáře na serveru (fetch + reset na `origin/<branch>`)
  2) nasazení frontendu do `/var/www/html` (synchronizace souborů)
  3) instalaci backend dependencies (composer)
  4) migrace + čištění cache
  5) restart/reload služeb (php-fpm, nginx)
- Pozn.: deploy skripty se nesmí mazat při `git clean` (řešeno výjimkami), reporty se nesmí mazat při nasazení frontendu.

### 1.7 Logování a analýza provozu
- nginx logy:
  - `/var/log/nginx/access.log` + rotace `access.log.*(.gz)`
  - `/var/log/nginx/error.log` + rotace
- GoAccess:
  - generování reportu z `access.log*`
  - report dostupný přes URL `/reports/report.html` a chráněný Basic Auth
  - refresh reportu skriptem `refresh-report.sh` (možné spouštět ručně nebo cronem)

### 1.8 Bezpečnost a incidenty
- Byl řešen incident kompromitace VPS (odchozí SSH scanning, malware z `/tmp` a persistence v cronu).
- Opatření:
  - UFW (omezení portů) + blokace podezřelých odchozích portů
  - odstranění persistence (škodlivé crony a soubory v `/tmp` a v home uživatele)
  - doporučení: po incidentu je nejbezpečnější provést rebuild VPS (po záloze DB)

### 1.9 Provozní postupy (rychlý runbook)
- Restart webu:
  - `sudo systemctl restart nginx php8.4-fpm`
- Kontrola logů:
  - `sudo tail -n 100 /var/log/nginx/error.log`
  - `sudo tail -n 100 /srv/app/WA-Scrum-project/forum-api-app/storage/logs/laravel.log`
- Kontrola portů:
  - `sudo ss -tulpen`
- Kontrola firewallu:
  - `sudo ufw status verbose`

---

## 2) Tech stack – rozhodnutí a zdůvodnění (rozhodovací matice)

### 2.1 Technologická rozhodnutí (kategorie)
- Infrastruktura / hosting (VPS provider)
- Web server / reverse proxy
- Backend framework + runtime
- Databáze
- Log analytics / reporting

### 2.2 Kritéria a váhy (1–5)
Váhy (důležitost):
- Stabilita/provozní spolehlivost **5**
- Jednoduchost nasazení **5**
- Cena **4**
- Zkušenost týmu / dostupnost dokumentace **4**
- Výkon **3**
- Monitoring/logování **3**

### 2.3 Rozhodovací matice

#### VPS / hosting
| Technologie | Stabilita (5) | Nasazení (5) | Cena (4) | Dokumentace (4) | Výkon (3) | Skóre |
|---|---:|---:|---:|---:|---:|---:|
| Hetzner Cloud | 5×5 | 5×5 | 4×4 | 4×4 | 4×3 | **94** |
| DigitalOcean | 5×5 | 5×5 | 3×4 | 5×4 | 4×3 | 94 |
| VPS low-cost | 3×5 | 3×5 | 5×4 | 2×4 | 3×3 | 67 |

**Rozhodnutí:** Hetzner Cloud – stabilita, dobrá cena/výkon, jednoduchá správa VPS.

#### Web server / reverse proxy
| Technologie | Stabilita (5) | Výkon (3) | Jednoduchost (5) | Dokumentace (4) | Skóre |
|---|---:|---:|---:|---:|---:|
| nginx | 5×5 | 5×3 | 5×5 | 5×4 | **85** |
| Apache | 4×5 | 3×3 | 4×5 | 5×4 | 69 |
| Caddy | 4×5 | 4×3 | 5×5 | 3×4 | 69 |

**Rozhodnutí:** nginx – výkon, jednoduchost reverse proxy, standardní volba pro produkci.

#### Databáze
| Technologie | Nasazení (5) | Jednoduchost (5) | Stabilita (5) | Správa (3) | Skóre |
|---|---:|---:|---:|---:|---:|
| SQLite | 5×5 | 5×5 | 3×5 | 2×3 | 71 |
| MariaDB | 4×5 | 4×5 | 5×5 | 5×3 | **80** |
| PostgreSQL | 4×5 | 3×5 | 5×5 | 4×3 | 72 |

**Rozhodnutí:** MariaDB – nejstabilnější v poměru jednoduchosti, nasazení a správě databáze

#### Log analytics / reporting
| Technologie | Jednoduchost (5) | Výstupy (4) | Provozní náklady (4) | Skóre |
|---|---:|---:|---:|---:|
| GoAccess | 5×5 | 4×4 | 5×4 | **61** |
| Grafana + Loki | 3×5 | 5×4 | 3×4 | 47 |
| ELK stack | 2×5 | 5×4 | 2×4 | 38 |

**Rozhodnutí:** GoAccess – rychlá offline analýza nginx logů do HTML, bez dalších nákladů.

---

## 3) Architektura systému (sysadmin pohled)

### 3.1 Komponenty
1) **DNS + Doména (`forumjecna.app`)** – směruje na veřejnou IP VPS  
2) **VPS (Ubuntu 24.04, Hetzner CX23)** – běží nginx, php-fpm a aplikace  
3) **nginx (web server / reverse proxy)** – statický frontend + routování API na backend  
4) **Frontend (SPA, statické soubory)** – běží v browseru, volá `/api/v1/*`  
5) **Backend (Laravel API)** – zpracování požadavků, autentizace, CRUD  
6) **Databáze (MariaDB)** – persistentní data aplikace  
7) **Logy a reporty (GoAccess)** – nginx access log → HTML report + refresh script

### 3.2 Komunikace a datové toky
- Browser → `https://forumjecna.app/` → nginx → `/var/www/html/index.html` + JS
- Frontend JS → `GET/POST https://forumjecna.app/api/v1/...` → nginx → PHP-FPM → Laravel → MariaDB
- nginx access log ukládá requesty → GoAccess generuje report z `access.log*`

### 3.3 Architektonický diagram

Browser ──HTTPS──> nginx ──static──> /var/www/html (Frontend)
                     │
                     └──/api/*──FastCGI──> php8.4-fpm ──> Laravel API ──> MariaDB

Logs: /var/log/nginx/access.log* ──> GoAccess ──> /reports/report.html

### 3.4 Vztah architektury k požadavkům
- Požadavky na dostupnost frontendu a API plní nginx + php-fpm + Laravel
- Požadavky na deploy plní `deploy.sh` a definovaná struktura složek
- Požadavky na provozní data plní nginx logy + GoAccess report

---

## 4) Trasovatelnost (tabulka)

| Requirement ID | Use Case | Komponenta architektury | Část implementace | Test / Ověření |
|---|---|---|---|---|
| REQ-INF-01 | UC-INF-01 Nasazení aplikace | VPS + nginx | `/srv/app/WA-Scrum-project`, `/etc/nginx/sites-available/duck` | `curl -I https://forumjecna.app/` |
| REQ-INF-02 | UC-INF-01 Nasazení aplikace | Frontend hosting | `/var/www/html` (deploy z `frontend/`) | otevřít `/` v prohlížeči, `curl -I /` |
| REQ-INF-03 | UC-INF-01/02 Provoz API | nginx + PHP-FPM + Laravel | nginx location `/api/`, `php8.4-fpm.sock`, `forum-api-app/public/index.php` | `curl https://forumjecna.app/api/v1/posts` (200 JSON) |
| REQ-INF-04 | UC-INF-01 Deploy verze | Deploy script | `/srv/app/WA-Scrum-project/deploy.sh` | spustit `./deploy.sh` + ověřit `/` a `/api` |
| REQ-INF-05 | UC-INF-03 Log analýza | nginx logy | `/var/log/nginx/access.log*` | `tail access.log`, kontrola rotace |
| REQ-INF-06 | UC-INF-03 Log report | GoAccess | `goaccess … -o report.html`, `/usr/local/bin/refresh-report.sh` | otevřít `/reports/report.html` |
| REQ-INF-07 | UC-INF-04 Bezpečnost | Firewall | UFW pravidla (22/80/443) | `sudo ufw status verbose` |
| REQ-INF-08 | UC-INF-05 Doména/HTTPS | DNS + certbot/nginx | `server_name forumjecna.app`, cert paths | otevřít `https://forumjecna.app` bez varování |

---
