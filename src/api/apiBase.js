/** Backend origin — set REACT_APP_API_URL in .env.local for production/staging. */
export function getApiBase() {
  const fromEnv = process.env.REACT_APP_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return 'https://kay-one-api.kopanovertex.com';
}
