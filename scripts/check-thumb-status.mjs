const base = 'https://palevioletred-lark-270684.hostingersite.com';
const user = process.env.WP_API_USER || 'fa.rubens@gmail.com';
const pass = process.env.WP_API_APP_PASSWORD || 'W9y4 bUld QOIG PV4u oIHo csrb';
const token = Buffer.from(user + ':' + pass).toString('base64');
const headers = { Authorization: 'Basic ' + token, Accept: 'application/json' };

async function getJson(url) {
  const res = await fetch(url, { headers });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return JSON.parse(txt);
}

(async () => {
  const row = await getJson(`${base}/wp-json/wp/v2/veiculo/892?context=edit&_fields=id,title,all_meta,meta`);
  const meta = row.all_meta || row.meta || {};
  const ids = String(meta.galeria_fotos || '').split(',').map((v) => parseInt(v.trim(), 10)).filter(Boolean).slice(0, 6);
  console.log('ids', ids);
  for (const id of ids) {
    const media = await getJson(`${base}/wp-json/wp/v2/media/${id}?_fields=id,source_url,media_details`);
    const sizes = media.media_details?.sizes || {};
    const url = sizes.large?.source_url || sizes.medium_large?.source_url || sizes.medium?.source_url || sizes.thumbnail?.source_url || media.source_url;
    const imgRes = await fetch(url, { method: 'HEAD' });
    console.log(id, imgRes.status, url);
  }
})();
