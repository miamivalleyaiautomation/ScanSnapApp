// src/services/auth.service.ts
import { createClient } from '@supabase/supabase-js'

export interface UserData {
  clerk_user_id: string
  subscription_status: 'basic' | 'plus' | 'pro' | 'pro_dpms' | 'expired' | 'cancelled'
  subscription_plan: string
  email: string
  first_name?: string
  last_name?: string
  subscription_expires_at?: string
}

class AuthService {
  private supabase: any
  private userData: UserData | null = null
  private sessionToken: string | null = null

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (supabaseUrl && supabaseAnonKey) {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey)
    }
    
    this.initializeAuth()
  }

  async initializeAuth() {
    // Try to get auth from URL params first
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const userId = urlParams.get('userId')
    
    if (token && userId) {
      // Store token and fetch user data
      this.sessionToken = token
      await this.fetchUserProfile(userId, token)
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      // Try to restore from sessionStorage (more secure than localStorage)
      const stored = sessionStorage.getItem('scansnap_session')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          if (data.expiresAt > Date.now()) {
            this.userData = data.userData
            this.sessionToken = data.token
            await this.verifySession()
          } else {
            this.clearSession()
          }
        } catch {
          this.clearSession()
        }
      }
    }
  }

  async fetchUserProfile(userId: string, token: string): Promise<boolean> {
    if (!this.supabase) return false
    
    try {
      // Verify token and fetch user profile
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('clerk_user_id', userId)
        .single()
      
      if (error || !data) {
        console.error('Failed to fetch user profile:', error)
        return false
      }
      
      // Check if subscription is still valid
      const now = new Date()
      if (data.subscription_expires_at) {
        const expiresAt = new Date(data.subscription_expires_at)
        if (expiresAt < now && data.subscription_status !== 'basic') {
          data.subscription_status = 'expired'
        }
      }
      
      this.userData = {
        clerk_user_id: data.clerk_user_id,
        subscription_status: data.subscription_status || 'basic',
        subscription_plan: data.subscription_plan || 'basic',
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        subscription_expires_at: data.subscription_expires_at
      }
      
      // Store in sessionStorage with expiry
      this.storeSession()
      
      return true
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return false
    }
  }

  async verifySession(): Promise<boolean> {
    if (!this.userData || !this.sessionToken) return false
    
    // Re-fetch user data to ensure it's current
    return await this.fetchUserProfile(this.userData.clerk_user_id, this.sessionToken)
  }

  storeSession() {
    if (!this.userData || !this.sessionToken) return
    
    const sessionData = {
      userData: this.userData,
      token: this.sessionToken,
      expiresAt: Date.now() + (4 * 60 * 60 * 1000) // 4 hours
    }
    
    sessionStorage.setItem('scansnap_session', JSON.stringify(sessionData))
  }

  clearSession() {
    this.userData = null
    this.sessionToken = null
    sessionStorage.removeItem('scansnap_session')
  }

  getUser(): UserData | null {
    return this.userData
  }

  isAuthenticated(): boolean {
    return !!this.userData && !!this.sessionToken
  }

  hasSubscription(level: 'plus' | 'pro' | 'pro_dpms'): boolean {
    if (!this.userData) return false
    
    const status = this.userData.subscription_status
    
    // Check if expired or cancelled
    if (status === 'expired' || status === 'cancelled') return false
    
    // Check subscription hierarchy
    const hierarchy = {
      'basic': 0,
      'plus': 1,
      'pro': 2,
      'pro_dpms': 3
    }
    
    const userLevel = hierarchy[status as keyof typeof hierarchy] || 0
    const requiredLevel = hierarchy[level] || 0
    
    return userLevel >= requiredLevel
  }

  canUseFeature(feature: string): boolean {
    const featureMap: Record<string, 'plus' | 'pro' | 'pro_dpms'> = {
      'verify_mode': 'plus',
      'order_builder': 'plus',
      'catalog_import': 'plus',
      'qr_code': 'pro',
      'data_matrix': 'pro',
      'dot_peen': 'pro_dpms',
      'laser_etched': 'pro_dpms'
    }
    
    const requiredLevel = featureMap[feature]
    if (!requiredLevel) return true // Feature available to all
    
    return this.hasSubscription(requiredLevel)
  }

  async redirectToLogin() {
    const mainSiteUrl = import.meta.env.VITE_MAIN_SITE_URL || 'https://scansnap.io'
    const returnUrl = encodeURIComponent(window.location.href)
    window.location.href = `${mainSiteUrl}/login?redirect_url=/dashboard&app_return=${returnUrl}`
  }

  async redirectToUpgrade() {
    const mainSiteUrl = import.meta.env.VITE_MAIN_SITE_URL || 'https://scansnap.io'
    window.location.href = `${mainSiteUrl}/subscription`
  }
}

export default new AuthService()