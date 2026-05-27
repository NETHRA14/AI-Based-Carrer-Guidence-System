# Deployment Environment Setup

## Issue: Missing Supabase Environment Variables

The error "supabaseUrl is required" occurs when the Supabase environment variables are not properly configured in the deployment environment.

## Root Cause

The application uses environment variables from `.env.local` for local development, but these are NOT automatically transferred to deployment platforms like Vercel.

## Solution

### 1. For Vercel Deployment

You need to manually set the environment variables in the Vercel dashboard:

1. Go to your Vercel project dashboard
2. Navigate to "Settings" > "Environment Variables"
3. Add the following variables:

**Required for Supabase:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your_project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**App Configuration:**
```
NEXT_PUBLIC_APP_URL=https://your-app-domain.vercel.app
NODE_ENV=production
DATABASE_URL=postgresql://postgres:your_password@db.your_project.supabase.co:5432/postgres
JWT_SECRET=your_jwt_secret
```

**AI Providers:**
```
HUGGINGFACE_API_KEY=your_huggingface_api_key
COHERE_API_KEY=your_cohere_api_key
DEFAULT_AI_PROVIDER=huggingface
```

**Optional (Google Maps):**
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 2. Automated Setup Script

You can also use the Vercel CLI to set multiple environment variables at once:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... continue for all variables
```

### 3. Environment Variable File for CLI

Create a `deploy.env` file (DO NOT commit this):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your_project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=https://your-app-domain.vercel.app
DATABASE_URL=postgresql://postgres:your_password@db.your_project.supabase.co:5432/postgres
JWT_SECRET=your_jwt_secret
HUGGINGFACE_API_KEY=your_huggingface_api_key
COHERE_API_KEY=your_cohere_api_key
DEFAULT_AI_PROVIDER=huggingface
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Then use:
```bash
vercel env pull .env.production
```

## Code Improvements Made

1. **Enhanced Error Handling**: Modified `lib/supabase-admin.ts` to handle missing environment variables gracefully
2. **Fallback Behavior**: Updated API routes to fallback to regular Supabase client when admin client is unavailable
3. **Better Logging**: Added console errors when environment variables are missing

## Testing the Fix

After setting the environment variables:

1. Redeploy your application on Vercel
2. Check the deployment logs for any remaining environment variable errors
3. Test the API endpoints that were failing:
   - `/api/achievements`
   - `/api/activity`

## Security Notes

**IMPORTANT**: Never commit actual API keys or secrets to version control. The values shown above are from your `.env.local` and should be treated as potentially sensitive.

For production:
1. Rotate any exposed keys
2. Use environment-specific values
3. Implement proper secret management

## Quick Fix Command

If you have Vercel CLI installed, you can quickly set the essential variables:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Enter: https://your_project.supabase.co

vercel env add SUPABASE_SERVICE_ROLE_KEY production  
# Enter: your_supabase_service_role_key

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Enter: your_supabase_anon_key
```

Then redeploy:
```bash
vercel --prod
```