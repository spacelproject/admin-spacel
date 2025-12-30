# Environment Variables Documentation

This document describes all environment variables required for the SPACEL Admin Panel.

## Required Variables

### `VITE_SUPABASE_URL`
- **Description**: Your Supabase project URL
- **Example**: `https://your-project.supabase.co`
- **How to get**: Go to your Supabase project settings → API → Project URL
- **Required**: Yes

### `VITE_SUPABASE_ANON_KEY`
- **Description**: Your Supabase anonymous/public API key
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **How to get**: Go to your Supabase project settings → API → anon/public key
- **Required**: Yes
- **Security Note**: This is safe to expose in client-side code, but should not be committed to version control

## Optional Variables

### `VITE_APP_NAME`
- **Description**: Application name displayed in the UI
- **Default**: `SPACEL Admin Panel`
- **Required**: No

### `VITE_APP_VERSION`
- **Description**: Application version
- **Default**: `1.0.0`
- **Required**: No

### `VITE_ADMIN_EMAIL_DOMAIN`
- **Description**: Email domain for admin users (for validation)
- **Default**: `@yourcompany.com`
- **Required**: No

### `VITE_GOOGLE_ANALYTICS_ID`
- **Description**: Google Analytics tracking ID
- **Example**: `G-XXXXXXXXXX`
- **Required**: No
- **Note**: If provided, analytics will be enabled

### `VITE_SENTRY_DSN`
- **Description**: Sentry DSN for error tracking
- **Example**: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`
- **Required**: No
- **Note**: If provided, error tracking will be enabled

## Supabase Edge Functions (Email Notifications)

These are configured in the **Supabase Dashboard**, not in the Vite `.env`.

### `RESEND_API_KEY`
- **Description**: Resend API key used by Supabase Edge Functions to send suspension/reinstatement emails
- **Example**: `re_...`
- **Where to set**: Supabase Dashboard → Project Settings → Functions → Secrets
- **Required**: Yes (for `send-suspension-email` and `send-reinstatement-email`)

### `SUPABASE_SERVICE_ROLE_KEY`
- **Description**: Used by Edge Functions to read profiles and write `system_logs` (bypasses RLS)
- **Where to set**: Supabase Dashboard → Project Settings → Functions → Secrets
- **Required**: Yes (for the email functions)

## Setup Instructions

1. Copy `.env.example` to `.env` in the root directory:
   ```bash
   cp .env.example .env
   ```

2. Fill in the required variables with your actual values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key
   ```

3. Restart your development server if it's running

## Security Notes

- **Never commit `.env` files to version control** - they are already in `.gitignore`
- The `VITE_SUPABASE_ANON_KEY` is safe to expose in client-side code (it's designed for this)
- For production, ensure environment variables are set in your hosting platform's environment settings
- Use Row Level Security (RLS) policies in Supabase to protect your data

## Troubleshooting

### "Missing required environment variables" error
- Ensure your `.env` file exists in the root directory
- Check that variable names start with `VITE_` (required for Vite)
- Restart your development server after adding/modifying `.env` file

### Application not connecting to Supabase
- Verify your `VITE_SUPABASE_URL` is correct
- Verify your `VITE_SUPABASE_ANON_KEY` is correct
- Check browser console for connection errors
- Ensure your Supabase project is active and not paused

