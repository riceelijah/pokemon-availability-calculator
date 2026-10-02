# pokemon-availability-calculator

Pick the Pokémon games you own (in the sidebar) and see every Pokémon **form** you can obtain, where to find it, and which ones are one per save or usable/recruitable in Pokémon Champions.  
Web Interface Here: https://riceelijah.github.io/pokemon-availability-calculator/
## Features

- **Every game that can reach Pokémon HOME**, one checkbox per version so version exclusives count correctly:
  - Direct: Let's Go Pikachu/Eevee, Sword/Shield, Brilliant Diamond/Shining Pearl, Legends: Arceus, Scarlet/Violet, Legends: Z-A, FireRed/LeafGreen on Switch (HOME link added October 2026), Pokémon GO, Pokémon Champions, and Pokémon HOME itself (its gift distributions, one per account)
  - Via Pokémon Bank: X/Y, Omega Ruby/Alpha Sapphire, Sun/Moon, Ultra Sun/Ultra Moon, Black/White, Black 2/White 2, Virtual Console Red/Blue/Yellow/Gold/Silver/Crystal
  - Via the legacy chain (Pal Park / Poké Transfer): Diamond/Pearl/Platinum, HeartGold/SoulSilver, Ruby/Sapphire/Emerald, FireRed/LeafGreen
- **Every form is its own entry** (1,500 total): regional forms, alternate forms (Rotom, Deoxys, genders…), cosmetic forms (Unown, Vivillon, Alcremie, Furfrou…), battle-only forms (Megas, Gigantamax, Zen Mode…) and event/special forms (Partner Pikachu, Pikachu caps…).
- **Breeding**: in games with breeding, owning an evolved Pokémon makes its earlier stages obtainable (hatch, then evolve).
- **Labels**: *1 per save*, *Champions* (usable in Pokémon Champions) and *Recruitable* (has appeared in a Champions Recruit Ranch roster; "past roster" if not in the current one).
- Filters for form types, labels, search, and a "Not obtainable" view to see what you're missing.

## Run locally

```bash
npm start
```

Then open `http://localhost:4173`.

## Data

`data/pokemon.json` is generated and committed. To rebuild it:

```bash
npm run build-data            # uses pages cached in .cache/
npm run build-data -- --refresh   # re-download everything
```

Sources:

- [Pokémon Database](https://pokemondb.net/pokedex/) — the form list, per-version "Where to find" locations, game Pokédexes and egg groups.
- [Serebii.net](https://www.serebii.net/) — Pokémon Champions usable / transfer-only Pokémon and Recruit Ranch rosters, the Pokémon GO roster, and Scarlet/Violet version exclusives (PokémonDB has none of these).
- Serebii's Pokémon HOME icons, packed into one sprite sheet (`data/icons.webp`) at build time so the site doesn't hotlink.
- Serebii per-game lists (unobtainable, version exclusives, legendaries, gifts, in-game trades, Ramanas Park, Grand Underground, Dynamax Adventures, Friend Safari…) fill gaps where PokémonDB has no location, and correct version-exclusive fossils and impossible evolutions.
- `scripts/lib/curated.mjs` — hand-kept facts: legendary/mythical lists, cosmetic forms PokémonDB only mentions in prose, and one-per-save special forms.

Known limitations: PokémonDB has no location details yet for Scarlet/Violet or Legends: Z-A, so those use "in the game's Pokédex"; per-form availability for cosmetic forms follows the species; gender-only visual differences are not split out.

## Test

```bash
npm test
```
