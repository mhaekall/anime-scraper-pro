#!/bin/bash
# ==============================================================================
# Automated Cache Warm-up Cron Script
# Target: Memanaskan L1/L0 Cache untuk Stream Anime Ongoing
# ==============================================================================
# Jalankan ini via crontab setiap 4-6 jam.
# Contoh crontab entry (jalankan setiap jam 2 pagi, 8 pagi, 2 siang, 8 malam):
# 0 2,8,14,20 * * * /data/data/com.termux/files/home/workspace/anime-scraper-pro/apps/api/scripts/cron_warmup.sh >> /tmp/anime_cron.log 2>&1

ADMIN_KEY="${ADMIN_API_KEY:-admin123}"
API_URL="${API_URL:-http://localhost:8000}"

echo "============================================================"
echo "[$(date)] Memulai Cache Warmup & Smart Prefetch..."

# Trigger endpoint background prefetch (memanaskan cache episode berikutnya)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/v2/admin/trigger-prefetch" \
     -H "x-admin-key: $ADMIN_KEY" \
     -H "Content-Type: application/json")

if [ "$STATUS" -eq 200 ]; then
    echo "[$(date)] ✅ Trigger berhasil dikirim ke Background Engine (HTTP 200)."
else
    echo "[$(date)] ❌ Gagal trigger Cache Warmup. HTTP Code: $STATUS"
fi

echo "============================================================"
