/**
 * Sound notification utility
 * Plays a notification sound when new notifications arrive
 */

/**
 * Plays a notification sound using Web Audio API
 * Falls back to HTML5 Audio if Web Audio API is not available
 */
export const playNotificationSound = () => {
  console.log('🔊 playNotificationSound called')
  try {
    // Check if Web Audio API is available
    if (window.AudioContext || window.webkitAudioContext) {
      console.log('🔊 Using Web Audio API')
      playWebAudioSound()
    } else {
      console.log('🔊 Web Audio API not available, using HTML5 fallback')
      // Fallback to HTML5 Audio with a simple beep
      playHTML5Sound()
    }
  } catch (error) {
    console.error('❌ Error playing notification sound:', error)
    // Try a simple beep as last resort
    try {
      console.log('🔊 Attempting simple beep fallback...')
      simpleBeepFallback()
    } catch (fallbackError) {
      console.error('❌ All sound methods failed:', fallbackError)
    }
  }
}

/**
 * Plays a pleasant notification sound using Web Audio API
 * Creates a two-tone chime sound
 */
const playWebAudioSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    let audioContext = new AudioContext()
    
    console.log('🔊 Audio context state:', audioContext.state)
    
    // Handle browser autoplay restrictions
    // If the context is suspended, try to resume it (requires user interaction)
    if (audioContext.state === 'suspended') {
      console.log('🔊 Audio context suspended, attempting to resume...')
      audioContext.resume().then(() => {
        console.log('✅ Audio context resumed, state:', audioContext.state)
        // Play sound with the resumed context
        playSoundWithContext(audioContext)
      }).catch(err => {
        console.warn('⚠️ Could not resume audio context:', err)
        // Try simple beep fallback
        simpleBeepFallback()
      })
      return
    }
    
    console.log('🔊 Audio context ready, playing sound...')
    playSoundWithContext(audioContext)
  } catch (error) {
    console.error('❌ Web Audio API error:', error)
    console.log('🔊 Falling back to simple beep...')
    simpleBeepFallback()
  }
}

/**
 * Helper function to actually play the sound with a given audio context
 */
const playSoundWithContext = (audioContext) => {
  try {
    console.log('🔊 Creating oscillators...')
    // Create oscillator for the first tone (higher pitch)
    const oscillator1 = audioContext.createOscillator()
    const gainNode1 = audioContext.createGain()
    
    // Create oscillator for the second tone (lower pitch)
    const oscillator2 = audioContext.createOscillator()
    const gainNode2 = audioContext.createGain()
    
    // Connect nodes
    oscillator1.connect(gainNode1)
    gainNode1.connect(audioContext.destination)
    
    oscillator2.connect(gainNode2)
    gainNode2.connect(audioContext.destination)
    
    // Configure first tone (higher pitch - 800Hz)
    oscillator1.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator1.type = 'sine'
    
    // Configure second tone (lower pitch - 600Hz)
    oscillator2.frequency.setValueAtTime(600, audioContext.currentTime)
    oscillator2.type = 'sine'
    
    // Create envelope for smooth sound
    const now = audioContext.currentTime
    const attackTime = 0.01
    const sustainTime = 0.1
    const releaseTime = 0.2
    
    // First tone envelope
    gainNode1.gain.setValueAtTime(0, now)
    gainNode1.gain.linearRampToValueAtTime(0.3, now + attackTime)
    gainNode1.gain.linearRampToValueAtTime(0.3, now + attackTime + sustainTime)
    gainNode1.gain.linearRampToValueAtTime(0, now + attackTime + sustainTime + releaseTime)
    
    // Second tone envelope (starts slightly after first)
    gainNode2.gain.setValueAtTime(0, now + 0.05)
    gainNode2.gain.linearRampToValueAtTime(0.3, now + 0.05 + attackTime)
    gainNode2.gain.linearRampToValueAtTime(0.3, now + 0.05 + attackTime + sustainTime)
    gainNode2.gain.linearRampToValueAtTime(0, now + 0.05 + attackTime + sustainTime + releaseTime)
    
    // Start oscillators
    console.log('🔊 Starting oscillators...')
    oscillator1.start(now)
    oscillator1.stop(now + attackTime + sustainTime + releaseTime)
    
    oscillator2.start(now + 0.05)
    oscillator2.stop(now + 0.05 + attackTime + sustainTime + releaseTime)
    
    console.log('✅ Sound started playing')
    
    // Clean up after sound finishes
    setTimeout(() => {
      audioContext.close().catch(() => {
        // Ignore errors when closing context
      })
    }, 500)
  } catch (error) {
    console.error('❌ Error playing sound with context:', error)
    simpleBeepFallback()
  }
}

/**
 * Fallback: Plays a simple beep using HTML5 Audio
 * Uses Web Audio API to generate a simple tone
 */
const playHTML5Sound = () => {
  console.log('🔊 Using HTML5 sound fallback...')
  simpleBeepFallback()
}

/**
 * Last resort: Very simple beep using system beep
 * This uses the browser's built-in audio capabilities with higher volume
 */
const simpleBeepFallback = () => {
  console.log('🔊 Using simple beep fallback...')
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) {
      console.warn('⚠️ No audio support available')
      return
    }
    
    const ctx = new AudioContext()
    console.log('🔊 Simple beep context state:', ctx.state)
    
    // Resume if suspended
    if (ctx.state === 'suspended') {
      console.log('🔊 Resuming suspended context for simple beep...')
      ctx.resume().then(() => {
        console.log('✅ Context resumed for simple beep, state:', ctx.state)
        playSimpleBeep(ctx)
      }).catch((err) => {
        console.error('❌ Could not resume audio for simple beep:', err)
      })
    } else {
      playSimpleBeep(ctx)
    }
  } catch (error) {
    console.error('❌ Simple beep failed:', error)
  }
}

/**
 * Play a very simple beep with higher volume
 */
const playSimpleBeep = (ctx) => {
  try {
    console.log('🔊 Creating simple beep oscillator...')
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.frequency.value = 800
    osc.type = 'sine'
    
    // Higher volume - start at 0.7 instead of 0.5
    gain.gain.setValueAtTime(0.7, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
    
    console.log('✅ Simple beep played')
    
    osc.onended = () => {
      console.log('🔊 Simple beep finished')
      ctx.close().catch(() => {})
    }
    
    setTimeout(() => {
      ctx.close().catch(() => {})
    }, 400)
  } catch (error) {
    console.error('❌ Simple beep play error:', error)
  }
}

/**
 * Checks if sound notifications are enabled for the user
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>} - Whether sound notifications are enabled
 */
export const isSoundNotificationEnabled = async (userId) => {
  if (!userId) return false
  
  try {
    const { supabase } = await import('../lib/supabase')
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('sound_notifications')
      .eq('user_id', userId)
      .single()
    
    // Default to true if preference not set
    return preferences?.sound_notifications ?? true
  } catch (error) {
    console.warn('Error checking sound notification preference:', error)
    // Default to enabled if we can't check
    return true
  }
}

