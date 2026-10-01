import { decodeEntities, stripTags } from './html.mjs';

export const SEREBII = 'https://www.serebii.net';

// Champions "Available Pokémon" and "Transfer Only" tables. Each row has the
// HOME sprite (`/pokemonhome/pokemon/small/026-a.png`) whose suffix encodes the form.
export function parseChampionsAvailable(html) {
  const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) || [];
  const out = [];
  for (const row of rows) {
    const sprite = row.match(/\/pokemonhome\/pokemon\/(?:small\/)?(\d+)(-[a-z0-9-]+)?\.png/);
    const name = row.match(/<a href="\/pokedex-champions\/[^"]*">([\s\S]*?)<\/a>/);
    if (!sprite || !name) {
      continue;
    }
    out.push({
      num: Number(sprite[1]),
      code: (sprite[2] || '').slice(1),
      name: stripTags(name[1].split(/<br\s*\/?>/i)[0])
    });
  }
  return dedupe(out);
}

export function parseChampionsRosterIndex(html) {
  const seen = new Map();
  for (const match of html.matchAll(/<a href="(recruit\/[a-z0-9-]+\.shtml)"><u>([^<]+)<\/u><\/a><\/td>\s*<td class="fooinfo">([^<]*)<\/td>/g)) {
    seen.set(match[1], { path: match[1], name: decodeEntities(match[2]).trim(), duration: decodeEntities(match[3]).trim() });
  }
  return [...seen.values()];
}

export function parseChampionsRoster(html) {
  const out = [];
  for (const match of html.matchAll(/<img src="\/pokedex-champions\/icon\/(\d+)(-[a-z0-9-]+)?\.png" alt="([^"]*)"/g)) {
    out.push({ num: Number(match[1]), code: (match[2] || '').slice(1), name: decodeEntities(match[3]) });
  }
  return dedupe(out);
}

export function parseGoGeneration(html) {
  const out = [];
  const pattern = /<img src="\/pokemongo\/pokemon\/(\d+)(-[a-z0-9-]+)?\.png"[\s\S]*?<a href="\/pokemongo\/pokemon\/\d+\.shtml">([^<]*)<\/a>([^<]*)</g;
  for (const match of html.matchAll(pattern)) {
    out.push({
      num: Number(match[1]),
      code: (match[2] || '').slice(1),
      name: decodeEntities(match[3]).trim(),
      note: decodeEntities(match[4]).replace(/[()]/g, '').trim()
    });
  }
  return dedupe(out);
}

function dedupe(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.num}|${row.code}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Scarlet/Violet version exclusives (PokémonDB has no SV location data yet).
export function parseSvExclusives(html) {
  const scarletAt = html.indexOf('Exclusive to Pok&eacute;mon Scarlet');
  const violetAt = html.indexOf('Exclusive to Pok&eacute;mon Violet');
  const parse = (segment) =>
    dedupe([...segment.matchAll(/\/pokedex-sv\/icon\/(?:new\/)?(\d+)(-[a-z0-9-]+)?\.png/g)].map((m) => ({ num: Number(m[1]), code: (m[2] || '').slice(1), name: '' })));
  if (scarletAt === -1 || violetAt === -1) {
    return { scarlet: [], violet: [] };
  }
  return { scarlet: parse(html.slice(scarletAt, violetAt)), violet: parse(html.slice(violetAt)) };
}

// Generic Serebii game page: every Pokémon icon on the page as {num, code}.
export function parseIconList(html) {
  const pattern = /src="\/(?:scarletviolet\/pokemon|pokedex-sv\/icon|legendsz-a\/pokemon)\/(?:new\/)?(?:small\/)?(\d{3,4})(-[a-z0-9]+)?\.png"/g;
  return dedupe([...html.matchAll(pattern)].map((m) => ({ num: Number(m[1]), code: (m[2] || '').slice(1), name: '' })));
}

// Serebii pages that say how Pokémon are obtained in games PokémonDB has no
// location data for yet. Order matters: later lists take precedence.
export const GAME_LIST_PAGES = {
  scarlet: [
    { path: 'scarletviolet/pokemonnotindex.shtml', text: 'Obtainable outside the Pokédex' },
    { path: 'scarletviolet/giftpokemon.shtml', text: 'Gift Pokémon' },
    { path: 'scarletviolet/legendary.shtml', text: 'Legendary / special encounter' },
    { path: 'scarletviolet/snacksworthlegendary.shtml', text: 'Snacksworth legendary (The Indigo Disk, Blueberry Academy)' },
    { path: 'scarletviolet/transferonly.shtml', transferOnly: true }
  ],
  'legends-z-a': [
    { path: 'legendsz-a/availablepokemon.shtml', text: 'Available in Lumiose City' },
    { path: 'legendsz-a/hyperspacepokedex.shtml', text: 'Hyperspace Lumiose (Mega Dimension DLC)' },
    { path: 'legendsz-a/giftpokemon.shtml', text: 'Gift Pokémon' },
    { path: 'legendsz-a/legendary.shtml', text: 'Legendary / Mythical encounter' },
    { path: 'legendsz-a/transferonly.shtml', transferOnly: true }
  ]
};

// Per-game Serebii lists used to fill gaps in PokémonDB's location data.
// `versions` maps our game ids to text in Serebii's "Exclusive to …" headings.
export const SEREBII_GAME_AUDITS = [
  {
    section: 'swordshield', maxNum: 898,
    versions: { sword: ['Sword'], shield: ['Shield'] },
    transferOnly: ['transferonly'],
    methods: [['legendary', 'Legendary encounter'], ['dynamaxadventurespokemon', 'Dynamax Adventures (The Crown Tundra)'], ['gift', 'Gift Pokémon'], ['ingametrade', 'In-game trade']],
    fallback: 'Obtainable in-game per Serebii (e.g. Max Raid Battles); PokémonDB lists no location'
  },
  {
    section: 'brilliantdiamondshiningpearl', maxNum: 493,
    versions: { 'brilliant-diamond': ['Brilliant Diamond'], 'shining-pearl': ['Shining Pearl'] },
    transferOnly: ['transferonly'],
    methods: [['legendary', 'Legendary encounter'], ['ramanaspark', 'Ramanas Park'], ['grandunderground', 'Grand Underground'], ['gift', 'Gift Pokémon'], ['ingametrades', 'In-game trade']],
    fallback: 'Obtainable in-game per Serebii; PokémonDB lists no location'
  },
  {
    section: 'sunmoon', maxNum: 802,
    versions: { sun: ['Pokémon Sun'], moon: ['Pokémon Moon'] },
    methods: [['legendary', 'Legendary encounter'], ['gift', 'Gift Pokémon'], ['ingametrades', 'In-game trade']],
    fallback: 'Obtainable in-game per Serebii (e.g. Island Scan or SOS Battles); PokémonDB lists no location'
  },
  {
    section: 'ultrasunultramoon', maxNum: 807,
    versions: { 'ultra-sun': ['Ultra Sun'], 'ultra-moon': ['Ultra Moon'] },
    methods: [['legendary', 'Legendary encounter (Ultra Wormhole or story)'], ['gift', 'Gift Pokémon'], ['ingametrade', 'In-game trade']],
    fallback: 'Obtainable in-game per Serebii (e.g. Island Scan or SOS Battles); PokémonDB lists no location'
  },
  {
    section: 'omegarubyalphasapphire', maxNum: 721,
    versions: { 'omega-ruby': ['Omega Ruby'], 'alpha-sapphire': ['Alpha Sapphire'] },
    methods: [['legendary', 'Legendary encounter (Soaring in the Sky or Mirage Spots)'], ['gift', 'Gift Pokémon'], ['ingametrade', 'In-game trade']],
    fallback: 'Obtainable in-game per Serebii (e.g. Mirage Spots); PokémonDB lists no location'
  },
  {
    section: 'xy', maxNum: 721,
    versions: { x: ['to X', 'Pokémon X'], y: ['to Y', 'Pokémon Y'] },
    methods: [['legendary', 'Legendary encounter'], ['gift', 'Gift Pokémon'], ['ingametrade', 'In-game trade']],
    fallback: 'Friend Safari (per Serebii; PokémonDB lists no location)'
  },
  {
    section: 'heartgoldsoulsilver', maxNum: 493, genderedIcons: true,
    versions: { heartgold: ['HeartGold', 'Heart Gold'], soulsilver: ['SoulSilver', 'Soul Silver'] },
    methods: [['legends', 'Legendary encounter'], ['gift', 'Gift Pokémon'], ['trade', 'In-game trade']],
    fallback: 'Safari Zone or Pokéwalker (per Serebii; PokémonDB lists no location)'
  }
];

const ANY_ICON = /src="(?:[^"]*\/)?(?:pokedex-[a-z0-9]+\/(?:icon(?:\/letsgo)?|ow)|pokemon|pokearth\/sprites\/[a-z]+|[a-z0-9]+\/pokemon(?:\/new)?(?:\/small)?)\/(\d{3,4})(-[a-z0-9]+)?\.(?:png|gif)"/g;

// National numbers of the plain (non-form) icons on a Serebii page. Some
// sections (e.g. HeartGold/SoulSilver) suffix every icon with -m / -f for
// the male / female sprite.
export function parseSpeciesNumbers(html, { genderedIcons = false } = {}) {
  const plain = (suffix) => !suffix || (genderedIcons && (suffix === '-m' || suffix === '-f'));
  return [...new Set([...html.matchAll(ANY_ICON)].filter((m) => plain(m[2])).map((m) => Number(m[1])))];
}

// Splits an exclusives page on its "Exclusive to …" headings.
export function parseExclusivesByVersion(html, versions, options = {}) {
  const marks = [];
  for (const m of html.matchAll(/>\s*([^<>]*Exclusive to[^<>]*)</g)) {
    const text = decodeEntities(m[1]);
    for (const [gameId, keys] of Object.entries(versions)) {
      if (keys.some((key) => text.includes(key))) {
        marks.push({ at: m.index, gameId });
        break;
      }
    }
  }
  const out = Object.fromEntries(Object.keys(versions).map((id) => [id, []]));
  marks.forEach((mark, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].at : html.length;
    out[mark.gameId].push(...parseSpeciesNumbers(html.slice(mark.at, end), options));
  });
  return out;
}
