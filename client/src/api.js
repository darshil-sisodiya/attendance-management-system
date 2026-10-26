// Thin fetch wrapper: attaches the JWT and turns API errors into exceptions.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('token') || '') },
    body: body && JSON.stringify(body),
  });
  if (res.status === 401 && path !== '/login') {
    localStorage.clear();
    location.reload();
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.status === 204 ? null : path.endsWith('.csv') ? res.blob() : res.json();
}

export const today = () => new Date().toLocaleDateString('en-CA');

export const pctClass = (p, target = 75) => (p == null ? '' : p < target ? 'bad' : p < target + 10 ? 'warn' : 'good');
