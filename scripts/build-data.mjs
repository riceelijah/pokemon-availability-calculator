// Builds data/pokemon.json from PokémonDB (forms, locations, game Pokédexes)
// and Serebii (Pokémon Champions rosters, Pokémon GO roster).
//
//   node scripts/build-data.mjs            # uses cached pages in .cache/
//   node scripts/build-data.mjs --refresh  # re-downloads every page
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { createFetcher } from './lib/fetch-cache.mjs';
import { loadSources } from './lib/sources.mjs';
import { buildDataset } from './lib/build.mjs';
import { ICON_COLUMNS, ICON_SIZE, buildIconSheet } from './lib/icons.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fetchPage = createFetcher({
  cacheDir: path.join(root, '.cache'),
  refresh: process.argv.includes('--refresh')
});

const sources = await loadSources(fetchPage, { log: console.log });
const dataset = buildDataset(sources);

console.log('Building icon sprite sheet from Serebii HOME icons…');
const iconIndex = await buildIconSheet(dataset.formsInternal, sources.homeIcons, {
  cacheDir: path.join(root, '.cache', 'icons'),
  outFile: path.join(root, 'data', 'icons.webp'),
  log: console.log
});
for (const form of dataset.forms) {
  if (form.id in iconIndex) {
    form.icon = iconIndex[form.id];
  }
}
dataset.icons = { file: 'data/icons.webp', size: ICON_SIZE, columns: ICON_COLUMNS };
delete dataset.formsInternal;

await mkdir(path.join(root, 'data'), { recursive: true });
await writeFile(path.join(root, 'data', 'pokemon.json'), JSON.stringify(dataset));
console.log(`Wrote ${dataset.forms.length} forms to data/pokemon.json`);
