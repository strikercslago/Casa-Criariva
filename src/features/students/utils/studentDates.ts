export function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export function formatStudentDate(value: string | null) {
  if (!value) {
    return 'Nao informado'
  }

  const [year, month, day] = value.split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}
