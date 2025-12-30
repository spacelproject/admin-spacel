// Create Pending Listing Script
// This script creates a real pending listing in the database for testing
// Run this in your browser console while logged into the admin panel

import { supabase } from './src/lib/supabase.js'

async function createPendingListing() {
  try {
    console.log('🔍 Creating pending listing...')
    
    // Step 1: Get an existing partner from the database
    const { data: partners, error: partnersError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .eq('role', 'partner')
      .limit(1)
    
    if (partnersError) {
      console.error('❌ Error fetching partners:', partnersError)
      return
    }
    
    if (!partners || partners.length === 0) {
      console.error('❌ No partners found in database. Please create a partner first.')
      return
    }
    
    const partner = partners[0]
    console.log('✅ Found partner:', partner.email)
    
    // Step 2: Create a pending listing
    const newListing = {
      partner_id: partner.id,
      name: 'Modern Co-working Space',
      description: 'A spacious and modern co-working area perfect for teams and individuals. Features include high-speed WiFi, comfortable seating, meeting rooms, kitchen facilities, and 24/7 access. Located in the heart of the city with easy access to public transportation.',
      address: '123 Business Street, Sydney NSW 2000',
      images: ['/assets/images/no_image.png'],
      category: 'office',
      subcategory: 'co-working',
      hourly_price: 25,
      daily_price: 180,
      capacity: 20,
      area: 500,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('📝 Creating listing:', newListing.name)
    
    const { data: listing, error: insertError } = await supabase
      .from('listings')
      .insert(newListing)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Error creating listing:', insertError)
      return
    }
    
    console.log('✅ Pending listing created successfully!')
    console.log('📋 Listing details:', {
      id: listing.id,
      name: listing.name,
      partner: partner.email,
      status: listing.status,
      submitted_at: listing.submitted_at
    })
    console.log('🔄 Refresh the dashboard to see the pending listing in the Pending Approvals section.')
    
    return listing
    
  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

// Run the script
createPendingListing()

