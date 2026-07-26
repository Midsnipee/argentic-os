#!/bin/bash
# Cloudflare Tunnel pour exposer l'API Argentic OS
# Usage: ./tunnel.sh [port]

PORT=${1:-9151}

if ! command -v cloudflared &>/dev/null; then
    echo "📦 Installation de cloudflared..."
    curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" \
        -o /tmp/cloudflared
    chmod +x /tmp/cloudflared
    CLOUDFLARED=/tmp/cloudflared
else
    CLOUDFLARED=cloudflared
fi

echo "🌐 Tunnel Cloudflare → port $PORT"
$CLOUDFLARED tunnel --url "http://localhost:$PORT" 2>&1 | while read line; do
    echo "$line"
    if echo "$line" | grep -q "trycloudflare.com"; then
        URL=$(echo "$line" | grep -oP 'https://[a-z0-9.-]+\.trycloudflare\.com')
        echo ""
        echo "══════════════════════════════════════════════════"
        echo "🔗 URL publique : $URL"
        echo "   API : $URL/api"
        echo "══════════════════════════════════════════════════"
    fi
done