#!/usr/bin/env bash
# caddy/setup.sh — run once with: sudo bash ~/leadgen-v2/caddy/setup.sh
#
# What this script does:
#   1. Installs Caddy from the official Caddy apt repo
#   2. Creates /etc/caddy/tls/ for the Cloudflare Origin Certificate
#   3. Installs the Caddyfile (with YOUR_DOMAIN still as placeholder)
#   4. Configures UFW firewall:
#        - Allows 80/443 publicly (HTTP/HTTPS only)
#        - Allows SSH only via Tailscale VPN + local LAN (192.168.1.0/24)
#        - Denies everything else by default
#   5. Prints next steps — Caddy is NOT started until cert is in place

set -euo pipefail

CADDYFILE_SRC="$(dirname "$0")/Caddyfile"
LAN_SUBNET="192.168.1.0/24"

# ── 1. Install Caddy ────────────────────────────────────────────────────────
echo "▶ Installing Caddy..."
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list

apt-get update -q
apt-get install -y caddy

# Prevent the default example Caddyfile from starting
systemctl stop caddy 2>/dev/null || true

# ── 2. TLS directory for Cloudflare Origin Certificate ──────────────────────
echo "▶ Creating /etc/caddy/tls/ ..."
mkdir -p /etc/caddy/tls
chmod 750 /etc/caddy/tls
chown caddy:caddy /etc/caddy/tls

# ── 3. Install Caddyfile ────────────────────────────────────────────────────
echo "▶ Installing Caddyfile..."
cp "$CADDYFILE_SRC" /etc/caddy/Caddyfile
chown root:caddy /etc/caddy/Caddyfile
chmod 640 /etc/caddy/Caddyfile

# ── 4. UFW firewall ─────────────────────────────────────────────────────────
echo "▶ Configuring UFW firewall..."
echo "  Rules:"
echo "    ALLOW  80/tcp  (HTTP — public)"
echo "    ALLOW  443/tcp (HTTPS — public)"
echo "    ALLOW  22/tcp  on tailscale0 (SSH via Tailscale VPN)"
echo "    ALLOW  22/tcp  from $LAN_SUBNET (SSH from local LAN)"
echo "    DENY   everything else"
echo ""

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

ufw allow 80/tcp  comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw allow in on tailscale0 to any port 22 proto tcp comment "SSH via Tailscale"
ufw allow from "$LAN_SUBNET" to any port 22 proto tcp comment "SSH from LAN"

ufw --force enable
echo ""
ufw status verbose
echo ""

# ── 5. Next steps ───────────────────────────────────────────────────────────
cat <<'INSTRUCTIONS'
────────────────────────────────────────────────────────────────
  Setup complete. Caddy is installed but NOT yet started.
  UFW is active — only ports 80, 443, and SSH are open.

  BEFORE starting Caddy you need to:

  Step A — Generate a Cloudflare Origin Certificate:
    1. Go to Cloudflare Dashboard → your domain → SSL/TLS → Origin Server
    2. Click "Create Certificate"
    3. Let Cloudflare generate the key pair
    4. Validity: 15 years
    5. Hostnames: yourdomain.com, *.yourdomain.com

  Step B — Install the certificate:
    sudo nano /etc/caddy/tls/cf-cert.pem   ← paste the CERTIFICATE
    sudo nano /etc/caddy/tls/cf-key.pem    ← paste the PRIVATE KEY
    sudo chown caddy:caddy /etc/caddy/tls/cf-cert.pem /etc/caddy/tls/cf-key.pem
    sudo chmod 640 /etc/caddy/tls/cf-cert.pem /etc/caddy/tls/cf-key.pem

  Step C — Set your domain in /etc/caddy/Caddyfile:
    sudo nano /etc/caddy/Caddyfile
    Replace YOUR_DOMAIN with your actual domain (e.g. leads.yourdomain.com)

  Step D — Start Caddy:
    sudo systemctl start caddy
    sudo systemctl status caddy
    sudo journalctl -u caddy -f

  Step E — Cloudflare settings:
    DNS:     A record → your public IP, Proxy enabled (orange cloud)
    SSL/TLS: Full (strict)
    Always Use HTTPS: On

  Step F — Router port forwarding:
    Forward TCP 80  → 192.168.1.226
    Forward TCP 443 → 192.168.1.226
    Do NOT forward port 22 or 3002.

────────────────────────────────────────────────────────────────
INSTRUCTIONS
