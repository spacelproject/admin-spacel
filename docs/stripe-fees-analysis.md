# Stripe Fees Analysis: What Platform Actually Receives

## Current Understanding from Stripe Payment Intent Metadata

Based on actual Stripe payment intents, here's what we found:

### For a $100 Base Price Booking:

**From Payment Intent Metadata:**
- Total Payment: $114.26 (11,426 cents)
- Application Fee: $18.26 (1,826 cents)
  - This is the total platform revenue BEFORE Stripe fees
  - Includes: Service Fee ($12.00) + Processing Fee ($2.26) + Commission ($4.00)
- Metadata `platformEarnings`: $13.74 (1,374 cents)
  - This appears to be the NET platform earnings AFTER Stripe fees

### Breakdown:
1. **Application Fee Components:**
   - Service Fee: $12.00 (1,200 cents)
   - Processing Fee: $2.26 (226 cents)
   - Commission (partnerFee): $4.00 (400 cents)
   - **Total Application Fee: $18.26**

2. **Stripe Fees on Application Fee:**
   - If `platformEarnings` ($13.74) represents net after fees
   - Then Stripe fees = $18.26 - $13.74 = **$4.52**
   - This is approximately **24.8%** of the application fee

3. **Commission Portion:**
   - Commission: $4.00 (before Stripe fees)
   - Commission represents 21.9% of application fee ($4.00 / $18.26)
   - If we apply the same Stripe fee rate (24.8%):
     - Stripe fees on commission: $4.00 × 24.8% = $0.99
     - Net commission: $4.00 - $0.99 = **$3.01**

## ⚠️ Important Discovery

The `platformEarnings` in Stripe metadata ($13.74) represents the **total platform revenue net after Stripe fees**, not just the commission portion.

This includes:
- Service Fee (net after fees)
- Processing Fee (net after fees)  
- Commission (net after fees)

## Current Calculation vs. Actual Stripe Data

### Our Current Calculation:
- We calculate: Commission ($4.00) - Stripe fees (2.9% + $0.30) = **$3.58**
- This assumes Stripe charges fees only on the commission portion

### Actual Stripe Behavior (Stripe Connect):
- Stripe charges fees on the **entire payment transaction** ($114.26)
- The application fee ($18.26) is what the platform receives **gross**
- Stripe deducts fees from the total payment, not from the application fee separately
- The net platform receives from the application fee is $13.74

## Correct Calculation for Platform Earnings (Commission Portion)

Since Stripe fees are charged on the total transaction, we need to understand:

1. **Total Transaction:** $114.26
2. **Stripe Fees:** Approximately $4.52 (based on $18.26 - $13.74)
3. **Stripe Fee Rate:** ~3.96% of total transaction ($4.52 / $114.26)

For the commission portion specifically:
- Commission: $4.00
- Proportional Stripe fees on commission: Need to calculate based on total transaction fees
- Net commission: Less than $4.00

## Recommendation

We have two options:

### Option 1: Use Actual Stripe Balance Transaction Data
- Retrieve balance transaction from Stripe for each payment
- Calculate exact fees charged
- Determine net platform earnings accurately
- This requires calling Stripe API for balance transactions

### Option 2: Use Proportional Calculation
- If total Stripe fees on $114.26 transaction = ~$4.52
- Commission is 3.5% of total transaction ($4.00 / $114.26)
- Commission portion of Stripe fees: $4.52 × 3.5% = $0.16
- Net commission: $4.00 - $0.16 = **$3.84**

However, this may not be accurate because Stripe fees aren't necessarily proportional.

## Next Steps

1. ✅ Update Edge Function to retrieve balance transactions
2. ✅ Check actual Stripe balance transaction fees
3. ✅ Compare with our calculated values
4. ✅ Update platform earnings calculation to use actual Stripe data

## Key Insight

**The `platformEarnings` in Stripe metadata ($13.74) is the TOTAL platform revenue (all fees) net after Stripe fees, not just the commission.**

To get just the commission portion net:
- We need to extract it proportionally from the total net ($13.74)
- Or calculate Stripe fees specifically on the commission portion
- Or use balance transaction data to see exact fee breakdown

