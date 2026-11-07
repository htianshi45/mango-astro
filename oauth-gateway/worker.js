/**
 * Decap CMS → GitHub OAuth 网关（Cloudflare Worker）
 *
 * 协议已从 decap-cms@3.17.3 主程序逐行核对：
 *  - CMS 打开弹窗：{base_url}/{auth_endpoint}?provider=github&site_id=...&scope=repo
 *  - 网关 /auth 必须先向 opener 发 "authorizing:github"，等 CMS 原样回发后才能跳 GitHub
 *    （直接 302 会让 CMS 一直停在 handshake 监听，登录无响应）
 *  - /callback 用 code 换 access_token，然后向 opener 发
 *      "authorization:github:success:" + JSON.stringify({token, provider:"github"})
 *    失败则发 "authorization:github:error:" + JSON.stringify({error, message})
 *  - CMS 只接受 source origin === new URL(base_url).origin 的消息，本 Worker 天然满足
 *  - CMS 还会 POST {base_url}/{auth_endpoint}/refresh，GitHub OAuth App 不签发
 *    refresh_token，这里明确返回 501 而不是 404
 *
 * Secrets（wrangler secret put，绝不写进代码/wrangler.toml）：
 *   GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
 * Vars（wrangler.toml）：
 *   ALLOWED_ORIGINS  CMS 页面 origin 白名单，逗号分隔
 */

const PROVIDER = 'github';
const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const STATE_COOKIE = 'mango_oauth_state';
const ORIGIN_COOKIE = 'mango_cms_origin';
const COOKIE_MAX_AGE = 600; // 10 分钟

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const gatewayOrigin = url.origin;
    try {
      if (url.pathname === '/auth' && request.method === 'GET') {
        return handleAuth(request, env, gatewayOrigin);
      }
      if (url.pathname === '/callback' && request.method === 'GET') {
        return handleCallback(request, env, gatewayOrigin);
      }
      if (url.pathname === '/auth/refresh') {
        return json({ error: 'not_supported', message: 'GitHub OAuth Apps do not issue refresh tokens.' }, 501, gatewayOrigin);
      }
      if (url.pathname === '/' || url.pathname === '/health') {
        return health(env, gatewayOrigin);
      }
      return new Response('Not Found', { status: 404, headers: baseHeaders(gatewayOrigin) });
    } catch (err) {
      return resultPage(
        'authorization:' + PROVIDER + ':error:' + JSON.stringify({
          error: 'gateway_error', message: String(err && err.message || err),
        }),
        allowedOrigins(env)[0], gatewayOrigin,
      );
    }
  },
};

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || 'http://localhost:4321,http://localhost:4322')
    .split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
}

function baseHeaders(gatewayOrigin) {
  return { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Referrer-Policy': 'no-referrer' };
}

function json(obj, status, gatewayOrigin) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { ...baseHeaders(gatewayOrigin), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function health(env, gatewayOrigin) {
  return json({
    ok: true,
    provider: PROVIDER,
    client_id_configured: Boolean(env.GITHUB_CLIENT_ID),
    client_secret_configured: Boolean(env.GITHUB_CLIENT_SECRET),
    allowed_origins: allowedOrigins(env),
    callback_url: gatewayOrigin + '/callback',
    note: '把 callback_url 原样填进 GitHub OAuth App 的 Authorization callback URL',
  }, 200, gatewayOrigin);
}

function secureFlag(gatewayOrigin) {
  return gatewayOrigin.startsWith('https://') ? '; Secure' : '';
}

function makeCookie(name, value, maxAge, gatewayOrigin) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secureFlag(gatewayOrigin)}`;
}

function clearCookie(name, gatewayOrigin) {
  return makeCookie(name, '', 0, gatewayOrigin);
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}

function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 从 Referer 推断 CMS 页面 origin，并限制在白名单内 */
function resolveCmsOrigin(request, env) {
  const list = allowedOrigins(env);
  const ref = request.headers.get('Referer') || '';
  let candidate = '';
  try { candidate = new URL(ref).origin; } catch (_) { /* ignore */ }
  return list.includes(candidate) ? candidate : list[0];
}

/** scope 由 CMS 传参，只做字符集白名单，避免注入 */
function cleanScope(raw) {
  const v = (raw || 'repo').trim();
  return /^[a-z_,]{1,64}$/.test(v) ? v : 'repo';
}

function handleAuth(request, env, gatewayOrigin) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return resultPage(
      'authorization:' + PROVIDER + ':error:' + JSON.stringify({
        error: 'gateway_not_configured', message: '缺少 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET',
      }),
      resolveCmsOrigin(request, env), gatewayOrigin,
    );
  }

  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') || PROVIDER;
  if (provider !== PROVIDER) {
    return resultPage(
      'authorization:' + PROVIDER + ':error:' + JSON.stringify({ error: 'unsupported_provider' }),
      resolveCmsOrigin(request, env), gatewayOrigin,
    );
  }

  const state = randomHex(32);
  const cmsOrigin = resolveCmsOrigin(request, env);
  const redirectUri = gatewayOrigin + '/callback';

  const gh = new URL(AUTHORIZE_URL);
  gh.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  gh.searchParams.set('redirect_uri', redirectUri);
  gh.searchParams.set('scope', cleanScope(url.searchParams.get('scope')));
  gh.searchParams.set('state', state);
  gh.searchParams.set('allow_signup', 'false');
  if (url.searchParams.get('login') === 'true') gh.searchParams.set('login', 'true');

  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>正在跳转 GitHub 授权…</title></head>
<body style="font:14px/1.6 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;padding:32px;color:#333">
正在跳转 GitHub 授权…
<script>
(function(){
  var MSG = ${JSON.stringify('authorizing:' + PROVIDER)};
  var TARGET = ${JSON.stringify(cmsOrigin)};
  var NEXT = ${JSON.stringify(gh.toString())};
  var done = false;
  function go(){ if(done) return; done = true; window.location.href = NEXT; }
  window.addEventListener('message', function(e){
    if(e.data === MSG && e.origin === TARGET) go();
  });
  try { window.opener && window.opener.postMessage(MSG, TARGET); }
  catch(err) { go(); }
  // 兜底：某些旧版 CMS 不回发握手，2.5s 后仍然继续
  setTimeout(go, 2500);
})();
</script></body></html>`;

  const headers = {
    ...baseHeaders(gatewayOrigin),
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'",
  };
  return new Response(html, {
    status: 200,
    headers: [
      ...Object.entries(headers),
      ['Set-Cookie', makeCookie(STATE_COOKIE, state, COOKIE_MAX_AGE, gatewayOrigin)],
      ['Set-Cookie', makeCookie(ORIGIN_COOKIE, encodeURIComponent(cmsOrigin), COOKIE_MAX_AGE, gatewayOrigin)],
    ],
  });
}

async function handleCallback(request, env, gatewayOrigin) {
  const url = new URL(request.url);
  const cookies = parseCookies(request.headers.get('Cookie'));
  const list = allowedOrigins(env);
  const savedOrigin = decodeURIComponent(cookies[ORIGIN_COOKIE] || '');
  const cmsOrigin = list.includes(savedOrigin) ? savedOrigin : list[0];

  const ghError = url.searchParams.get('error');
  if (ghError) {
    return fail('github_denied', url.searchParams.get('error_description') || ghError, cmsOrigin, gatewayOrigin);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = cookies[STATE_COOKIE];
  if (!code || !state || !savedState || state !== savedState) {
    return fail('invalid_state', 'state 校验失败或授权码缺失，请重新登录', cmsOrigin, gatewayOrigin);
  }

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'mango-cms-oauth-gateway',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: gatewayOrigin + '/callback',
      state,
    }),
  });
  const data = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || data.error || !data.access_token) {
    return fail(data.error || 'token_exchange_failed', data.error_description || '换取 access_token 失败', cmsOrigin, gatewayOrigin);
  }

  return resultPage(
    'authorization:' + PROVIDER + ':success:' + JSON.stringify({
      token: data.access_token,
      provider: PROVIDER,
      scope: data.scope || '',
    }),
    cmsOrigin, gatewayOrigin,
  );
}

function fail(error, message, cmsOrigin, gatewayOrigin) {
  return resultPage(
    'authorization:' + PROVIDER + ':error:' + JSON.stringify({ error, message }),
    cmsOrigin, gatewayOrigin,
  );
}

/** 结果页：把消息 postMessage 回 CMS 的 opener，然后自动关闭弹窗 */
function resultPage(message, targetOrigin, gatewayOrigin) {
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>授权完成</title></head>
<body style="font:14px/1.6 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;padding:32px;color:#333">
授权完成，窗口即将关闭…
<script>
(function(){
  var MSG = ${JSON.stringify(message)};
  var TARGET = ${JSON.stringify(targetOrigin)};
  try { if (window.opener) window.opener.postMessage(MSG, TARGET); } catch (err) {}
  setTimeout(function(){ window.close(); }, 300);
})();
</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: [
      ...Object.entries({
        ...baseHeaders(gatewayOrigin),
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'",
      }),
      ['Set-Cookie', clearCookie(STATE_COOKIE, gatewayOrigin)],
      ['Set-Cookie', clearCookie(ORIGIN_COOKIE, gatewayOrigin)],
    ],
  });
}
