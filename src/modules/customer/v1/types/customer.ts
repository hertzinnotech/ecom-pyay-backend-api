export type CreateCustomerInput = {
    email: string
    password?: string
    password_hash?: string
    has_account?: boolean
  
    first_name: string
    last_name?: string
    phone?: string
    metadata?: Record<string, unknown>
  }