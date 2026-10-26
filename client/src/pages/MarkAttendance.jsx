import { useEffect, useState } from 'react';
import { api, today } from '../api.js';

export default function MarkAttendance() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(today());
  const [roster, setRoster] = useState([]);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api('/subjects').then((s) => {
      setSubjects(s);
      setSubjectId(s[0]?.id ?? '');
    });
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    setMessage(null);
    // Unmarked students default to present; the faculty toggles absentees.
    api(`/attendance?subjectId=${subjectId}&date=${date}`).then((r) => setRoster(r.map((s) => ({ ...s, status: s.status || 'P', saved: !!s.status }))));
  }, [subjectId, date]);

  const setAll = (status) => setRoster((r) => r.map((s) => ({ ...s, status })));
  const toggle = (id) => setRoster((r) => r.map((s) => (s.id === id ? { ...s, status: s.status === 'P' ? 'A' : 'P' } : s)));

  const save = async () => {
    try {
      const r = await api('/attendance', { method: 'POST', body: { subjectId, date, records: roster.map((s) => ({ studentId: s.id, status: s.status })) } });
      setRoster((prev) => prev.map((s) => ({ ...s, saved: true })));
      setMessage({ ok: true, text: `Saved: ${r.present} present, ${r.saved - r.present} absent.` });
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    }
  };

  const present = roster.filter((s) => s.status === 'P').length;
  const alreadyMarked = roster.some((s) => s.saved);

  return (
    <>
      <header className="page-head">
        <div>
          <h2>Mark Attendance</h2>
          <p className="muted">Pick a subject and date, mark absentees, then save.</p>
        </div>
      </header>

      <section className="card toolbar">
        <label>
          Subject
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="toolbar-actions">
          <button onClick={() => setAll('P')}>All present</button>
          <button onClick={() => setAll('A')}>All absent</button>
        </div>
      </section>

      <section className="card">
        <h3>
          Class Roster
          <span className="pill good">{present} present</span>
          <span className="pill bad">{roster.length - present} absent</span>
          {alreadyMarked && <span className="pill">already marked, saving will update</span>}
        </h3>
        <div className="roster">
          {roster.map((s) => (
            <button key={s.id} className={'student ' + (s.status === 'P' ? 'present' : 'absent')} onClick={() => toggle(s.id)}>
              <span>
                <strong>{s.name}</strong>
                <small>{s.usn}</small>
              </span>
              <b>{s.status === 'P' ? 'Present' : 'Absent'}</b>
            </button>
          ))}
        </div>
        <div className="save-row">
          {message && <p className={message.ok ? 'success' : 'error'}>{message.text}</p>}
          <button className="primary" onClick={save} disabled={!roster.length}>Save Attendance</button>
        </div>
      </section>
    </>
  );
}
