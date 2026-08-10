import { z } from 'zod'

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data no formato AAAA-MM-DD.')

export function isIsoDate(value: string) {
  return isoDateSchema.safeParse(value).success
}
