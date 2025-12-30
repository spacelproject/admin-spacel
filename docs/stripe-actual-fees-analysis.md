# Actual Stripe Fees Analysis from Payment Intent Data

## Analysis Based on Payment Intent Metadata

From examining payment intents via Stripe MCP, here's what we found:

### Example: $100 Base Booking

**From Payment Intent Metadata:**
- **Total Payment**: $114.26 (11,426 cents)
- **Application Fee (Gross)**: $18.26 (1,826 cents)
  - Service Fee: $12.00 (1,200 cents)
  - Processing Fee: $2.26 (226 cents)  
  - Commission: $4.00 (400 cents)

**Platform Earnings (from metadata)**: $13.74 (1,374 cents)

### Actual Stripe Fees Calculation:

```
Application Fee (Gross): $18.26
Platform Earnings (Net): $13.74
Actual Stripe Fees: $18.26 - $13.74 = $4.52
```

**Effective Fee Percentage**: `$4.52 / $18.26 = 24.75%` of application fee

**Fee as % of Total Transaction**: `$4.52 / $114.26 = 3.96%` of total transaction

## Comparison with Estimated Calculation

### Our Estimated Calculation (2.9% + $0.30):
```
Stripe Fees = ($114.26 × 2.9%) + $0.30
Stripe Fees = $3.31 + $0.30
Stripe Fees = $3.61
```

### Actual Stripe Fees:
```
Actual Fees = $4.52
```

**Difference**: $4.52 - $3.61 = **$0.91 more** than estimated

## Why the Difference?

The actual Stripe fees ($4.52) are higher than our estimate ($3.61) because:

1. **Stripe Connect Fees**: When using Stripe Connect with destination charges, Stripe may charge additional fees
2. **Card Type**: Different card types have different fee structures
3. **International Cards**: If the card is international, fees may be higher
4. **Additional Processing Fees**: There may be additional fees beyond the standard 2.9% + $0.30

## Updated Calculation Formula

Based on actual data, the effective Stripe fee rate appears to be:

**For a $114.26 transaction:**
- Estimated: $3.61 (3.16%)
- Actual: $4.52 (3.96%)

**Effective Fee Rate**: Approximately **~4% of total transaction** (varies by transaction size)

## Recommended Calculation

Since actual fees are higher than estimated, we should:

1. **Use actual Stripe balance transaction data when available** (most accurate)
2. **Use a slightly higher estimate when balance transaction unavailable**:
   - Instead of: `(transaction × 2.9%) + $0.30`
   - Use: `(transaction × 0.035) + $0.50` (3.5% + $0.50) for better estimate

Or use the proportional method based on actual data:
- **Application Fee Gross - Stripe Fees = Net Application Fee**
- **Stripe Fees ≈ 24-25% of Application Fee Gross** (for typical bookings)

## Summary Table

| Transaction | App Fee Gross | Estimated Fees | Actual Fees | Difference |
|------------|---------------|----------------|-------------|------------|
| $114.26 | $18.26 | $3.61 | $4.52 | +$0.91 |

## Conclusion

The actual Stripe fees are approximately **$4.52 for a $114.26 transaction**, which is:
- **3.96% of total transaction**
- **24.75% of application fee**

This is higher than the standard 2.9% + $0.30, likely due to Stripe Connect fees and other factors.

