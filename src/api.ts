export async function fetchJSON(url: string, options?: RequestInit) {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message =
      (isJson && data && (data.error || data.message)) ||
      (typeof data === 'string' ? data.slice(0, 160) : `HTTP ${res.status}`);
    throw new Error(String(message));
  }
  if (!isJson) {
    throw new TypeError(`Expected JSON, got ${contentType}`);
  }
  return data;
}
