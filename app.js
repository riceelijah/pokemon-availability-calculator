import { GAMES, GAME_GROUPS } from './src/games.js';
import { KIND_LABELS, filterForms, summarise } from './src/availability.js';

const PAGE_SIZE = 150;
const STORAGE_KEY = 'pokemon-availability:v2';

const gameList = document.getElementById('game-list');
const gamesCount = document.getElementById('games-count');
const summary = document.getElementById('result-summary');
const resultsTable = document.getElementById('results-table');
const resultsBody = document.getElementById('results-body');
const showMore = document.getElementById('show-more');
const search = document.getElementById('search');

let dataset = null;
let currentResults = [];
let shown = 0;

// ---------------------------------------------------------------------------
// Persistence (per-browser convenience only)

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ games: getSelectedGames() }));
  } catch {
    // storage unavailable — ignore
  }
}

// ---------------------------------------------------------------------------
// Sidebar

function renderGameList(selected) {
  for (const group of GAME_GROUPS) {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = group.name;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent = 'Toggle';
    toggle.addEventListener('click', () => {
      const boxes = [...fieldset.querySelectorAll('input')];
      const allOn = boxes.every((box) => box.checked);
      boxes.forEach((box) => {
        box.checked = !allOn;
      });
      onGamesChanged();
    });
    legend.appendChild(toggle);
    fieldset.appendChild(legend);

    const desc = document.createElement('p');
    desc.className = 'group-desc';
    desc.textContent = group.description;
    fieldset.appendChild(desc);

    for (const game of GAMES.filter((g) => g.group === group.id)) {
      const label = document.createElement('label');
      label.className = 'game-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = game.id;
      checkbox.checked = selected.has(game.id);
      checkbox.addEventListener('change', onGamesChanged);
      const text = document.createElement('span');
      text.textContent = game.name;
      label.append(checkbox, text);
      fieldset.appendChild(label);
    }
    gameList.appendChild(fieldset);
  }
}

function getSelectedGames() {
  return [...gameList.querySelectorAll('input:checked')].map((box) => box.value);
}

function setSelection(predicate) {
  gameList.querySelectorAll('input').forEach((box) => {
    box.checked = predicate(GAMES.find((g) => g.id === box.value));
  });
  onGamesChanged();
}

function onGamesChanged() {
  saveState();
  render();
}

document.querySelectorAll('[data-select]').forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.select;
    setSelection((game) => mode === 'all' || (mode === 'direct' && game.group === 'direct'));
  });
});

// ---------------------------------------------------------------------------
// Filters

function readOptions() {
  const kinds = new Set([...document.querySelectorAll('input[name="kind"]:checked')].map((box) => box.value));
  return {
    show: document.querySelector('input[name="show"]:checked').value,
    kinds,
    search: search.value,
    includeEvents: document.getElementById('include-events').checked,
    onePerSave: document.getElementById('filter-one-per-save').checked,
    championsUsable: document.getElementById('filter-champions-usable').checked,
    championsRecruitable: document.getElementById('filter-champions-recruitable').checked,
    rosters: dataset?.champions?.rosters ?? []
  };
}

document.querySelectorAll('.toolbar input').forEach((input) => {
  input.addEventListener(input.type === 'search' ? 'input' : 'change', render);
});

// ---------------------------------------------------------------------------
// Results

function badge(text, className, title) {
  const span = document.createElement('span');
  span.className = `badge ${className || ''}`.trim();
  span.textContent = text;
  if (title) {
    span.title = title;
  }
  return span;
}

const ICON_DISPLAY = 40;

function renderIcon(form) {
  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.setAttribute('aria-hidden', 'true');
  const sheet = dataset.icons;
  if (sheet && Number.isInteger(form.icon)) {
    const col = form.icon % sheet.columns;
    const row = Math.floor(form.icon / sheet.columns);
    icon.style.backgroundImage = `url(${sheet.file})`;
    icon.style.backgroundSize = `${sheet.columns * ICON_DISPLAY}px auto`;
    icon.style.backgroundPosition = `-${col * ICON_DISPLAY}px -${row * ICON_DISPLAY}px`;
  }
  return icon;
}

function gameName(id) {
  return GAMES.find((g) => g.id === id)?.name ?? id;
}

function renderRow(result) {
  const { form, champions } = result;
  const row = document.createElement('tr');
  if (!result.obtainable) {
    row.className = 'is-unavailable';
  }

  const num = document.createElement('td');
  num.className = 'cell-num';
  num.textContent = `#${String(form.num).padStart(4, '0')}`;

  const name = document.createElement('td');
  const nameWrap = document.createElement('div');
  nameWrap.className = 'cell-name';
  nameWrap.appendChild(renderIcon(form));
  name.appendChild(nameWrap);
  const nameText = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = form.species;
  nameText.appendChild(strong);
  if (form.form) {
    const formName = document.createElement('span');
    formName.className = 'form-name';
    formName.textContent = form.form;
    nameText.appendChild(formName);
  }
  nameWrap.appendChild(nameText);

  const labels = document.createElement('td');
  labels.className = 'cell-labels';
  const badges = document.createElement('div');
  badges.className = 'badges';
  if (form.kind !== 'default') {
    badges.appendChild(badge(KIND_LABELS[form.kind]));
  }
  if (result.onePerSaveIn.length) {
    const games = result.onePerSaveIn.map(gameName).join(', ');
    badges.appendChild(badge(result.onlyOnePerSave ? '1 per save' : '1 per save (some games)', 'badge-save', `Only one per save file in: ${games}`));
  }
  if (champions.usable) {
    badges.appendChild(badge('Champions', 'badge-usable', 'Usable in Pokémon Champions'));
  }
  if (champions.recruitable) {
    const title = `Recruit Ranch rosters: ${champions.rosters.join(', ')}`;
    badges.appendChild(badge(champions.recruitableNow ? 'Recruitable' : 'Recruitable (past roster)', 'badge-recruit', title));
  }
  labels.appendChild(badges);

  const where = document.createElement('td');
  const list = document.createElement('ul');
  list.className = 'locations';
  const shownSources = result.sources.length ? result.sources : [];
  if (!shownSources.length) {
    const item = document.createElement('li');
    item.className = 'muted';
    item.textContent = 'Not in any selected game';
    list.appendChild(item);
  }
  for (const source of shownSources) {
    const item = document.createElement('li');
    item.className = `status-${source.status === 'transfer' ? 'transfer' : source.status === 'event' && !result.obtainable ? 'event-only' : source.status}`;
    const game = document.createElement('span');
    game.className = 'game';
    game.textContent = `${source.gameName}: `;
    item.appendChild(game);
    item.append(describeSource(source, form));
    if (form.onePerSave?.includes(source.gameId) && source.status === 'obtainable') {
      item.append(' ');
      item.appendChild(badge('1 per save', 'badge-save'));
    }
    list.appendChild(item);
  }
  where.appendChild(list);

  row.append(num, name, labels, where);
  return row;
}

function describeSource(source, form) {
  switch (source.status) {
    case 'transfer':
      return 'Trade or transfer in from another game';
    case 'battle':
      return `Battle-only form — obtain ${form.species} and use it in battle`;
    case 'event':
      return source.text || 'Event distribution only';
    default:
      return source.text || 'Obtainable';
  }
}

function renderMore() {
  const fragment = document.createDocumentFragment();
  const next = currentResults.slice(shown, shown + PAGE_SIZE);
  next.forEach((result) => fragment.appendChild(renderRow(result)));
  resultsBody.appendChild(fragment);
  shown += next.length;
  showMore.hidden = shown >= currentResults.length;
  showMore.textContent = `Show more (${currentResults.length - shown} remaining)`;
}

function render() {
  const selected = getSelectedGames();
  gamesCount.textContent = `${selected.length} of ${GAMES.length} selected`;
  if (!dataset) {
    return;
  }

  const options = readOptions();
  const stats = summarise(dataset.forms, selected, options);
  currentResults = filterForms(dataset.forms, selected, options);
  resultsBody.innerHTML = '';
  shown = 0;

  if (!selected.length) {
    summary.textContent = `Choose one or more games in the sidebar. ${stats.total} forms of ${stats.species} Pokémon are tracked.`;
  } else {
    summary.textContent = `${stats.obtainable} of ${stats.total} forms obtainable (${stats.obtainableSpecies} of ${stats.species} species) · showing ${currentResults.length}`;
  }

  resultsTable.hidden = currentResults.length === 0;
  if (currentResults.length === 0 && selected.length) {
    summary.textContent += ' — nothing matches these filters.';
  }
  renderMore();
}

showMore.addEventListener('click', renderMore);

// ---------------------------------------------------------------------------
// Start-up

const state = loadState();
renderGameList(new Set(state.games || []));
render();

fetch('./data/pokemon.json')
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    dataset = data;
    const generated = new Date(data.generatedAt);
    document.getElementById('data-credit').append(` Data built ${generated.toLocaleDateString()}.`);
    render();
  })
  .catch((error) => {
    summary.textContent = `Could not load data/pokemon.json (${error.message}). Run "npm run build-data" first.`;
  });

