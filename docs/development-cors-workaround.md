# Development CORS Workaround (Without Changing Site URL)

## Problem
You can't change the Site URL in Supabase because it's set to your production domain. This causes CORS errors in local development.

## Solution: Use Vite Proxy

I've configured a Vite proxy that will route Supabase auth requests through your dev server, bypassing CORS issues.

### Setup Steps

1. **Add to your `.env` file** (or create one if it doesn't exist):
   ```env
   VITE_USE_PROXY=true
   ```

2. **Restart your dev server**:
   ```bash
   npm run dev
   ```

3. **That's it!** The proxy will automatically handle CORS for you.

### How It Works

- In **development**: Requests go through Vite proxy → Supabase (bypasses CORS)
- In **production**: Requests go directly to Supabase (no proxy needed)

### Configuration

The proxy is already configured in `vite.config.js`:
- Proxies `/supabase-auth/*` to `https://bwgwoqywmlaevyygkafg.supabase.co/*`
- Only active when `VITE_USE_PROXY=true` in development

### To Disable Proxy

If you want to use direct Supabase connection:
1. Remove or set `VITE_USE_PROXY=false` in `.env`
2. Restart dev server

### Alternative: Keep Production Site URL

Your Supabase Site URL can stay as your production domain. The proxy handles local development without affecting production.

## Notes

- This only affects **development** - production is unchanged
- The proxy only routes auth endpoints
- All other Supabase requests still go directly
- No changes needed to your Supabase dashboard

