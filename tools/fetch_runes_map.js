const https = require('https');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const runes = await getJson('https://ddragon.leagueoflegends.com/cdn/14.20.1/data/en_US/runesReforged.json');
  console.log('Total Rune Trees:', runes.length);
  const sample = runes.map(r => ({ id: r.id, name: r.name, icon: r.icon, slots: r.slots.length }));
  console.log('Trees:', sample);
}

main();
