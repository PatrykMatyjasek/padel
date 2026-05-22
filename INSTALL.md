# Deploying Padel Manager on a VPS

## Requirements

- Ubuntu 22.04+ (or any Debian-based distro)
- 1 GB RAM minimum
- Node.js 20+
- A domain name pointed at your VPS (optional but recommended)

---

## 1. Connect to your VPS

```bash
ssh root@YOUR_SERVER_IP
```

---

## 2. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # should print v20.x.x
```

---

## 3. Install PM2 (process manager)

```bash
npm install -g pm2
```

---

## 4. Clone your repository

```bash
cd /var/www
git clone YOUR_REPO_URL padel
cd padel
```

If the repo is private, either use an SSH deploy key or a personal access token in the URL.

---

## 5. Install dependencies

```bash
npm install
```

---

## 6. Create the environment file

```bash
nano .env.local
```

Paste the following, replacing the values:

```env
NEXTAUTH_SECRET=GENERATE_A_STRONG_RANDOM_STRING
NEXTAUTH_URL=https://yourdomain.com
```

To generate a strong secret:
```bash
openssl rand -base64 32
```

> **Important:** `NEXTAUTH_URL` must match the exact URL users will access — including `https://` and no trailing slash.

---

## 7. Set up the database

```bash
npx prisma db push
```

This creates `prisma/dev.db` (SQLite file). Make sure the directory is writable.

---

## 8. Build the app

```bash
npm run build
```

---

## 9. Start with PM2

```bash
pm2 start npm --name "padel" -- start
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

The app runs on port **3000** by default.

---

## 10. Set up Nginx as a reverse proxy

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/padel
```

Paste:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/padel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 11. Enable HTTPS with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will auto-configure Nginx and set up certificate renewal.

---

## Updating the app

```bash
cd /var/www/padel
git pull
npm install
npm run build
pm2 restart padel
```

---

## Useful PM2 commands

```bash
pm2 status          # check if the app is running
pm2 logs padel      # view live logs
pm2 restart padel   # restart after changes
pm2 stop padel      # stop the app
```

---

## Notes

- **Database backups:** SQLite lives at `prisma/dev.db`. Back it up regularly:
  ```bash
  cp /var/www/padel/prisma/dev.db /var/backups/padel-$(date +%F).db
  ```
- **Persistent data warning:** Running `npx prisma db push` again is safe — it only applies schema changes, it does not wipe data.
- **Port conflicts:** If port 3000 is taken, set `PORT=3001` before the start command and update the Nginx proxy accordingly.
