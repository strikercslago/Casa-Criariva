import type { Database } from '@/lib/supabase/database.types'

export type EventType = Database['public']['Enums']['event_type']
export type EventStatus = Database['public']['Enums']['event_status']
export type EventRegistrationStatus = Database['public']['Enums']['event_registration_status']
export type EventRegistrationType = Database['public']['Enums']['event_registration_type']
export type PaymentMethod = Database['public']['Enums']['payment_method']

export type EventListRow = Database['public']['Functions']['list_events']['Returns'][number]
export type EventRegistrationRow = Database['public']['Functions']['list_event_registrations']['Returns'][number]
export type EventFinanceSummary = Database['public']['Functions']['get_event_finance_summary']['Returns'][number]
export type EventSessionRow = Database['public']['Tables']['event_sessions']['Row']
export type EventRow = Database['public']['Tables']['events']['Row']
export type CashAccount = Database['public']['Tables']['cash_accounts']['Row']

export type EventsFilters = {
  page: number
  pageSize: number
  search: string
  status: EventStatus | 'all'
  type: EventType | 'all'
}

export type EventRegistrationsFilters = {
  eventId: string
  finance: 'all' | 'paid' | 'partial' | 'pending' | 'free' | 'financial_pending'
  page: number
  pageSize: number
  search: string
  status: EventRegistrationStatus | 'all'
}

export type PagedResult<TRow> = {
  rows: TRow[]
  totalCount: number
  totalPages: number
}

export type EventSessionInput = {
  capacityOverride?: number | null
  endTime: string
  priceOverride?: number | null
  sessionDate: string
  startTime: string
}

export type CreateEventInput = {
  basePrice: number
  capacity?: number | null
  description?: string
  eventType: EventType
  name: string
  notes?: string
  registrationEndDate?: string | null
  registrationStartDate?: string | null
  sessions: EventSessionInput[]
  status: EventStatus
}

export type GuardianPayload = {
  email?: string | null
  fullName: string
  phone: string
}

export type CreateEventRegistrationInput = {
  baseAmount: number
  discountAmount: number
  eventId: string
  financialDueDate?: string | null
  guardian?: GuardianPayload | null
  guardianId?: string | null
  guestBirthDate?: string | null
  guestFullName?: string | null
  notes?: string
  registrationType: EventRegistrationType
  sessionIds: string[]
  status: EventRegistrationStatus
  studentId?: string | null
}

export type SettleEventRegistrationInput = {
  amount: number
  cashAccountId?: string | null
  notes?: string
  paymentMethod: PaymentMethod
  registrationId: string
  settledAt: string
}
