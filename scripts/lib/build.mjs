import { GAMES } from '../../src/games.js';
import { slugify } from './html.mjs';
import { iconCode } from './icons.mjs';
import {
  CHANGEABLE_SPECIES,
  FORM_AVAILABILITY_OVERRIDES,
  COSMETIC_FORMS,
  EXTRA_BATTLE_FORMS,
  LEGENDARY,
  LGPE_ALOLAN_TRADES,
  MYTHICAL,
  ONE_OFF_PARADOX,
  ONE_PER_SAVE_FORMS,
  REPEATABLE_LOCATION,
  SPECIAL_FORMS,
  SPECIAL_FORM_GAMES,
  ULTRA_BEAST,
  VERSION_EXCLUSIVE,
  classifyForm,
  regionalGroup
} from './curated.mjs';

const PDB_GAMES = GAMES.filter((game) => game.pdb);
const FALLBACK_TEXT = 'Gift or special encounter (in this game\'s Pokédex; PokémonDB lists no location)';
const MIN_GEN_FOR_GROUP = { alolan: 7, galarian: 8, hisuian: 8, paldean: 9, bloodmoon: 9 };

// Status codes kept short to keep the JSON small.
//   c = obtainable in-game, t = only by trading/transferring in,
//   e = event distribution only, b = battle-only form of an obtainable Pokémon.

export function buildDataset(sources) {
  const forms = buildFormList(sources);
  const dexBySlug = indexGameDexes(sources.gameDex);

  for (const form of forms) {
    const page = sources.species[form.speciesSlug];
    form.avail = {};
    for (const game of PDB_GAMES) {
      const status = formStatus(form, game, page, dexBySlug, forms);
      if (status) {
        form.avail[game.id] = status;
      }
    }
  }

  applyGameLists(forms, sources.gameLists, sources.homeIcons);
  applySvExclusives(forms, sources.svExclusives);
  fillBattleForms(forms, ['scarlet', 'violet', 'legends-z-a']);
  applyBreeding(forms, sources.species);
  for (const form of forms) {
    Object.assign(form.avail, FORM_AVAILABILITY_OVERRIDES[form.id]);
  }
  applyGo(forms, sources.go);
  const champions = applyChampions(forms, sources);

  for (const form of forms) {
    form.onePerSave = onePerSaveGames(form, sources.species[form.speciesSlug]);
  }

  return {
    generatedAt: new Date().toISOString(),
    sources: {
      pokemondb: 'https://pokemondb.net/pokedex/',
      champions: 'https://www.serebii.net/pokemonchampions/',
      go: 'https://www.serebii.net/pokemongo/'
    },
    champions,
    forms: forms.map(serialiseForm),
    // Full form records (with species slug etc.), used by later build steps; not written out.
    formsInternal: forms
  };
}

function serialiseForm(form) {
  const out = {
    id: form.id,
    num: form.num,
    species: form.species,
    form: form.form,
    kind: form.kind,
    types: form.types,
    avail: form.avail
  };
  if (form.onePerSave.length) {
    out.onePerSave = form.onePerSave;
  }
  if (form.champions) {
    out.champions = form.champions;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Form list

function buildFormList(sources) {
  const forms = [];
  const bySpecies = new Map();
  for (const row of sources.all) {
    if (!bySpecies.has(row.speciesSlug)) {
      bySpecies.set(row.speciesSlug, []);
    }
    bySpecies.get(row.speciesSlug).push(row);
  }

  for (const [slug, rows] of bySpecies) {
    const page = sources.species[slug];
    const speciesName = rows[0].speciesName;
    const num = rows[0].num;
    const make = (formName, kind, extra = {}) => ({
      id: formName ? `${slug}-${slugify(formName)}` : slug,
      num,
      species: speciesName,
      speciesSlug: slug,
      form: formName,
      kind,
      types: extra.types || rows[0].types,
      spriteSlug: extra.spriteSlug || null,
      group: formName ? regionalGroup(formName) : null,
      isDefault: Boolean(extra.isDefault)
    });

    const cosmetic = COSMETIC_FORMS[slug] || (page.cosmeticForms.length ? { forms: page.cosmeticForms, replacesDefault: true } : null);

    rows.forEach((row, index) => {
      const isFirst = index === 0;
      if (isFirst && cosmetic?.replacesDefault && !row.formName) {
        cosmetic.forms.forEach((name, i) => {
          const event = /\(event\)/i.test(name);
          const clean = name.replace(/\s*\(event\)/i, '');
          forms.push(make(clean, event ? 'special' : 'cosmetic', { types: row.types, isDefault: i === 0 }));
        });
        return;
      }
      const kind = !row.formName || isFirst ? (row.formName ? defaultKind(row.formName) : 'default') : classifyForm(row.formName);
      forms.push(make(row.formName, kind, { types: row.types, spriteSlug: row.spriteSlug, isDefault: isFirst }));
    });

    if (cosmetic && !cosmetic.replacesDefault) {
      for (const name of cosmetic.forms) {
        forms.push(make(name, 'cosmetic'));
      }
    }
    for (const name of SPECIAL_FORMS[slug] || []) {
      forms.push(make(name, 'special'));
    }
    for (const name of EXTRA_BATTLE_FORMS[slug] || []) {
      forms.push(make(name, 'battle'));
    }
    if (page.gigantamax) {
      const variants = slug === 'urshifu' ? ['Single Strike Style', 'Rapid Strike Style'] : [''];
      for (const variant of variants) {
        forms.push(make(variant ? `Gigantamax ${variant}` : 'Gigantamax', 'battle'));
      }
    }
  }

  return forms;
}

function defaultKind(formName) {
  // The first row of a species with only named forms (e.g. Deoxys "Normal Forme") is its default.
  return classifyForm(formName) === 'battle' ? 'battle' : 'default';
}

// ---------------------------------------------------------------------------
// Per-game availability

function indexGameDexes(gameDex) {
  // page -> Map(speciesSlug -> Set(spriteSlug))
  const index = {};
  for (const [page, entries] of Object.entries(gameDex)) {
    const map = new Map();
    for (const entry of entries) {
      if (!map.has(entry.speciesSlug)) {
        map.set(entry.speciesSlug, new Set());
      }
      map.get(entry.speciesSlug).add(entry.spriteSlug);
    }
    index[page] = map;
  }
  return index;
}

function dexSprites(game, speciesSlug, dexBySlug) {
  const sprites = new Set();
  let listed = false;
  for (const page of game.dex) {
    const set = dexBySlug[page]?.get(speciesSlug);
    if (set) {
      listed = true;
      set.forEach((s) => sprites.add(s));
    }
  }
  return listed ? sprites : null;
}

function speciesExistsIn(page, game) {
  const location = page.locations[game.pdb];
  if (location && location.status !== 'none' && location.status !== 'unknown') {
    return true;
  }
  return page.flavor.some((entry) => entry.games.includes(game.pdb));
}

function partnerGames(game) {
  return PDB_GAMES.filter((other) => other.id !== game.id && other.dex[0] === game.dex[0] && other.group === game.group);
}

function speciesStatus(form, game, page, dexBySlug) {
  const location = page.locations[game.pdb];
  if (location?.status === 'catch') {
    return ['c', location.text];
  }
  if (location?.status === 'event') {
    return ['e', location.text];
  }
  if (location?.status === 'trade') {
    if (MYTHICAL.has(form.num)) {
      return ['e', 'Event distribution only'];
    }
    // PokémonDB leaves out some gifts and story encounters (e.g. Zacian in
    // Sword). If no version of the game lists a location but the species is
    // in the game's own Pokédex, it is obtainable in-game.
    const partners = partnerGames(game);
    const everyVersionTrades = partners.every((other) => page.locations[other.pdb]?.status === 'trade');
    const exclusive = VERSION_EXCLUSIVE[form.speciesSlug];
    if (game.gen >= 5 && everyVersionTrades && dexSprites(game, form.speciesSlug, dexBySlug) && (!exclusive || exclusive.includes(game.id))) {
      return ['c', FALLBACK_TEXT];
    }
    return ['t', ''];
  }
  if (location?.status === 'unknown' || !location) {
    if (dexSprites(game, form.speciesSlug, dexBySlug)) {
      return ['c', `In the ${game.name} Pokédex (PokémonDB has no location details yet)`];
    }
    return speciesExistsIn(page, game) ? ['t', ''] : null;
  }
  return null;
}

function flavorFor(form, page) {
  if (!form.form) {
    return null;
  }
  const wanted = [form.form, `${form.form} ${form.species}`, form.form.replace(/ Form$/, '')].map((s) => s.toLowerCase());
  return page.flavor.find((entry) => entry.heading && wanted.includes(entry.heading.toLowerCase())) || null;
}

function formExistsIn(form, game, page) {
  const own = flavorFor(form, page);
  if (own) {
    return own.games.includes(game.pdb);
  }
  if (form.group && game.gen < MIN_GEN_FOR_GROUP[form.group]) {
    return false;
  }
  if (form.group && (game.id === 'brilliant-diamond' || game.id === 'shining-pearl')) {
    return false;
  }
  return speciesExistsIn(page, game);
}

function formStatus(form, game, page, dexBySlug, allForms) {
  const base = speciesStatus(form, game, page, dexBySlug);

  switch (form.kind) {
    case 'default':
    case 'regional':
      return regionalAwareStatus(form, game, page, dexBySlug, base, allForms);
    case 'alternate':
    case 'cosmetic':
      if (!base) {
        return null;
      }
      if (!formExistsIn(form, game, page)) {
        return null;
      }
      if (base[0] === 'c' && CHANGEABLE_SPECIES.has(form.speciesSlug)) {
        return ['c', `${base[1]} (change its form in-game)`];
      }
      return base;
    case 'battle':
      return battleStatus(form, game, page, dexBySlug, base);
    case 'special':
      return specialStatus(form, game, page);
    default:
      return base;
  }
}

function regionalAwareStatus(form, game, page, dexBySlug, base, allForms) {
  const siblings = allForms.filter((f) => f.speciesSlug === form.speciesSlug && (f.kind === 'regional' || f.kind === 'default'));
  const hasRegional = siblings.some((f) => f.kind === 'regional');

  if (form.kind === 'regional' && game.id.startsWith('lets-go') && form.group === 'alolan' && LGPE_ALOLAN_TRADES.includes(form.speciesSlug)) {
    return ['c', 'In-game trade'];
  }

  if (!hasRegional) {
    if (form.kind === 'regional' && !formExistsIn(form, game, page)) {
      return null;
    }
    return base;
  }
  if (!base) {
    return null;
  }

  const exists = form.kind === 'default' ? true : formExistsIn(form, game, page);
  if (!exists) {
    return null;
  }
  if (base[0] !== 'c') {
    return base;
  }

  const sprites = dexSprites(game, form.speciesSlug, dexBySlug);
  if (!sprites) {
    // Not in the regional Pokédex (e.g. DLC or post-game) — assume the default form.
    return form.kind === 'default' ? base : ['t', ''];
  }
  const groups = new Set([...sprites].map((s) => spriteGroup(s, form.speciesSlug)));
  const myGroup = form.kind === 'default' ? 'default' : form.group;
  return groups.has(myGroup) ? base : ['t', ''];
}

function spriteGroup(sprite, speciesSlug) {
  const suffix = sprite.slice(speciesSlug.length + 1);
  for (const group of ['alolan', 'galarian', 'hisuian', 'paldean', 'bloodmoon']) {
    if (suffix.includes(group)) {
      return group;
    }
  }
  return 'default';
}

function battleStatus(form, game, page, dexBySlug, base) {
  if (!base || base[0] === 'e') {
    return null;
  }
  const name = form.form;
  if (/^Gigantamax/.test(name)) {
    if (!game.gigantamax) {
      return null;
    }
  } else if (/^Primal /.test(name)) {
    if (!game.primal) {
      return null;
    }
  } else if (/^Mega /.test(name)) {
    if (game.megas === 'dex') {
      if (!dexSprites(game, form.speciesSlug, dexBySlug)) {
        return null;
      }
    } else if (!Array.isArray(game.megas) || !game.megas.includes(form.speciesSlug)) {
      return null;
    } else if (/ Z$/.test(name)) {
      return null;
    } else if (!form.spriteSlug) {
      // Megas introduced in Legends: Z-A have no older sprite.
      return null;
    }
  } else if (!formExistsIn(form, game, page)) {
    return null;
  }

  if (/^Galarian/.test(name) && !formExistsIn({ ...form, group: 'galarian' }, game, page)) {
    return null;
  }
  if (base[0] === 't') {
    return ['t', ''];
  }
  return ['b', 'Battle-only form'];
}

function specialStatus(form, game, page) {
  const known = SPECIAL_FORM_GAMES[form.id]?.[game.id];
  if (known) {
    return [/^Event/.test(known) ? 'e' : 'c', known];
  }
  const own = flavorFor(form, page);
  if (own?.games.includes(game.pdb)) {
    return ['e', 'Event distribution'];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Breeding: in games with a Day Care / Nursery / picnics, owning any evolved
// member of a family lets you hatch its first stage, then evolve it into the
// stages in between.

function applyBreeding(forms, speciesPages) {
  const bySpecies = new Map();
  for (const form of forms) {
    if (!bySpecies.has(form.speciesSlug)) {
      bySpecies.set(form.speciesSlug, []);
    }
    bySpecies.get(form.speciesSlug).push(form);
  }
  // The form of `slug` that belongs to the same regional line as `form`.
  const lineForm = (slug, group) =>
    (bySpecies.get(slug) || []).find((f) => (group ? f.group === group && f.kind === 'regional' : f.isDefault && (f.kind === 'default' || f.kind === 'cosmetic')));

  // Where the location is our generic fallback, prefer "Evolve X" when an
  // earlier stage of the same line is obtainable in that game.
  for (const form of forms) {
    const family = speciesPages[form.speciesSlug].evolutionFamily;
    const position = family.indexOf(form.speciesSlug);
    for (const [gameId, [code, text]] of Object.entries(form.avail)) {
      if (code !== 'c' || text !== FALLBACK_TEXT || position <= 0) {
        continue;
      }
      const earlier = family.slice(0, position).map((slug) => lineForm(slug, form.kind === 'regional' ? form.group : null)).filter((f) => f?.avail[gameId]?.[0] === 'c');
      if (earlier.length) {
        form.avail[gameId] = ['c', `Evolve ${earlier.map((f) => f.species).join(' / ')}`];
      }
    }
  }

  for (const game of PDB_GAMES.filter((g) => g.breeding)) {
    for (const parent of forms) {
      if (parent.avail[game.id]?.[0] !== 'c' || !(parent.kind === 'default' || parent.kind === 'regional' || parent.isDefault)) {
        continue;
      }
      const parentPage = speciesPages[parent.speciesSlug];
      if (parentPage.eggGroups.includes('Undiscovered')) {
        continue;
      }
      const family = parentPage.evolutionFamily;
      const position = family.indexOf(parent.speciesSlug);
      if (position <= 0) {
        continue;
      }
      const group = parent.kind === 'regional' ? parent.group : null;
      const base = lineForm(family[0], group);
      for (const slug of family.slice(0, position)) {
        const child = lineForm(slug, group);
        if (!child || child.avail[game.id]?.[0] === 'c' || !speciesExistsIn(speciesPages[slug], game)) {
          continue;
        }
        const how = slug === family[0] ? `Breed ${parent.species}` : `Breed ${parent.species}, then evolve the ${base?.species ?? 'offspring'}`;
        child.avail[game.id] = ['c', how];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// One-per-save

function onePerSaveGames(form, page) {
  const games = new Set(ONE_PER_SAVE_FORMS[form.id] || []);
  const special = LEGENDARY.has(form.num) || MYTHICAL.has(form.num) || ULTRA_BEAST.has(form.num) || ONE_OFF_PARADOX.has(form.num);
  if (special && form.num !== 489 && (page.eggGroups.includes('Undiscovered') || form.num === 490)) {
    for (const [gameId, [status, text]] of Object.entries(form.avail)) {
      if (gameId === 'go' || gameId === 'champions') {
        continue;
      }
      if (status === 'c' && !REPEATABLE_LOCATION.test(text)) {
        games.add(gameId);
      }
    }
  }
  return [...games].filter((gameId) => form.avail[gameId]?.[0] === 'c');
}

// ---------------------------------------------------------------------------
// Pokémon GO (Serebii)

function applyGo(forms, goRows) {
  const byNum = groupByNum(forms);
  for (const row of goRows) {
    const candidates = byNum.get(row.num) || [];
    for (const form of matchGoRow(candidates, row)) {
      form.avail.go = form.kind === 'battle'
        ? ['b', 'Battle-only form (Mega Evolution / form change in GO)']
        : ['c', 'Released in Pokémon GO (wild, raids, research or events)'];
    }
  }
}

const GO_GROUPS = { alola: 'alolan', galar: 'galarian', hisui: 'hisuian', paldea: 'paldean' };

function normaliseFormName(text, species) {
  return text
    .toLowerCase()
    .replace(species.toLowerCase(), '')
    .replace(/\b(forme?|style|mode|cloak|pattern|trim|plumage|face)\b/g, '')
    .replace(/deputante/g, 'debutante')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();
}

function matchGoRow(candidates, row) {
  if (!candidates.length) {
    return [];
  }
  const note = row.note.toLowerCase();
  const megaSuffix = { m: '', mx: ' X', my: ' Y', mz: ' Z' };
  if (!note && row.code in megaSuffix) {
    const suffix = megaSuffix[row.code];
    return candidates.filter((f) => /^Mega /.test(f.form) && (suffix ? f.form.endsWith(suffix) : !/ [XYZ]$/.test(f.form)));
  }
  if (!note && row.code === 'p') {
    return candidates.filter((f) => /^Primal /.test(f.form));
  }
  if (!note) {
    return candidates.filter((f) => f.isDefault).slice(0, 1);
  }
  // Costumes and event variants (sunglasses, GO Fest hats…) are not HOME forms.
  if (/go fest|sunglasses|balloon|flying|headband|armored|costume/.test(note)) {
    return [];
  }
  for (const [key, group] of Object.entries(GO_GROUPS)) {
    if (note.includes(key)) {
      const breed = note.match(/(combat|blaze|aqua) breed/);
      if (breed) {
        return candidates.filter((f) => f.form.toLowerCase().startsWith(breed[0]));
      }
      return candidates.filter((f) => f.group === group && f.kind === 'regional');
    }
  }
  const wanted = normaliseFormName(row.note, candidates[0].species);
  return candidates.filter((f) => f.form && normaliseFormName(f.form, f.species) === wanted).slice(0, 1);
}

// Serebii lists for Scarlet/Violet and Legends: Z-A (legendaries, gifts,
// Snacksworth, Hyperspace Lumiose, transfer-only…), matched by icon code.
function applyGameLists(forms, gameLists, homeIcons) {
  const byKey = new Map();
  for (const form of forms) {
    const code = iconCode(form, homeIcons);
    if (code === null) continue;
    const key = `${form.num}-${code}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(form);
  }
  const byNum = groupByNum(forms);
  const formsFor = (row) => {
    if (row.code) {
      return byKey.get(`${row.num}-${row.code}`) || [];
    }
    // A plain entry covers the species' default form plus the non-regional
    // forms that come with it (form changes, genders, cosmetic variants).
    return (byNum.get(row.num) || []).filter((f) => f.isDefault || f.kind === 'alternate' || f.kind === 'cosmetic');
  };

  for (const [gameId, pages] of Object.entries(gameLists)) {
    const targets = gameId === 'scarlet' ? ['scarlet', 'violet'] : [gameId];
    for (const page of pages) {
      for (const row of page.pokemon) {
        for (const form of formsFor(row)) {
          for (const target of targets) {
            const current = form.avail[target];
            if (page.transferOnly) {
              if (!current || current[0] === 'c') form.avail[target] = ['t', ''];
            } else if (!current || current[0] !== 'c' || /no location details yet/.test(current[1]) || /legendary/i.test(page.text)) {
              form.avail[target] = ['c', page.text];
            }
          }
        }
      }
    }
  }
}

// Battle-only forms of Pokémon that only became obtainable through the
// Serebii lists above (e.g. Terapagos' Terastal Form, Z-A Megas).
function fillBattleForms(forms, gameIds) {
  const byNum = groupByNum(forms);
  for (const form of forms) {
    if (form.kind !== 'battle' || /^(Gigantamax|Primal)/.test(form.form)) continue;
    const isMega = /^Mega /.test(form.form);
    const base = (byNum.get(form.num) || []).find((f) => f.isDefault || f.kind === 'default');
    for (const gameId of gameIds) {
      if (form.avail[gameId] || base?.avail[gameId]?.[0] !== 'c') continue;
      // Megas only exist in Legends: Z-A among these games.
      if (isMega && gameId !== 'legends-z-a') continue;
      form.avail[gameId] = ['b', 'Battle-only form'];
    }
  }
}

// Scarlet/Violet version exclusives from Serebii.
function applySvExclusives(forms, exclusives) {
  if (!exclusives) {
    return;
  }
  const byNum = groupByNum(forms);
  const codeToForm = (candidates, code) => {
    if (candidates[0]?.speciesSlug === 'tauros') {
      return candidates.filter((f) => f.form === { b: 'Blaze Breed', a: 'Aqua Breed', c: 'Combat Breed' }[code]);
    }
    const group = CHAMPIONS_REGIONAL[code];
    if (group) {
      return candidates.filter((f) => f.group === group && f.kind === 'regional');
    }
    // A plain entry covers every non-regional form of the species.
    return candidates.filter((f) => f.kind !== 'regional');
  };
  for (const [exclusiveTo, other] of [['scarlet', 'violet'], ['violet', 'scarlet']]) {
    for (const row of exclusives[exclusiveTo] || []) {
      for (const form of codeToForm(byNum.get(row.num) || [], row.code)) {
        // PokémonDB's DLC Pokédex pages show default sprites, so regional
        // forms found in the DLC (e.g. Alolan Vulpix) are only known from here.
        if (form.kind === 'regional' && form.avail[exclusiveTo]?.[0] !== 'c') {
          form.avail[exclusiveTo] = ['c', `${exclusiveTo === 'scarlet' ? 'Scarlet' : 'Violet'} exclusive (PokémonDB has no location details yet)`];
        }
        const entry = form.avail[other];
        if (!entry && form.kind === 'regional') {
          form.avail[other] = ['t', ''];
          continue;
        }
        if (entry && (entry[0] === 'c' || entry[0] === 'b')) {
          form.avail[other] = ['t', ''];
        }
      }
    }
  }
}

function groupByNum(forms) {
  const map = new Map();
  for (const form of forms) {
    if (!map.has(form.num)) {
      map.set(form.num, []);
    }
    map.get(form.num).push(form);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Pokémon Champions (Serebii)

const CHAMPIONS_REGIONAL = { a: 'alolan', g: 'galarian', h: 'hisuian', p: 'paldean' };
const VIVILLON_CODES = { '': 'Meadow', a: 'Archipelago', c: 'Continental', e: 'Elegant', f: 'Fancy', g: 'Garden', hp: 'High Plains', i: 'Icy Snow', j: 'Jungle', ma: 'Marine', mo: 'Modern', mon: 'Monsoon', o: 'Ocean', p: 'Polar', pb: 'Poké Ball', r: 'River', s: 'Sandstorm', sa: 'Savanna', su: 'Sun', t: 'Tundra' };
const FURFROU_CODES = { '': 'Natural', d: 'Diamond', da: 'Dandy', de: 'Debutante', h: 'Heart', k: 'Kabuki', l: 'La Reine', m: 'Matron', p: 'Pharaoh', s: 'Star' };

function championsMatch(candidates, row, { expandSpecies }) {
  const code = row.code;
  const speciesSlug = candidates[0]?.speciesSlug;
  if (speciesSlug === 'vivillon' && code in VIVILLON_CODES) {
    return candidates.filter((f) => f.form.startsWith(VIVILLON_CODES[code]));
  }
  if (speciesSlug === 'furfrou' && code in FURFROU_CODES) {
    return candidates.filter((f) => f.form.startsWith(FURFROU_CODES[code]));
  }
  if (code === 'e') {
    return candidates.filter((f) => f.form === 'Eternal Flower');
  }
  if (/^m[xyz]?$/.test(code) || /^Mega /.test(row.name)) {
    const suffix = { mx: ' X', my: ' Y', mz: ' Z' }[code];
    return candidates.filter((f) => /^Mega /.test(f.form) && (suffix ? f.form.endsWith(suffix) : !/ [XYZ]$/.test(f.form)));
  }
  const nameGroup = /^(Alolan|Galarian|Hisuian|Paldean)/.exec(row.name)?.[1]?.toLowerCase();
  const group = CHAMPIONS_REGIONAL[code] || nameGroup;
  if (group) {
    return candidates.filter((f) => f.group === group);
  }
  if (!expandSpecies) {
    return candidates.filter((f) => f.isDefault);
  }
  // A plain entry covers the species' default form plus forms it can switch
  // between or that are fixed variants (genders, Rotom appliances, …).
  return candidates.filter((f) => f.isDefault || f.kind === 'alternate' || (f.kind === 'battle' && !/^(Mega|Primal|Gigantamax)/.test(f.form)));
}

function applyChampions(forms, sources) {
  const byNum = groupByNum(forms);
  const usable = new Set();
  for (const row of [...sources.championsAvailable, ...sources.championsTransferOnly]) {
    const candidates = (byNum.get(row.num) || []).filter((f) => f.kind !== 'special' || f.form === 'Eternal Flower');
    for (const form of championsMatch(candidates, row, { expandSpecies: true })) {
      usable.add(form);
    }
  }

  const rosters = sources.rosters.map((roster, index) => ({
    id: roster.path.replace(/^recruit\/|\.shtml$/g, ''),
    name: roster.name,
    duration: roster.duration,
    current: index === sources.rosters.findIndex((r) => /^Regular/i.test(r.name))
  }));

  sources.rosters.forEach((roster, index) => {
    for (const row of roster.pokemon) {
      const candidates = byNum.get(row.num) || [];
      for (const form of championsMatch(candidates, row, { expandSpecies: true })) {
        form.champions = form.champions || { usable: true, recruit: [] };
        if (!form.champions.recruit.includes(rosters[index].id)) {
          form.champions.recruit.push(rosters[index].id);
        }
        usable.add(form);
      }
    }
  });

  for (const form of usable) {
    form.champions = form.champions || { usable: true, recruit: [] };
    const recruitable = form.champions.recruit.length > 0;
    const current = rosters.filter((r) => r.current && form.champions.recruit.includes(r.id));
    if (recruitable) {
      form.avail.champions = ['c', current.length ? `Recruit Ranch (${current[0].name})` : 'Recruit Ranch (earlier roster)'];
    } else {
      form.avail.champions = ['t', ''];
    }
  }

  return { rosters };
}
