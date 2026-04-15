#!/bin/bash
source .env
HF_TOKEN="HF_TOKEN_PLACEHOLDER"
REPO="jonyyyyyyyu/anime-scraper-api"

add_secret() {
  key=$1
  val=$2
  echo "Menyimpan secret: $key"
  curl -s -X POST "https://huggingface.co/api/spaces/$REPO/secrets" \
       -H "Authorization: Bearer $HF_TOKEN" \
       -H "Content-Type: application/json" \
       -d "{\"key\":\"$key\",\"value\":\"$val\"}"
  echo ""
}

add_secret "DATABASE_URL" "$DATABASE_URL"
add_secret "QSTASH_TOKEN" "$QSTASH_TOKEN"
add_secret "TELEGRAM_BOT_TOKEN" "$TELEGRAM_BOT_TOKEN"
add_secret "TELEGRAM_CHAT_ID" "$TELEGRAM_CHAT_ID"
add_secret "TG_PROXY_BASE_URL" "$TG_PROXY_BASE_URL"
