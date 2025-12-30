# Stripe Balance Transaction Analysis

## How Stripe Connect Destination Charges Work

### Flow of Funds
1. **Customer pays**: $114.26 (total transaction amount)
2. **Full amount goes to connected account**: $114.26 (temporarily)
3. **Application fee transferred back to platform**: $18.26 (gross)
4. **Stripe fees deducted from platform balance**: ~$4.52 (charged on total transaction)
5. **Platform net receives**: ~$13.74 (from balance transaction)

### Key Points
- Stripe charges fees on the **entire transaction amount** ($114.26), not just the application fee
- The platform receives the application fee ($18.26) but Stripe deducts fees from the platform's balance
- The balance transaction shows the **net amount** that actually lands in the platform's Stripe balance

## For a $100 Base Booking

### Application Fee Components:
- Service Fee: $12.00
- Processing Fee: $2.26
- Commission: $4.00
- **Total Application Fee: $18.26**

### Stripe Balance Transaction:
- **Gross Application Fee**: $18.26
- **Total Stripe Fees**: ~$4.52 (on $114.26 transaction)
- **Net Platform Receives**: ~$13.74

### Commission Portion Calculation:
Since commission is part of the application fee:
- Commission = $4.00 (21.9% of $18.26 application fee)
- Net Commission = $13.74 × 21.9% = **$3.01**

OR using balance transaction directly:
- Commission Ratio = $4.00 / $18.26 = 21.9%
- Net Commission = Net Application Fee × Commission Ratio
- Net Commission = $13.74 × 21.9% = **$3.01**

## Updated Calculation Method

### Method 1: Use Balance Transaction (Most Accurate)
1. Fetch balance transaction from Stripe
2. Get `net` amount (what platform actually receives)
3. Calculate commission ratio: `commission / application_fee_gross`
4. Multiply: `net × commission_ratio`

### Method 2: Proportional Fee Calculation (Fallback)
1. Get total Stripe fees from balance transaction
2. Calculate fee rate: `total_fees / total_transaction`
3. Apply to commission: `commission × (1 - fee_rate)`

### Method 3: Estimated Calculation (Current Fallback)
1. Calculate: `commission - (commission × 2.9% + $0.30)`
2. This gives: $4.00 - $0.42 = **$3.58**

## Recommendation

Use **Method 1** (Balance Transaction) for most accurate results:
- Fetches actual Stripe data
- Accounts for all fee variations
- Reflects what platform actually receives
- Works for all currencies and fee structures

## Implementation Status

✅ Edge Function updated to fetch balance transactions
✅ Service updated to use balance transaction data
✅ Falls back to estimated calculation if balance transaction unavailable

## Next Steps

1. Deploy updated Edge Function
2. Test with actual payment intents
3. Verify calculations match Stripe dashboard
4. Update database with accurate platform earnings

