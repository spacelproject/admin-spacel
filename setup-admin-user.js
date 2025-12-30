// Admin User Setup Script
// Run this in your browser console while logged into the admin panel

import { supabase } from './src/lib/supabase.js'

async function setupAdminUser() {
  try {
    console.log('🔍 Setting up admin user...')
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      return
    }
    
    if (!user) {
      console.error('❌ No user found. Please log in first.')
      return
    }
    
    console.log('👤 Current user:', user.email)
    
    // Check if user exists in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Profile error:', profileError)
      return
    }
    
    console.log('📋 User profile:', profile)
    
    // Check if already in admin_users table
    const { data: existingAdmin, error: adminError } = await supabase
      .from('admin_users')
      .select('id, role, is_active')
      .eq('user_id', user.id)
      .single()
    
    if (existingAdmin) {
      console.log('✅ User is already an admin:', existingAdmin)
      return
    }
    
    // Add to admin_users table
    const { data: newAdmin, error: insertError } = await supabase
      .from('admin_users')
      .insert({
        user_id: user.id,
        role: 'super_admin',
        permissions: ['all'],
        is_active: true
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Insert error:', insertError)
      return
    }
    
    console.log('✅ Admin user created successfully:', newAdmin)
    console.log('🔄 Please refresh the page to see changes.')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

// Run the setup
setupAdminUser()
