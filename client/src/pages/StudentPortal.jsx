import { useEffect, useState } from 'react';
import { api, pctClass } from '../api.js';

function Ring({ value, cls }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className={'ring ' + cls}>
      <circle cx="40" cy="40" r={r} className="track" />
      <circle cx="40" cy="40" r={r} className="value" strokeDasharray={`${(c * (value ?? 0)) / 100} ${c}`} />
      <text x="40" y="45" textAnchor="middle">{value ?? '—'}%</text>
    </svg>
  );
}

export default function StudentPortal({ user }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api('/me').then(setData);
  }, []);
  if (!data) return <p className="muted">Loading…</p>;

  const held = data.subjects.reduce((n, s) => n + s.held, 0);
  const attended = data.subjects.reduce((n, s) => n + s.attended, 0);
  const overall = held ? Math.round((1000 * attended) / held) / 10 : null;

  return (
    <>
      <header className="page-head">
        <div>
          <h2>My Attendance</h2>
          <p className="muted">{user.name} · {user.usn} · Minimum required: {data.target}%</p>
        </div>
        <div className="card kpi compact">
          <small>Overall</small>
          <strong className={pctClass(overall)}>{overall ?? '—'}%</strong>
        </div>
      </header>

      <section className="subject-grid">
        {data.subjects.map((s) => {
          const cls = pctClass(s.percent, data.target);
          return (
            <div key={s.subjectId} className="card subject-card">
              <Ring value={s.percent} cls={cls} />
              <div>
                <small className="muted">{s.code}</small>
                <h3>{s.subject}</h3>
                <p>{s.attended} of {s.held} classes attended</p>
                {s.percent < data.target ? (
                  <p className="pill bad">Attend the next {s.needed} classes to reach {data.target}%</p>
                ) : (
                  <p className="pill good">You can miss {s.canSkip} class{s.canSkip === 1 ? '' : 'es'} and stay above {data.target}%</p>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
