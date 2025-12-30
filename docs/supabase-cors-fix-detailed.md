# Detailed Guide: Fixing Supabase CORS Error

## Understanding the Issue

Supabase has **TWO different URL settings** that serve different purposes:

1. **Site URL** - Controls CORS for auth endpoints (this is what you need!)
2. **Redirect URLs** - Only for email verification redirects

## Step-by-Step Fix

### Step 1: Set Site URL (CRITICAL)

1. Go to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg
2. Click **"Authentication"** in the left sidebar
3. Click **"URL Configuration"** tab
4. Find the **"Site URL"** field (at the top)
5. Set it to: `http://localhost:5173`
6. **Click "Save"**

### Step 2: Add Redirect URLs

1. In the same "URL Configuration" page
2. Scroll to **"Redirect URLs"** section
3. Click **"Add URL"**
4. Add: `http://localhost:5173/**`
5. Click **"Save"**

### Step 3: Verify Email Provider Settings

1. Go to **"Authentication"** → **"Providers"** → **"Email"**
2. Ensure **"Enable email signup"** is **ON**
3. Ensure **"Confirm email"** is set as needed
4. Click **"Save"**

### Step 4: Check API Settings (Optional)

1. Go to **"Settings"** → **"API"**
2. Verify your project URL and anon key are correct
3. Check if there are any additional CORS restrictions

### Step 5: Wait and Test

1. **Wait 2-3 minutes** for Supabase to propagate changes
2. **Clear browser cache** or use **Incognito/Private mode**
3. **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)
4. Try registration again

## Visual Guide

```
Supabase Dashboard
├── Authentication
    ├── URL Configuration
        ├── Site URL: http://localhost:5173  ← SET THIS!
        └── Redirect URLs
            └── http://localhost:5173/**     ← Also add this
    ├── Providers
        └── Email
            └── Enable email signup: ON     ← Check this
```

## Common Mistakes

❌ **Wrong:** Only adding to Redirect URLs
✅ **Correct:** Setting Site URL AND adding Redirect URLs

❌ **Wrong:** Using `https://localhost:5173`
✅ **Correct:** Using `http://localhost:5173` (no https for localhost)

❌ **Wrong:** Not waiting for changes to propagate
✅ **Correct:** Wait 2-3 minutes after saving

## Still Not Working?

If you've done all the above and it's still not working:

1. **Check Browser Console** for the exact error
2. **Try a different browser** (Chrome, Firefox, Edge)
3. **Check if you're using a proxy or VPN** that might interfere
4. **Verify your .env file** has the correct Supabase URL
5. **Check Supabase project status** - make sure it's not paused

## Alternative: Use Production URL for Testing

If localhost continues to have issues:
1. Deploy your app to a staging environment
2. Add that URL to Site URL in Supabase
3. Test registration there

## Need More Help?

- Supabase Docs: https://supabase.com/docs/guides/auth
- Supabase Discord: https://discord.supabase.com

