// The results as a spreadsheet: Teams, every Order step of every team (the system, the answer, wrong tries), and
// Students. The Excel library loads only when someone downloads.
export async function downloadResults(report) {
  const XLSX = await import('xlsx')
  const book = XLSX.utils.book_new()
  const add = (name, rows, widths) => {
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: 'Nothing to show.' }])
    sheet['!cols'] = widths.map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(book, sheet, name)
  }
  add('Teams', [...report.teams].sort((a, b) => b.points - a.points).map((t, i) => ({
    Place: i + 1, Team: t.name, Points: t.points, 'Orders served': `${Math.floor(t.solved / 2)}/${(t.total ?? 0) / 2}`, Finished: t.finish_rank ? `#${t.finish_rank}` : 'No',
  })), [6, 20, 8, 14, 9])
  add('Orders', report.teams.flatMap((t) => t.steps.map((s) => ({
    Team: t.name, Order: s.order, Unknowns: s.unknowns, Step: s.kind === 'prices' ? 'Prices' : 'Damage', Result: s.status, Points: s.points,
    'Wrong tries': s.wrong, System: s.system, Answer: s.answer,
  }))), [16, 7, 10, 8, 13, 7, 11, 60, 50])
  add('Students', report.students, [22, 16, 22, 7, 7])
  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(book, `Whats-the-Damage-results-${today}.xlsx`)
}
