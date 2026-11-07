// Cloudflare Access check. Access sits in front of the Worker and signs every
// request with a JWT in the Cf-Access-Jwt-Assertion header. The Worker verifies
// it again, so a request that bypasses Access (for example the workers.dev URL)
// is refused. Fails closed: without ACCESS_TEAM_DOMAIN and ACCESS_AUD nothing
// is served unless DEV_ALLOW_NO_AUTH = "true" (local development only).

let jwksCache = { at: 0, keys: [] };

function b64urlToBytes(s) {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function decodePart(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

async function getKeys(teamDomain) {
  if (Date.now() - jwksCache.at < 10 * 60 * 1000 && jwksCache.keys.length) return jwksCache.keys;
  const host = teamDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const res = await fetch(`https://${host}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('Cannot load Access certificates');
  const data = await res.json();
  jwksCache = { at: Date.now(), keys: data.keys || [] };
  return jwksCache.keys;
}

export async function authenticate(request, env) {
  if (env.DEV_ALLOW_NO_AUTH === 'true') {
    return { ok: true, email: 'dev@localhost', dev: true };
  }
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return { ok: false, status: 503, error: 'Access is not configured (ACCESS_TEAM_DOMAIN, ACCESS_AUD)' };
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return { ok: false, status: 401, error: 'Missing Access token' };

  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, status: 401, error: 'Malformed token' };

  let header, payload;
  try {
    header = decodePart(parts[0]);
    payload = decodePart(parts[1]);
  } catch {
    return { ok: false, status: 401, error: 'Malformed token' };
  }
  if (header.alg !== 'RS256') return { ok: false, status: 401, error: 'Unexpected algorithm' };

  const keys = await getKeys(env.ACCESS_TEAM_DOMAIN);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return { ok: false, status: 401, error: 'Unknown signing key' };

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) return { ok: false, status: 401, error: 'Bad signature' };

  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) return { ok: false, status: 403, error: 'Wrong audience' };
  if (payload.exp && payload.exp < now) return { ok: false, status: 401, error: 'Token expired' };
  if (payload.nbf && payload.nbf > now + 60) return { ok: false, status: 401, error: 'Token not yet valid' };

  const allowed = (env.ALLOWED_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = String(payload.email || '').toLowerCase();
  if (allowed.length && !allowed.includes(email)) return { ok: false, status: 403, error: 'Email not allowed' };

  return { ok: true, email };
}
