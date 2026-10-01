import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { championsLabels, displayName, evaluateForm, filterForms, summarise } from '../src/availability.js';
import { GAMES } from '../src/games.js';

const rosters = [
  { id: 'regularrosterm-c', name: 'Regular Roster M-C', current: true },
  { id: 'regularrosterm-a', name: 'Regular Roster M-A', current: false }
];

const FORMS = [
  {
    id: 'vulpix', num: 37, species: 'Vulpix', form: '', kind: 'default',
    avail: { sword: ['c', 'Route 3'], shield: ['c', 'Dusty Bowl'], sun: ['t', ''] }
  },
  {
    id: 'vulpix-alolan-vulpix', num: 37, species: 'Vulpix', form: 'Alolan Vulpix', kind: 'regional',
    avail: { sun: ['c', 'Tapu Village'], moon: ['t', ''], sword: ['t', ''] }
  },
  {
    id: 'zacian', num: 888, species: 'Zacian', form: 'Hero of Many Battles', kind: 'default',
    avail: { sword: ['c', 'Energy Plant'], shield: ['t', ''] },
    onePerSave: ['sword']
  },
  {
    id: 'charizard-mega-charizard-x', num: 6, species: 'Charizard', form: 'Mega Charizard X', kind: 'battle',
    avail: { x: ['b', 'Battle-only form'] },
    champions: { usable: true, recruit: [] }
  },
  {
    id: 'mew', num: 151, species: 'Mew', form: '', kind: 'default',
    avail: { sword: ['e', 'Event distribution only'] }
  },
  {
    id: 'incineroar', num: 727, species: 'Incineroar', form: '', kind: 'default',
    avail: { sun: ['c', 'Evolve Torracat'] },
    champions: { usable: true, recruit: ['regularrosterm-a'] }
  }
];

test('every HOME-compatible game is a single selectable version', () => {
  const ids = GAMES.map((g) => g.id);
  for (const id of ['sword', 'shield', 'scarlet', 'violet', 'legends-z-a', 'legends-arceus', 'brilliant-diamond', 'lets-go-eevee', 'go', 'champions', 'x', 'ultra-moon', 'black-2', 'crystal', 'heartgold', 'emerald', 'leafgreen', 'firered-switch', 'leafgreen-switch']) {
    assert.ok(ids.includes(id), `${id} missing`);
  }
  assert.equal(new Set(ids).size, ids.length);
});

test('nothing is obtainable with no games selected', () => {
  assert.deepEqual(filterForms(FORMS, []), []);
});

test('regional forms are tracked separately from the standard form', () => {
  const sun = filterForms(FORMS, ['sun']).map((r) => r.form.id);
  assert.deepEqual(sun, ['vulpix-alolan-vulpix', 'incineroar']);

  const sword = filterForms(FORMS, ['sword']).map((r) => r.form.id);
  assert.ok(sword.includes('vulpix'));
  assert.ok(!sword.includes('vulpix-alolan-vulpix'));
});

test('trade-only and event-only entries do not count as obtainable', () => {
  assert.equal(evaluateForm(FORMS[2], ['shield']).status, 'transfer-only');
  assert.equal(evaluateForm(FORMS[4], ['sword']).status, 'event-only');
  assert.equal(evaluateForm(FORMS[4], ['sword'], { includeEvents: true }).obtainable, true);
});

test('one-per-save is reported only for games where it applies', () => {
  const both = evaluateForm(FORMS[2], ['sword', 'shield']);
  assert.deepEqual(both.onePerSaveIn, ['sword']);
  assert.equal(both.onlyOnePerSave, true);
  assert.deepEqual(filterForms(FORMS, ['sword'], { onePerSave: true }).map((r) => r.form.id), ['zacian']);
});

test('battle-only forms count once their base Pokémon is obtainable', () => {
  const result = evaluateForm(FORMS[3], ['x']);
  assert.equal(result.status, 'battle');
  assert.equal(result.obtainable, true);
});

test('Champions usable and recruitable labels', () => {
  assert.deepEqual(championsLabels(FORMS[3], rosters), { usable: true, recruitable: false, recruitableNow: false, rosters: [] });
  const incineroar = championsLabels(FORMS[5], rosters);
  assert.equal(incineroar.recruitable, true);
  assert.equal(incineroar.recruitableNow, false);
  assert.deepEqual(filterForms(FORMS, ['sun'], { championsRecruitable: true, rosters }).map((r) => r.form.id), ['incineroar']);
});

test('search, "not obtainable" view and summary counts', () => {
  assert.deepEqual(filterForms(FORMS, ['sun'], { search: 'alolan' }).map((r) => r.form.id), ['vulpix-alolan-vulpix']);
  assert.deepEqual(filterForms(FORMS, ['sun'], { search: '#0727' }).map((r) => r.form.id), ['incineroar']);
  assert.ok(filterForms(FORMS, ['sun'], { show: 'missing' }).every((r) => !r.obtainable));
  assert.deepEqual(summarise(FORMS, ['sword']), { total: 6, obtainable: 2, species: 5, obtainableSpecies: 2 });
  assert.equal(displayName(FORMS[1]), 'Alolan Vulpix');
});

test('generated dataset covers every form and game', () => {
  const data = JSON.parse(readFileSync(new URL('../data/pokemon.json', import.meta.url)));
  const ids = new Set(data.forms.map((f) => f.id));
  assert.equal(ids.size, data.forms.length, 'form ids are unique');
  assert.equal(new Set(data.forms.map((f) => f.num)).size, 1025, 'every national dex number is present');
  for (const id of ['vulpix-alolan-vulpix', 'rotom-heat-rotom', 'tauros-blaze-breed', 'unown-unown-a', 'vivillon-jungle-pattern', 'charizard-gigantamax', 'pikachu-partner-pikachu']) {
    assert.ok(ids.has(id), `${id} missing`);
  }
  const gameIds = new Set(GAMES.map((g) => g.id));
  for (const form of data.forms) {
    for (const gameId of Object.keys(form.avail)) {
      assert.ok(gameIds.has(gameId), `${form.id} references unknown game ${gameId}`);
    }
  }
  assert.ok(data.forms.some((f) => f.champions?.recruit?.length), 'some forms are recruitable in Champions');
  assert.ok(data.forms.some((f) => f.onePerSave?.length), 'some forms are one per save');
});
