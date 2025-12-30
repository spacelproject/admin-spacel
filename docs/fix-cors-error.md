# Fix CORS Error for Admin Registration

## Problem
You're getting a CORS error when trying to register:
```
Access to fetch at 'https://bwgwoqywmlaevyygkafg.supabase.co/auth/v1/signup' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

## Solution 1: Configure Supabase Site URL (IMPORTANT - This is different from Redirect URLs!)

**⚠️ CRITICAL:** You need to set the **Site URL**, not just Redirect URLs. These are two different settings!

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `bwgwoqywmlaevyygkafg`

2. **Set the Site URL (This controls CORS)**
   - Go to **"Authentication"** → **"URL Configuration"**
   - Find the **"Site URL"** field (this is different from Redirect URLs!)
   - Set it to: `http://localhost:5173`
   - **This is what controls CORS for auth endpoints**

3. **Add Redirect URLs (For email verification)**
   - In the same "URL Configuration" page
   - Find **"Redirect URLs"** section
   - Add: `http://localhost:5173/**`
   - This allows email verification redirects

4. **Enable Email Signup**
   - Go to **"Authentication"** → **"Providers"** → **"Email"**
   - Make sure **"Enable email signup"** is turned ON
   - Save changes

5. **Check Additional Settings**
   - Go to **"Authentication"** → **"Settings"**
   - Ensure **"Enable email confirmations"** is set as needed
   - Check that signup is not disabled

6. **Wait and Clear Cache**
   - Wait 2-3 minutes for changes to propagate
   - Clear your browser cache or use incognito mode
   - Try registration again

## Solution 2: Use Production URL

If you're testing locally, you can also:
- Deploy your app to a staging/production environment
- Add that URL to Supabase allowed origins
- Test registration there

## Solution 3: Temporary Workaround (Development Only)

If you need to test immediately, you can temporarily disable CORS in your browser (NOT recommended for production):
- This is only for development testing
- Use Chrome with `--disable-web-security` flag (NOT for production)

## Verification

After making changes:
1. Wait a few minutes for changes to propagate
2. Try registration again
3. Check browser console for any remaining errors

## Additional Notes

- The 403 Forbidden error might also indicate that signup is disabled in Supabase
- Make sure your Supabase project allows email signups
- Check that your API keys are correct in your `.env` file

