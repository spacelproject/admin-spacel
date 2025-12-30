# How to Generate Invite Tokens

## Location
Invite tokens can be generated in the **Platform Settings** page under the **"Staff & Invites"** tab.

## Steps to Generate an Invite Token

1. **Navigate to Platform Settings**
   - Click on "Settings" in the sidebar
   - Or go to `/platform-settings` directly

2. **Open Staff & Invites Tab**
   - Click on the "Staff & Invites" tab in the settings page

3. **Fill in the Invite Form**
   - **Email Address** (Optional): Enter the email address for the invite. If left empty, it creates an "open invite" that anyone can use.
   - **Role**: Select either "Admin" or "Support" role
   - **Expires In (Days)**: Set how many days until the token expires (1-365 days)

4. **Generate Token**
   - Click "Generate Invite Token"
   - The token will be automatically copied to your clipboard
   - A registration URL will be shown with the token included

5. **Share the Token**
   - **Option 1**: Share the full registration URL (e.g., `https://yourapp.com/admin-register?token=abc123...`)
   - **Option 2**: Share just the token string - user can enter it manually on the registration page

## Managing Invite Tokens

In the "Recent Invite Tokens" section, you can:
- **View all tokens**: See all generated invite tokens with their status
- **Copy token**: Click the copy icon next to any token to copy it
- **Copy registration URL**: Click the link icon to copy the full registration URL
- **Revoke token**: Click the X icon to revoke an active token (makes it unusable)

## Token Status

Tokens can have three statuses:
- **Active**: Token is valid and can be used
- **Used**: Token has already been used for registration
- **Expired**: Token has passed its expiration date

## Important Notes

1. **First User**: The first user to register will automatically become `super_admin`, regardless of the role selected in the invite token.

2. **Email Matching**: If an invite token has an email address, the user must register with that exact email address.

3. **Token Security**: 
   - Tokens are cryptographically secure (64-character hex string)
   - Each token can only be used once
   - Tokens expire after the set number of days
   - Revoked tokens cannot be reused

4. **Registration Flow**:
   - User receives invite token (via URL or token string)
   - User visits registration page
   - User enters token (or it's pre-filled from URL)
   - User selects role (Admin or Support)
   - User fills in name, email, password
   - User must verify email before logging in

## Quick Access

Direct link to Staff & Invites: `/platform-settings` → Click "Staff & Invites" tab

