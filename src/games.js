// Every game whose Pokémon can end up in Pokémon HOME, either directly or
// through the older transfer chain (Pal Park → Poké Transfer → Poké Transporter
// → Pokémon Bank → HOME). Each entry is a single version so that version
// exclusives are handled correctly.
//
// `pdb` is the CSS class PokémonDB uses for the game in its "Where to find"
// and "Pokédex entries" tables. `dex` lists the PokémonDB game Pokédex pages
// used to work out which regional forms appear in the game.

export const GAME_GROUPS = [
  {
    id: 'direct',
    name: 'Connects directly to HOME',
    description: 'Nintendo Switch and mobile games with a built-in HOME link.'
  },
  {
    id: 'bank',
    name: 'Via Pokémon Bank',
    description: '3DS games and Virtual Console releases, moved with Poké Transporter / Pokémon Bank.'
  },
  {
    id: 'legacy',
    name: 'Via the legacy transfer chain',
    description: 'Original DS/GBA cartridges, moved forward with Pal Park and Poké Transfer.'
  }
];

const MEGA_XY = ['venusaur', 'charizard', 'blastoise', 'alakazam', 'gengar', 'kangaskhan', 'pinsir', 'gyarados', 'aerodactyl', 'mewtwo', 'ampharos', 'scizor', 'heracross', 'houndoom', 'tyranitar', 'blaziken', 'gardevoir', 'mawile', 'aggron', 'medicham', 'manectric', 'banette', 'absol', 'garchomp', 'lucario', 'abomasnow'];
const MEGA_ORAS = [...MEGA_XY, 'beedrill', 'pidgeot', 'slowbro', 'steelix', 'sceptile', 'swampert', 'sableye', 'sharpedo', 'camerupt', 'altaria', 'glalie', 'salamence', 'metagross', 'latias', 'latios', 'rayquaza', 'lopunny', 'gallade', 'audino', 'diancie'];
const MEGA_LGPE = ['venusaur', 'charizard', 'blastoise', 'beedrill', 'pidgeot', 'alakazam', 'slowbro', 'gengar', 'kangaskhan', 'pinsir', 'gyarados', 'aerodactyl', 'mewtwo'];

// Games without breeding: Gen 1, Let's Go, Legends: Arceus, Legends: Z-A, GO and Champions.
const NO_BREEDING = new Set(['lets-go-pikachu', 'lets-go-eevee', 'legends-arceus', 'legends-z-a', 'go', 'champions', 'red', 'blue', 'yellow']);

function game(id, name, group, gen, pdb, dex, extra = {}) {
  return { id, name, group, gen, pdb, dex, breeding: !NO_BREEDING.has(id), ...extra };
}

const XY = { megas: MEGA_XY };
const ORAS = { megas: MEGA_ORAS, primal: true };
const GEN7 = { megas: MEGA_ORAS, primal: true };
const LGPE = { megas: MEGA_LGPE };
const SWSH = { gigantamax: true };
const ZA = { megas: 'dex' };

export const GAMES = [
  // Direct to HOME
  game('lets-go-pikachu', "Let's Go, Pikachu!", 'direct', 7, 'lets-go-pikachu', ['lets-go-pikachu-eevee'], LGPE),
  game('lets-go-eevee', "Let's Go, Eevee!", 'direct', 7, 'lets-go-eevee', ['lets-go-pikachu-eevee'], LGPE),
  game('sword', 'Sword', 'direct', 8, 'sword', ['sword-shield', 'sword-shield/isle-of-armor', 'sword-shield/crown-tundra'], SWSH),
  game('shield', 'Shield', 'direct', 8, 'shield', ['sword-shield', 'sword-shield/isle-of-armor', 'sword-shield/crown-tundra'], SWSH),
  game('brilliant-diamond', 'Brilliant Diamond', 'direct', 8, 'brilliant-diamond', ['brilliant-diamond-shining-pearl']),
  game('shining-pearl', 'Shining Pearl', 'direct', 8, 'shining-pearl', ['brilliant-diamond-shining-pearl']),
  game('legends-arceus', 'Legends: Arceus', 'direct', 8, 'legends-arceus', ['legends-arceus']),
  game('scarlet', 'Scarlet', 'direct', 9, 'scarlet', ['scarlet-violet', 'scarlet-violet/teal-mask', 'scarlet-violet/indigo-disk']),
  game('violet', 'Violet', 'direct', 9, 'violet', ['scarlet-violet', 'scarlet-violet/teal-mask', 'scarlet-violet/indigo-disk']),
  game('legends-z-a', 'Legends: Z-A', 'direct', 9, 'legends-z-a', ['legends-z-a', 'legends-z-a/mega-dimension'], ZA),
  game('go', 'Pokémon GO', 'direct', 0, null, [], { source: 'serebii-go' }),
  game('champions', 'Pokémon Champions', 'direct', 0, null, [], { source: 'serebii-champions' }),

  // Via Pokémon Bank
  game('x', 'X', 'bank', 6, 'x', ['x-y'], XY),
  game('y', 'Y', 'bank', 6, 'y', ['x-y'], XY),
  game('omega-ruby', 'Omega Ruby', 'bank', 6, 'omega-ruby', ['omega-ruby-alpha-sapphire'], ORAS),
  game('alpha-sapphire', 'Alpha Sapphire', 'bank', 6, 'alpha-sapphire', ['omega-ruby-alpha-sapphire'], ORAS),
  game('sun', 'Sun', 'bank', 7, 'sun', ['sun-moon'], GEN7),
  game('moon', 'Moon', 'bank', 7, 'moon', ['sun-moon'], GEN7),
  game('ultra-sun', 'Ultra Sun', 'bank', 7, 'ultra-sun', ['ultra-sun-ultra-moon'], GEN7),
  game('ultra-moon', 'Ultra Moon', 'bank', 7, 'ultra-moon', ['ultra-sun-ultra-moon'], GEN7),
  game('black', 'Black', 'bank', 5, 'black', ['black-white']),
  game('white', 'White', 'bank', 5, 'white', ['black-white']),
  game('black-2', 'Black 2', 'bank', 5, 'black-2', ['black-white-2']),
  game('white-2', 'White 2', 'bank', 5, 'white-2', ['black-white-2']),
  game('red', 'Red (Virtual Console)', 'bank', 1, 'red', ['red-blue-yellow']),
  game('blue', 'Blue (Virtual Console)', 'bank', 1, 'blue', ['red-blue-yellow']),
  game('yellow', 'Yellow (Virtual Console)', 'bank', 1, 'yellow', ['red-blue-yellow']),
  game('gold', 'Gold (Virtual Console)', 'bank', 2, 'gold', ['gold-silver-crystal']),
  game('silver', 'Silver (Virtual Console)', 'bank', 2, 'silver', ['gold-silver-crystal']),
  game('crystal', 'Crystal (Virtual Console)', 'bank', 2, 'crystal', ['gold-silver-crystal']),

  // Legacy chain
  game('diamond', 'Diamond', 'legacy', 4, 'diamond', ['diamond-pearl']),
  game('pearl', 'Pearl', 'legacy', 4, 'pearl', ['diamond-pearl']),
  game('platinum', 'Platinum', 'legacy', 4, 'platinum', ['platinum']),
  game('heartgold', 'HeartGold', 'legacy', 4, 'heartgold', ['heartgold-soulsilver']),
  game('soulsilver', 'SoulSilver', 'legacy', 4, 'soulsilver', ['heartgold-soulsilver']),
  game('ruby', 'Ruby', 'legacy', 3, 'ruby', ['ruby-sapphire-emerald']),
  game('sapphire', 'Sapphire', 'legacy', 3, 'sapphire', ['ruby-sapphire-emerald']),
  game('emerald', 'Emerald', 'legacy', 3, 'emerald', ['ruby-sapphire-emerald']),
  game('firered', 'FireRed', 'legacy', 3, 'firered', ['firered-leafgreen']),
  game('leafgreen', 'LeafGreen', 'legacy', 3, 'leafgreen', ['firered-leafgreen'])
];

export const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));
