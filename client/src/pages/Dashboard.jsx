import { useEffect, useMemo, useState } from 'react';
import { api, pctClass } from '../api.js';
import ChartBox from '../ChartBox.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api('/summary').then(setData);
  }, []);

  const charts = useMemo(() => {
    if (!data) return null;
    const target = { type: 'line', label: `${data.target}% target`, data: data.subjects.map(() => data.target), borderColor: '#e11d48', borderDash: [6, 4], pointRadius: 0 };
    return {
      subjects: {
        type: 'bar',
        data: {
          labels: data.subjects.map((s) => s.code),
          datasets: [
            { label: 'Attendance %', data: data.subjects.map((s) => s.percent), backgroundColor: data.subjects.map((s) => (s.percent < data.target ? '#f97316' : '#0d9488')), borderRadius: 6 },
            target,
          ],
        },
        options: { scales: { y: { min: 0, max: 100 } }, plugins: { tooltip: { callbacks: { title: (i) => data.subjects[i[0].dataIndex].name } } } },
      },
      trend: {
        type: 'line',
        data: {
          labels: data.trend.map((t) => t.date.slice(5)),
          datasets: [{ label: 'Daily attendance %', data: data.trend.map((t) => t.percent), borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,.12)', fill: true, tension: 0.35 }],
        },
        options: { scales: { y: { min: 40, max: 100 } } },
      },
    };
  }, [data]);

  const exportCsv = async () => {
    const url = URL.createObjectURL(await api('/export.csv'));
    Object.assign(document.createElement('a'), { href: url, download: 'attendance-report.csv' }).click();
    URL.revokeObjectURL(url);
  };

  if (!data) return <p className="muted">Loading…</p>;
  const { totals } = data;

  return (
    <>
      <header className="page-head">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">7th Semester CSE · Academic Year 2026–27</p>
        </div>
        <button className="primary" onClick={exportCsv}>Export CSV Report</button>
      </header>

      <section className="kpis">
        <div className="card kpi"><small>Students</small><strong>{totals.students}</strong></div>
        <div className="card kpi"><small>Subjects</small><strong>{totals.subjects}</strong></div>
        <div className="card kpi"><small>Classes Held</small><strong>{totals.classes}</strong></div>
        <div className="card kpi"><small>Overall Attendance</small><strong className={pctClass(totals.percent)}>{totals.percent ?? '—'}%</strong></div>
      </section>

      <section className="grid2">
        <div className="card">
          <h3>Subject-wise Attendance</h3>
          <ChartBox config={charts.subjects} />
        </div>
        <div className="card">
          <h3>Daily Attendance Trend</h3>
          <ChartBox config={charts.trend} />
        </div>
      </section>

      <section className="card">
        <h3>
          Shortage Watchlist <span className="pill bad">{data.shortage.length} below {data.target}%</span>
        </h3>
        <table>
          <thead>
            <tr><th>USN</th><th>Student</th><th>Subject</th><th>Attended / Held</th><th>Attendance</th><th>Classes needed</th></tr>
          </thead>
          <tbody>
            {data.shortage.map((r) => (
              <tr key={r.studentId + '-' + r.subjectId}>
                <td>{r.usn}</td>
                <td>{r.name}</td>
                <td>{r.code} · {r.subject}</td>
                <td>{r.attended} / {r.held}</td>
                <td><span className={'pill ' + pctClass(r.percent)}>{r.percent}%</span></td>
                <td><strong>{r.needed}</strong> consecutive</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
