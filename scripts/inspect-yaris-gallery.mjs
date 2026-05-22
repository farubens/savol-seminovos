const base = 'https://palevioletred-lark-270684.hostingersite.com';
const user = process.env.WP_API_USER || 'fa.rubens@gmail.com';
const pass = process.env.WP_API_APP_PASSWORD || 'W9y4 bUld QOIG PV4u oIHo csrb';
const token = Buffer.from(user + ':' + pass).toString('base64');
const headers = { Authorization: 'Basic ' + token, Accept: 'application/json' };

async function getJson(url) {
  const res = await fetch(url, { headers });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${url} :: ${txt.slice(0, 180)}`);
  return JSON.parse(txt);
}

(async () => {
  const fields = 'id,title,all_meta,meta,featured_media';
  const rows = await getJson(`${base}/wp-json/wp/v2/veiculo?per_page=100&context=edit&_fields=${fields}`);
  const yaris = rows.filter((row) => (row.title?.rendered || '').toLowerCase().includes('yaris'));
  console.log('Yaris rows', yaris.length);

  for (const row of yaris) {
    const meta = row.all_meta || row.meta || {};
    const idsRaw = String(meta.galeria_fotos || '').trim();
    const ids = idsRaw.split(',').map((v) => parseInt(v.trim(), 10)).filter((v) => Number.isFinite(v));

    console.log(`\nVehicle ${row.id} :: ${row.title?.rendered}`);
    console.log('featured_media', row.featured_media);
    console.log('galeria_fotos', idsRaw);

    for (const id of ids.slice(0, 15)) {
      try {
        const media = await getJson(`${base}/wp-json/wp/v2/media/${id}?_fields=id,source_url,mime_type,media_details`);
        const s = media.media_details?.sizes || {};
        const candidate = s.large?.source_url || s.medium_large?.source_url || s.medium?.source_url || s.thumbnail?.source_url || media.source_url || '';
        const hasSpace = /\s/.test(candidate);
        console.log(`  media ${id} mime=${media.mime_type} candidate=${candidate} hasSpace=${hasSpace}`);
      } catch (error) {
        console.log(`  media ${id} ERROR ${String(error.message || error)}`);
      }
    }
  }
})();
