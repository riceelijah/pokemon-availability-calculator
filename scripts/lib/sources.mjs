import { GAMES } from '../../src/games.js';
import { PDB, parseAllPokemon, parseGameDex, parseSpeciesPage } from './pokemondb.mjs';
import { parseChampionsAvailable, parseChampionsRoster, parseChampionsRosterIndex, parseGoGeneration, parseSvExclusives, SEREBII } from './serebii.mjs';

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

  return { all, species, gameDex, championsAvailable, championsTransferOnly, rosters, go, svExclusives };
}
