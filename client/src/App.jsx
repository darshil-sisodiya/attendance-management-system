import { useState } from 'react';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MarkAttendance from './pages/MarkAttendance.jsx';
import Students from './pages/Students.jsx';
import StudentPortal from './pages/StudentPortal.jsx';

const PAGES = { dashboard: ['Dashboard', Dashboard], mark: ['Mark Attendance', MarkAttendance], students: ['Students & Subjects', Students] };

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [page, setPage] = useState('dashboard');

  if (!user) return <Login onLogin={setUser} />;

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };
  const Page = user.role === 'faculty' ? PAGES[page][1] : StudentPortal;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">AE</span>
          <div>
            <strong>AttendEase</strong>
            <small>Attendance Management</small>
          </div>
        </div>
        <nav>
          {user.role === 'faculty' ? (
            Object.entries(PAGES).map(([key, [label]]) => (
              <button key={key} className={page === key ? 'active' : ''} onClick={() => setPage(key)}>
                {label}
              </button>
            ))
          ) : (
            <button className="active">My Attendance</button>
          )}
        </nav>
        <div className="me">
          <div className="avatar">{user.name[0]}</div>
          <div>
            <strong>{user.name}</strong>
            <small>{user.usn || 'Faculty'}</small>
          </div>
        </div>
        <button className="logout" onClick={logout}>Log out</button>
      </aside>
      <main>
        <Page user={user} />
      </main>
    </div>
  );
}
