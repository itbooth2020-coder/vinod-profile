// "Sources" under a live answer (AI-006): the resume passages Claude cited, as a short quote and its
// page ("resume p. 2"). Collapsed by default so answers stay short; offline answers have none.
export default function Citations({ items }) {
  if (!items?.length) return null
  return (
    <details className="cites">
      <summary>Sources ({items.length})</summary>
      <ol>
        {items.map((c, i) => (
          <li key={i}>
            <q>{c.text}</q> <span className="cites__where">{c.label}</span>
          </li>
        ))}
      </ol>
    </details>
  )
}
