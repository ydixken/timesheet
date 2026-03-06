import { create } from 'zustand'
import type { User } from '@timesheet/shared'
import type { UserManager } from 'oidc-client-ts'
import { createUserManager } from '../lib/oidc'

type AuthMode = 'oidc' | 'none'

interface AuthState {
  user: User | null
  loading: boolean
  authMode: AuthMode | null
  accessToken: string | null
  initialize: () => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => string | null
}

let userManager: UserManager | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  authMode: null,
  accessToken: null,

  initialize: async () => {
    try {
      const res = await fetch('/api/auth/config')
      const config = await res.json() as { mode: AuthMode; oidc?: { issuerUrl: string; clientId: string } }

      set({ authMode: config.mode })

      if (config.mode === 'none') {
        set({
          user: { id: 'dev', username: 'developer', email: 'dev@local' },
          loading: false,
        })
        return
      }

      // OIDC mode
      const oidc = config.oidc!
      userManager = createUserManager({
        authority: oidc.issuerUrl,
        clientId: oidc.clientId,
        redirectUri: `${window.location.origin}/auth/callback`,
      })

      // Handle callback path
      if (window.location.pathname === '/auth/callback') {
        const oidcUser = await userManager.signinRedirectCallback()
        set({
          user: {
            id: oidcUser.profile.sub,
            username: oidcUser.profile.preferred_username ?? oidcUser.profile.sub,
            email: oidcUser.profile.email,
            groups: oidcUser.profile.groups as string[] | undefined,
          },
          accessToken: oidcUser.access_token,
          loading: false,
        })
        return
      }

      // Check existing session
      const oidcUser = await userManager.getUser()
      if (oidcUser && !oidcUser.expired) {
        set({
          user: {
            id: oidcUser.profile.sub,
            username: oidcUser.profile.preferred_username ?? oidcUser.profile.sub,
            email: oidcUser.profile.email,
            groups: oidcUser.profile.groups as string[] | undefined,
          },
          accessToken: oidcUser.access_token,
          loading: false,
        })
        return
      }

      // No valid session, redirect to IdP
      await userManager.signinRedirect()
    } catch {
      set({ user: null, loading: false })
    }
  },

  logout: async () => {
    const { authMode } = get()
    if (authMode === 'oidc' && userManager) {
      await userManager.signoutRedirect()
    }
    set({ user: null, accessToken: null })
  },

  getAccessToken: () => get().accessToken,
}))
