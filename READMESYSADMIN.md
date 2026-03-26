# Forum Ječná – VPS Setup (Ubuntu 24.04 + Nginx + Laravel API + MariaDB)  
  
Tento README popisuje kompletní nasazení aplikace na VPS (Ubuntu 24.04).    
Stack: **Nginx (static frontend + reverse proxy)**, **PHP-FPM**, **Laravel API**, **MariaDB**.  
  
---  
  
## Požadavky  
- VPS s Ubuntu 24.04 (root nebo sudo)  
- Doména (např. `forumjecna.app`) směřující A záznamem na IP VPS  
- Repo: `https://github.com/MrToxc/WA-Scrum-project.git`  
- Přístup přes SSH   
  
---  
  
## 1) Základní příprava serveru  
  
### 1.1 Update systému  
```bash  
sudo apt update && sudo apt upgrade -y
```
### 1.2 Instalace balíčků

```bash
sudo apt install -y nginx git unzip curl rsync
```
---

## 2) PHP 8.4 + Composer

### 2.1 PHP + rozšíření pro Laravel + MariaDB

```bash
sudo apt install -y \  
  php8.4-fpm php8.4-cli php8.4-mbstring php8.4-xml php8.4-curl php8.4-zip php8.4-bcmath \  
  php8.4-mysql
```

### 2.2 Composer

```bash
cd /tmp  
curl -sS https://getcomposer.org/installer | php  
sudo mv composer.phar /usr/local/bin/composer  
composer --version
```
---

## 3) MariaDB

### 3.1 Instalace MariaDB

```bash
sudo apt install -y mariadb-server  
sudo systemctl enable --now mariadb
```
### 3.2 Základní zabezpečení (doporučeno)

```bash
sudo mariadb-secure-installation
```
### 3.3 Vytvoření DB + uživatele (příklad)

```bash
Doplň si heslo a názvy podle potřeby.

sudo mariadb

V MariaDB konzoli:

CREATE DATABASE jecna_forum CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;  
  
CREATE USER 'jecna_user'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';  
GRANT ALL PRIVILEGES ON jecna_forum.* TO 'jecna_user'@'localhost';  
FLUSH PRIVILEGES;  
EXIT;
```
---

## 4) Uživatel + složky

### 4.1 Vytvoř uživatele `deploy`

```bash
sudo adduser deploy  
sudo usermod -aG sudo deploy
```
### 4.2 Připrav aplikační složku

```bash
sudo mkdir -p /srv/app  
sudo chown -R deploy:deploy /srv/app
```
---

## 5) Klonování repozitáře

```bash
Přepni se na deploy:

sudo -iu deploy

Klon:

cd /srv/app  
git clone https://github.com/MrToxc/WA-Scrum-project.git  
cd WA-Scrum-project
```
---

## 6) Backend (Laravel API)

### 6.1 Instalace dependencies

```bash
cd /srv/app/WA-Scrum-project/forum-api-app  
composer install --no-dev --optimize-autoloader

> Pokud narazíš na problém s PHP verzí v locku, může být potřeba:

composer update --no-dev --optimize-autoloader
```
### 6.2 .env

```bash
cp -n .env.example .env  
php artisan key:generate
```
### 6.3 MariaDB konfigurace v `.env`

Otevři `.env`:
```bash
nano .env

Nastav (příklad):

APP_ENV=production  
APP_DEBUG=false  
APP_URL=https://forumjecna.app  
  
DB_CONNECTION=mysql  
DB_HOST=127.0.0.1  
DB_PORT=3306  
DB_DATABASE=jecna_forum  
DB_USERNAME=jecna_user  
DB_PASSWORD=STRONG_PASSWORD_HERE
```
### 6.4 Práva pro Laravel (storage/cache)

```bash
sudo chown -R www-data:www-data storage bootstrap/cache  
sudo chmod -R 775 storage bootstrap/cache
```
### 6.5 Migrace
```bash
php artisan migrate --force
```
---

## 7) Frontend (static)

### 7.1 API_BASE ve frontendu

V `frontend/api.js` musí být:
```bash
export const API_BASE = "/api/v1";
```
### 7.2 Nasazení do nginx web rootu
```bash
sudo rm -rf /var/www/html/*  
sudo cp -r /srv/app/WA-Scrum-project/frontend/* /var/www/html/  
sudo chown -R www-data:www-data /var/www/html  
sudo find /var/www/html -type d -exec chmod 755 {} \;  
sudo find /var/www/html -type f -exec chmod 644 {} \;
```
---

## 8) Nginx konfigurace

### 8.1 Vytvoř konfiguraci webu
```bash
sudo nano /etc/nginx/sites-available/forumjecna
```
Vlož (uprav doménu):
```bash
server {  
    listen 80;  
    server_name forumjecna.app;  
  
    root /var/www/html;  
    index index.html;  
  
    # SPA fallback (pokud používáte client-side routing)  
    location / {  
        try_files $uri $uri/ /index.html;  
    }  
  
    # Laravel API (prefix /api)  
    location ^~ /api/ {  
        root /srv/app/WA-Scrum-project/forum-api-app/public;  
        try_files $uri /index.php?$query_string;  
    }  
  
    location ~ \.php$ {  
        root /srv/app/WA-Scrum-project/forum-api-app/public;  
        include snippets/fastcgi-php.conf;  
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;  
    }  
  
    # blok skrytých souborů (kromě ACME pro certbot)  
    location ~ /\.(?!well-known).* {  
        deny all;  
    }  
}
```
Aktivace:
```bash
sudo ln -s /etc/nginx/sites-available/forumjecna /etc/nginx/sites-enabled/  
sudo rm -f /etc/nginx/sites-enabled/default  
sudo nginx -t  
sudo systemctl reload nginx
```
---

## 9) HTTPS

### 9.1 Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx  
sudo certbot --nginx -d forumjecna.app
```
---

## 10) Firewall
```bash
sudo ufw allow OpenSSH  
sudo ufw allow 80  
sudo ufw allow 443  
sudo ufw enable  
sudo ufw status verbose
```
---

## 11) Deploy

Pokud máte v repo `deploy.sh`, spouští se:
```bash
cd /srv/app/WA-Scrum-project  
chmod +x deploy.sh  
./deploy.sh
```
> Doporučení: deploy server držet “čistý” a vždy syncnout s GitHubem (fetch + reset).

---

## 12) Ověření funkčnosti

Frontend:
```bash
curl -I https://forumjecna.app/
```
API:
```bash
curl -i https://forumjecna.app/api/v1/posts
```
Kontrola služeb:
```bash
sudo systemctl status nginx  
sudo systemctl status php8.4-fpm  
sudo systemctl status mariadb
```
---

## 13) Troubleshooting

### Logy

- Nginx:
    - `/var/log/nginx/access.log`
    - `/var/log/nginx/error.log`
- Laravel:
    - `/srv/app/WA-Scrum-project/forum-api-app/storage/logs/laravel.log`

### Restart služeb
```bash
sudo systemctl restart nginx php8.4-fpm mariadb
```
### DB přístup (MariaDB)
```bash
sudo mariadb
```
---

## 14) Bezpečnostní minimum

- SSH pouze klíče, zakázat password login v `/etc/ssh/sshd_config`:
    - `PasswordAuthentication no`
    - `PermitRootLogin prohibit-password`
- Fail2ban:
```bash
sudo apt install -y fail2ban  
sudo systemctl enable --now fail2ban
```
---
