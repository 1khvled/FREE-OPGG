const https = require('https');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'OP.GG Desktop App' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    const aramData = await getJson('https://lol-api-champion.op.gg/api/GLOBAL/champions/aram/266/none?tier=all');
    console.log('ARAM status:', !!aramData?.data);
    if (aramData?.data) {
      console.log('ARAM keys:', Object.keys(aramData.data));
      console.log('ARAM core items:', aramData.data.core_items?.length);
      console.log('ARAM runes:', !!aramData.data.runes);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
