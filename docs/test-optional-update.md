# Testing Optional Update Feature

## 📋 Overview

**Optional Update** means users can dismiss the update dialog and continue using the app. This is different from **Forced Update** which blocks the app until the user updates.

---

## 🎯 Test Scenarios

### **Scenario 1: User on Version Between Min and Latest (Should See Optional Update)**

**Setup in Admin Panel:**
1. Go to `/app-updates`
2. Configure:
   - **Current App Version**: `1.0.4`
   - **Latest Version**: `1.4.0`
   - **Min Supported Version**: `1.2.0`
   - **Update Type**: `optional` ⭐
   - **Update Message**: `"A new version is available. Please update for the best experience."`
   - **Enabled**: ✅ checked
3. Click **Save Configuration**

**Test in Flutter App:**
1. Simulate app version `1.3.0` (between min `1.2.0` and latest `1.4.0`)
2. Launch the app
3. App calls Edge Function: `https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/app-config`
4. App receives config with `updateType: "optional"`

**Expected Behavior:**
- ✅ Update dialog appears
- ✅ Dialog shows your custom message
- ✅ User can **dismiss/close** the dialog
- ✅ App continues to work normally
- ✅ User can use the app without updating
- ✅ Dialog may appear again on next launch (depending on your Flutter implementation)

---

### **Scenario 2: User Below Min Version (Should See Forced Update)**

**Setup in Admin Panel:**
- Same config as above, but user's app version is `1.1.0` (below min `1.2.0`)

**Expected Behavior:**
- ⚠️ **Even with `updateType: "optional"`, users below min version should see FORCED update**
- ✅ App is blocked until update
- ✅ User cannot dismiss the dialog
- ✅ User must update to continue

**Note:** The `updateType` setting applies to users who are **above** the minimum version but **below** the latest version.

---

### **Scenario 3: User on Latest Version (No Update)**

**Setup:**
- User's app version: `1.4.0` (matches latest version)

**Expected Behavior:**
- ✅ No update dialog appears
- ✅ App works normally
- ✅ No update check needed

---

## 🧪 Step-by-Step Testing Guide

### **Step 1: Configure Optional Update in Admin Panel**

1. **Navigate to App Updates:**
   ```
   http://localhost:5173/app-updates
   ```

2. **Fill in the form:**
   ```
   Current App Version: 1.0.4
   Latest Version: 1.4.0
   Min Supported Version: 1.2.0
   Update Type: Optional Update  ← Select this
   Update Message: "A new version is available. Update now for new features!"
   Android Store URL: [your Play Store URL]
   iOS Store URL: [your App Store URL]
   Enabled: ✅
   ```

3. **Save the configuration**

4. **Verify in Database:**
   ```sql
   SELECT value FROM app_config WHERE key = 'update_config';
   ```
   
   Should return JSON with:
   ```json
   {
     "currentAppVersion": "1.0.4",
     "latestVersion": "1.4.0",
     "minSupportedVersion": "1.2.0",
     "updateType": "optional",  ← This is the key
     "updateMessage": "A new version is available...",
     "androidStoreUrl": "...",
     "iosStoreUrl": "...",
     "enabled": true
   }
   ```

---

### **Step 2: Test Edge Function Response**

**Using cURL:**
```bash
curl https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/app-config
```

**Using Postman/Thunder Client:**
- Method: `GET`
- URL: `https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/app-config`
- Headers: (if needed) `Authorization: Bearer YOUR_ANON_KEY`

**Expected Response:**
```json
{
  "currentAppVersion": "1.0.4",
  "latestVersion": "1.4.0",
  "minSupportedVersion": "1.2.0",
  "updateType": "optional",
  "updateMessage": "A new version is available. Update now for new features!",
  "androidStoreUrl": "https://play.google.com/store/apps/details?id=com.spacel.marketplace",
  "iosStoreUrl": "https://apps.apple.com/app/spacel-marketplace/id123456789",
  "enabled": true
}
```

---

### **Step 3: Test in Flutter App**

#### **Option A: Simulate Different App Versions**

In your Flutter app, temporarily hardcode different versions to test:

```dart
// Test version 1.3.0 (should see optional update)
String appVersion = "1.3.0";

// Test version 1.1.0 (should see forced update - below min)
String appVersion = "1.1.0";

// Test version 1.4.0 (should see no update)
String appVersion = "1.4.0";
```

#### **Option B: Use Flutter's Package Info**

```dart
import 'package:package_info_plus/package_info_plus.dart';

Future<void> checkForUpdates() async {
  // Get current app version
  PackageInfo packageInfo = await PackageInfo.fromPlatform();
  String currentVersion = packageInfo.version; // e.g., "1.3.0"
  
  // Call your Edge Function
  final response = await http.get(
    Uri.parse('https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/app-config'),
  );
  
  final config = jsonDecode(response.body);
  
  // Compare versions and show update dialog
  if (shouldShowUpdate(currentVersion, config)) {
    showUpdateDialog(config);
  }
}
```

---

### **Step 4: Verify Optional Update Behavior**

**When `updateType: "optional"` and user version is between min and latest:**

1. **Update Dialog Should:**
   - ✅ Show your custom message
   - Have "Update Now" button → Opens store
   - Have "Later" or "Dismiss" button → Closes dialog
   - Allow user to continue using app

2. **User Can:**
   - ✅ Click "Later" and continue using app
   - ✅ Dismiss the dialog
   - ✅ Use all app features normally
   - ✅ See dialog again on next launch (if you implement that)

3. **User Cannot:**
   - ❌ Be forced to update (unless below min version)

---

## 🔄 Comparison: Optional vs Forced

### **Optional Update (`updateType: "optional"`)**

| User Version | Behavior |
|-------------|----------|
| < Min Version (e.g., 1.1.0) | **FORCED** - Must update (blocks app) |
| >= Min but < Latest (e.g., 1.3.0) | **OPTIONAL** - Can dismiss, continue using |
| >= Latest (e.g., 1.4.0) | **NO UPDATE** - App is up to date |

### **Forced Update (`updateType: "forced"`)**

| User Version | Behavior |
|-------------|----------|
| < Min Version (e.g., 1.1.0) | **FORCED** - Must update (blocks app) |
| >= Min but < Latest (e.g., 1.3.0) | **FORCED** - Must update (blocks app) |
| >= Latest (e.g., 1.4.0) | **NO UPDATE** - App is up to date |

**Key Difference:** With "forced", even users above min version are blocked until they update.

---

## 📱 Flutter Implementation Example

Here's how your Flutter app should handle optional updates:

```dart
void showUpdateDialog(Map<String, dynamic> config) {
  final updateType = config['updateType']; // "optional" or "forced"
  final message = config['updateMessage'];
  final storeUrl = Platform.isAndroid 
    ? config['androidStoreUrl'] 
    : config['iosStoreUrl'];
  
  showDialog(
    context: context,
    barrierDismissible: updateType == 'optional', // Can dismiss if optional
    builder: (context) => AlertDialog(
      title: Text('Update Available'),
      content: Text(message),
      actions: [
        if (updateType == 'optional')
          TextButton(
            onPressed: () => Navigator.pop(context), // Dismiss
            child: Text('Later'),
          ),
        ElevatedButton(
          onPressed: () {
            // Open store URL
            launchUrl(Uri.parse(storeUrl));
            if (updateType == 'forced') {
              // Exit app if forced
              exit(0);
            }
          },
          child: Text('Update Now'),
        ),
      ],
    ),
  );
}
```

---

## ✅ Testing Checklist

- [ ] Configure optional update in admin panel
- [ ] Save configuration successfully
- [ ] Verify config in database
- [ ] Test Edge Function returns correct JSON
- [ ] Test with app version below min → Should be FORCED
- [ ] Test with app version between min and latest → Should be OPTIONAL
- [ ] Test with app version at/above latest → Should show NO UPDATE
- [ ] Verify optional dialog can be dismissed
- [ ] Verify user can continue using app after dismissing
- [ ] Verify "Update Now" button opens correct store URL
- [ ] Test on both Android and iOS

---

## 🐛 Troubleshooting

### **Issue: Optional update still blocks the app**

**Check:**
1. Is user's version below `minSupportedVersion`? → This will always be forced
2. Is `updateType` actually set to `"optional"` in the database?
3. Is your Flutter code checking `updateType` correctly?

### **Issue: Edge Function returns wrong config**

**Check:**
1. Verify the config in database:
   ```sql
   SELECT value FROM app_config WHERE key = 'update_config';
   ```
2. Check Edge Function code reads from `app_config` table
3. Verify JSON parsing in Edge Function

### **Issue: Update dialog doesn't appear**

**Check:**
1. Is `enabled: true` in the config?
2. Is app version comparison logic correct?
3. Is Edge Function being called on app launch?

---

## 🎯 Quick Test Commands

### **Test Edge Function:**
```bash
# Get config
curl https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/app-config

# Pretty print JSON
curl https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/app-config | jq
```

### **Check Database:**
```sql
-- View config
SELECT key, value::jsonb, updated_at 
FROM app_config 
WHERE key = 'update_config';

-- Update to optional manually
UPDATE app_config 
SET value = jsonb_set(
  value::jsonb, 
  '{updateType}', 
  '"optional"'
)
WHERE key = 'update_config';
```

---

**Happy Testing! 🚀**

