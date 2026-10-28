export function siteUrl(path: string) {
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  return new URL(path.replace(/^\/+/, ''), base).href;
}

export function pageUrl(path: string, parameters: Record<string, string> = {}) {
  const url = new URL(siteUrl(path));
  const current = new URLSearchParams(location.search);
  for (const key of ['lang', 'scoutTheme', 'debug']) {
    const value = current.get(key);
    if (value) url.searchParams.set(key, value);
  }
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url.href;
}