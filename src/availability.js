import { GAME_BY_ID } from './games.js';

// Status codes used in data/pokemon.json.
export const STATUS = {
  c: 'obtainable',
  b: 'battle',
  e: 'event',
  t: 'transfer'
};

export const KIND_LABELS = {
  default: 'Standard',
  regional: 'Regional form',
  alternate: 'Alternate form',
  battle: 'Battle-only',
  cosmetic: 'Cosmetic form',
  special: 'Event / special'
};

export function displayName(form) {
  if (!form.form) {
    return form.species;
  }
  if (form.form.includes(form.species)) {
    return form.form;
  }
  return `${form.species} (${form.form})`;
}

// Works out how a single form can be obtained from the selected games.
export function evaluateForm(form, selectedGameIds, { includeEvents = false } = {}) {
  const sources = [];
  for (const gameId of selectedGameIds) {
    const entry = form.avail?.[gameId];
    if (!entry) {
      continue;
    }
    const [code, text] = entry;
    sources.push({ gameId, gameName: GAME_BY_ID[gameId]?.name ?? gameId, status: STATUS[code] ?? code, text });
  }

  const has = (status) => sources.some((source) => source.status === status);
  let status = 'unavailable';
  if (has('obtainable')) {
    status = 'obtainable';
  } else if (has('battle')) {
    status = 'battle';
  } else if (includeEvents && has('event')) {
    status = 'event';
  } else if (has('event')) {
    status = 'event-only';
  } else if (has('transfer')) {
    status = 'transfer-only';
  }

  const obtainableIn = sources.filter((source) => source.status === 'obtainable');
  const onePerSaveIn = obtainableIn.filter((source) => form.onePerSave?.includes(source.gameId));

  return {
    form,
    status,
    obtainable: status === 'obtainable' || status === 'battle' || status === 'event',
    sources,
    onePerSaveIn: onePerSaveIn.map((source) => source.gameId),
    // True when every selected game that offers it only gives one per save file.
    onlyOnePerSave: obtainableIn.length > 0 && onePerSaveIn.length === obtainableIn.length
  };
}

export function championsLabels(form, rosters = []) {
  const champions = form.champions;
  if (!champions) {
    return { usable: false, recruitable: false, recruitableNow: false, rosters: [] };
  }
  const current = new Set(rosters.filter((r) => r.current).map((r) => r.id));
  return {
    usable: Boolean(champions.usable),
    recruitable: champions.recruit.length > 0,
    recruitableNow: champions.recruit.some((id) => current.has(id)),
    rosters: champions.recruit.map((id) => rosters.find((r) => r.id === id)?.name ?? id)
  };
}

export function filterForms(forms, selectedGameIds, options = {}) {
  const {
    show = 'obtainable',
    includeEvents = false,
    kinds = null,
    search = '',
    onePerSave = false,
    championsUsable = false,
    championsRecruitable = false,
    rosters = []
  } = options;

  const query = search.trim().toLowerCase();
  const results = [];

  for (const form of forms) {
    if (kinds && !kinds.has(form.kind)) {
      continue;
    }
    if (query && !displayName(form).toLowerCase().includes(query) && String(form.num) !== query.replace(/^#?0*/, '')) {
      continue;
    }
    const champions = championsLabels(form, rosters);
    if (championsUsable && !champions.usable) {
      continue;
    }
    if (championsRecruitable && !champions.recruitable) {
      continue;
    }
    const result = evaluateForm(form, selectedGameIds, { includeEvents });
    if (onePerSave && !result.onePerSaveIn.length) {
      continue;
    }
    if (show === 'obtainable' && !result.obtainable) {
      continue;
    }
    if (show === 'missing' && result.obtainable) {
      continue;
    }
    results.push({ ...result, champions });
  }

  return results;
}

export function summarise(forms, selectedGameIds, options = {}) {
  const { kinds = null, includeEvents = false } = options;
  let total = 0;
  let obtainable = 0;
  const species = new Set();
  const obtainableSpecies = new Set();
  for (const form of forms) {
    if (kinds && !kinds.has(form.kind)) {
      continue;
    }
    total += 1;
    species.add(form.num);
    if (evaluateForm(form, selectedGameIds, { includeEvents }).obtainable) {
      obtainable += 1;
      obtainableSpecies.add(form.num);
    }
  }
  return { total, obtainable, species: species.size, obtainableSpecies: obtainableSpecies.size };
}
