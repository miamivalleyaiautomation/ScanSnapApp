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
      console.log('🔐 Validating session...')
      
      // Try to validate with the API
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      try {
        const response = await fetch('https://scansnap.io/api/app/session/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include', // Include cookies if needed
          body: JSON.stringify({ sessionToken }),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Session validation failed')
        }
        
        if (data.success && data.session) {
          console.log('✅ Session validated:', data.session)
          session.value = data.session
          
          // Store in localStorage for this session
          localStorage.setItem('scansnap_session', JSON.stringify(data.session))
          localStorage.setItem('scansnap_session_token', sessionToken)
          localStorage.setItem('scansnap_session_timestamp', new Date().toISOString())
          
          return data.session
        } else {
          throw new Error('Invalid session response structure')
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        
        // Check if it's a network/CORS error
        if (fetchError.name === 'AbortError') {
          console.warn('⏱️ Session validation timed out')
          throw new Error('Session validation timed out. Please try again.')
        } else if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          console.warn('🔌 Network/CORS error - attempting fallback')
          
          // Fallback: Try to decode the session token if it looks like a JWT or contains session data
          // This is a temporary measure for development/testing
          try {
            // Check if the token looks like it might contain session data
            const decoded = atob(sessionToken.split('.')[1] || sessionToken)
            const sessionData = JSON.parse(decoded)
            
            if (sessionData && sessionData.email) {
              const fallbackSession: UserSession = {
                userId: sessionData.userId || 'user_fallback',
                email: sessionData.email,
                firstName: sessionData.firstName,
                lastName: sessionData.lastName,
                subscription: sessionData.subscription || 'basic',
                dashboardUrl: sessionData.dashboardUrl || 'https://scansnap.io/dashboard',
                expiresAt: sessionData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              }
              
              console.log('⚠️ Using decoded session data (fallback)')
              session.value = fallbackSession
              localStorage.setItem('scansnap_session', JSON.stringify(fallbackSession))
              localStorage.setItem('scansnap_session_token', sessionToken)
              localStorage.setItem('scansnap_session_timestamp', new Date().toISOString())
              
              return fallbackSession
            }
          } catch (decodeError) {
            console.error('Failed to decode session token:', decodeError)
          }
          
          throw new Error('Unable to connect to server. Please check your connection.')
        } else {
          throw fetchError
        }
      }
    } catch (err) {
      console.error('❌ Session validation error:', err)
      
      // More user-friendly error messages
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          error.value = 'Connection error. The app will work with limited features.'
        } else if (err.message.includes('timed out')) {
          error.value = 'Connection timed out. The app will work with limited features.'
        } else {
          error.value = err.message
        }
      } else {
        error.value = 'Failed to validate session'
      }
      
      // Don't clear session from localStorage on network errors
      // This allows the app to work offline with cached session
      if (err instanceof Error && !err.message.includes('fetch')) {
        clearSession()
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
      
      if (sessionToken) {
        console.log('📍 Found session in URL')
        
        try {
          await validateSession(sessionToken)
          
          // Clean URL after successful validation
          const cleanUrl = window.location.pathname + window.location.hash
          window.history.replaceState({}, document.title, cleanUrl)
        } catch (err) {
          console.error('Failed to validate session from URL:', err)
          // If validation fails, still clean the URL to prevent repeated attempts
          const cleanUrl = window.location.pathname + window.location.hash
          window.history.replaceState({}, document.title, cleanUrl)
          
          // Set error but allow app to continue in standalone mode
          error.value = 'Unable to validate session. Running in standalone mode.'
        }
      } else {
        // Check localStorage
        const stored = localStorage.getItem('scansnap_session')
        const storedToken = localStorage.getItem('scansnap_session_token')
        const storedTimestamp = localStorage.getItem('scansnap_session_timestamp')
        
        if (stored && storedToken && storedTimestamp) {
          try {
            const storedSession = JSON.parse(stored) as UserSession
            
            // Check if expired
            if (new Date(storedSession.expiresAt) > new Date()) {
              // Check if session is older than 1 hour (re-validate)
              const sessionAge = Date.now() - new Date(storedTimestamp).getTime()
              const oneHour = 60 * 60 * 1000
              
              if (sessionAge < oneHour) {
                console.log('📦 Using cached session (less than 1 hour old)')
                session.value = storedSession
                error.value = null
              } else {
                console.log('🔄 Re-validating stored session (older than 1 hour)')
                try {
                  await validateSession(storedToken)
                } catch (err) {
                  // If re-validation fails, continue with cached session
                  console.warn('Re-validation failed, using cached session')
                  session.value = storedSession
                  error.value = null
                }
              }
            } else {
              console.log('⏰ Stored session expired')
              clearSession()
            }
          } catch (e) {
            console.error('Failed to parse stored session:', e)
            clearSession()
          }
        } else {
          console.log('📭 No session found - running in standalone mode')
          // No session found - this is OK for standalone usage
        }
      }
    } catch (err) {
      console.error('Session check error:', err)
      // Error already set in validateSession
    } finally {
      isLoading.value = false
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
    // Basic features and exports are always available to everyone
    if (feature === 'basic' || feature === 'quick' || 
        feature === 'export_csv' || feature === 'export_xlsx' || feature === 'export_pdf') {
      return true
    }
    
    // If no session, only allow basic features
    if (!session.value) {
      return false
    }
    
    const { subscription } = session.value
    
    // Plus features (verify and builder modes)
    if (feature === 'verify' || feature === 'builder') {
      return ['plus', 'pro', 'pro_dpms'].includes(subscription)
    }
    
    // Pro features (advanced 2D codes)
    if (feature === 'qr' || feature === 'datamatrix' || feature === 'aztec' || feature === 'matrix_codes') {
      return ['pro', 'pro_dpms'].includes(subscription)
    }
    
    // Pro DPMS features (specialized DPMS barcodes)
    if (feature === 'dpms' || feature === 'micro_qr' || feature === 'rm_qr') {
      return subscription === 'pro_dpms'
    }
    
    // Catalog features
    if (feature === 'catalog_import') {
      return ['plus', 'pro', 'pro_dpms'].includes(subscription)
    }
    
    // Default deny for unknown features
    return false
  }
  
  const getSubscriptionLabel = (): string => {
    if (!session.value) return 'Basic'
    
    const labels = {
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
  
  // Initialize session check on mount
  onMounted(() => {
    checkSession()
  })
  
  return {
    session,
    isLoading,
    error,
    validateSession,
    clearSession,
    hasFeature,
    checkSession,
    getSubscriptionLabel,
    isSubscribed
  }
}