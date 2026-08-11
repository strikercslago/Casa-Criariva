export type CsvColumn<TRow> = {
  header: string
  value: (row: TRow) => string | number | null | undefined
}

export function buildCsv<TRow>(rows: TRow[], columns: Array<CsvColumn<TRow>>) {
  const header = columns.map((column) => escapeCsv(column.header)).join(';')
  const body = rows.map((row) => columns.map((column) => escapeCsv(column.value(row))).join(';'))
  return `\ufeff${[header, ...body].join('\r\n')}`
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}
