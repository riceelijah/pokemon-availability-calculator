import test from 'node:test';
import assert from 'node:assert/strict';

import { getObtainablePokemon } from '../src/availability.js';

test('returns empty list when no games are selected', () => {
  assert.deepEqual(getObtainablePokemon([]), []);
});

test('returns only Pokémon available in selected games with locations', () => {
  const result = getObtainablePokemon(['ruby-sapphire']);

  assert.ok(result.length > 0);
  assert.equal(result.every((pokemon) => pokemon.encounters.every((enc) => enc.game === 'Pokémon Ruby/Sapphire')), true);
});

test('combines encounters from multiple selected games', () => {
  const result = getObtainablePokemon(['red-blue', 'yellow']);
  const pikachu = result.find((pokemon) => pokemon.name === 'Pikachu');

  assert.ok(pikachu);
  assert.equal(pikachu.encounters.length, 2);
});
