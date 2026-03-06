export interface User {
  id: string
  username: string
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}
