import { AppError } from '@/lib/errors/AppError'
import { createTimeoutError } from '@/app/providers/authErrors'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import { withTimeout } from '@/shared/utils/withTimeout'
import type { StudentListItem } from '@/features/students/types/studentTypes'
import type {
  CashAccount,
  CreateEventInput,
  CreateEventRegistrationInput,
  EventFinanceSummary,
  EventListRow,
  EventRegistrationRow,
  EventRegistrationsFilters,
  EventRow,
  EventSessionRow,
  EventsFilters,
  PagedResult,
  SettleEventRegistrationInput,
} from '@/features/events/types/eventsTypes'
import { mapEventsError } from '@/features/events/utils/eventsErrors'

const EVENTS_TIMEOUT_MS = 12_000

export type GuardianCandidate = {
  email: string | null
  full_name: string
  id: string
  phone: string | null
}

function getClient() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    throw new AppError('auth', 'Supabase ainda nao esta configurado neste ambiente.')
  }

  return supabase
}

export async function listEvents(filters: EventsFilters): Promise<PagedResult<EventListRow>> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.rpc('list_events', {
      p_page: filters.page,
      p_page_size: filters.pageSize,
      p_search: filters.search.trim(),
      p_status_filter: filters.status,
      p_type_filter: filters.type,
    }),
    EVENTS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) throw mapEventsError(error)
  return toPagedResult((data ?? []) as EventListRow[], filters.pageSize)
}

export async function getEvent(eventId: string): Promise<EventRow> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.from('events').select('*').eq('id', eventId).maybeSingle(),
    EVENTS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) throw mapEventsError(error)
  if (!data) throw new AppError('not-found', 'Evento nao encontrado.')
  return data as EventRow
}

export async function listEventSessions(eventId: string): Promise<EventSessionRow[]> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.from('event_sessions').select('*').eq('event_id', eventId).order('session_date').order('start_time'),
    EVENTS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) throw mapEventsError(error)
  return (data ?? []) as EventSessionRow[]
}

export async function getEventFinanceSummary(eventId: string): Promise<EventFinanceSummary> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.rpc('get_event_finance_summary', { p_event_id: eventId }),
    EVENTS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) throw mapEventsError(error)
  return data?.[0] ?? {
    event_id: eventId,
    expected_revenue: 0,
    free_count: 0,
    paid_count: 0,
    partial_count: 0,
    pending_count: 0,
    receivable_amount: 0,
    received_amount: 0,
  }
}

export async function listEventRegistrations(filters: EventRegistrationsFilters): Promise<PagedResult<EventRegistrationRow>> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.rpc('list_event_registrations', {
      p_event_id: filters.eventId,
      p_finance_filter: filters.finance,
      p_page: filters.page,
      p_page_size: filters.pageSize,
      p_search: filters.search.trim(),
      p_status_filter: filters.status,
    }),
    EVENTS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) throw mapEventsError(error)
  return toPagedResult((data ?? []) as EventRegistrationRow[], filters.pageSize)
}

export async function listCashAccounts(): Promise<CashAccount[]> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.from('cash_accounts').select('*').eq('is_active', true).order('name'),
    EVENTS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) throw mapEventsError(error)
  return (data ?? []) as CashAccount[]
}

export async function searchStudents(search: string): Promise<StudentListItem[]> {
  const supabase = getClient()
  const normalizedSearch = search.trim()
  let query = supabase
    .from('students')
    .select('id, full_name, preferred_name, birth_date, enrollment_date, status')
    .neq('status', 'archived')
    .order('full_name')
    .limit(8)

  if (normalizedSearch) {
    query = query.ilike('full_name', `%${normalizedSearch}%`)
  }

  const { data, error } = await withTimeout(query, EVENTS_TIMEOUT_MS, createTimeoutError)
  if (error) throw mapEventsError(error)
  return (data ?? []) as StudentListItem[]
}

export async function searchGuardians(search: string): Promise<GuardianCandidate[]> {
  const supabase = getClient()
  const normalizedSearch = search.trim()
  let query = supabase
    .from('guardians')
    .select('id, full_name, phone, email')
    .order('full_name')
    .limit(8)

  if (normalizedSearch) {
    query = query.or(`full_name.ilike.%${normalizedSearch}%,phone.ilike.%${normalizedSearch}%,email.ilike.%${normalizedSearch}%`)
  }

  const { data, error } = await withTimeout(query, EVENTS_TIMEOUT_MS, createTimeoutError)
  if (error) throw mapEventsError(error)
  return (data ?? []) as GuardianCandidate[]
}

export async function createEvent(input: CreateEventInput) {
  return runPayloadRpc<string>('create_event', {
    base_price: input.basePrice,
    capacity: input.capacity ?? null,
    description: input.description?.trim() || null,
    event_type: input.eventType,
    name: input.name.trim(),
    notes: input.notes?.trim() || null,
    registration_end_date: input.registrationEndDate ?? null,
    registration_start_date: input.registrationStartDate ?? null,
    sessions: input.sessions.map((session) => ({
      capacity_override: session.capacityOverride ?? null,
      end_time: session.endTime,
      price_override: session.priceOverride ?? null,
      session_date: session.sessionDate,
      start_time: session.startTime,
    })),
    status: input.status,
  })
}

export async function updateEventStatus(eventId: string, status: string, reason?: string) {
  return runPayloadRpc<string>('update_event_status', {
    event_id: eventId,
    reason: reason?.trim() || null,
    status,
  })
}

export async function createEventRegistration(input: CreateEventRegistrationInput) {
  return runPayloadRpc<string>('create_event_registration', {
    base_amount: input.baseAmount,
    discount_amount: input.discountAmount,
    event_id: input.eventId,
    financial_due_date: input.financialDueDate ?? null,
    guardian: input.guardian ? {
      email: input.guardian.email ?? null,
      full_name: input.guardian.fullName.trim(),
      phone: input.guardian.phone.trim(),
    } : null,
    guardian_id: input.guardianId ?? null,
    guest_birth_date: input.guestBirthDate ?? null,
    guest_full_name: input.guestFullName?.trim() || null,
    notes: input.notes?.trim() || null,
    registration_type: input.registrationType,
    session_ids: input.sessionIds,
    status: input.status,
    student_id: input.studentId ?? null,
  })
}

export async function confirmEventRegistration(registrationId: string) {
  return runPayloadRpc<string>('confirm_event_registration', { registration_id: registrationId })
}

export async function cancelEventRegistration(registrationId: string, reason: string) {
  return runPayloadRpc<string>('cancel_event_registration', { registration_id: registrationId, reason: reason.trim() })
}

export async function settleEventRegistration(input: SettleEventRegistrationInput) {
  return runPayloadRpc('settle_event_registration', {
    amount: input.amount,
    cash_account_id: input.cashAccountId ?? null,
    notes: input.notes?.trim() || null,
    payment_method: input.paymentMethod,
    registration_id: input.registrationId,
    settled_at: input.settledAt,
  })
}

async function runPayloadRpc<TReturn>(rpcName: string, payload: Record<string, unknown>): Promise<TReturn> {
  const supabase = getClient()
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: { payload: Json },
  ) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>
  const { data, error } = await withTimeout(rpc(rpcName, { payload: payload as unknown as Json }), EVENTS_TIMEOUT_MS, createTimeoutError)

  if (error) throw mapEventsError(error)
  return data as TReturn
}

function toPagedResult<TRow extends { total_count: number }>(rows: TRow[], pageSize: number): PagedResult<TRow> {
  const totalCount = rows[0]?.total_count ?? 0
  return {
    rows,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  }
}
