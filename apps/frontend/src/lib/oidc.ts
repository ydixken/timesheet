import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

export function createUserManager(config: {
  authority: string
  clientId: string
  redirectUri: string
}) {
  return new UserManager({
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid profile email groups',
    userStore: new WebStorageStateStore({ store: sessionStorage }),
    automaticSilentRenew: true,
    post_logout_redirect_uri: window.location.origin,
  })
}
