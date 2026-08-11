import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelEventRegistration,
  confirmEventRegistration,
  createEvent,
  createEventRegistration,
  getEvent,
  getEventFinanceSummary,
  listCashAccounts,
  listEventRegistrations,
  listEvents,
  listEventSessions,
  searchGuardians,
  searchStudents,
  settleEventRegistration,
  updateEventStatus,
} from '@/features/events/api/eventsApi'
import { eventFinanceKeys, eventRegistrationsKeys, eventsKeys } from '@/features/events/hooks/eventsKeys'
import type {
  CreateEventInput,
  CreateEventRegistrationInput,
  EventRegistrationsFilters,
  EventStatus,
  EventsFilters,
  SettleEventRegistrationInput,
} from '@/features/events/types/eventsTypes'
import { financeKeys } from '@/features/finance/hooks/financeKeys'

const EVENTS_STALE_TIME_MS = 45_000

export function useEvents(filters: EventsFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listEvents(filters),
    queryKey: eventsKeys.list(filters),
    staleTime: EVENTS_STALE_TIME_MS,
  })
}

export function useEvent(eventId: string | null) {
  return useQuery({
    enabled: Boolean(eventId),
    queryFn: () => getEvent(eventId ?? ''),
    queryKey: eventId ? eventsKeys.detail(eventId) : [...eventsKeys.all, 'detail', 'none'],
    staleTime: EVENTS_STALE_TIME_MS,
  })
}

export function useEventSessions(eventId: string | null) {
  return useQuery({
    enabled: Boolean(eventId),
    queryFn: () => listEventSessions(eventId ?? ''),
    queryKey: eventId ? eventsKeys.sessions(eventId) : [...eventsKeys.all, 'sessions', 'none'],
    staleTime: EVENTS_STALE_TIME_MS,
  })
}

export function useEventFinanceSummary(eventId: string | null) {
  return useQuery({
    enabled: Boolean(eventId),
    queryFn: () => getEventFinanceSummary(eventId ?? ''),
    queryKey: eventId ? eventFinanceKeys.summary(eventId) : [...eventFinanceKeys.all, 'summary', 'none'],
    staleTime: EVENTS_STALE_TIME_MS,
  })
}

export function useEventRegistrations(filters: EventRegistrationsFilters | null) {
  return useQuery({
    enabled: Boolean(filters?.eventId),
    placeholderData: keepPreviousData,
    queryFn: () => listEventRegistrations(filters as EventRegistrationsFilters),
    queryKey: filters
      ? eventRegistrationsKeys.list(filters.eventId, filters)
      : [...eventRegistrationsKeys.all, 'list', 'none'],
    staleTime: EVENTS_STALE_TIME_MS,
  })
}

export function useEventCashAccounts() {
  return useQuery({
    queryFn: listCashAccounts,
    queryKey: [...eventsKeys.all, 'cash-accounts'] as const,
    staleTime: EVENTS_STALE_TIME_MS * 5,
  })
}

export function useSearchEventStudents(search: string) {
  return useQuery({
    enabled: search.trim().length >= 2,
    queryFn: () => searchStudents(search),
    queryKey: [...eventsKeys.all, 'student-search', search] as const,
    staleTime: EVENTS_STALE_TIME_MS,
  })
}

export function useSearchEventGuardians(search: string) {
  return useQuery({
    enabled: search.trim().length >= 2,
    queryFn: () => searchGuardians(search),
    queryKey: [...eventsKeys.all, 'guardian-search', search] as const,
    staleTime: EVENTS_STALE_TIME_MS,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateEventInput) => createEvent(input),
    onSuccess: () => invalidateEvents(queryClient),
  })
}

export function useUpdateEventStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, reason, status }: { eventId: string; reason?: string; status: EventStatus }) =>
      updateEventStatus(eventId, status, reason),
    onSuccess: (_data, variables) => {
      invalidateEvent(queryClient, variables.eventId)
    },
  })
}

export function useCreateEventRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateEventRegistrationInput) => createEventRegistration(input),
    onSuccess: (_data, variables) => {
      invalidateEvent(queryClient, variables.eventId)
      void queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useConfirmEventRegistration(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (registrationId: string) => confirmEventRegistration(registrationId),
    onSuccess: () => {
      invalidateEvent(queryClient, eventId)
      void queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useCancelEventRegistration(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reason, registrationId }: { reason: string; registrationId: string }) =>
      cancelEventRegistration(registrationId, reason),
    onSuccess: () => {
      invalidateEvent(queryClient, eventId)
      void queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useSettleEventRegistration(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SettleEventRegistrationInput) => settleEventRegistration(input),
    onSuccess: () => {
      invalidateEvent(queryClient, eventId)
      void queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

function invalidateEvents(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: eventsKeys.all })
  void queryClient.invalidateQueries({ queryKey: eventRegistrationsKeys.all })
  void queryClient.invalidateQueries({ queryKey: eventFinanceKeys.all })
}

function invalidateEvent(queryClient: ReturnType<typeof useQueryClient>, eventId: string) {
  invalidateEvents(queryClient)
  void queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
  void queryClient.invalidateQueries({ queryKey: eventsKeys.sessions(eventId) })
  void queryClient.invalidateQueries({ queryKey: eventFinanceKeys.summary(eventId) })
}
