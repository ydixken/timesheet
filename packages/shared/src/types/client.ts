export interface Client {
  id: string
  name: string
  email: string | null
  address: string | null
  logoPath: string | null
  createdAt: string
  updatedAt: string
}
