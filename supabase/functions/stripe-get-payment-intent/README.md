# Stripe Get Payment Intent Edge Function

This Edge Function retrieves payment intent details from Stripe, including metadata like `platformEarnings`.

## Purpose

Used to fetch platform earnings from Stripe metadata when the database value is missing, particularly useful for refunded bookings.

## Usage

```typescript
POST /functions/v1/stripe-get-payment-intent
Content-Type: application/json
Authorization: Bearer <token>

{
  "payment_intent_id": "pi_xxx"
}
```

## Response

Returns the payment intent object with metadata, including `platformEarnings` if available.

