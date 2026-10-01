// Builds one sprite sheet of Pokémon HOME icons (from Serebii) so the site
// makes a single local request instead of hotlinking ~1,400 images.
import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { fetchBinaryCached } from './fetch-cache.mjs';
import { decodeEntities } from './html.mjs';
import { SEREBII } from './serebii.mjs';

const run = promisify(execFile);
export const ICON_SIZE = 48;
export const ICON_COLUMNS = 40;

const ALCREMIE_CREAM = { 'Vanilla Cream': '', 'Ruby Cream': 'rc', 'Matcha Cream': 'mac', 'Mint Cream': 'mic', 'Lemon Cream': 'lc', 'Salted Cream': 'sc', 'Ruby Swirl': 'rs', 'Caramel Swirl': 'cs', 'Rainbow Swirl': 'ras' };
const ALCREMIE_SWEET = { Strawberry: '', Berry: 'berry', Love: 'love', Star: 'star', Clover: 'clover', Flower: 'flower', Ribbon: 'ribbon' };

// Forms missing from Serebii's HOME storage list (they revert or can't be
// stored as-is), with the icon codes Serebii uses for them.
const EXTRA_CODES = {
  pikachu: { 'Partner Pikachu': 'pa' },
  eevee: { 'Partner Eevee': 'pa' },
  castform: { 'Sunny Form': 's', 'Rainy Form': 'r', 'Snowy Form': 'i' },
  cherrim: { 'Sunshine Form': 's' },
  dialga: { 'Origin Forme': 'o' },
  palkia: { 'Origin Forme': 'o' },
  giratina: { 'Origin Forme': 'o' },
  darmanitan: { 'Zen Mode': 'd', 'Galarian Zen Mode': 'gz' },
  kyurem: { 'White Kyurem': 'w', 'Black Kyurem': 'b' },
  meloetta: { 'Pirouette Forme': 'p' },
  genesect: { 'Douse Drive': 'w', 'Shock Drive': 'e', 'Burn Drive': 'f', 'Chill Drive': 'i' },
  greninja: { 'Ash-Greninja': 'a' },
  aegislash: { 'Blade Forme': 'b' },
  xerneas: { 'Active Mode': 'a' },
  zygarde: { 'Complete Forme': 'c', '10% Forme': '10' },
  oricorio: { "Pa'u Style": 'pau' },
  rockruff: { 'Own Tempo Rockruff': 'o' },
  wishiwashi: { 'School Form': 's' },
  minior: { 'Core Form': 'r' },
  mimikyu: { 'Busted Form': 'b' },
  necrozma: { 'Dusk Mane Necrozma': 'dm', 'Dawn Wings Necrozma': 'dw', 'Ultra Necrozma': 'u' },
  cramorant: { 'Gulping Form': 'gu', 'Gorging Form': 'go' },
  zacian: { 'Crowned Sword': 'c' },
  zamazenta: { 'Crowned Shield': 'c' },
  eternatus: { Eternamax: 'e' },
  calyrex: { 'Ice Rider': 'i', 'Shadow Rider': 's' },
  ursaluna: { Bloodmoon: 'b' },
  palafin: { 'Hero Form': 'h' },
  poltchageist: { 'Artisan Form': 'm' },
  sinistcha: { 'Masterpiece Form': 'm' },
  ogerpon: { 'Wellspring Mask': 'w', 'Hearthflame Mask': 'h', 'Cornerstone Mask': 'c' },
  terapagos: { 'Terastal Form': 't', 'Stellar Form': 's' },
  magearna: { 'Original Color': 'o' },
  zarude: { Dada: 'd' }
};

export function parseHomeIcons(html) {
  const rows = [];
  for (const m of html.matchAll(/src="\/pokemonhome\/pokemon\/80\/(\d+)(-[a-z0-9-]+)?\.png"[^>]*title="([^"]*)"/g)) {
    rows.push({ num: Number(m[1]), code: (m[2] || '').slice(1), title: decodeEntities(m[3]) });
  }
  return rows;
}

function normalise(text, species) {
  return text
    .toLowerCase()
    .replaceAll(species.toLowerCase(), '')
    .replace(/\b(forme?|style|mode|cloak|pattern|trim|plumage|face|size)\b/g, '')
    .replace(/deputante/g, 'debutante')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();
}

// Serebii's icon code for a form ('' = the species' default icon).
export function iconCode(form, homeRows) {
  const name = form.form;
  if (!name) {
    return '';
  }
  if (/^Gigantamax/.test(name)) return /Rapid/.test(name) ? 'rgi' : 'gi';
  const extra = EXTRA_CODES[form.speciesSlug]?.[name];
  if (extra) return extra;
  if ((form.speciesSlug === 'arceus' || form.speciesSlug === 'silvally') && / Type$/.test(name)) {
    return name === 'Normal Type' ? '' : name.replace(/ Type$/, '').toLowerCase();
  }
  if (form.speciesSlug === 'alcremie') {
    const m = name.match(/^(.*) \((\w+) Sweet\)$/);
    return m ? `${ALCREMIE_CREAM[m[1]] ?? ''}${ALCREMIE_SWEET[m[2]] ?? ''}` : '';
  }
  if (form.speciesSlug === 'unown') {
    if (name.includes('!')) return 'em';
    if (name.includes('?')) return 'qm';
    const letter = name.slice(-1).toLowerCase();
    return letter === 'a' ? '' : letter;
  }
  if (form.speciesSlug === 'minior' && / Core$/.test(name)) {
    return name.startsWith('Red') ? 'r' : name[0].toLowerCase();
  }
  const mega = name.match(/^Mega .*?( [XYZ])?$/);
  if (mega) {
    return { ' X': 'mx', ' Y': 'my', ' Z': 'mz' }[mega[1]] || 'm';
  }
  if (/^Primal /.test(name)) return 'p';
  if (form.speciesSlug === 'tauros') {
    return { 'Combat Breed': 'p', 'Blaze Breed': 'b', 'Aqua Breed': 'a' }[name] ?? '';
  }

  const rows = homeRows.filter((row) => row.num === form.num && row.code);
  const wanted = normalise(name, form.species);
  const hit = rows.find((row) => normalise(row.title, form.species) === wanted);
  if (hit) {
    return hit.code;
  }
  const group = name.match(/^(Alolan|Galarian|Hisuian|Paldean)/)?.[1];
  if (group) {
    return { Alolan: 'a', Galarian: 'g', Hisuian: 'h', Paldean: 'p' }[group];
  }
  return null; // unknown — use the species icon
}

export async function buildIconSheet(forms, homeRows, { cacheDir, outFile, log = () => {} }) {
  const files = [];
  const indexByFile = new Map();
  const iconIndex = {};
  let done = 0;

  for (const form of forms) {
    const num = String(form.num).padStart(3, '0');
    const code = iconCode(form, homeRows);
    const candidates = code ? [`${num}-${code}`, num] : [num];
    let file = null;
    for (const name of candidates) {
      file = await fetchBinaryCached(`${SEREBII}/pokemonhome/pokemon/80/${name}.png`, path.join(cacheDir, `${name}.png`));
      if (file) break;
    }
    done += 1;
    if (done % 250 === 0) log(`  icons: ${done}/${forms.length}`);
    if (!file) continue;
    if (!indexByFile.has(file)) {
      indexByFile.set(file, files.length);
      files.push(file);
    }
    iconIndex[form.id] = indexByFile.get(file);
  }

  await mkdir(path.dirname(outFile), { recursive: true });
  await run('montage', [
    ...files,
    '-background', 'none',
    '-resize', `${ICON_SIZE}x${ICON_SIZE}`,
    '-geometry', `${ICON_SIZE}x${ICON_SIZE}+0+0`,
    '-tile', `${ICON_COLUMNS}x`,
    '-quality', '85',
    '-define', 'webp:alpha-quality=90',
    outFile
  ], { maxBuffer: 1 << 26 });
  log(`  sprite sheet: ${files.length} unique icons`);
  return iconIndex;
}
