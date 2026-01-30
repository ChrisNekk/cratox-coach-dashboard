#!/bin/bash

echo "=== Cratox Coach Dashboard - Deploy to Vercel ==="
echo ""

# Step 1: Push to GitHub
echo "Step 1: Pushing to GitHub..."
git push origin main

if [ $? -ne 0 ]; then
    echo "GitHub push failed. Please check your credentials."
    exit 1
fi

echo "✓ Pushed to GitHub successfully!"
echo ""

# Step 2: Deploy with Vercel
echo "Step 2: Deploying to Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

echo "Running Vercel deployment..."
vercel --prod

echo ""
echo "=== Deployment Complete ==="
