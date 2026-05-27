#!/bin/bash

# Vercel Environment Variables Setup Script
# This script sets up all required environment variables for deployment

echo "Setting up Vercel environment variables..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI is not installed. Please install it first:"
    echo "npm i -g vercel"
    exit 1
fi

# Core Supabase Configuration
echo "Setting Supabase configuration..."
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://your_project.supabase.co"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "your_supabase_anon_key"
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "your_supabase_service_role_key"

# Database Configuration
echo "Setting database configuration..."
vercel env add DATABASE_URL production <<< "postgresql://postgres:your_password@db.your_project.supabase.co:5432/postgres"

# App Configuration
echo "Setting app configuration..."
vercel env add NODE_ENV production <<< "production"
vercel env add JWT_SECRET production <<< "\$2a\$10\$Dx4r3dUCFfZk8/dmA4zbF/bmE+NvG49idyzwVQ/5ZdhMQwb/LH0bE/f4ljyHbvK+vMaqgvN0HjyxameL66ToIdtEbg=="

# AI Providers
echo "Setting AI provider configuration..."
vercel env add HUGGINGFACE_API_KEY production <<< "your_huggingface_api_key"
vercel env add COHERE_API_KEY production <<< "your_cohere_api_key"
vercel env add DEFAULT_AI_PROVIDER production <<< "huggingface"

# Google Maps (Optional)
echo "Setting Google Maps configuration..."
vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production <<< "your_google_maps_api_key"

# Get the deployment URL and set NEXT_PUBLIC_APP_URL
echo ""
echo "Please manually set NEXT_PUBLIC_APP_URL after deployment:"
echo "vercel env add NEXT_PUBLIC_APP_URL production"
echo "Enter your Vercel app URL (e.g., https://your-app.vercel.app)"

echo ""
echo "Environment variables setup complete!"
echo "Run 'vercel --prod' to deploy with these variables."

echo ""
echo "To verify your environment variables:"
echo "vercel env ls"