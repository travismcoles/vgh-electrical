# VCH Electrical Panel Directory — Setup Guide
## Raspberry Pi Self-Hosting Edition  v0.5

---

## What You've Got

A complete **Next.js web app** built on:
- **Next.js 14** (React frontend + API backend)
- **SQLite** database via Prisma (no separate DB server — just one file!)
- **Local file storage** for photos/PDFs
- **NextAuth** for login and sessions
- **Tailwind CSS** for styling

Works on any computer, tablet, iPhone, or Android via your browser.

---

## Option A — Raspberry Pi with Docker (Recommended)

### Hardware
- Raspberry Pi 4 (4GB+ RAM recommended)
- 32GB+ SD card (or USB SSD for better reliability)
- Connected to your hospital network via ethernet

### Step 1: Set Up Raspberry Pi OS

Download **Raspberry Pi OS Lite (64-bit)** from https://www.raspberrypi.com/software/

Flash to SD card, enable SSH, connect to network.

SSH in:
```bash
ssh pi@<your-pi-ip>
```

### Step 2: Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

Verify:
```bash
docker --version
docker compose version
```

### Step 3: Transfer the App

From your computer, zip and transfer this folder to the Pi:
```bash
# On your computer:
zip -r vch-panel-app.zip vch-panel-app/
scp vch-panel-app.zip pi@<your-pi-ip>:~/

# On the Pi:
unzip vch-panel-app.zip
cd vch-panel-app
```

### Step 4: Configure Environment

```bash
cp .env.example .env
nano .env
```

Set these values:
```
DATABASE_URL=file:/data/panels.db
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://<your-pi-ip>:3000
```

Generate your secret key:
```bash
openssl rand -base64 32
```

### Step 5: Build and Launch

```bash
docker compose up -d --build
```

This takes 5–10 minutes the first time (downloading and compiling).

Watch progress:
```bash
docker compose logs -f
```

### Step 6: Initialize Database

```bash
docker compose exec app npx prisma db seed
```

You should see:
```
✓ Admin user created (admin@vch.ca / admin123)
✓ 25 buildings created
✓ Sample panels created
```

**⚠️ Change the admin password immediately after first login!**

### Step 7: Access the App

Open on any device on your network:
```
http://<your-pi-ip>:3000
```

Login: `admin@vch.ca` / `admin123`

---

## Option B — Run Without Docker (Node.js Direct)

### Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # should be 20.x
```

### Setup

```bash
cd vch-panel-app
npm install
cp .env.example .env
nano .env   # fill in your values
```

Create data directory:
```bash
mkdir -p data uploads
```

### Initialize & Build

```bash
npx prisma db push
npx prisma db seed  # creates admin user + buildings
npm run build
```

### Start

```bash
npm start
```

### Run as a Service (auto-start on reboot)

Create a systemd service:
```bash
sudo nano /etc/systemd/system/vch-panels.service
```

Paste:
```ini
[Unit]
Description=VCH Electrical Panel Directory
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/vch-panel-app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable vch-panels
sudo systemctl start vch-panels
sudo systemctl status vch-panels
```

---

## Option C — Deploy to a VPS (Cloud)

If you'd rather not manage hardware, this app runs on any of these for ~$5–10/month:

| Provider     | Notes                          |
|--------------|--------------------------------|
| Railway      | Easiest, deploy from GitHub    |
| Render       | Free tier available            |
| DigitalOcean | $6/mo Droplet, very reliable   |
| Fly.io       | Good free tier                 |

All of them support Docker. Just push the repo and follow their Docker deployment guides.

---

## Making It Accessible From Your Phone (Outside Wi-Fi)

By default the app only works on your local network.

**Option 1 — Cloudflare Tunnel (Free, Secure)**
Best option for hospital use. Creates a secure HTTPS tunnel.

```bash
# On the Pi:
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

cloudflared tunnel login
cloudflared tunnel create vch-panels
cloudflared tunnel route dns vch-panels panels.yourcompany.ca
cloudflared tunnel run vch-panels
```

**Option 2 — Tailscale VPN (Easy)**
Install Tailscale on both the Pi and your iPhone/Android. They'll see each other as if on the same network.
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

---

## Accessing via QR Code Scan

When you print a QR code and scan it, it links to:
```
http://<your-pi-ip>:3000/panels/<panel-id>
```

For this to work from a phone anywhere:
- Use a domain/Cloudflare Tunnel URL instead of the IP
- Update `NEXTAUTH_URL` in your `.env` to the public URL
- Reprint QR codes after changing the URL

---

## Backup & Data Safety

Your entire database is a single file: `/data/panels.db` (Docker) or `./data/panels.db`

### Automatic backup script

```bash
# Create backup script
cat > ~/backup-panels.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/panel-backups"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d-%H%M)

# Copy database
cp /data/panels.db "$BACKUP_DIR/panels-$DATE.db"

# Keep only last 30 backups
ls -t "$BACKUP_DIR"/*.db | tail -n +31 | xargs -r rm

echo "Backup complete: panels-$DATE.db"
EOF
chmod +x ~/backup-panels.sh
```

Schedule daily backups:
```bash
crontab -e
# Add this line:
0 2 * * * /home/pi/backup-panels.sh
```

**Also back up to a USB drive or network share regularly!**

---

## Updating the App

```bash
# Stop the app
docker compose down  # (or: sudo systemctl stop vch-panels)

# Replace app files with new version
# Make sure to keep your .env file!

# Rebuild
docker compose up -d --build

# OR (without Docker):
npm install
npm run build
sudo systemctl start vch-panels
```

Database migrations happen automatically on startup.

---

## User Roles Reference

| Role           | View | Direct Edit | Submit Request | Approve | Manage Users |
|----------------|------|-------------|----------------|---------|--------------|
| Admin          | ✓    | ✓           | ✓              | ✓       | ✓            |
| Chargehand     | ✓    | ✓           | ✓              | ✓       | ✗            |
| Electrician    | ✓    | ✓ (direct)  | ✓              | ✗       | ✗            |
| Subcontractor  | ✓    | Request only| ✓              | ✗       | ✗            |
| View Only      | ✓    | ✗           | ✗              | ✗       | ✗            |

> **Note:** Electricians can currently edit directly. If you want them to go through the change request workflow instead, let me know and it's a simple config change.

---

## Importing Your Excel Data

1. Log in as Admin
2. Go to **Import** in the nav menu
3. Upload your exported Excel file
4. Expected format:
   - Sheet 1: `Building | Panel Designation | Manufacturer | Description | Location | Voltage | Fed From | Fuse/Breaker | Circuits`
   - Sheet 2: `Panel Designation | Circuit Number | Description`

---

## Troubleshooting

**App won't start:**
```bash
docker compose logs app
# or: journalctl -u vch-panels -n 50
```

**Can't login:**
- Check `NEXTAUTH_SECRET` is set in `.env`
- Check `NEXTAUTH_URL` matches your actual URL exactly

**Database locked error:**
- Only one process should access the SQLite file at a time
- Make sure you're not running two instances

**Photos not showing:**
- Check the uploads directory exists and is writable
- Check `UPLOAD_DIR` in `.env`

**QR codes link to wrong URL:**
- Update `NEXTAUTH_URL` to your public/LAN URL
- Regenerate QR codes from the QR Codes page

---

## Tech Stack (For Reference)

```
Frontend:  Next.js 14 + React + Tailwind CSS
Backend:   Next.js API Routes (Node.js)
Database:  SQLite via Prisma ORM
Auth:      NextAuth.js (credentials)
Files:     Local filesystem (easy to move to S3 later)
Deploy:    Docker + docker-compose
```

To move to a different machine:
1. Copy the entire app folder
2. Copy `/data/panels.db`
3. Copy the `uploads` folder
4. Copy `.env`
5. Run `docker compose up -d`

That's it — fully portable.

---

Built for VGH Electrical Engineering & Maintenance | VCH  
Version 0.5 | Travis Coles
