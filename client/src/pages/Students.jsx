import { useEffect, useState } from 'react';
import { api, pctClass } from '../api.js';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [student, setStudent] = useState({ name: '', usn: '' });
  const [subject, setSubject] = useState({ code: '', name: '' });
  const [error, setError] = useState('');

  const load = () => {
    api('/students').then(setStudents);
    api('/subjects').then(setSubjects);
  };
  useEffect(load, []);

  const add = (path, body, reset) => async (e) => {
    e.preventDefault();
    try {
      await api(path, { method: 'POST', body });
      reset();
      setError('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (s) => {
    if (!confirm(`Remove ${s.name} (${s.usn}) and all their attendance records?`)) return;
    await api('/students/' + s.id, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h2>Students & Subjects</h2>
          <p className="muted">New students log in with their USN (lowercase) as the password.</p>
        </div>
      </header>
      {error && <p className="error">{error}</p>}

      <section className="grid2">
        <form className="card inline-form" onSubmit={add('/students', student, () => setStudent({ name: '', usn: '' }))}>
          <h3>Add Student</h3>
          <input placeholder="Full name" required value={student.name} onChange={(e) => setStudent({ ...student, name: e.target.value })} />
          <input placeholder="USN e.g. 1NH23CS120" required value={student.usn} onChange={(e) => setStudent({ ...student, usn: e.target.value })} />
          <button className="primary">Add</button>
        </form>
        <form className="card inline-form" onSubmit={add('/subjects', subject, () => setSubject({ code: '', name: '' }))}>
          <h3>Add Subject</h3>
          <input placeholder="Code e.g. 22CSE75" required value={subject.code} onChange={(e) => setSubject({ ...subject, code: e.target.value })} />
          <input placeholder="Subject name" required value={subject.name} onChange={(e) => setSubject({ ...subject, name: e.target.value })} />
          <button className="primary">Add</button>
        </form>
      </section>

      <section className="card">
        <h3>Student Register <span className="pill">{students.length} students · {subjects.length} subjects</span></h3>
        <table>
          <thead>
            <tr><th>USN</th><th>Name</th><th>Attended / Held</th><th>Overall</th><th>Shortage subjects</th><th></th></tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.usn}</td>
                <td>{s.name}</td>
                <td>{s.attended} / {s.held}</td>
                <td><span className={'pill ' + pctClass(s.percent)}>{s.percent ?? '—'}{s.percent != null && '%'}</span></td>
                <td>{s.shortage ? <span className="pill bad">{s.shortage}</span> : <span className="muted">None</span>}</td>
                <td><button className="link danger" onClick={() => remove(s)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
