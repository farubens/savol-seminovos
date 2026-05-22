const user = process.env.WP_API_USER || 'fa.rubens@gmail.com';
const pass = process.env.WP_API_APP_PASSWORD || 'W9y4 bUld QOIG PV4u oIHo csrb';
const token = Buffer.from(user + ':' + pass).toString('base64');

const url = 'https://palevioletred-lark-270684.hostingersite.com/wp-json/wp/v2/veiculo?per_page=5&context=edit&_fields=id,title,all_meta,meta,featured_media';

(async () => {
  const res = await fetch(url, {
    headers: {
      Authorization: 'Basic ' + token,
      Accept: 'application/json'
    }
  });

  console.log('status', res.status, 'content-type', res.headers.get('content-type'));
  const text = await res.text();
  if (!res.ok) {
    console.log(text.slice(0, 300));
    process.exit(1);
  }

  const rows = JSON.parse(text);
  for (const row of rows) {
    const meta = row.all_meta || row.meta || {};
    console.log('\nID', row.id, row.title?.rendered || '');
    console.log('featured_media', row.featured_media);
    console.log('autosync_photo_urls', String(meta.autosync_photo_urls || '').slice(0, 400));
    console.log('galeria_fotos', String(meta.galeria_fotos || '').slice(0, 250));
  }
})();
