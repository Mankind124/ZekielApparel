/**
 * Serves uploaded images from the R2 bucket.
 * Any request to /uploads/FILENAME is fetched from R2 and streamed back.
 */

export async function onRequestGet({ env, params }) {
  const key = Array.isArray(params.path) ? params.path.join('/') : params.path;
  if (!key) return new Response('Not found', { status: 404 });

  const obj = await env.ZEKIEL_R2.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=86400');
  return new Response(obj.body, { headers });
}
