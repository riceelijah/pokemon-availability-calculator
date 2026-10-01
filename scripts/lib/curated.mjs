// Hand-maintained facts that PokémonDB does not expose in a machine-readable way.

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const LEGENDARY = new Set([
  144, 145, 146, 150, 243, 244, 245, 249, 250, 377, 378, 379, 380, 381, 382, 383, 384,
  480, 481, 482, 483, 484, 485, 486, 487, 488, 638, 639, 640, 641, 642, 643, 644, 645, 646,
  716, 717, 718, 772, 773, 785, 786, 787, 788, 789, 790, 791, 792, 800,
  888, 889, 890, 891, 892, 894, 895, 896, 897, 898, 905,
  1001, 1002, 1003, 1004, 1007, 1008, 1014, 1015, 1016, 1017, 1024
]);

export const MYTHICAL = new Set([
  151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649, 719, 720, 721,
  801, 802, 807, 808, 809, 893, 1025
]);

export const ULTRA_BEAST = new Set([...range(793, 799), ...range(803, 806)]);

// Paradox Pokémon that are one-off encounters rather than wild spawns.
export const ONE_OFF_PARADOX = new Set([1009, 1010, 1020, 1021, 1022, 1023]);

// Version-exclusive legendaries that PokémonDB lists as "trade" in both
// versions; used when we infer availability from the game Pokédex.
export const VERSION_EXCLUSIVE = {
  zacian: ['sword'],
  zamazenta: ['shield'],
  koraidon: ['scarlet'],
  miraidon: ['violet'],
  dialga: ['brilliant-diamond', 'diamond'],
  palkia: ['shining-pearl', 'pearl'],
  xerneas: ['x'],
  yveltal: ['y'],
  solgaleo: ['sun', 'ultra-sun'],
  lunala: ['moon', 'ultra-moon'],
  reshiram: ['black', 'white-2'],
  zekrom: ['white', 'black-2']
};

// Location text that means the encounter can be repeated within a single save.
export const REPEATABLE_LOCATION = /(Max Lair|Dynamax Adventure|Max Raid|Tera Raid|Ultra Space Wilds|Mass outbreak|Outbreak|Wild Zone|Hyperspace)/i;

// Specific forms that are only ever obtainable once per save file, keyed by
// form id, with the games where that is true.
export const ONE_PER_SAVE_FORMS = {
  'pikachu-partner-pikachu': ['lets-go-pikachu'],
  'eevee-partner-eevee': ['lets-go-eevee'],
  'pichu-spiky-eared': ['heartgold', 'soulsilver'],
  'pikachu-cosplay': ['omega-ruby', 'alpha-sapphire'],
  'pikachu-rock-star': ['omega-ruby', 'alpha-sapphire'],
  'pikachu-belle': ['omega-ruby', 'alpha-sapphire'],
  'pikachu-pop-star': ['omega-ruby', 'alpha-sapphire'],
  'pikachu-ph-d': ['omega-ruby', 'alpha-sapphire'],
  'pikachu-libre': ['omega-ruby', 'alpha-sapphire'],
  'greninja-ash-greninja': ['sun', 'moon', 'ultra-sun', 'ultra-moon'],
  'floette-eternal-flower': ['legends-z-a']
};

// Cosmetic forms PokémonDB only mentions in prose (or not at all). Every one
// of these is listed separately so each form can be tracked on its own.
const ALCREMIE_CREAMS = ['Vanilla Cream', 'Ruby Cream', 'Matcha Cream', 'Mint Cream', 'Lemon Cream', 'Salted Cream', 'Ruby Swirl', 'Caramel Swirl', 'Rainbow Swirl'];
const ALCREMIE_SWEETS = ['Strawberry', 'Berry', 'Love', 'Star', 'Clover', 'Flower', 'Ribbon'];
const FLOWER_COLORS = ['Red Flower', 'Yellow Flower', 'Orange Flower', 'Blue Flower', 'White Flower'];
const SEASONS = ['Spring Form', 'Summer Form', 'Autumn Form', 'Winter Form'];
const SEAS = ['West Sea', 'East Sea'];
const TYPES = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy'];
const UNOWN = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((l) => `Unown ${l}`).concat(['Unown ! (Exclamation)', 'Unown ? (Question)']);

export const COSMETIC_FORMS = {
  unown: { forms: UNOWN, replacesDefault: true },
  shellos: { forms: SEAS, replacesDefault: true },
  gastrodon: { forms: SEAS, replacesDefault: true },
  deerling: { forms: SEASONS, replacesDefault: true },
  sawsbuck: { forms: SEASONS, replacesDefault: true },
  flabebe: { forms: FLOWER_COLORS, replacesDefault: true },
  floette: { forms: FLOWER_COLORS, replacesDefault: true },
  florges: { forms: FLOWER_COLORS, replacesDefault: true },
  furfrou: { forms: ['Natural Form', 'Heart Trim', 'Star Trim', 'Diamond Trim', 'Debutante Trim', 'Matron Trim', 'Dandy Trim', 'La Reine Trim', 'Kabuki Trim', 'Pharaoh Trim'], replacesDefault: true },
  minior: { forms: ['Red Core', 'Orange Core', 'Yellow Core', 'Green Core', 'Blue Core', 'Indigo Core', 'Violet Core'] },
  alcremie: { forms: ALCREMIE_CREAMS.flatMap((cream) => ALCREMIE_SWEETS.map((sweet) => `${cream} (${sweet} Sweet)`)), replacesDefault: true },
  arceus: { forms: TYPES.map((t) => `${t} Type`), replacesDefault: true },
  silvally: { forms: TYPES.map((t) => `${t} Type`), replacesDefault: true },
  genesect: { forms: ['Douse Drive', 'Shock Drive', 'Burn Drive', 'Chill Drive'] },
  sinistea: { forms: ['Phony Form', 'Antique Form'], replacesDefault: true },
  polteageist: { forms: ['Phony Form', 'Antique Form'], replacesDefault: true },
  poltchageist: { forms: ['Counterfeit Form', 'Artisan Form'], replacesDefault: true },
  sinistcha: { forms: ['Unremarkable Form', 'Masterpiece Form'], replacesDefault: true },
  xerneas: { forms: ['Neutral Mode', 'Active Mode'], replacesDefault: true },
  spinda: { forms: [] }
};

// Event / special forms that PokémonDB does not list as separate rows.
export const SPECIAL_FORMS = {
  pikachu: ['Original Cap', 'Hoenn Cap', 'Sinnoh Cap', 'Unova Cap', 'Kalos Cap', 'Alola Cap', 'Partner Cap', 'World Cap', 'Cosplay', 'Rock Star', 'Belle', 'Pop Star', 'Ph. D.', 'Libre'],
  pichu: ['Spiky-eared'],
  magearna: ['Original Color'],
  zarude: ['Dada']
};

// Battle-only forms PokémonDB does not list as rows.
export const EXTRA_BATTLE_FORMS = {
  cherrim: ['Sunshine Form'],
  mimikyu: ['Busted Form'],
  cramorant: ['Gulping Form', 'Gorging Form']
};

// Where special forms can be obtained (other than event distributions).
export const SPECIAL_FORM_GAMES = {
  'pikachu-cosplay': { 'omega-ruby': 'Contest Spectacular gift', 'alpha-sapphire': 'Contest Spectacular gift' },
  'pikachu-rock-star': { 'omega-ruby': 'Contest Spectacular gift (change outfit)', 'alpha-sapphire': 'Contest Spectacular gift (change outfit)' },
  'pikachu-belle': { 'omega-ruby': 'Contest Spectacular gift (change outfit)', 'alpha-sapphire': 'Contest Spectacular gift (change outfit)' },
  'pikachu-pop-star': { 'omega-ruby': 'Contest Spectacular gift (change outfit)', 'alpha-sapphire': 'Contest Spectacular gift (change outfit)' },
  'pikachu-ph-d': { 'omega-ruby': 'Contest Spectacular gift (change outfit)', 'alpha-sapphire': 'Contest Spectacular gift (change outfit)' },
  'pikachu-libre': { 'omega-ruby': 'Contest Spectacular gift (change outfit)', 'alpha-sapphire': 'Contest Spectacular gift (change outfit)' },
  'pikachu-partner-cap': { 'ultra-sun': 'Event (Pokémon movie distribution)', 'ultra-moon': 'Event (Pokémon movie distribution)' },
  'pichu-spiky-eared': { heartgold: 'Ilex Forest shrine (with event Spiky-eared Pichu)', soulsilver: 'Ilex Forest shrine (with event Spiky-eared Pichu)' },
  'pikachu-partner-pikachu': { 'lets-go-pikachu': 'Starter Pokémon' },
  'eevee-partner-eevee': { 'lets-go-eevee': 'Starter Pokémon' }
};

// Alolan forms are received from in-game trades in Let's Go Pikachu/Eevee.
export const LGPE_ALOLAN_TRADES = ['rattata', 'raticate', 'raichu', 'sandshrew', 'sandslash', 'vulpix', 'ninetales', 'diglett', 'dugtrio', 'meowth', 'persian', 'geodude', 'graveler', 'golem', 'grimer', 'muk', 'exeggutor', 'marowak'];

// Forms that are changed in-game (item, move, location…), so they are
// obtainable wherever the species is.
export const CHANGEABLE_SPECIES = new Set([
  'rotom', 'deoxys', 'giratina', 'shaymin', 'tornadus', 'thundurus', 'landorus', 'enamorus',
  'kyurem', 'necrozma', 'hoopa', 'oricorio', 'zygarde', 'calyrex', 'keldeo', 'burmy',
  'dialga', 'palkia', 'ogerpon', 'furfrou', 'arceus', 'silvally', 'genesect', 'xerneas', 'urshifu'
]);

// Name patterns used to classify the forms listed by PokémonDB.
export function classifyForm(formName) {
  if (/^(Mega |Primal )|Eternamax|Ultra Necrozma|Zen Mode|School Form|Core Form$|Blade Forme|Pirouette|Noice Face|Hangry Mode|Crowned|Terastal Form|Stellar Form|Hero Form|Sunny Form|Rainy Form|Snowy Form|Complete Forme|Busted|Gulping|Gorging|Sunshine|Gigantamax/.test(formName)) {
    return 'battle';
  }
  if (/^(Alolan|Galarian|Hisuian|Paldean) |Breed$|Bloodmoon/.test(formName)) {
    return 'regional';
  }
  if (/^(Partner |Own Tempo|Ash-Greninja|Eternal Flower)/.test(formName)) {
    return 'special';
  }
  return 'alternate';
}

export function regionalGroup(formName) {
  const match = formName.match(/^(Alolan|Galarian|Hisuian|Paldean)/);
  if (match) {
    return match[1].toLowerCase();
  }
  if (/Breed$/.test(formName)) {
    return 'paldean';
  }
  if (/Bloodmoon/.test(formName)) {
    return 'bloodmoon';
  }
  return null;
}
