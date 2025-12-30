# Commission Dashboard Metrics Breakdown

## How Each Metric is Calculated

### 1. **Total Booking Revenue: $6,445.14**

**Calculation:**
```javascript
totalRevenue = sum of all booking.base_amount
```

**Code Location:** `src/hooks/useCommissionData.js:270`
```javascript
const totalRevenue = transformedBookings.reduce((sum, b) => sum + b.bookingAmount, 0)
// where bookingAmount = booking.base_amount
```

**What it represents:**
- Sum of all base booking amounts (what the space costs before fees)
- This is the total value of bookings made

---

### 2. **Net Application Fee: $1,062.63**

**Calculation:**
```javascript
totalNetApplicationFee = sum of all booking.net_application_fee (from database)
```

**Code Location:** `src/hooks/useCommissionData.js:276`
```javascript
const totalNetApplicationFee = transformedBookings.reduce(
  (sum, b) => sum + (b.netApplicationFee || 0), 0
)
// where netApplicationFee = booking.net_application_fee from database
```

**What it represents:**
- Total platform revenue after Stripe fees
- Formula: `(Service Fee + Processing Fee + Commission) - Stripe Fees`
- For a $100 booking: $18.26 (gross) - $4.52 (Stripe fees) = **$13.74** (net)

**Database Field:** `bookings.net_application_fee`

---

### 3. **Platform Earnings: $1,038.57**

**Calculation:**
```javascript
totalPlatformEarnings = sum of all booking.platform_earnings (from database)
```

**Code Location:** `src/hooks/useCommissionData.js:273`
```javascript
const totalPlatformEarnings = transformedBookings.reduce(
  (sum, b) => sum + b.platformEarnings, 0
)
// where platformEarnings = booking.platform_earnings from database
```

**What it represents:**
- Net commission earnings after Stripe fees
- This is ONLY the commission portion (not service fee or processing fee)
- Formula: `Commission - Stripe Fees on Commission`
- For a $100 booking with $4 commission: ~$3.01 (net commission)

**Database Field:** `bookings.platform_earnings`

**Difference from Net Application Fee:**
- Net Application Fee = Total platform revenue (service fee + processing fee + commission - all Stripe fees)
- Platform Earnings = Only commission portion after Stripe fees

---

### 4. **Commission (Before Fees): $438.60**

**Calculation:**
```javascript
totalCommission = sum of all booking.commission_partner
```

**Code Location:** `src/hooks/useCommissionData.js:271`
```javascript
const totalCommission = transformedBookings.reduce(
  (sum, b) => sum + b.platformFee, 0
)
// where platformFee = booking.commission_partner
```

**What it represents:**
- Total partner commission before Stripe fees are deducted
- This is the gross commission amount
- For a $100 booking: typically $4.00 (4% commission)

**Database Field:** `bookings.commission_partner`

---

### 5. **Average Commission Rate: 6.8%**

**Calculation:**
```javascript
averageCommissionRate = (totalCommission / totalRevenue) × 100
```

**Code Location:** `src/hooks/useCommissionData.js:277`
```javascript
const averageCommissionRate = totalRevenue > 0 
  ? (totalCommission / totalRevenue) * 100 
  : 0
```

**Example:**
- Total Commission: $438.60
- Total Revenue: $6,445.14
- Average Rate: ($438.60 / $6,445.14) × 100 = **6.8%**

**What it represents:**
- Weighted average commission rate across all bookings
- Shows the overall commission percentage

---

### 6. **Total Transactions: 52**

**Calculation:**
```javascript
totalTransactions = count of all bookings
```

**Code Location:** `src/hooks/useCommissionData.js:286`
```javascript
totalTransactions: transformedBookings.length
```

**What it represents:**
- Total number of completed bookings this month
- Simple count of booking records

---

### 7. **Host Payouts: $6,006.54**

**Calculation:**
```javascript
totalHostPayouts = sum of (base_amount - commission_partner) for all bookings
```

**Code Location:** `src/hooks/useCommissionData.js:274`
```javascript
const totalHostPayouts = transformedBookings.reduce(
  (sum, b) => sum + b.hostPayout, 0
)
// where hostPayout = baseAmount - commissionPartner
// hostPayout = booking.base_amount - booking.commission_partner
```

**What it represents:**
- Total amount paid to hosts (space owners)
- Formula: `Base Amount - Commission`
- For a $100 booking with $4 commission: $100 - $4 = **$96.00**

**Example Calculation:**
- Total Booking Revenue: $6,445.14
- Total Commission: $438.60
- Host Payouts: $6,445.14 - $438.60 = **$6,006.54** ✅

---

## Complete Flow for a $100 Base Booking

### Step-by-Step Breakdown:

1. **Base Amount**: $100.00
   - This is what the space costs

2. **Service Fee** (12%): $12.00
   - Charged to seeker

3. **Processing Fee** (1.75% + $0.30): $2.26
   - Charged to seeker
   - Formula: `((base + service_fee) × 0.0175) + 0.30`

4. **Total Seeker Pays**: $114.26
   - Base + Service Fee + Processing Fee

5. **Commission** (4%): $4.00
   - Deducted from base amount
   - Goes to platform

6. **Host Receives**: $96.00
   - Base - Commission

7. **Application Fee Gross**: $18.26
   - Service Fee + Processing Fee + Commission
   - $12.00 + $2.26 + $4.00

8. **Stripe Fees** (3.96% of $114.26): $4.52
   - Deducted from platform balance

9. **Net Application Fee**: $13.74
   - Application Fee Gross - Stripe Fees
   - $18.26 - $4.52

10. **Platform Earnings** (Commission Net): ~$3.01
    - Commission portion of Net Application Fee
    - Formula: `Net Application Fee × (Commission / App Fee Gross)`
    - $13.74 × ($4.00 / $18.26) = $3.01

---

## Summary Table

| Metric | Value | Calculation | Database Field |
|--------|-------|-------------|----------------|
| **Total Booking Revenue** | $6,445.14 | Sum of `base_amount` | `bookings.base_amount` |
| **Net Application Fee** | $1,062.63 | Sum of `net_application_fee` | `bookings.net_application_fee` |
| **Platform Earnings** | $1,038.57 | Sum of `platform_earnings` | `bookings.platform_earnings` |
| **Commission (Before Fees)** | $438.60 | Sum of `commission_partner` | `bookings.commission_partner` |
| **Average Commission Rate** | 6.8% | `(totalCommission / totalRevenue) × 100` | Calculated |
| **Total Transactions** | 52 | Count of bookings | Count |
| **Host Payouts** | $6,006.54 | Sum of `(base_amount - commission_partner)` | Calculated |

---

## Key Differences

### Net Application Fee vs Platform Earnings:

- **Net Application Fee** ($1,062.63):
  - Total platform revenue after Stripe fees
  - Includes: Service Fee + Processing Fee + Commission (all net after Stripe fees)
  - This is what the platform actually receives in total

- **Platform Earnings** ($1,038.57):
  - Only the commission portion after Stripe fees
  - Excludes service fee and processing fee
  - This is the net commission earnings

**Difference**: $1,062.63 - $1,038.57 = $24.06
- This difference represents the net service fee + processing fee portions
- These fees also have Stripe fees deducted from them

---

## Verification

All calculations are done in `src/hooks/useCommissionData.js` starting at line 269:

```javascript
// Calculate summary stats
const totalRevenue = transformedBookings.reduce((sum, b) => sum + b.bookingAmount, 0)
const totalCommission = transformedBookings.reduce((sum, b) => sum + b.platformFee, 0)
const totalPlatformEarnings = transformedBookings.reduce((sum, b) => sum + b.platformEarnings, 0)
const totalHostPayouts = transformedBookings.reduce((sum, b) => sum + b.hostPayout, 0)
const totalNetApplicationFee = transformedBookings.reduce((sum, b) => sum + (b.netApplicationFee || 0), 0)
const averageCommissionRate = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0
```

These values are then passed to `RevenueSummaryCards` component which displays them.

