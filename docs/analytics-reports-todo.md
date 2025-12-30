# Analytics Reports - TODO Fix List

This document outlines all the tasks needed to fix the Analytics & Reports page issues.

---

## 🔴 CRITICAL PRIORITY (Must Fix First)

### Filter Implementation
1. **Apply userType filter to profiles query**
   - Filter by role (partner for hosts, seeker for guests)
   - Location: `src/hooks/useAnalyticsData.js` line ~307-309
   - Status: ⏳ Pending

2. **Apply spaceCategory filter to listings query**
   - Filter listings by category field
   - Location: `src/hooks/useAnalyticsData.js` line ~315-317
   - Status: ⏳ Pending

3. **Apply bookingStatus filter to bookings query**
   - Filter bookings by status field
   - Location: `src/hooks/useAnalyticsData.js` line ~311-314
   - Status: ⏳ Pending

4. **Implement location filter**
   - Determine location field structure in database first
   - Apply filter to listings/address field
   - Location: `src/hooks/useAnalyticsData.js`
   - Status: ⏳ Pending

5. **Add filters to dependency array**
   - Include filters in fetchAnalyticsData useCallback dependencies
   - Location: `src/hooks/useAnalyticsData.js` line 381
   - Status: ⏳ Pending

### Custom Date Range Support
6. **Pass customDateRange to useAnalyticsData hook**
   - Update hook call in index.jsx to include customDateRange
   - Location: `src/pages/analytics-reports/index.jsx` line 35
   - Status: ⏳ Pending

7. **Update getDateRange() to handle custom dates**
   - Modify function to accept and use custom date range
   - Location: `src/hooks/useAnalyticsData.js` line 16-38
   - Status: ⏳ Pending

---

## 🟡 MEDIUM PRIORITY (Should Fix Next)

### Date Range Enhancements
8. **Add 6m (6 months) date range option**
   - Update getDateRange() switch statement
   - Location: `src/hooks/useAnalyticsData.js` line 20-35
   - Status: ⏳ Pending

9. **Add ytd (year to date) date range option**
   - Calculate from January 1st to current date
   - Location: `src/hooks/useAnalyticsData.js` line 20-35
   - Status: ⏳ Pending

### Query Improvements
10. **Add date filter to users query**
    - Filter profiles by created_at within date range
    - Location: `src/hooks/useAnalyticsData.js` line ~307-309
    - Status: ⏳ Pending

11. **Add date filter to listings query**
    - Filter listings by created_at within date range
    - Location: `src/hooks/useAnalyticsData.js` line ~315-317
    - Status: ⏳ Pending

12. **Fix previous period calculation logic**
    - Use proper date range comparison (previous period vs current period)
    - Location: `src/hooks/useAnalyticsData.js` line 53-60
    - Status: ⏳ Pending

---

## 🟢 LOW PRIORITY (Nice to Have)

### Real Data Integration
13. **Replace mock customer satisfaction**
    - Query reviews table for actual ratings
    - Calculate average rating
    - Location: `src/hooks/useAnalyticsData.js` line 124-125
    - Status: ⏳ Pending

14. **Replace mock response time**
    - Query support_tickets table
    - Calculate average response time
    - Location: `src/hooks/useAnalyticsData.js` line 127-128
    - Status: ⏳ Pending

### Filter Improvements
15. **Fix location filter options**
    - Query database for distinct locations
    - Update FilterControls component to use dynamic options
    - Location: `src/pages/analytics-reports/components/FilterControls.jsx`
    - Status: ⏳ Pending

### Code Cleanup
16. **Remove or verify earnings table query**
    - Check if earnings table exists in database
    - Remove query if table doesn't exist (earnings not used in calculations)
    - Location: `src/hooks/useAnalyticsData.js` line 318-323
    - Status: ⏳ Pending

17. **Fix real-time subscription memory leak**
    - Use static channel names instead of Date.now()
    - Improve cleanup logic
    - Location: `src/hooks/useAnalyticsData.js` line 386-406
    - Status: ⏳ Pending

### Feature Implementation
18. **Implement drill-down functionality**
    - Create modal/sheet for detailed view
    - Pass detailed data when drill-down clicked
    - Location: `src/pages/analytics-reports/index.jsx` line 114-117
    - Status: ⏳ Pending

19. **Implement report template logic**
    - Make different templates generate different report structures
    - Or remove template selection if not needed
    - Location: `src/pages/analytics-reports/index.jsx` line 129-142
    - Status: ⏳ Pending

20. **Remove or implement schedule reports**
    - Either implement backend scheduling system
    - Or remove schedule UI from ReportGenerator component
    - Location: `src/pages/analytics-reports/components/ReportGenerator.jsx`
    - Status: ⏳ Pending

---

## 📋 Implementation Order Recommendation

### Phase 1: Critical Fixes (Est. 2-3 hours)
1. Pass customDateRange to hook
2. Update getDateRange() for custom dates
3. Apply userType filter
4. Apply bookingStatus filter
5. Apply spaceCategory filter
6. Add filters to dependency array
7. Implement location filter (after determining structure)

### Phase 2: Medium Priority (Est. 1-2 hours)
8. Add missing date range options (6m, ytd)
9. Add date filters to users and listings queries
10. Fix previous period calculation

### Phase 3: Low Priority (Est. 3-4 hours)
11. Replace mock data with real queries
12. Fix location filter options
13. Clean up earnings query
14. Fix memory leak in subscriptions
15. Implement drill-down (if needed)
16. Fix report templates (if needed)
17. Remove/implement schedule reports

**Total Estimated Time: 6-9 hours**

---

## ✅ Progress Tracking

- **Total Tasks:** 20
- **Critical:** 7 tasks
- **Medium:** 5 tasks  
- **Low:** 8 tasks
- **Completed:** 0
- **In Progress:** 0
- **Pending:** 20

---

*Last Updated: [Will be updated as tasks are completed]*

