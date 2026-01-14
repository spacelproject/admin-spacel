# Category Management Implementation

## Overview
The Category Management system has been updated to use the database (`space_categories` table) instead of mock data. This ensures that categories created in the admin panel are immediately available to partner and seeker apps.

## Database Schema

### Table: `space_categories`
- **id** (UUID): Primary key
- **name** (VARCHAR(100)): Unique identifier (e.g., 'office', 'retail')
- **label** (VARCHAR(100)): Display name (e.g., 'Office Space', 'Retail Space')
- **description** (TEXT): Optional description
- **icon** (VARCHAR(50)): Optional icon identifier
- **parent_id** (UUID): Reference to parent category (NULL for main categories)
- **is_active** (BOOLEAN): Whether the category is active
- **sort_order** (INTEGER): Display order
- **created_at** (TIMESTAMP): Creation timestamp
- **updated_at** (TIMESTAMP): Last update timestamp

### Structure
- **Main Categories**: Have `parent_id = NULL`
- **Subcategories**: Have `parent_id` pointing to their parent category's `id`

## Setup

### 1. Run the Migration
Execute the migration file to create the table:
```sql
-- Run: supabase/migrations/create_space_categories_table.sql
```

Or manually run:
```bash
psql -h your-db-host -U postgres -d your-db-name -f supabase/migrations/create_space_categories_table.sql
```

### 2. Verify Table Creation
The migration will:
- Create the `space_categories` table
- Add necessary indexes
- Set up RLS policies
- Insert default categories and subcategories

## Usage

### Admin Panel
1. Navigate to **Space Management** page
2. Click **"Manage Categories"** to expand the category management section
3. **Add Main Category**: Enter category name and click "Add Category"
4. **Add Subcategory**: Select a main category, enter subcategory name, click "Add SubCategory"
5. **Edit**: Click the edit icon next to any category/subcategory
6. **Delete**: Click the trash icon (will prevent deletion if category is in use)

### For Partner/Seeker Apps
To fetch categories for use in partner/seeker apps, query the `space_categories` table:

```javascript
// Fetch all active main categories
const { data: mainCategories } = await supabase
  .from('space_categories')
  .select('*')
  .is('parent_id', null)
  .eq('is_active', true)
  .order('sort_order', { ascending: true });

// Fetch subcategories for a specific category
const { data: subCategories } = await supabase
  .from('space_categories')
  .select('*')
  .eq('parent_id', parentCategoryId)
  .eq('is_active', true)
  .order('sort_order', { ascending: true });

// Or fetch all categories with their subcategories in one query
const { data: allCategories } = await supabase
  .from('space_categories')
  .select('*, parent:parent_id(*)')
  .eq('is_active', true)
  .order('sort_order', { ascending: true });
```

## API Endpoints (for Partner/Seeker Apps)

### Recommended: Create a Supabase Edge Function
Create an edge function to provide a clean API for fetching categories:

```typescript
// supabase/functions/get-categories/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  // Fetch all active categories
  const { data: categories, error } = await supabase
    .from('space_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Transform to hierarchical structure
  const mainCategories = categories.filter(cat => !cat.parent_id)
  const subCategories = categories.filter(cat => cat.parent_id)

  const result = mainCategories.map(main => ({
    id: main.name,
    name: main.name,
    label: main.label,
    description: main.description,
    icon: main.icon,
    subCategories: subCategories
      .filter(sub => sub.parent_id === main.id)
      .map(sub => ({
        id: sub.name,
        name: sub.name,
        label: sub.label,
        description: sub.description,
        icon: sub.icon
      }))
  }))

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

## Features

### ✅ Implemented
- ✅ Database persistence for categories
- ✅ Create main categories
- ✅ Create subcategories
- ✅ Edit categories and subcategories
- ✅ Delete categories (with usage validation)
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications
- ✅ RLS policies for security
- ✅ Default categories migration

### 🔄 Real-time Updates
Categories are automatically refreshed when:
- A new category is created
- A category is updated
- A category is deleted

The admin panel will show the latest categories immediately. Partner/seeker apps should refresh their category list periodically or use Supabase real-time subscriptions.

## Security

### Row Level Security (RLS)
- **Public Read**: Anyone can read active categories (for partner/seeker apps)
- **Admin Write**: Only admins can create/update/delete categories

### Validation
- Prevents deletion of categories that are in use by listings
- Ensures unique category names
- Validates required fields

## Troubleshooting

### "Categories table not found" Error
**Solution**: Run the migration file to create the `space_categories` table.

### Categories Not Appearing in Partner/Seeker Apps
**Check**:
1. Ensure `is_active = TRUE` for categories
2. Verify RLS policies allow public read access
3. Check that partner/seeker apps are querying the correct table
4. Verify the category `name` matches what's used in listings

### Cannot Delete Category
**Reason**: Category is being used by one or more listings.
**Solution**: Either:
- Delete or update the listings using that category first
- Or change the category of those listings to a different category

## Migration from Mock Data

The system automatically migrates from mock data:
1. Default categories are inserted on first migration
2. Existing listings continue to work (they use `category` and `subcategory` string fields)
3. New categories created in admin panel are immediately available

## Next Steps

1. **Run the migration** to create the table
2. **Test category creation** in the admin panel
3. **Update partner/seeker apps** to fetch from `space_categories` table
4. **Consider adding icons** to categories for better UI
5. **Add category descriptions** for better user experience

