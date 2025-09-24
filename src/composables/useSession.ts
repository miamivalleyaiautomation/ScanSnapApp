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
      
      // Call your API to validate
      const response = await fetch('https://scansnap.io/api/app/session/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionToken })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Session validation failed')
      }
      
      console.log('✅ Session validated:', data.session)
      session.value = data.session
      
      // Store in localStorage for this session
      localStorage.setItem('scansnap_session', JSON.stringify(data.session))
      localStorage.setItem('scansnap_session_token', sessionToken)
      
      return data.session
    } catch (err) {
      console.error('❌ Session validation error:', err)
      error.value = err instanceof Error ? err.message : 'Failed to validate session'
      throw err
    }
  }
  
  const checkSession = async () => {
    isLoading.value = true
    
    try {
      // Check URL params first
      const urlParams = new URLSearchParams(window.location.search)
      const sessionToken = urlParams.get('session')
      
      if (sessionToken) {
        console.log('📍 Found session in URL')
        await validateSession(sessionToken)
        
        // Clean URL after validation
        window.history.replaceState({}, document.title, window.location.pathname)
      } else {
        // Check localStorage
        const stored = localStorage.getItem('scansnap_session')
        if (stored) {
          const storedSession = JSON.parse(stored) as UserSession
          
          // Check if expired
          if (new Date(storedSession.expiresAt) > new Date()) {
            console.log('📦 Using stored session')
            session.value = storedSession
          } else {
            console.log('⏰ Stored session expired')
            clearSession()
          }
        }
      }
    } catch (err) {
      console.error('Session check error:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const clearSession = () => {
    session.value = null
    localStorage.removeItem('scansnap_session')
    localStorage.removeItem('scansnap_session_token')
  }
  
  const hasFeature = (feature: string): boolean => {
    if (!session.value) return false
    
    const { subscription } = session.value
    
    // Basic features
    if (feature === 'basic') return true
    
    // Plus features
    if (feature === 'verify' || feature === 'builder') {
      return ['plus', 'pro', 'pro_dpms'].includes(subscription)
    }
    
    // Pro features  
    if (feature === 'qr' || feature === 'datamatrix') {
      return ['pro', 'pro_dpms'].includes(subscription)
    }
    
    // DPMS features
    if (feature === 'dpms') {
      return subscription === 'pro_dpms'
    }
    
    return false
  }
  
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
    checkSession
  }
}