import type { EventRegistrationsFilters, EventsFilters } from '@/features/events/types/eventsTypes'

export const eventsKeys = {
  all: ['events'] as const,
  detail: (id: string) => [...eventsKeys.all, 'detail', id] as const,
  list: (filters: EventsFilters) => [...eventsKeys.lists(), filters] as const,
  lists: () => [...eventsKeys.all, 'list'] as const,
  sessions: (id: string) => [...eventsKeys.all, 'sessions', id] as const,
}

export const eventRegistrationsKeys = {
  all: ['event-registrations'] as const,
  detail: (id: string) => [...eventRegistrationsKeys.all, 'detail', id] as const,
  list: (eventId: string, filters: EventRegistrationsFilters) =>
    [...eventRegistrationsKeys.all, 'list', eventId, filters] as const,
}

export const eventFinanceKeys = {
  all: ['event-finance'] as const,
  summary: (eventId: string) => [...eventFinanceKeys.all, 'summary', eventId] as const,
}
