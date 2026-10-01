export const GAMES = [
  { id: 'red-blue', name: 'Pokémon Red/Blue' },
  { id: 'yellow', name: 'Pokémon Yellow' },
  { id: 'gold-silver', name: 'Pokémon Gold/Silver' },
  { id: 'ruby-sapphire', name: 'Pokémon Ruby/Sapphire' },
  { id: 'sword-shield', name: 'Pokémon Sword/Shield' }
];

export const POKEMON_DATA = [
  {
    name: 'Pikachu',
    encounters: [
      { gameId: 'red-blue', location: 'Viridian Forest' },
      { gameId: 'yellow', location: 'Starter Pokémon from Professor Oak' },
      { gameId: 'gold-silver', location: 'Viridian Forest (Kanto)' },
      { gameId: 'sword-shield', location: "Route 4 (Sword) / Giant's Cap (Shield)" }
    ]
  },
  {
    name: 'Eevee',
    encounters: [
      { gameId: 'red-blue', location: 'Celadon Mansion gift' },
      { gameId: 'yellow', location: 'Celadon Mansion gift' },
      { gameId: 'gold-silver', location: 'Bill gift in Goldenrod City' },
      { gameId: 'sword-shield', location: 'Route 4' }
    ]
  },
  {
    name: 'Larvitar',
    encounters: [
      { gameId: 'gold-silver', location: 'Mt. Silver' },
      { gameId: 'ruby-sapphire', location: 'Trade only (not catchable)' },
      { gameId: 'sword-shield', location: 'Lake of Outrage (Shield)' }
    ]
  },
  {
    name: 'Ralts',
    encounters: [
      { gameId: 'ruby-sapphire', location: 'Route 102' },
      { gameId: 'sword-shield', location: 'Max Raid Battles (Wild Area)' }
    ]
  },
  {
    name: 'Dratini',
    encounters: [
      { gameId: 'red-blue', location: 'Safari Zone (Super Rod)' },
      { gameId: 'yellow', location: 'Game Corner prize' },
      { gameId: 'gold-silver', location: "Dragon's Den" },
      { gameId: 'sword-shield', location: "Soothing Wetlands (Isle of Armor DLC)" }
    ]
  },
  {
    name: 'Beldum',
    encounters: [
      { gameId: 'ruby-sapphire', location: "Steven's house in Mossdeep City" },
      { gameId: 'sword-shield', location: 'Crown Tundra (Dynamax Adventures)' }
    ]
  }
];

export function getObtainablePokemon(ownedGameIds) {
  const owned = new Set(ownedGameIds);

  if (!owned.size) {
    return [];
  }

  return POKEMON_DATA.flatMap((pokemon) => {
    const encounters = pokemon.encounters.filter((encounter) => owned.has(encounter.gameId));
    if (!encounters.length) {
      return [];
    }

    return [
      {
        name: pokemon.name,
        encounters: encounters.map((encounter) => {
          const game = GAMES.find((candidate) => candidate.id === encounter.gameId);
          return {
            game: game ? game.name : encounter.gameId,
            location: encounter.location
          };
        })
      }
    ];
  });
}
