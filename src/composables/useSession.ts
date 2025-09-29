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
      
      // Use the correct domain for API calls
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://scansnap.io'
      
      // Use GET method with query params for cross-domain compatibility
      const endpoint = `${apiBaseUrl}/api/app/session/validate?token=${encodeURIComponent(sessionToken)}`
      
      console.log(`📡 Calling validation endpoint: ${endpoint}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit', // Don't send cookies cross-domain
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        console.log('📦 Response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Error response:', errorText)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('✅ API Response:', data)
        
        if (data.success && data.session) {
          console.log('✅ Session validated successfully:', data.session)
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
        console.error('❌ Fetch error:', fetchError)
        
        // Network error fallback - allow basic offline mode
        if (fetchError.name === 'AbortError' || 
            (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch'))) {
          
          console.warn('🔌 Network error - attempting offline mode')
          
          // Check if we have a cached session
          const cached = localStorage.getItem('scansnap_session')
          if (cached) {
            try {
              const cachedSession = JSON.parse(cached) as UserSession
              const expiresAt = new Date(cachedSession.expiresAt)
              
              if (expiresAt > new Date()) {
                console.log('📦 Using cached session (offline mode)')
                session.value = cachedSession
                error.value = 'Working offline with cached session'
                return cachedSession
              }
            } catch (e) {
              console.error('Failed to use cached session:', e)
            }
          }
          
          // Create basic offline session
          const fallbackSession: UserSession = {
            userId: `offline_${Date.now()}`,
            email: 'offline@mode.local',
            firstName: 'Offline',
            lastName: 'Mode',
            subscription: 'basic',
            dashboardUrl: 'https://scansnap.io/dashboard',
            expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
          }
          
          console.log('⚠️ Using offline fallback session (limited features)')
          session.value = fallbackSession
          error.value = 'Working offline with limited features'
          
          return fallbackSession
        }
        
        throw fetchError
      }
      
    } catch (err) {
      console.error('❌ Session validation failed:', err)
      clearSession()
      
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          error.value = 'Unable to connect to server. Working in offline mode.'
        } else if (err.message.includes('AbortError')) {
          error.value = 'Connection timeout. Please try again.'
        } else {
          error.value = err.message
        }
      } else {
        error.value = 'Session validation failed'
      }
      
      // Don't throw - allow app to work in standalone mode
      return null
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
        
        const result = await validateSession(sessionToken)
        
        if (result) {
          // Clean URL after successful validation
          const url = new URL(window.location.href)
          url.searchParams.delete('session')
          window.history.replaceState({}, document.title, url.toString())
        }
        
      } else {
        // Check localStorage for existing session
        const stored = localStorage.getItem('scansnap_session')
        const storedToken = localStorage.getItem('scansnap_session_token')
        const storedTimestamp = localStorage.getItem('scansnap_session_timestamp')
        
        if (stored && storedToken && storedTimestamp) {
          try {
            const storedSession = JSON.parse(stored) as UserSession
            const expiresAt = new Date(storedSession.expiresAt)
            const now = new Date()
            
            if (expiresAt > now) {
              const sessionAge = Date.now() - new Date(storedTimestamp).getTime()
              const oneHour = 60 * 60 * 1000
              
              if (sessionAge < oneHour) {
                console.log('✅ Using cached session')
                session.value = storedSession
              } else {
                // Try to revalidate
                console.log('🔄 Revalidating old session')
                await validateSession(storedToken)
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
          console.log('📭 No session - running in standalone mode')
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
    // Basic features always available
    const freeFeatures = ['basic', 'quick', 'export_csv', 'export_xlsx', 'export_pdf']
    
    if (freeFeatures.includes(feature)) {
      return true
    }
    
    // If no session or in offline mode, deny premium features
    if (!session.value || session.value.email === 'offline@mode.local') {
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
    return session.value !== null && 
           session.value.subscription !== 'basic' &&
           session.value.email !== 'offline@mode.local'
  }

  const refreshSession = async () => {
    console.log('🔄 Manually refreshing session...')
    await checkSession()
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
  }
}