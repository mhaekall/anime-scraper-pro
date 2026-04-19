#!/bin/bash
# AI PRODUCTIVITY HACKER: DIRECT DEPLOY SCRIPT (TERMUX BYPASS)
set -e

PROJECT_NAME="orcanime"

echo "🚀 Starting Deployment for $PROJECT_NAME to Cloudflare Pages..."

echo "🔧 Patching workerd for Termux..."
find node_modules -name "main.js" -path "*/workerd/lib/main.js" -exec sed -i 's/function generateBinPath() {/function generateBinPath() { return __filename;/g' {} +

echo "🛠️  Building project with @cloudflare/next-on-pages..."
CI=true npx --yes @cloudflare/next-on-pages

echo "🔧 Patching next-on-pages async_hooks module resolution for Next 15..."
find .vercel/output/static/_worker.js -type f -name "*.js" -exec sed -i 's/"async_hooks"/"node:async_hooks"/g' {} +

echo "📤 Deploying to Cloudflare Pages..."
CI=true npx --yes wrangler pages deploy --project-name $PROJECT_NAME --branch main

echo -e "\n✅ Deployment Complete! Check: https://$PROJECT_NAME.pages.dev"