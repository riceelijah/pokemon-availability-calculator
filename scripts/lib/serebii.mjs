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
