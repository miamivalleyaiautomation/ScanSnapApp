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
      
      // Call your API to validate - using the actual endpoint
      const response = await fetch('https://scansnap.io/api/app/session/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionToken })
      })
      
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
    } catch (err) {
      console.error('❌ Session validation error:', err)
      error.value = err instanceof Error ? err.message : 'Failed to validate session'
      
      // Clear any stored session on error
      clearSession()
      
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
        await validateSession(sessionToken)
        
        // Clean URL after successful validation
        const cleanUrl = window.location.pathname + window.location.hash
        window.history.replaceState({}, document.title, cleanUrl)
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
              } else {
                console.log('🔄 Re-validating stored session (older than 1 hour)')
                await validateSession(storedToken)
              }
            } else {
              console.log('⏰ Stored session expired')
              clearSession()
              error.value = 'Session expired. Please return to the dashboard.'
            }
          } catch (e) {
            console.error('Failed to parse stored session:', e)
            clearSession()
          }
        } else {
          console.log('📭 No session found')
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
    // If no session, allow basic features only
    if (!session.value) {
      return feature === 'basic' || feature === 'quick'
    }
    
    const { subscription } = session.value
    
    // Everyone gets basic features
    if (feature === 'basic' || feature === 'quick') return true
    
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
    
    // Export features
    if (feature === 'export_pdf' || feature === 'export_xlsx') {
      return ['plus', 'pro', 'pro_dpms'].includes(subscription)
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