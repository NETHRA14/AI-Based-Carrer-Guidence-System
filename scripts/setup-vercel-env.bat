@echo off
echo Setting up Vercel environment variables...

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Vercel CLI is not installed. Please install it first:
    echo npm i -g vercel
    pause
    exit /b 1
)

echo Setting Supabase configuration...
echo https://your_project.supabase.co | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo your_supabase_anon_key | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo your_supabase_service_role_key | vercel env add SUPABASE_SERVICE_ROLE_KEY production

echo Setting database configuration...
echo postgresql://postgres:Akash%%401234@db.tyymopgkofdscyyghvyp.supabase.co:5432/postgres | vercel env add DATABASE_URL production

echo Setting app configuration...
echo production | vercel env add NODE_ENV production
echo your_jwt_secret | vercel env add JWT_SECRET production

echo Setting AI provider configuration...
echo your_huggingface_api_key | vercel env add HUGGINGFACE_API_KEY production
echo your_cohere_api_key | vercel env add COHERE_API_KEY production
echo huggingface | vercel env add DEFAULT_AI_PROVIDER production

echo Setting Google Maps configuration...
echo your_google_maps_api_key | vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production

echo.
echo Environment variables setup complete!
echo Run 'vercel --prod' to deploy with these variables.
echo.
echo Please manually set NEXT_PUBLIC_APP_URL after deployment:
echo vercel env add NEXT_PUBLIC_APP_URL production
echo Enter your Vercel app URL (e.g., https://your-app.vercel.app)
echo.
echo To verify your environment variables:
echo vercel env ls

pause