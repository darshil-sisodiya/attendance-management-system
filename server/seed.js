// Resets the database with a demo 7th-semester CSE section (Sep–Oct 2026).
import { db, hashPassword } from './db.js';

db.exec('DELETE FROM attendance; DELETE FROM subjects; DELETE FROM users;');

const addUser = db.prepare('INSERT INTO users (name, username, password_hash, role, usn) VALUES (?, ?, ?, ?, ?)');
addUser.run('Prof. Faculty Coordinator', 'faculty', hashPassword('faculty123'), 'faculty', null);

// [USN, name, how regularly they attend]
const students = [
  ['1NH23CS001', 'Aarav Sharma', 0.95], ['1NH23CS012', 'Ananya Rao', 0.9],
  ['1NH23CS019', 'Bhavya Nair', 0.7], ['1NH23CS027', 'Chirag Patel', 0.88],
  ['1NH23CS034', 'Diya Menon', 0.97], ['1NH23CS045', 'Farhan Khan', 0.64],
  ['1NH23CS052', 'Gauri Kulkarni', 0.85], ['1NH23CS061', 'Harsh Vardhan', 0.92],
  ['1NH23CS070', 'Darshil Sisodiya', 0.94], ['1NH23CS078', 'Ishita Reddy', 0.72],
  ['1NH23CS089', 'Karthik Srinivas', 0.82], ['1NH23CS096', 'Meera Iyer', 0.96],
  ['1NH23CS104', 'Nikhil Joshi', 0.78], ['1NH23CS113', 'Priya Desai', 0.6],
];
const studentIds = students.map(([usn, name, rate]) => ({
  id: addUser.run(name, usn.toLowerCase(), hashPassword('student123'), 'student', usn).lastInsertRowid,
  rate,
}));

// [code, name, weekdays the class meets (0 = Sunday)]
const subjects = [
  ['22CSE71', 'Full Stack Technologies', [1, 3, 5]],
  ['22CSE72', 'Cloud Computing', [2, 4]],
  ['22CSE73', 'Machine Learning', [1, 2, 4]],
  ['22CSE74', 'Cryptography & Network Security', [3, 5]],
];
const addSubject = db.prepare('INSERT INTO subjects (code, name) VALUES (?, ?)');
const mark = db.prepare('INSERT INTO attendance (subject_id, student_id, date, status) VALUES (?, ?, ?, ?)');

// Deterministic PRNG (mulberry32) so the demo data is the same every run.
let seed = 70;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

db.exec('BEGIN');
for (const [code, name, days] of subjects) {
  const subjectId = addSubject.run(code, name).lastInsertRowid;
  for (let d = new Date('2026-09-01T00:00:00Z'); d <= new Date('2026-10-23T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
    if (!days.includes(d.getUTCDay())) continue;
    const date = d.toISOString().slice(0, 10);
    for (const s of studentIds) mark.run(subjectId, s.id, date, random() < s.rate ? 'P' : 'A');
  }
}
db.exec('COMMIT');

console.log(`Seeded ${students.length} students, ${subjects.length} subjects.`);
console.log('Faculty login: faculty / faculty123 | Student login: <usn in lowercase> / student123');
