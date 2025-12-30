// Environment configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Required environment variables validation
const missingVars = []
if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL')
if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY')

if (missingVars.length > 0) {
  const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}. Please check your .env file.`
  console.error('❌ Configuration Error:', errorMsg)
  throw new Error(errorMsg)
}

export const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'SPACEL Admin Panel',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    adminEmailDomain: import.meta.env.VITE_ADMIN_EMAIL_DOMAIN || '@yourcompany.com'
  },
  features: {
    analytics: !!import.meta.env.VITE_GOOGLE_ANALYTICS_ID,
    errorTracking: !!import.meta.env.VITE_SENTRY_DSN
  }
}

export default config
