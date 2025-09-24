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
      
      // List of endpoints to try
      const endpoints = [
        'https://scansnap.io/api/app/session/validate',
        'https://scansnap.io/api/session/validate',
        'https://scansnap.io/dashboard/test-session', // Your test endpoint
      ]
      
      let lastError: any = null
      
      // Try each endpoint
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`)
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout per endpoint
          
          const response = await fetch(endpoint, {
            method: endpoint.includes('test-session') ? 'GET' : 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: endpoint.includes('test-session') ? undefined : JSON.stringify({ sessionToken }),
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (response.ok) {
            const data = await response.json()
            console.log('API Response from', endpoint, ':', data)
            
            if (data.success && data.session) {
              console.log('✅ Session validated:', data.session)
              session.value = data.session
              error.value = null
              
              // Store in localStorage for this session
              localStorage.setItem('scansnap_session', JSON.stringify(data.session))
              localStorage.setItem('scansnap_session_token', sessionToken)
              localStorage.setItem('scansnap_session_timestamp', new Date().toISOString())
              
              return data.session
            }
          }
        } catch (err) {
          lastError = err
          console.warn(`Failed to fetch from ${endpoint}:`, err)
          continue // Try next endpoint
        }
      }
      
      // If all endpoints fail, try to decode the token
      console.warn('🔌 All API endpoints unreachable, attempting to decode token')
      
      try {
        // Try to decode the session token if it's a JWT or base64 encoded
        let sessionData: any = null
        
        // Check if it's a JWT (has three parts separated by dots)
        if (sessionToken.includes('.')) {
          const parts = sessionToken.split('.')
          if (parts.length >= 2) {
            // Decode the payload (second part)
            const decoded = atob(parts[1])
            sessionData = JSON.parse(decoded)
          }
        } else {
          // Try direct base64 decode
          try {
            const decoded = atob(sessionToken)
            sessionData = JSON.parse(decoded)
          } catch {
            // Not base64 encoded
          }
        }
        
        // If we successfully decoded something with user info
        if (sessionData && sessionData.email) {
          const decodedSession: UserSession = {
            userId: sessionData.userId || sessionData.sub || `user_${Date.now()}`,
            email: sessionData.email,
            firstName: sessionData.firstName || sessionData.given_name || '',
            lastName: sessionData.lastName || sessionData.family_name || '',
            subscription: sessionData.subscription || sessionData.plan || 'basic',
            dashboardUrl: sessionData.dashboardUrl || 'https://scansnap.io/dashboard',
            expiresAt: sessionData.expiresAt || sessionData.exp 
              ? new Date((sessionData.exp || sessionData.expiresAt) * 1000).toISOString()
              : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
          
          console.log('✅ Using decoded session for:', decodedSession.email)
          session.value = decodedSession
          error.value = null
          
          // Store the decoded session
          localStorage.setItem('scansnap_session', JSON.stringify(decodedSession))
          localStorage.setItem('scansnap_session_token', sessionToken)
          localStorage.setItem('scansnap_session_timestamp', new Date().toISOString())
          
          return decodedSession
        }
      } catch (decodeError) {
        console.error('Failed to decode session token:', decodeError)
      }
      
      // If we can't decode the token or reach the API, return minimal session
      // This allows the app to work but with limited features
      console.warn('⚠️ Could not validate or decode session, using standalone mode')
      error.value = 'Unable to validate session. Running with limited features.'
      
      // Don't set a fake session - let the app run in standalone mode
      clearSession()
      throw new Error('Session validation failed')
      
    } catch (err) {
      console.error('❌ Session validation error:', err)
      
      // Clear the session and show error
      clearSession()
      error.value = 'Unable to validate session. Please return to the dashboard and try again.'
      
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
        
        // IMPORTANT: Clear any existing session when new token arrives
        // This ensures we don't show the wrong user
        const existingToken = localStorage.getItem('scansnap_session_token')
        if (existingToken && existingToken !== sessionToken) {
          console.log('🔄 Different session token detected, clearing old session')
          clearSession()
        }
        
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
  
  // Force refresh session (useful when switching users)
  const refreshSession = async () => {
    console.log('🔄 Force refreshing session...')
    clearSession() // Clear everything first
    await checkSession() // Re-check from URL or storage
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
    isSubscribed,
    refreshSession
  }
}