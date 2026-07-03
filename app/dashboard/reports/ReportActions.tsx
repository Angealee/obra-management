'use client'

import Link from 'next/link'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { buildCsv, type CsvCell } from '@/lib/reportCsv'

// Action bar shown above every report on screen (hidden when printing):
// back link, CSV download, and the print trigger.

function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]) {
  // ﻿ BOM so Excel opens the UTF-8 file with names/accents intact.
  const blob = new Blob(['﻿' + buildCsv(headers, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportActions({
  csvFilename,
  csvHeaders,
  csvRows,
}: {
  csvFilename: string
  csvHeaders: string[]
  csvRows: CsvCell[][]
}) {
  return (
    <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
      <Link href="/dashboard/reports" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={13} /> All reports
      </Link>
      <div style={{ flex: 1 }} />
      <button
        type="button"
        className="btn-secondary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        onClick={() => downloadCsv(csvFilename, csvHeaders, csvRows)}
      >
        <Download size={13} /> Download CSV
      </button>
      <button
        type="button"
        className="btn-primary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        onClick={() => window.print()}
      >
        <Printer size={13} /> Print / Save as PDF
      </button>
    </div>
  )
}
