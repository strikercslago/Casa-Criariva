type StudentPhotoDiagnosticDetails = Record<string, boolean | number | string | null | undefined>

export function logStudentPhotoDiagnostic(event: string, details?: StudentPhotoDiagnosticDetails) {
  if (!import.meta.env.DEV) {
    return
  }

  console.info(`[student-photo] ${event}`, sanitizeDetails(details))
}

export function warnStudentPhotoDiagnostic(event: string, details?: StudentPhotoDiagnosticDetails) {
  if (!import.meta.env.DEV) {
    return
  }

  console.warn(`[student-photo] ${event}`, sanitizeDetails(details))
}

function sanitizeDetails(details?: StudentPhotoDiagnosticDetails) {
  if (!details) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(details).filter(([key]) => !/authorization|base64|signedurl|token|url/i.test(key)),
  )
}
