import { GAMES } from '../../src/games.js';
import { parseHomeIcons } from './icons.mjs';
import { PDB, parseAllPokemon, parseGameDex, parseSpeciesPage } from './pokemondb.mjs';
import { parseChampionsAvailable, parseChampionsRoster, parseChampionsRosterIndex, parseExclusivesByVersion, parseGoGeneration, parseHomeGifts, parseIconList, parseSpeciesNumbers, parseSvExclusives, GAME_LIST_PAGES, SEREBII, SEREBII_GAME_AUDITS } from './serebii.mjs';

export async function loadSources(fetchPage, { log = () => {} } = {}) {
  log('Fetching PokémonDB national list…');
  const all = parseAllPokemon(await fetchPage(`${PDB}/pokedex/all`));

  const speciesSlugs = [...new Set(all.map((row) => row.speciesSlug))];
  const species = {};
  let done = 0;
  for (const slug of speciesSlugs) {
    species[slug] = parseSpeciesPage(await fetchPage(`${PDB}/pokedex/${slug}`));
    done += 1;
    if (done % 100 === 0) {
      log(`  species pages: ${done}/${speciesSlugs.length}`);
    }
  }

  log('Fetching game Pokédexes…');
  const dexPages = [...new Set(GAMES.flatMap((game) => game.dex))];
  const gameDex = {};
  for (const page of dexPages) {
    gameDex[page] = parseGameDex(await fetchPage(`${PDB}/pokedex/game/${page}`));
  }

  log('Fetching Pokémon Champions data from Serebii…');
  const championsAvailable = parseChampionsAvailable(await fetchPage(`${SEREBII}/pokemonchampions/pokemon.shtml`));
  const championsTransferOnly = parseChampionsAvailable(await fetchPage(`${SEREBII}/pokemonchampions/transferonly.shtml`));
  const rosterIndex = parseChampionsRosterIndex(await fetchPage(`${SEREBII}/pokemonchampions/recruit.shtml`));
  const rosters = [];
  for (const roster of rosterIndex) {
    rosters.push({ ...roster, pokemon: parseChampionsRoster(await fetchPage(`${SEREBII}/pokemonchampions/${roster.path}`)) });
  }

  log('Fetching Pokémon GO data from Serebii…');
  const go = [];
  for (let gen = 1; gen <= 9; gen += 1) {
    go.push(...parseGoGeneration(await fetchPage(`${SEREBII}/pokemongo/gen${gen}pokemon.shtml`)));
  }

  const svExclusives = parseSvExclusives(await fetchPage(`${SEREBII}/scarletviolet/exclusives.shtml`));

  log('Fetching Scarlet/Violet and Legends: Z-A lists from Serebii…');
  const gameLists = {};
  for (const [gameId, pages] of Object.entries(GAME_LIST_PAGES)) {
    gameLists[gameId] = [];
    for (const page of pages) {
      gameLists[gameId].push({ ...page, pokemon: parseIconList(await fetchPage(`${SEREBII}/${page.path}`)) });
    }
  }

  log('Fetching per-game Serebii lists (unobtainable, exclusives, legendaries, gifts…)…');
  const serebiiGames = [];
  for (const audit of SEREBII_GAME_AUDITS) {
    const page = (name) => fetchPage(`${SEREBII}/${audit.section}/${name}.shtml`);
    const opts = { genderedIcons: Boolean(audit.genderedIcons) };
    const transferOnly = [];
    for (const name of audit.transferOnly || []) {
      transferOnly.push(...parseSpeciesNumbers(await page(name), opts));
    }
    const methods = [];
    for (const [name, text, flags = {}] of audit.methods) {
      methods.push({ text, ...flags, nums: parseSpeciesNumbers(await page(name), opts) });
    }
    serebiiGames.push({
      ...audit,
      unobtainable: parseSpeciesNumbers(await page('unobtainable'), opts),
      transferOnlyNums: transferOnly,
      exclusives: parseExclusivesByVersion(await page('exclusives'), audit.versions, opts),
      methodLists: methods
    });
  }

  const homeGifts = parseHomeGifts(await fetchPage(`${SEREBII}/pokemonhome/giftpokemon.shtml`));

  const homeIcons = parseHomeIcons(await fetchPage(`${SEREBII}/pokemonhome/depositablepokemon.shtml`));

  return { all, species, gameDex, championsAvailable, championsTransferOnly, rosters, go, svExclusives, gameLists, homeIcons, serebiiGames, homeGifts };
}
