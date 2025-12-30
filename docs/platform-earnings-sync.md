# Platform Earnings Sync Implementation

## Overview

This document describes how the system fetches and syncs platform earnings from Stripe metadata, especially for refunded bookings where the database value might be missing.

## Problem

- Stripe payment intent metadata contains `platformEarnings` for all bookings (including refunded ones)
- Database `platform_earnings` field was NULL for refunded bookings and some newer bookings
- Commission management dashboard couldn't display accurate platform earnings for refunded bookings

## Solution

A multi-layered approach ensures platform earnings are always available:

### 1. Automatic Sync on Commission Data Load

**Location**: `src/hooks/useCommissionData.js`

When commission data is fetched:
- Identifies bookings with `stripe_payment_intent_id` but missing `platform_earnings`
- Automatically syncs from Stripe metadata (background, non-blocking)
- Limits to first 10 bookings per load to avoid performance issues

### 2. Sync During Refund Processing

**Location**: `src/hooks/useBookings.js` and `supabase/functions/stripe-refund/index.ts`

When a refund is processed:
- Fetches payment intent from Stripe
- Extracts `platformEarnings` from metadata
- Updates database `platform_earnings` field
- Ensures refunded bookings always have platform earnings

### 3. Edge Function for Stripe Data Fetching

**Location**: `supabase/functions/stripe-get-payment-intent/index.ts`

New Edge Function that:
- Retrieves payment intent details from Stripe
- Returns metadata including `platformEarnings`
- Requires admin authentication
- Handles errors gracefully

## Key Functions

### `StripeService.getPlatformEarningsFromStripe(paymentIntentId)`

Fetches platform earnings from Stripe payment intent metadata.

**Returns**: `Promise<number|null>` - Platform earnings in dollars, or null if not found

### `StripeService.syncPlatformEarningsFromStripe(bookingId, paymentIntentId)`

Syncs platform earnings from Stripe to database.

**Returns**: `Promise<number|null>` - Platform earnings value that was saved

## Data Flow

```
┌─────────────────┐
│   Commission    │
│   Data Load     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Check for      │────▶│  Missing         │
│  missing        │     │  platform_earnings│
│  platform_earnings│    └────────┬─────────┘
└─────────────────┘              │
         │                       ▼
         │              ┌──────────────────┐
         │              │  Fetch from      │
         │              │  Stripe Metadata │
         │              └────────┬─────────┘
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         │              │  Update Database │
         │              └──────────────────┘
         │
         ▼
┌─────────────────┐
│  Display Data   │
└─────────────────┘

Refund Processing:
┌─────────────────┐
│  Process Refund │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Fetch Payment  │
│  Intent from    │
│  Stripe         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Extract        │
│  platformEarnings│
│  from metadata  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Update Booking │
│  in Database    │
└─────────────────┘
```

## Stripe Metadata Format

Payment intents contain metadata like:

```json
{
  "metadata": {
    "bookingId": "...",
    "platformEarnings": "13.74",  // Net earnings after Stripe fees
    "partnerFee": "400",           // Commission before Stripe fees
    "originalAmount": "10000",
    "serviceFee": "1200",
    "paymentProcessingFee": "225.99999999999997"
  }
}
```

## Deployment Checklist

- [ ] Deploy `stripe-get-payment-intent` Edge Function
- [ ] Verify `STRIPE_SECRET_KEY` is set in Supabase secrets
- [ ] Test with a refunded booking
- [ ] Monitor console logs for sync operations
- [ ] (Optional) Run backfill script for existing bookings

## Troubleshooting

### Platform earnings not syncing

1. Check browser console for errors
2. Verify Edge Function is deployed and accessible
3. Check Stripe secret key is configured
4. Verify payment intent ID exists in database

### Edge Function errors

1. Check Supabase function logs
2. Verify admin authentication
3. Check Stripe API key permissions
4. Verify payment intent exists in Stripe

## Performance Considerations

- Sync operations are non-blocking and happen in background
- Limited to 10 bookings per commission data load
- Cached results in database reduce Stripe API calls
- Refund processing includes sync to minimize future lookups

## Future Improvements

1. Batch sync script for all existing bookings
2. Webhook handler to sync on payment success
3. Scheduled job to verify sync accuracy
4. Dashboard to view sync status

