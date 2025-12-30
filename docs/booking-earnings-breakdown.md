# Detailed Earnings Breakdown for a $100 Base Price Booking

## Current Fee Structure
Based on the fee settings in the database:
- **Seeker Service Rate**: 12% of base amount
- **Partner Fee Rate (Commission)**: 4% of base amount
- **Processing Fee**: 1.75% of (base + service fee) + $0.30 fixed
- **Stripe Fees**: 2.9% + $0.30 per transaction

---

## 💰 Complete Financial Breakdown

### 1️⃣ **Base Booking Amount**
- **Base Price**: $100.00
  - This is what the space owner lists their space for

---

### 2️⃣ **Fees Added to Booking**

#### **Service Fee** (12% of base amount)
- Calculation: $100.00 × 12% = **$12.00**
- Paid by: Seeker (the person booking the space)
- Goes to: Platform

#### **Processing Fee** (1.75% + $0.30 fixed)
- Calculation: (($100.00 + $12.00) × 1.75%) + $0.30
- Calculation: ($112.00 × 0.0175) + $0.30
- Calculation: $1.96 + $0.30 = **$2.26**
- Paid by: Seeker
- Goes to: Platform

---

### 3️⃣ **Total Amount Paid by Seeker**
- Base Amount: $100.00
- Service Fee: $12.00
- Processing Fee: $2.26
- **TOTAL PAID**: **$114.26**

---

### 4️⃣ **Commission (Partner Fee)**
- **Commission Rate**: 4% of base amount
- **Commission Amount**: $100.00 × 4% = **$4.00**
- Deducted from: Base amount (paid to space owner)
- Goes to: Platform

---

### 5️⃣ **Space Owner (Partner) Payout**
- Base Amount: $100.00
- Minus Commission: -$4.00
- **NET PAYOUT TO SPACE OWNER**: **$96.00**

---

### 6️⃣ **Platform Revenue Streams**

The platform earns money from three sources:

#### **A. Service Fee Revenue**
- **Gross**: $12.00
- **Note**: This is separate from commission and is kept by the platform

#### **B. Processing Fee Revenue**
- **Gross**: $2.26
- **Note**: This covers payment processing costs

#### **C. Commission Revenue** (what we track in commission dashboard)
- **Commission (Before Fees)**: $4.00
- **Stripe Fees on Commission**: 
  - Calculation: ($4.00 × 2.9%) + $0.30
  - Calculation: $0.116 + $0.30 = **$0.416** ≈ **$0.42**
- **Platform Earnings (Net after Stripe fees)**: 
  - $4.00 - $0.42 = **$3.58**

---

## 📊 Summary Table

| Item | Amount | Who Pays/Receives |
|------|--------|-------------------|
| **Base Price** | $100.00 | Seeker → Space Owner |
| **Service Fee** | $12.00 | Seeker → Platform |
| **Processing Fee** | $2.26 | Seeker → Platform |
| **Total Paid by Seeker** | **$114.26** | Seeker |
| | | |
| **Commission** | $4.00 | Deducted from Base |
| **Stripe Fees (on commission)** | $0.42 | Platform pays to Stripe |
| **Platform Earnings (Net)** | **$3.58** | Platform (from commission) |
| | | |
| **Space Owner Receives** | **$96.00** | Base - Commission |
| **Platform Total Revenue** | **$17.26** | Service Fee + Processing Fee + Commission |
| **Platform Net Revenue (from commission only)** | **$3.58** | Commission - Stripe Fees |

---

## 🎯 Key Points

1. **Platform Earnings ($3.58)** - This is what shows in the "Platform Earnings" card on the commission dashboard. It represents the net commission after Stripe fees are deducted.

2. **Commission (Before Fees) ($4.00)** - This is what shows in the "Commission (Before Fees)" card. It's the gross commission before Stripe fees.

3. **Total Platform Revenue** - The platform actually receives more than just the commission:
   - Service Fee: $12.00
   - Processing Fee: $2.26
   - Commission (net): $3.58
   - **Total: $17.84**

4. **Stripe Fees** - Stripe charges 2.9% + $0.30 on the commission amount ($4.00), resulting in $0.42 in fees.

5. **Space Owner** - Receives $96.00 (base amount minus commission).

6. **Seeker** - Pays $114.26 total for a $100 listing.

---

## 🔄 Example Calculation in Code

```javascript
// Base amount
const baseAmount = 100.00;

// Service fee (12%)
const serviceFee = baseAmount * 0.12; // $12.00

// Processing fee (1.75% of base + service fee + $0.30)
const processingFee = ((baseAmount + serviceFee) * 0.0175) + 0.30; // $2.26

// Commission (4% of base)
const commission = baseAmount * 0.04; // $4.00

// Stripe fees on commission (2.9% + $0.30)
const stripeFees = (commission * 0.029) + 0.30; // $0.42

// Platform earnings (net commission after Stripe fees)
const platformEarnings = commission - stripeFees; // $3.58

// Space owner payout
const spaceOwnerPayout = baseAmount - commission; // $96.00

// Total paid by seeker
const totalPaid = baseAmount + serviceFee + processingFee; // $114.26
```

---

## 📈 What Gets Tracked in Commission Dashboard

The commission management dashboard specifically tracks:
- **Total Booking Revenue**: Sum of all base amounts ($6,445.14 for all bookings)
- **Commission (Before Fees)**: Sum of all commission_partner values ($438.60)
- **Platform Earnings**: Sum of all platform_earnings (commission net after Stripe fees) ($410.15)
- **Host Payouts**: Sum of (base_amount - commission_partner) for all bookings

