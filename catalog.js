import { loadMovies, filterMovies, MOOD_TAGS, TIME_TAGS, ratingLabel } from './data.js';

const state = {
  mood: 'all',
  time: 'any',
  genre: 'all',
  movies: [],
};

const catalogEl = document.getElementById('catalog');
const countEl = document.getElementById('resultCount');
const moodChips = document.getElementById('moodChips');
const timeChips = document.getElementById('timeChips');
const genreChips = document.getElementById('genreChips');

function chip(label, active, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `chip${active ? ' is-active' : ''}`;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function renderChips() {
  moodChips.replaceChildren(
    chip('Все', state.mood === 'all', () => {
      state.mood = 'all';
      render();
    }),
    ...MOOD_TAGS.map((m) =>
      chip(m.label, state.mood === m.id, () => {
        state.mood = m.id;
        render();
      }),
    ),
  );

  timeChips.replaceChildren(
    ...TIME_TAGS.map((t) =>
      chip(t.label, state.time === t.id, () => {
        state.time = t.id;
        render();
      }),
    ),
  );

  const genres = [...new Set(state.movies.flatMap((m) => m.genres))].sort((a, b) =>
    a.localeCompare(b, 'ru'),
  );
  genreChips.replaceChildren(
    chip('Все', state.genre === 'all', () => {
      state.genre = 'all';
      render();
    }),
    ...genres.map((g) =>
      chip(g, state.genre === g, () => {
        state.genre = g;
        render();
      }),
    ),
  );
}

function card(movie) {
  const a = document.createElement('a');
  a.className = 'card';
  a.href = `./movie.html?id=${movie.id}`;
  a.innerHTML = `
    <div class="card__poster">
      <img src="${movie.poster}" alt="Постер: ${movie.title}" loading="lazy" />
    </div>
    <div class="card__body">
      <div class="card__meta">
        <span>${movie.year}</span>
        <span>${movie.runtime} мин</span>
        <span>КП ${ratingLabel(movie.kp)}</span>
      </div>
      <h2 class="card__title">${movie.title}</h2>
      <p class="card__genres">${movie.genres.slice(0, 3).join(' · ')}</p>
      <p class="card__logline">${movie.logline}</p>
    </div>
  `;
  return a;
}

function render() {
  renderChips();
  const list = filterMovies(state.movies, state);
  countEl.textContent =
    list.length === state.movies.length
      ? `${list.length} фильмов в каталоге`
      : `Найдено ${list.length} из ${state.movies.length}`;
  catalogEl.replaceChildren(...list.map(card));
  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Ничего не подошло — смягчите фильтры или сбросьте их.';
    catalogEl.append(empty);
  }
}

document.getElementById('resetFilters').addEventListener('click', () => {
  state.mood = 'all';
  state.time = 'any';
  state.genre = 'all';
  render();
});

try {
  state.movies = await loadMovies();
  render();
} catch (e) {
  catalogEl.textContent = 'Не удалось загрузить данные.';
  console.error(e);
}
