/**
 * Small media helpers shared by the leaderboard, multisearch and my-page
 * screens: summoner avatars, champion portraits and ranked-tier badges.
 *
 * The reference draws its ranked tiers with remote badge images
 * (`tier_info.tier_image_url`, or the desktop asset CDN). When no image is
 * available the badge falls back to a token-coloured chip so the tier is
 * still legible.
 */

import { h } from '../../core/dom.js';

/** Desktop app asset base (tier badges, lane icons). */
export const ASSET_BASE = 'https://desktop-app-data.op.gg/desktop/app/assets/images/';

/** OP.GG static CDN. */
const CDN_BASE = 'https://opgg-static.akamaized.net';

/**
 * Ranked tier -> design token. The reference's own ranked palette is not in
 * `tokens.css`, so the closest tokens are used:
 *   iron #745D53, bronze #5A3E3A, silver #7D8E98, gold #EDA343,
 *   platinum #00B2C3, emerald #00C87C, diamond #557EFF, master #8F2BE5,
 *   grandmaster #E24437, challenger #3053A7.
 */
const RANKED_TIER_TOKEN = {
  challenger: '--accent-blue-strong',
  grandmaster: '--accent-red',
  master: '--accent-pink',
  diamond: '--accent-blue',
  emerald: '--accent-green-bright',
  platinum: '--accent-cyan',
  gold: '--accent-gold',
  silver: '--text-muted',
  bronze: '--accent-orange',
  iron: '--text-label',
  unranked: '--text-faint',
  none: '--text-faint',
};

/** Short badge text for a ranked tier. */
const RANKED_TIER_SHORT = {
  challenger: 'CH',
  grandmaster: 'GM',
  master: 'M',
  diamond: 'D',
  emerald: 'E',
  platinum: 'P',
  gold: 'G',
  silver: 'S',
  bronze: 'B',
  iron: 'I',
  unranked: '—',
  none: '—',
};

/**
 * Canonical lower-case ranked tier key.
 *
 * @param {string|object|null|undefined} tier
 * @returns {string}
 */
export function rankedTierKey(tier) {
  if (!tier) return 'none';
  const raw = typeof tier === 'object'
    ? (tier.tier ?? tier.rank_tier ?? tier.key ?? '')
    : String(tier);
  return String(raw).trim().toLowerCase().replace(/[\s_-]+/g, '_') || 'none';
}

/**
 * The CSS custom property carrying a ranked tier's colour.
 *
 * @param {string|object|null|undefined} tier
 * @returns {string}
 */
export function rankedTierToken(tier) {
  return RANKED_TIER_TOKEN[rankedTierKey(tier)] || RANKED_TIER_TOKEN.none;
}

/**
 * A summoner avatar with an optional level badge.
 *
 * @param {object} options
 * @param {string} [options.url]
 * @param {number} [options.size=32]
 * @param {number|string} [options.level]
 * @param {string} [options.alt]
 * @returns {HTMLElement}
 */
export function createSummonerAvatar({ url = null, size = 32, level = null, alt = '' } = {}) {
  const wrap = h('span.md-avatar', {
    style: { width: `${size}px`, height: `${size}px` },
  });

  if (url) {
    const img = h('img.md-avatar__img', {
      src: url,
      alt,
      loading: 'lazy',
      decoding: 'async',
      referrerpolicy: 'no-referrer',
      on: {
        error: () => {
          img.remove();
          wrap.classList.add('md-avatar--empty');
        },
      },
    });
    wrap.appendChild(img);
  } else {
    wrap.classList.add('md-avatar--empty');
  }

  if (level !== null && level !== undefined && level !== '') {
    wrap.appendChild(h('span.md-avatar__level', { text: String(level) }));
  }
  return wrap;
}

/**
 * A champion portrait. Falls back to a neutral square when the URL is
 * missing or fails to load.
 *
 * @param {object} options
 * @param {string} [options.url]
 * @param {number} [options.size=32]
 * @param {string} [options.alt]
 * @param {boolean} [options.round]
 * @returns {HTMLElement}
 */
export function createChampionPortrait({ url = null, size = 32, alt = '', round = false } = {}) {
  const wrap = h('span.md-champion', {
    class: round ? 'md-champion--round' : null,
    style: { width: `${size}px`, height: `${size}px` },
  });

  if (url) {
    const img = h('img.md-champion__img', {
      src: url,
      alt,
      loading: 'lazy',
      decoding: 'async',
      referrerpolicy: 'no-referrer',
      on: {
        error: () => {
          img.remove();
          wrap.classList.add('md-champion--empty');
        },
      },
    });
    wrap.appendChild(img);
  } else {
    wrap.classList.add('md-champion--empty');
  }
  return wrap;
}

/**
 * A ranked-tier badge. Uses the reference's badge image when the API
 * provides one, otherwise a token-coloured chip.
 *
 * @param {object} options
 * @param {string|object} [options.tier]
 * @param {string} [options.division]
 * @param {string} [options.imageUrl]
 * @param {number} [options.size=24]
 * @param {string} [options.title]
 * @returns {HTMLElement}
 */
export function createTierBadge({ tier, division = '', imageUrl = null, size = 24, title = null, showText = false } = {}) {
  const key = rankedTierKey(tier);
  const label = String(key === 'none' ? '' : key).toUpperCase();
  const text = [label, division].filter(Boolean).join(' ');

  const badge = h('span.md-tier', {
    title: title || text,
    style: { minWidth: `${size}px`, height: `${size}px` },
    dataset: { tier: key },
  }, [h('span.md-tier__short', { text: RANKED_TIER_SHORT[key] || '—' })]);

  if (showText && text) badge.appendChild(h('span.md-tier__text', { text }));

  /* The reference draws the rank with a badge image; the short code stays in
     the DOM so a failed image still leaves the tier readable. */
  if (imageUrl) {
    const img = h('img.md-tier__img', {
      src: imageUrl,
      alt: '',
      loading: 'lazy',
      decoding: 'async',
      referrerpolicy: 'no-referrer',
      on: { error: () => img.remove() },
    });
    badge.appendChild(img);
  }
  return badge;
}

/* --------------------------------------------------------------------------
 * Champion catalogue
 * ------------------------------------------------------------------------ */

/** Module-level cache so the static payload is fetched at most once. */
let cataloguePromise = null;

/**
 * Collect the champion records out of whatever `OPGG_STATIC_DATA` returned.
 *
 * @param {any} raw
 * @returns {Array<{id:number|string,key:string,name:string,imageUrl:string}>}
 */
function collectChampions(raw) {
  const list = [];
  const push = (record) => {
    if (!record || typeof record !== 'object') return;
    const id = record.id ?? record.champion_id ?? record.championId;
    if (id === undefined || id === null) return;
    list.push({
      id: String(id),
      key: String(record.key ?? record.champion_key ?? ''),
      name: String(record.name ?? ''),
      imageUrl: String(record.image_url ?? record.imageUrl ?? ''),
    });
  };

  if (Array.isArray(raw)) {
    raw.forEach(push);
    return list;
  }
  if (!raw || typeof raw !== 'object') return list;

  for (const key of ['data', 'champions', 'metaChampions', 'list']) {
    const value = raw[key];
    if (Array.isArray(value)) {
      value.forEach(push);
      return list;
    }
    if (value && typeof value === 'object') {
      for (const [id, record] of Object.entries(value)) {
        if (record && typeof record === 'object') {
          push({ id, ...record });
        }
      }
      return list;
    }
  }
  return list;
}

/**
 * Fetch (and cache) the champion catalogue used to resolve champion
 * portraits. Resolves to an empty map when the endpoint is unavailable —
 * portraits then degrade to neutral squares.
 *
 * @param {object} api - the `ctx.api` facade.
 * @returns {Promise<Map<string, {id:string,key:string,name:string,imageUrl:string}>>}
 */
export function loadChampionCatalogue(api) {
  if (!api || typeof api.staticData !== 'function') {
    return Promise.resolve(new Map());
  }
  if (!cataloguePromise) {
    cataloguePromise = Promise.resolve()
      .then(() => api.staticData())
      .then((raw) => {
        const map = new Map();
        for (const champion of collectChampions(raw)) {
          map.set(champion.id, champion);
          if (champion.key) map.set(champion.key.toLowerCase(), champion);
        }
        return map;
      })
      .catch(() => new Map());
  }
  return cataloguePromise;
}

/**
 * Portrait URL for a champion id.
 *
 * @param {Map<string, object>} catalogue
 * @param {number|string|null|undefined} championId
 * @param {number} [size=32]
 * @returns {string|null}
 */
export function championImageUrl(catalogue, championId, size = 32) {
  if (championId === null || championId === undefined || championId === '') return null;
  const record = catalogue && typeof catalogue.get === 'function'
    ? catalogue.get(String(championId))
    : null;
  if (!record) return null;

  if (record.imageUrl) {
    const base = record.imageUrl.split('?')[0];
    return `${base}?image=c_scale,q_auto,w_${size}`;
  }
  if (record.key) {
    return `${CDN_BASE}/meta/images/lol/latest/champion/${record.key}.png?image=c_scale,q_auto,w_${size}`;
  }
  return null;
}
