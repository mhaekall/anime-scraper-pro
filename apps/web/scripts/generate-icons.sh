#!/bin/bash

# Script to generate placeholder PWA icons using an API
# This ensures the PWA is immediately valid without needing complex image processing libraries.

PUBLIC_DIR="apps/web/public"

echo "Generating PWA Icons..."

# Create 192x192 icon
echo "Downloading 192x192 icon..."
curl -s "https://ui-avatars.com/api/?name=AP&size=192&background=000000&color=ffffff&font-size=0.4&bold=true" -o "$PUBLIC_DIR/icon-192x192.png"

# Create 512x512 icon
echo "Downloading 512x512 icon..."
curl -s "https://ui-avatars.com/api/?name=AP&size=512&background=000000&color=ffffff&font-size=0.4&bold=true" -o "$PUBLIC_DIR/icon-512x512.png"

echo "✅ Icons generated successfully in $PUBLIC_DIR/"
