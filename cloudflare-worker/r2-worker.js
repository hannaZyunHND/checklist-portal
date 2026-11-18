/**
 * Cloudflare Worker Proxy cho R2 Bucket (checklist-portal) — 100% Free Tier (100k req/day)
 *
 * Cách deploy nhanh (không lộ Access Key / Secret Key lên GitHub Pages):
 * 1. Vào Cloudflare Dashboard -> Workers & Pages -> Create -> Create Worker -> đặt tên "joytime-r2-proxy".
 * 2. Dán toàn bộ code này vào Worker -> Deploy.
 * 3. Vào Settings -> Bindings -> Add -> R2 Bucket:
 *    - Variable name: BUCKET
 *    - R2 Bucket: checklist-portal
 * 4. Vào Settings -> Variables and Secrets -> Add:
 *    - WORKER_SECRET = chuỗi bí mật (khớp VITE_R2_WORKER_SECRET)
 * 5. Copy URL Worker (https://joytime-r2-proxy.<sub-domain>.workers.dev) vào VITE_R2_WORKER_URL.
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Worker-Secret, X-File-Name',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // POST /upload?key=...
    if (request.method === 'POST' && url.pathname === '/upload') {
      const secret = request.headers.get('X-Worker-Secret') || '';
      if (env.WORKER_SECRET && secret !== env.WORKER_SECRET) {
        return json({ ok: false, error: 'Unauthorized' }, 401);
      }

      const key = (url.searchParams.get('key') || '').replace(/^\/+/, '');
      if (!key) {
        return json({ ok: false, error: 'Missing object key' }, 400);
      }

      const contentLength = Number(request.headers.get('content-length') || 0);
      if (contentLength > MAX_BYTES) {
        return json({ ok: false, error: 'File vượt quá giới hạn 5MB' }, 413);
      }

      const body = await request.arrayBuffer();
      if (body.byteLength > MAX_BYTES) {
        return json({ ok: false, error: 'File vượt quá giới hạn 5MB' }, 413);
      }

      const contentType = request.headers.get('content-type') || 'application/octet-stream';
      await env.BUCKET.put(key, body, {
        httpMetadata: { contentType },
      });

      const fileUrl = `${url.origin}/file/${key}`;
      return json({ ok: true, key, url: fileUrl }, 200);
    }

    // GET /file/<key>
    if (request.method === 'GET' && url.pathname.startsWith('/file/')) {
      const key = decodeURIComponent(url.pathname.slice('/file/'.length));
      if (!key) return new Response('Not found', { status: 404, headers: corsHeaders });

      const obj = await env.BUCKET.get(key);
      if (!obj) return new Response('Not found', { status: 404, headers: corsHeaders });

      const headers = new Headers(corsHeaders);
      obj.writeHttpMetadata(headers);
      headers.set('etag', obj.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return new Response(obj.body, { headers });
    }

    // DELETE /file/<key>
    if (request.method === 'DELETE' && url.pathname.startsWith('/file/')) {
      const secret = request.headers.get('X-Worker-Secret') || '';
      if (env.WORKER_SECRET && secret !== env.WORKER_SECRET) {
        return json({ ok: false, error: 'Unauthorized' }, 401);
      }
      const key = decodeURIComponent(url.pathname.slice('/file/'.length));
      if (!key || !key.startsWith('tickets/')) {
        return json({ ok: false, error: 'Invalid object key' }, 400);
      }
      await env.BUCKET.delete(key);
      return json({ ok: true, deleted: key }, 200);
    }

    return new Response('Joytime R2 Proxy OK', { status: 200, headers: corsHeaders });
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
