# App Update Management - Testing Guide

## 🚀 Quick Start

### 1. Start the Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173` (or the port shown in terminal).

### 2. Access the Feature

1. **Login** to the admin dashboard (if not already logged in)
2. **Navigate** to "App Updates" in the sidebar menu (or go to `/app-updates`)
3. You should see the App Update Management page

---

## ✅ Testing Checklist

### **Test 1: Page Load & Initial State**

**Steps:**
1. Navigate to `/app-updates`
2. Check if the page loads without errors
3. Verify default values are shown (if no config exists in DB)

**Expected:**
- ✅ Page loads with loading spinner, then shows form
- ✅ All form fields are populated with default values
- ✅ Current app version shows "1.0.4"
- ✅ Preview section displays correctly

---

### **Test 2: Load Existing Configuration**

**Prerequisites:** 
- First, save a configuration (see Test 3), then refresh the page

**Steps:**
1. Save a configuration
2. Refresh the page
3. Check if saved values are loaded

**Expected:**
- ✅ Form fields populate with saved values
- ✅ "Last updated" timestamp shows correctly
- ✅ No errors in console

**Verify in Database:**
```sql
SELECT key, value, updated_at 
FROM app_config 
WHERE key = 'update_config';
```

---

### **Test 3: Save Configuration**

**Steps:**
1. Fill in all form fields with valid values:
   - Latest Version: `1.4.0`
   - Min Supported Version: `1.2.0`
   - Update Type: `forced`
   - Update Message: `Please update to continue using the app.`
   - Android Store URL: `https://play.google.com/store/apps/details?id=com.spacel.marketplace`
   - iOS Store URL: `https://apps.apple.com/app/spacel-marketplace/id123456789`
   - Enabled: `checked`
2. Click "Save Configuration"
3. Confirm the dialog
4. Check for success message

**Expected:**
- ✅ Confirmation dialog appears
- ✅ Success toast message: "Update configuration saved successfully"
- ✅ "Last updated" timestamp updates
- ✅ No errors in console

**Verify in Database:**
```sql
SELECT value FROM app_config WHERE key = 'update_config';
-- Should return JSON string with your values
```

---

### **Test 4: Validation - Semantic Version Format**

**Steps:**
1. Enter invalid version in "Latest Version":
   - Try: `1.4` (missing patch)
   - Try: `v1.4.0` (has prefix)
   - Try: `1.4.0.1` (too many parts)
   - Try: `1.4.0-beta` (has suffix)
2. Try to save

**Expected:**
- ✅ Error message: "Must be in format X.Y.Z (e.g., 1.4.0)"
- ✅ Save button should work, but validation prevents save
- ✅ Error clears when you fix the format

**Valid formats that should work:**
- ✅ `1.0.0`
- ✅ `1.4.0`
- ✅ `10.20.30`

---

### **Test 5: Validation - Min Version ≤ Latest Version**

**Steps:**
1. Set Latest Version: `1.0.3`
2. Set Min Supported Version: `1.0.5` (higher than latest)
3. Try to save

**Expected:**
- ✅ Error message: "Must be less than or equal to latest version"
- ✅ Save is prevented

**Valid combinations:**
- ✅ Latest: `1.4.0`, Min: `1.2.0` ✓
- ✅ Latest: `1.4.0`, Min: `1.4.0` ✓ (equal is allowed)
- ❌ Latest: `1.0.3`, Min: `1.0.5` ✗ (should fail)

---

### **Test 6: Validation - Update Message Length**

**Steps:**
1. Enter message with 501 characters (over limit)
2. Try to save

**Expected:**
- ✅ Error message: "Update message must be 500 characters or less"
- ✅ Character counter shows "501/500"
- ✅ Save is prevented

**Valid:**
- ✅ 500 characters or less ✓
- ❌ 501+ characters ✗

---

### **Test 7: Validation - Store URLs**

**Steps:**
1. Enter invalid URLs:
   - `http://example.com` (not HTTPS)
   - `not-a-url` (invalid format)
   - `https://` (incomplete)
2. Try to save

**Expected:**
- ✅ Error message: "Must be a valid HTTPS URL"
- ✅ Save is prevented

**Valid URLs:**
- ✅ `https://play.google.com/store/apps/details?id=com.spacel.marketplace`
- ✅ `https://apps.apple.com/app/spacel-marketplace/id123456789`
- ❌ `http://example.com` ✗ (must be HTTPS)

---

### **Test 8: Update Type Selection**

**Steps:**
1. Select "Forced Update" from dropdown
2. Check preview section
3. Select "Optional Update"
4. Check preview section again

**Expected:**
- ✅ Dropdown shows selected value
- ✅ Preview section updates (though preview shows user experience, not the update type setting)
- ✅ Both options can be selected

---

### **Test 9: Enabled Toggle**

**Steps:**
1. Uncheck "Enable Update System"
2. Save configuration
3. Reload page
4. Check if toggle is still unchecked

**Expected:**
- ✅ Toggle can be checked/unchecked
- ✅ Value persists after save and reload
- ✅ When disabled, update system should be inactive (for Flutter app)

---

### **Test 10: Reset to Defaults**

**Steps:**
1. Modify some form values
2. Click "Reset to Defaults"
3. Confirm the dialog
4. Check if values reset

**Expected:**
- ✅ Confirmation dialog appears
- ✅ All fields reset to default values
- ✅ Info toast: "Form reset to default values"
- ✅ No errors

---

### **Test 11: Preview Section**

**Steps:**
1. Set Latest Version: `1.4.0`
2. Set Min Supported Version: `1.2.0`
3. Check preview section

**Expected:**
- ✅ Shows three scenarios:
  - Users on version < 1.2.0: **FORCED UPDATE**
  - Users on version >= 1.2.0 but < 1.4.0: **OPTIONAL UPDATE**
  - Users on version >= 1.4.0: **NO UPDATE**
- ✅ Preview updates when you change versions

---

### **Test 12: Edge Function Integration**

**Steps:**
1. Save a configuration in the admin panel
2. Test your Edge Function endpoint:
   ```bash
   curl https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/app-config
   ```
   Or use Postman/Thunder Client

**Expected:**
- ✅ Edge Function returns the JSON config you saved
- ✅ Response matches the structure:
  ```json
  {
    "latestVersion": "1.4.0",
    "minSupportedVersion": "1.2.0",
    "updateType": "forced",
    "updateMessage": "Please update to continue using the app.",
    "androidStoreUrl": "https://play.google.com/store/apps/details?id=com.spacel.marketplace",
    "iosStoreUrl": "https://apps.apple.com/app/spacel-marketplace/id123456789",
    "enabled": true
  }
  ```

---

### **Test 13: Error Handling**

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Disconnect internet (or block Supabase requests)
4. Try to save configuration

**Expected:**
- ✅ Error toast: "Error saving configuration"
- ✅ Error logged to console
- ✅ Form remains editable (not stuck in loading state)

---

### **Test 14: Loading States**

**Steps:**
1. Navigate to page
2. Check initial load

**Expected:**
- ✅ Loading spinner shows while fetching config
- ✅ "Loading update configuration..." message
- ✅ Form appears after data loads

**During Save:**
- ✅ "Saving..." button text
- ✅ Save button disabled
- ✅ All form fields disabled

---

## 🧪 Manual Database Testing

### Check Database Directly

```sql
-- View current config
SELECT key, value, updated_at 
FROM app_config 
WHERE key = 'update_config';

-- Delete config (to test default values)
DELETE FROM app_config WHERE key = 'update_config';

-- Insert test config manually
INSERT INTO app_config (key, value, updated_at)
VALUES (
  'update_config',
  '{"latestVersion":"1.4.0","minSupportedVersion":"1.2.0","updateType":"forced","updateMessage":"Test message","androidStoreUrl":"https://play.google.com/store/apps/details?id=com.spacel.marketplace","iosStoreUrl":"https://apps.apple.com/app/spacel-marketplace/id123456789","enabled":true}',
  NOW()
)
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

---

## 🐛 Common Issues & Solutions

### Issue: "Error loading configuration"
**Solution:** 
- Check Supabase connection
- Verify `app_config` table exists
- Check browser console for detailed error

### Issue: Validation errors not showing
**Solution:**
- Check browser console for JavaScript errors
- Verify validation functions are imported correctly

### Issue: Save button not working
**Solution:**
- Check if all required fields are filled
- Verify no validation errors (red text under fields)
- Check browser console for errors

### Issue: Config not loading on page refresh
**Solution:**
- Check database: `SELECT * FROM app_config WHERE key = 'update_config';`
- Verify JSON is valid in database
- Check network tab in DevTools for API response

---

## 📝 Test Scenarios Summary

| Test | Status | Notes |
|------|--------|-------|
| Page Load | ⬜ | Should show defaults or saved config |
| Save Config | ⬜ | Should save to database |
| Load Config | ⬜ | Should load on page refresh |
| Version Validation | ⬜ | Must be X.Y.Z format |
| Min ≤ Latest | ⬜ | Min version validation |
| Message Length | ⬜ | Max 500 characters |
| URL Validation | ⬜ | Must be HTTPS |
| Update Type | ⬜ | Forced/Optional selection |
| Enabled Toggle | ⬜ | Master switch |
| Reset Defaults | ⬜ | Should reset all fields |
| Preview Section | ⬜ | Should show user scenarios |
| Edge Function | ⬜ | Should return saved config |
| Error Handling | ⬜ | Should show user-friendly errors |
| Loading States | ⬜ | Should show spinners |

---

## 🎯 Quick Test Script

Run this in your browser console after loading the page:

```javascript
// Check if config loaded
console.log('Config loaded:', document.querySelector('[data-testid="app-updates-form"]') !== null);

// Check validation
const latestVersion = document.querySelector('input[placeholder="1.4.0"]')?.value;
console.log('Latest version:', latestVersion);
console.log('Is valid semver:', /^\d+\.\d+\.\d+$/.test(latestVersion));
```

---

## ✅ Success Criteria

The feature is working correctly if:

1. ✅ Page loads without errors
2. ✅ Form fields are editable
3. ✅ Validation works for all fields
4. ✅ Save persists to database
5. ✅ Load retrieves from database
6. ✅ Preview section updates correctly
7. ✅ Error messages are user-friendly
8. ✅ Loading states work properly
9. ✅ Edge Function can read the config
10. ✅ All edge cases handled gracefully

---

**Happy Testing! 🚀**

