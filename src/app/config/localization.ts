export const appLocalization = {
  currency: 'BRL',
  locale: 'pt-BR',
  timeZone: 'America/Sao_Paulo',
} as const

export function createDateFormatter(options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(appLocalization.locale, options)
}

export function createNumberFormatter(options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(appLocalization.locale, options)
}

export const moneyFormatter = createNumberFormatter({
  currency: appLocalization.currency,
  style: 'currency',
})
