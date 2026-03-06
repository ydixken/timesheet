export interface User {
  id: string
  username: string
  email?: string
  groups?: string[]
  createdAt?: string
}

export interface AuthResponse {
  user: User
  token: string
}
