// src/composables/useSession.ts
import { ref, onMounted } from 'vue'

export interface UserSession {
  userId: string
  email: string
  firstName?: string
  lastName?: string
  subscription: 'basic' | 'plus' | 'pro' | 'pro_dpms'
  dashboardUrl: string
  expiresAt: string
}

const session = ref<UserSession | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

export function useSession() {
  const validateSession = async (sessionToken: string) => {
    try {
      console.log('🔐 Validating session with token:', sessionToken.substring(0, 20) + '...')
      
      // Primary endpoint - Netlify Function
      const endpoint = 'https://scansnap.io/.netlify/functions/validate-session'
      
      try {
        console.log(`Calling validation endpoint: ${endpoint}`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ sessionToken }),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('API Response:', data)
        
        if (data.success && data.session) {
          console.log('✅ Session validated:', data.session)
          session.value = data.session
          error.value = null
          
          // Store in localStorage for this session
          localStorage.setItem('scansnap_session', JSON.stringify(data.session))
          localStorage.setItem('scansnap_session_token', sessionToken)
          localStorage.setItem('scansnap_session_timestamp', new Date().toISOString())
          
          return data.session
        } else {
          throw new Error(data.error || 'Invalid session response')
        }
        
      } catch (fetchError: any) {
        console.error('Validation error:', fetchError)
        
        // If it's a network/timeout error, try to decode the token as fallback
        if (fetchError.name === 'AbortError' || 
            (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch'))) {
          
          console.warn('🔌 Network error - attempting token decode fallback')
          
          // Try to extract basic info from token if possible
          // Format might be: session_TIMESTAMP_RANDOM
          const tokenParts = sessionToken.split('_')
          if (tokenParts.length >= 2) {
            // For development/offline mode - create a basic session
            const fallbackSession: UserSession = {
              userId: `user_${tokenParts[1]}`,
              email: 'offline@example.com',
              firstName: 'Offline',
              lastName: 'User',
              subscription: 'basic', // Conservative default
              dashboardUrl: 'https://scansnap.io/dashboard',
              expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours
            }
            
            console.log('⚠️ Using offline fallback session (limited features)')
            session.value = fallbackSession
            error.value = 'Working offline with limited features'
            
            // Store the fallback session
            localStorage.setItem('scansnap_session', JSON.stringify(fallbackSession))
            localStorage.setItem('scansnap_session_token', sessionToken)
            localStorage.setItem('scansnap_session_timestamp', new Date().toISOString())
            
            return fallbackSession
          }
        }
        
        throw fetchError
      }
      
    } catch (err) {
      console.error('❌ Session validation failed:', err)
      
      // Clear the session on validation failure
      clearSession()
      
      // Set appropriate error message
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          error.value = 'Unable to connect to server. Please check your connection.'
        } else if (err.message.includes('AbortError')) {
          error.value = 'Connection timeout. Please try again.'
        } else {
          error.value = err.message
        }
      } else {
        error.value = 'Session validation failed'
      }
      
      throw err
    }
  }
  
  const checkSession = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      // Check URL params first
      const urlParams = new URLSearchParams(window.location.search)
      const sessionToken = urlParams.get('session')
      
      console.log('🔍 Session check:')
      console.log('  - URL:', window.location.href)
      console.log('  - Token from URL:', sessionToken ? 'Found' : 'Not found')
      
      if (sessionToken) {
        console.log('📍 Processing session from URL')
        
        // Clear any existing session when new token arrives
        const existingToken = localStorage.getItem('scansnap_session_token')
        if (existingToken && existingToken !== sessionToken) {
          console.log('🔄 Different session token detected, clearing old session')
          clearSession()
        }
        
        try {
          await validateSession(sessionToken)
          
          // Clean URL after successful validation (remove session param)
          const url = new URL(window.location.href)
          url.searchParams.delete('session')
          window.history.replaceState({}, document.title, url.toString())
          
        } catch (err) {
          console.error('Session validation failed:', err)
          
          // Still clean the URL to prevent repeated attempts
          const url = new URL(window.location.href)
          url.searchParams.delete('session')
          window.history.replaceState({}, document.title, url.toString())
          
          // Allow app to continue in standalone mode
          error.value = 'Unable to validate session. Running in standalone mode.'
        }
        
      } else {
        // Check localStorage for existing session
        const stored = localStorage.getItem('scansnap_session')
        const storedToken = localStorage.getItem('scansnap_session_token')
        const storedTimestamp = localStorage.getItem('scansnap_session_timestamp')
        
        console.log('📦 Checking stored session:')
        console.log('  - Has session:', !!stored)
        console.log('  - Has token:', !!storedToken)
        console.log('  - Has timestamp:', !!storedTimestamp)
        
        if (stored && storedToken && storedTimestamp) {
          try {
            const storedSession = JSON.parse(stored) as UserSession
            console.log('  - Stored user:', storedSession.email)
            console.log('  - Subscription:', storedSession.subscription)
            
            // Check if expired
            const expiresAt = new Date(storedSession.expiresAt)
            const now = new Date()
            
            if (expiresAt > now) {
              // Session still valid
              const sessionAge = Date.now() - new Date(storedTimestamp).getTime()
              const oneHour = 60 * 60 * 1000
              
              if (sessionAge < oneHour) {
                console.log('✅ Using cached session (less than 1 hour old)')
                session.value = storedSession
                error.value = null
              } else {
                console.log('🔄 Session is old, attempting re-validation')
                try {
                  await validateSession(storedToken)
                } catch (err) {
                  console.warn('Re-validation failed, using cached session anyway')
                  session.value = storedSession
                  error.value = null
                }
              }
            } else {
              console.log('⏰ Stored session expired at:', expiresAt)
              clearSession()
            }
            
          } catch (e) {
            console.error('Failed to parse stored session:', e)
            clearSession()
          }
        } else {
          console.log('📭 No stored session - running in standalone mode')
        }
      }
      
    } catch (err) {
      console.error('Unexpected error during session check:', err)
    } finally {
      isLoading.value = false
      console.log('✅ Session check complete')
    }
  }
  
  const clearSession = () => {
    session.value = null
    localStorage.removeItem('scansnap_session')
    localStorage.removeItem('scansnap_session_token')
    localStorage.removeItem('scansnap_session_timestamp')
    console.log('🗑️ Session cleared')
  }
  
  const hasFeature = (feature: string): boolean => {
    // Basic features and all exports are always available to everyone
    const freeFeatures = [
      'basic', 'quick', 'export_csv', 'export_xlsx', 'export_pdf'
    ]
    
    if (freeFeatures.includes(feature)) {
      return true
    }
    
    // If no session, deny premium features
    if (!session.value) {
      return false
    }
    
    const { subscription } = session.value
    
    // Define feature tiers
    const featureTiers: Record<string, string[]> = {
      basic: [],
      plus: ['verify', 'builder', 'catalog_import'],
      pro: ['verify', 'builder', 'catalog_import', 'qr', 'datamatrix', 'aztec', 'matrix_codes'],
      pro_dpms: [
        'verify', 'builder', 'catalog_import', 
        'qr', 'datamatrix', 'aztec', 'matrix_codes',
        'dpms', 'micro_qr', 'rm_qr'
      ]
    }
    
    const allowedFeatures = featureTiers[subscription] || []
    return allowedFeatures.includes(feature)
  }
  
  const getSubscriptionLabel = (): string => {
    if (!session.value) return 'Basic'
    
    const labels: Record<string, string> = {
      basic: 'Basic',
      plus: 'Plus',
      pro: 'Professional',
      pro_dpms: 'Pro + DPMS'
    }
    
    return labels[session.value.subscription] || session.value.subscription.toUpperCase()
  }
  
  const isSubscribed = (): boolean => {
    return session.value !== null && session.value.subscription !== 'basic'
  }
  
  const refreshSession = async () => {
    console.log('🔄 Manually refreshing session...')
    clearSession()
    await checkSession()
  }
  
  // Manual session setter for development/testing
  const setManualSession = (
    email: string, 
    subscription: UserSession['subscription'] = 'plus',
    firstName: string = 'Test',
    lastName: string = 'User'
  ) => {
    const manualSession: UserSession = {
      userId: `user_manual_${Date.now()}`,
      email,
      firstName,
      lastName,
      subscription,
      dashboardUrl: 'https://scansnap.io/dashboard',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
    
    session.value = manualSession
    error.value = null
    
    localStorage.setItem('scansnap_session', JSON.stringify(manualSession))
    localStorage.setItem('scansnap_session_token', `manual_${Date.now()}`)
    localStorage.setItem('scansnap_session_timestamp', new Date().toISOString())
    
    console.log('✅ Manual session set for:', email, '(' + subscription + ')')
    
    return manualSession
  }
  
  // Initialize session check on mount
  onMounted(() => {
    checkSession()
  })
  
  return {
    // State
    session,
    isLoading,
    error,
    
    // Methods
    validateSession,
    clearSession,
    hasFeature,
    checkSession,
    getSubscriptionLabel,
    isSubscribed,
    refreshSession,
    
    // Development helpers (remove in production if needed)
    setManualSession
  }
}