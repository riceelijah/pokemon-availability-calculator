import { GAMES, getObtainablePokemon } from './src/availability.js';

const gameList = document.getElementById('game-list');
const summary = document.getElementById('result-summary');
const resultsTable = document.getElementById('results-table');
const resultsBody = document.getElementById('results-body');

function renderGameList() {
  GAMES.forEach((game) => {
    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = game.id;
    checkbox.addEventListener('change', renderResults);

    const text = document.createElement('span');
    text.textContent = game.name;

    label.appendChild(checkbox);
    label.appendChild(text);
    gameList.appendChild(label);
  });
}

function getSelectedGames() {
  return Array.from(gameList.querySelectorAll('input[type="checkbox"]:checked')).map(
    (checkbox) => checkbox.value
  );
}

function renderResults() {
  const selectedGames = getSelectedGames();
  const obtainable = getObtainablePokemon(selectedGames);

  resultsBody.innerHTML = '';

  if (!selectedGames.length) {
    resultsTable.hidden = true;
    summary.textContent = 'Choose one or more games to begin.';
    return;
  }

  if (!obtainable.length) {
    resultsTable.hidden = true;
    summary.textContent = 'No Pokémon match the selected games.';
    return;
  }

  summary.textContent = `You can obtain ${obtainable.length} Pokémon from your selected games.`;
  resultsTable.hidden = false;

  obtainable.forEach((pokemon) => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = pokemon.name;

    const locationCell = document.createElement('td');
    locationCell.innerHTML = pokemon.encounters
      .map((encounter) => `<strong>${encounter.game}</strong>: ${encounter.location}`)
      .join('<br />');

    row.appendChild(nameCell);
    row.appendChild(locationCell);
    resultsBody.appendChild(row);
  });
}

renderGameList();
renderResults();
