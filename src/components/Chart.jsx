// Charts the profile agent can return in a ```chart fenced block (JSON):
//   bar:      { "type": "bar", "title": "...", "unit": "%", "data": [{ "label": "...", "value": 30 }] }
//   timeline: { "type": "timeline", "title": "...", "data": [{ "label": "...", "sub": "...", "start": "2016-10", "end": "2024-05" | "present" }] }
// Single series in the theme accent, direct value labels, hover tooltips and a data table for screen readers.

const toYears = (ym) => {
  if (!ym || ym === 'present') {
    const d = new Date()
    return d.getFullYear() + d.getMonth() / 12
  }
  const [y, m = 1] = String(ym).split('-').map(Number)
  return y + (m - 1) / 12
}

function DataTable({ head, rows }) {
  return (
    <details className="chart__data">
      <summary>View data</summary>
      <table>
        <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </details>
  )
}

function Bar({ spec }) {
  const data = spec.data.filter((d) => d && typeof d.label === 'string' && Number.isFinite(Number(d.value)))
  const max = Math.max(...data.map((d) => Math.abs(Number(d.value))), 1)
  const unit = spec.unit || ''
  return (
    <>
      <ul className="bars">
        {data.map((d) => {
          const v = Number(d.value)
          return (
            <li key={d.label} className="bars__row" title={`${d.label}: ${v}${unit}`}>
              <span className="bars__label">{d.label}</span>
              <span className="bars__track">
                <span className="bars__fill" style={{ width: `${(Math.abs(v) / max) * 100}%` }} />
              </span>
              <span className="bars__value">{v}{unit}</span>
            </li>
          )
        })}
      </ul>
      <DataTable head={['Item', `Value${unit ? ` (${unit})` : ''}`]} rows={data.map((d) => [d.label, d.value])} />
    </>
  )
}

function Timeline({ spec }) {
  const data = spec.data.filter((d) => d && d.label && d.start)
  const t0 = Math.floor(Math.min(...data.map((d) => toYears(d.start))))
  const t1 = Math.ceil(Math.max(...data.map((d) => toYears(d.end))))
  const span = Math.max(t1 - t0, 1)
  const step = span > 12 ? 3 : span > 6 ? 2 : 1
  const ticks = []
  for (let y = t0; y <= t1; y += step) ticks.push(y)
  const pct = (y) => ((y - t0) / span) * 100

  return (
    <>
      <ol className="tl">
        {data.map((d) => {
          const a = toYears(d.start)
          const b = toYears(d.end)
          const range = `${d.start} – ${d.end || 'present'}`
          return (
            <li key={d.label + d.start} className="tl__row" title={`${d.label}${d.sub ? ` · ${d.sub}` : ''}: ${range}`}>
              <span className="tl__label">
                {d.label}
                {d.sub && <small>{d.sub}</small>}
              </span>
              <span className="tl__track">
                <span className="tl__bar" style={{ left: `${pct(a)}%`, width: `${Math.max(pct(b) - pct(a), 1.2)}%` }} />
              </span>
            </li>
          )
        })}
      </ol>
      <div className="tl__axis" aria-hidden="true">
        <span />
        <span className="tl__ticks">
          {ticks.map((y) => <i key={y} style={{ left: `${pct(y)}%` }}>{y}</i>)}
        </span>
      </div>
      <DataTable
        head={['Item', 'Detail', 'From', 'To']}
        rows={data.map((d) => [d.label, d.sub || '', d.start, d.end || 'present'])}
      />
    </>
  )
}

export default function Chart({ source }) {
  let spec
  try {
    spec = JSON.parse(source)
  } catch {
    return <p className="chart__error">Chart data couldn't be read.</p>
  }
  if (!Array.isArray(spec?.data) || !spec.data.length) return <p className="chart__error">Chart has no data.</p>
  const Body = spec.type === 'timeline' ? Timeline : Bar
  return (
    <figure className="chart">
      {spec.title && <figcaption className="chart__title">{spec.title}</figcaption>}
      <Body spec={spec} />
    </figure>
  )
}
