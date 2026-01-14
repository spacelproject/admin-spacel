# Space Categories in Database

## Summary
- **Total Categories**: 99
- **Main Categories**: 9
- **Subcategories**: 90 (10 per main category)

---

## Category Hierarchy

### 1. Office Space (`office`) — 10 subcategories
   - **Subcategories:**
     1. Meeting Room (`meeting_room`)
     2. Conference Room (`conference_room`)
     3. Private Office (`private_office`)
     4. Open Workspace (`open_workspace`)
     5. Coworking Space (`coworking_space`)
     6. Executive Suite (`executive_suite`)
     7. Virtual Office (`virtual_office`)
     8. Hot Desk (`hot_desk`)
     9. Dedicated Desk (`dedicated_desk`)
     10. Board Room (`board_room`)

### 2. Retail Space (`retail`) — 10 subcategories
   - **Subcategories:**
     1. Pop-up Store (`pop_up_store`)
     2. Showroom (`showroom`)
     3. Retail Shop (`retail_shop`)
     4. Market Stall (`market_stall`)
     5. Kiosk (`kiosk`)
     6. Gallery Space (`gallery_space`)
     7. Boutique (`boutique`)
     8. Storefront (`storefront`)
     9. Shopping Center Unit (`shopping_center_unit`)
     10. Department Store Space (`department_store_space`)

### 3. Industrial Space (`industrial`) — 10 subcategories
   - **Subcategories:**
     1. Warehouse (`warehouse`)
     2. Manufacturing Space (`manufacturing_space`)
     3. Storage Unit (`storage_unit`)
     4. Workshop (`workshop`)
     5. Factory Floor (`factory_floor`)
     6. Distribution Center (`distribution_center`)
     7. Cold Storage (`cold_storage`)
     8. Loading Bay (`loading_bay`)
     9. Industrial Kitchen (`industrial_kitchen`)
     10. Assembly Line (`assembly_line`)

### 4. Hospitality Space (`hospitality`) — 10 subcategories
   - **Subcategories:**
     1. Restaurant (`restaurant`)
     2. Bar (`bar`)
     3. Café (`café`)
     4. Banquet Hall (`banquet_hall`)
     5. Hotel Room (`hotel_room`)
     6. Event Venue (`event_venue`)
     7. Catering Kitchen (`catering_kitchen`)
     8. Rooftop Space (`rooftop_space`)
     9. Lounge (`lounge`)
     10. Private Dining Room (`private_dining_room`)

### 5. Healthcare Space (`healthcare`) — 10 subcategories
   - **Subcategories:**
     1. Medical Office (`medical_office`)
     2. Clinic Space (`clinic_space`)
     3. Therapy Room (`therapy_room`)
     4. Laboratory (`laboratory`)
     5. Examination Room (`examination_room`)
     6. Dental Office (`dental_office`)
     7. Wellness Center (`wellness_center`)
     8. Pharmacy Space (`pharmacy_space`)
     9. Rehabilitation Center (`rehabilitation_center`)
     10. Medical Equipment Room (`medical_equipment_room`)

### 6. Mixed Use Space (`mixed`) — 10 subcategories
   - **Subcategories:**
     1. Mixed-Use Space (`mixed_use_space`)
     2. Flexible Space (`flexible_space`)
     3. Multi-Purpose Room (`multi_purpose_room`)
     4. Hybrid Workspace (`hybrid_workspace`)
     5. Adaptable Venue (`adaptable_venue`)
     6. Community Space (`community_space`)
     7. Shared Facility (`shared_facility`)
     8. Convertible Space (`convertible_space`)
     9. Variable Layout (`variable_layout`)
     10. Modular Space (`modular_space`)

### 7. Farm Space (`farm`) — 10 subcategories
   - **Subcategories:**
     1. Agricultural Land (`agricultural_land`)
     2. Greenhouse (`greenhouse`)
     3. Barn (`barn`)
     4. Storage Facility (`storage_facility`)
     5. Farm Office (`farm_office`)
     6. Processing Plant (`processing_plant`)
     7. Animal Shelter (`animal_shelter`)
     8. Crop Storage (`crop_storage`)
     9. Farm Equipment Storage (`farm_equipment_storage`)
     10. Irrigation Facility (`irrigation_facility`)

### 8. Creative Space (`creative`) — 10 subcategories
   - **Subcategories:**
     1. Art Studio (`art_studio`)
     2. Music Studio (`music_studio`)
     3. Photography Studio (`photography_studio`)
     4. Design Studio (`design_studio`)
     5. Recording Studio (`recording_studio`)
     6. Rehearsal Space (`rehearsal_space`)
     7. Maker Space (`maker_space`)
     8. Craft Workshop (`craft_workshop`)
     9. Video Production Studio (`video_production_studio`)
     10. Dance Studio (`dance_studio`)

### 9. Entertainment Space (`entertainment`) — 10 subcategories
   - **Subcategories:**
     1. Event Space (`event_space`)
     2. Theater (`theater`)
     3. Cinema (`cinema`)
     4. Game Room (`game_room`)
     5. Party Hall (`party_hall`)
     6. Concert Venue (`concert_venue`)
     7. Sports Facility (`sports_facility`)
     8. Amusement Center (`amusement_center`)
     9. Arcade (`arcade`)
     10. Club Space (`club_space`)

---

## Database Structure

All categories are stored in the `space_categories` table with the following structure:
- Main categories have `parent_id = NULL`
- Subcategories have `parent_id` pointing to their parent category's UUID
- All categories have `is_active = TRUE`
- Categories are ordered by `sort_order`

## Category IDs (for reference)

### Main Categories:
- `office` → Office Space
- `retail` → Retail Space
- `industrial` → Industrial Space
- `hospitality` → Hospitality Space
- `healthcare` → Healthcare Space
- `mixed` → Mixed Use Space
- `farm` → Farm Space
- `creative` → Creative Space
- `entertainment` → Entertainment Space

### All 90 Subcategories:
Each main category has exactly 10 subcategories as listed above in the Category Hierarchy section.

---

*Last updated: Based on database query from space_categories table*

