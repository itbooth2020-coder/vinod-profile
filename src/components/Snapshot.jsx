import { snapshot, industryCards } from '../data.js'

export default function Snapshot() {
  return (
    <section id="snapshot" className="section section--alt">
      <div className="container">
        <h2>Snapshot</h2>
        <div className="snapshot">
          <dl className="card snapshot__table">
            {snapshot.map((s) => (
              <div key={s.label} className="snapshot__row">
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
          <div>
            <h3 className="snapshot__heading">Industry experience</h3>
            <ul className="industries">
              {industryCards.map((i) => (
                <li key={i.name} className="card industries__item">
                  <span className="card__icon" aria-hidden="true">{i.icon}</span>
                  <span>{i.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
