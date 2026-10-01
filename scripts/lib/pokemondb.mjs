import { decodeEntities, sectionBetween, stripTags } from './html.mjs';

export const PDB = 'https://pokemondb.net';

// /pokedex/all — one row per species/form, including Mega Evolutions and other named forms.
export function parseAllPokemon(html) {
  const rows = html.match(/<tr>\s*<td class="cell-num cell-fixed"[\s\S]*?<\/tr>/g) || [];
  return rows.map((row) => {
    const num = Number(row.match(/data-sort-value="(\d+)"/)[1]);
    const link = row.match(/<a class="ent-name" href="\/pokedex\/([^"]+)"[^>]*>([^<]*)<\/a>/);
    const form = row.match(/<small class="text-muted">([^<]*)<\/small>/);
    const icon = row.match(/\/icon\/([^"/]+)\.png/);
    const types = [...row.matchAll(/class="type-icon type-([a-z]+)"/g)].map((m) => m[1]);
    return {
      num,
      speciesSlug: link[1],
      speciesName: decodeEntities(link[2]),
      formName: form ? decodeEntities(form[1]) : '',
      spriteSlug: icon ? icon[1] : null,
      types
    };
  });
}

// Game Pokédex page — returns the sprite slugs listed (they encode the form, e.g. `wooper-paldean`).
export function parseGameDex(html) {
  const cards = html.match(/<div class="infocard ">[\s\S]*?<\/div>/g) || [];
  const entries = [];
  for (const card of cards) {
    const species = card.match(/href="\/pokedex\/([^"]+)"/);
    const sprite = card.match(/\/(?:normal|icon)\/(?:2x\/|1x\/)?([a-z0-9-]+)\.(?:png|jpg|avif)/);
    if (species) {
      entries.push({ speciesSlug: species[1], spriteSlug: sprite ? sprite[1] : species[1] });
    }
  }
  return entries;
}

function gamesInHeader(th) {
  return [...th.matchAll(/class="igame ([a-z0-9-]+)"/g)].map((m) => m[1]);
}

function parseGameTable(tableHtml) {
  const rows = tableHtml.match(/<tr>[\s\S]*?<\/tr>/g) || [];
  return rows.flatMap((row) => {
    const th = row.match(/<th>([\s\S]*?)<\/th>/);
    const td = row.match(/<td[^>]*>([\s\S]*?)<\/td>/);
    if (!th || !td) {
      return [];
    }
    return [{ games: gamesInHeader(th[1]), html: td[1] }];
  });
}

export function classifyLocation(html) {
  const text = stripTags(html);
  if (/Trade\/migrate from another game/i.test(text)) {
    return { status: 'trade', text: '' };
  }
  if (/Not available in this game/i.test(text)) {
    return { status: 'none', text: '' };
  }
  if (/Location data not yet available/i.test(text)) {
    return { status: 'unknown', text: '' };
  }
  if (/^(Event|Events?\b.*only)/i.test(text) || /distribution/i.test(text)) {
    return { status: 'event', text };
  }
  return { status: 'catch', text };
}

export function parseSpeciesPage(html) {
  const result = {
    eggGroups: [],
    cosmeticForms: [],
    gigantamax: false,
    flavor: [],
    locations: {},
    evolutionFamily: []
  };

  const egg = html.match(/<th>Egg Groups<\/th>\s*<td>([\s\S]*?)<\/td>/);
  if (egg) {
    result.eggGroups = stripTags(egg[1]).split(',').map((s) => s.trim()).filter(Boolean);
  }

  const intro = sectionBetween(html, '<main', ['<div id="dex-basics">']);
  result.gigantamax = /has a Gigantamax form/i.test(intro);
  const formList = intro.match(/<ul class="list-blank col-split[^"]*">([\s\S]*?)<\/ul>/);
  if (formList) {
    result.cosmeticForms = [...formList[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => stripTags(m[1]));
  }

  const evo = sectionBetween(html, 'id="dex-evolution"', ['id="dex-flavor"', 'id="dex-moves"']);
  result.evolutionFamily = [...new Set([...evo.matchAll(/class="ent-name" href="\/pokedex\/([^"]+)"/g)].map((m) => m[1]))];

  // Pokédex entries are grouped by form under <h3> headings when a species has several forms.
  const flavor = sectionBetween(html, 'id="dex-flavor"', ['id="dex-moves"', 'id="dex-sprites"']);
  const parts = flavor.split(/<h3>/);
  parts.forEach((part, index) => {
    let heading = '';
    let body = part;
    if (index > 0) {
      const close = part.indexOf('</h3>');
      heading = stripTags(part.slice(0, close));
      body = part.slice(close + 5);
    }
    const games = parseGameTable(body).flatMap((row) => row.games);
    if (games.length) {
      result.flavor.push({ heading, games: [...new Set(games)] });
    }
  });

  const where = sectionBetween(html, 'id="dex-locations"', ['id="dex-lang"']);
  const table = where.match(/<table class="vitals-table">([\s\S]*?)<\/table>/);
  if (table) {
    for (const row of parseGameTable(table[1])) {
      const location = classifyLocation(row.html);
      for (const game of row.games) {
        result.locations[game] = location;
      }
    }
  }

  return result;
}
