import { loadMovies, filterMovies, MOOD_TAGS, TIME_TAGS, ratingLabel } from './data.js';
import { getFavorites, isFavorite, toggleFavorite } from './favorites.js';
import { createSelect } from './select.js';

const state = {
  mood: 'all',
  time: 'any',
  genre: 'all',
  country: 'all',
  movies: [],
  rouletteSource: 'filters',
  lastPick: null,
};

const catalogEl = document.getElementById('catalog');
const countEl = document.getElementById('resultCount');
const favCountEl = document.getElementById('favCount');
const toolbar = document.getElementById('toolbar');
const modal = document.getElementById('rouletteModal');
const stage = document.getElementById('rouletteStage');
const track = document.getElementById('reelTrack');
const poolEl = document.getElementById('roulettePool');
const goMovie = document.getElementById('goMovie');

let selects = {};
let spinning = false;

function syncFavCount() {
  favCountEl.textContent = String(getFavorites().length);
}

function filtered() {
  return filterMovies(state.movies, state);
}

function roulettePool() {
  if (state.rouletteSource === 'favorites') {
    const favs = new Set(getFavorites());
    return state.movies.filter((m) => favs.has(m.id));
  }
  return filtered();
}

function updatePoolHint() {
  const pool = roulettePool();
  if (state.rouletteSource === 'favorites') {
    poolEl.textContent = pool.length
      ? `В избранном ${pool.length} — крутим только их`
      : 'В избранном пусто — лайкни фильмы в каталоге';
  } else {
    poolEl.textContent = pool.length
      ? `По текущим фильтрам ${pool.length} фильм(ов)`
      : 'По фильтрам ничего нет — смягчи условия';
  }
}

function card(movie, index) {
  const article = document.createElement('article');
  article.className = 'work';
  article.style.animationDelay = `${0.05 + index * 0.04}s`;
  const liked = isFavorite(movie.id);

  article.innerHTML = `
    <a class="work__preview" href="movie.html?id=${movie.id}" aria-label="${movie.title}">
      <img src="${movie.poster}" alt="" loading="lazy" />
    </a>
    <div class="work__body">
      <div class="work__meta">
        <span>${movie.year} · ${movie.runtime} мин</span>
        <span class="badge">КП ${ratingLabel(movie.kp)}</span>
      </div>
      <h3 class="work__title">
        <a href="movie.html?id=${movie.id}">${movie.title}</a>
      </h3>
      <p class="work__subtitle">${movie.genres.slice(0, 3).join(' · ')}</p>
      <p class="work__desc">${movie.logline}</p>
      <div class="work__links">
        <a href="movie.html?id=${movie.id}">Открыть →</a>
        <button type="button" class="like ${liked ? 'is-on' : ''}" data-id="${movie.id}" aria-pressed="${liked}">
          ${liked ? '♥ В избранном' : '♡ Хочу посмотреть'}
        </button>
      </div>
    </div>
  `;

  article.querySelector('.like').addEventListener('click', (e) => {
    e.preventDefault();
    toggleFavorite(movie.id);
    syncFavCount();
    render();
    updatePoolHint();
  });

  return article;
}

function render() {
  const list = filtered();
  countEl.textContent =
    list.length === state.movies.length
      ? `${list.length} фильмов`
      : `${list.length} из ${state.movies.length}`;
  catalogEl.replaceChildren(...list.map((m, i) => card(m, i)));
  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Ничего не нашлось — сбрось фильтры или выбери другие.';
    catalogEl.append(empty);
  }
}

function buildToolbar() {
  const genres = [...new Set(state.movies.flatMap((m) => m.genres))].sort((a, b) =>
    a.localeCompare(b, 'ru'),
  );
  const countries = [...new Set(state.movies.flatMap((m) => m.countries))].sort((a, b) =>
    a.localeCompare(b, 'ru'),
  );

  selects.mood = createSelect({
    id: 'mood',
    label: 'Настроение',
    options: MOOD_TAGS,
    value: state.mood,
    onChange: (v) => {
      state.mood = v;
      render();
      updatePoolHint();
    },
  });
  selects.time = createSelect({
    id: 'time',
    label: 'Время',
    options: TIME_TAGS,
    value: state.time,
    onChange: (v) => {
      state.time = v;
      render();
      updatePoolHint();
    },
  });
  selects.genre = createSelect({
    id: 'genre',
    label: 'Жанр',
    options: [{ id: 'all', label: 'Все жанры' }, ...genres.map((g) => ({ id: g, label: g }))],
    value: state.genre,
    onChange: (v) => {
      state.genre = v;
      render();
      updatePoolHint();
    },
  });
  selects.country = createSelect({
    id: 'country',
    label: 'Страна',
    options: [{ id: 'all', label: 'Все страны' }, ...countries.map((c) => ({ id: c, label: c }))],
    value: state.country,
    onChange: (v) => {
      state.country = v;
      render();
      updatePoolHint();
    },
  });

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn btn--ghost';
  reset.textContent = 'Сбросить';
  reset.addEventListener('click', () => {
    state.mood = 'all';
    state.time = 'any';
    state.genre = 'all';
    state.country = 'all';
    selects.mood.setValue('all');
    selects.time.setValue('any');
    selects.genre.setValue('all');
    selects.country.setValue('all');
    render();
    updatePoolHint();
  });

  toolbar.replaceChildren(
    selects.mood.el,
    selects.time.el,
    selects.genre.el,
    selects.country.el,
    reset,
  );
}

function reelItem(movie, active = false) {
  return `
    <div class="reel__item${active ? ' is-active' : ''}" data-id="${movie.id}">
      <img src="${movie.poster}" alt="" />
      <div>
        <strong>${movie.title}</strong>
        <span>${movie.year} · ${movie.runtime} мин</span>
      </div>
    </div>
  `;
}

function openModal() {
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  updatePoolHint();
  track.innerHTML = '<div class="reel__empty">Нажми «Крутить»</div>';
  track.style.transform = 'translateY(0)';
  goMovie.hidden = true;
  state.lastPick = null;
}

function closeModal() {
  if (spinning) return;
  modal.hidden = true;
  document.body.style.overflow = '';
}

function spin() {
  const pool = roulettePool();
  if (!pool.length || spinning) {
    if (!pool.length) {
      track.innerHTML = `<div class="reel__empty">${
        state.rouletteSource === 'favorites'
          ? 'Сначала добавь фильмы в избранное'
          : 'По фильтрам пусто'
      }</div>`;
      goMovie.hidden = true;
    }
    return;
  }

  spinning = true;
  goMovie.hidden = true;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  state.lastPick = pick;

  const sequence = [];
  for (let i = 0; i < 18; i += 1) sequence.push(pool[i % pool.length]);
  sequence.push(pick);

  track.innerHTML = sequence.map((m, i) => reelItem(m, i === sequence.length - 1)).join('');
  track.style.transition = 'none';
  track.style.transform = 'translateY(0)';

  const itemHeight = 72 + 12;
  const target = sequence.length - 1;
  const offset = target * itemHeight;

  requestAnimationFrame(() => {
    track.style.transition = 'transform 2.4s cubic-bezier(0.12, 0.75, 0.12, 1)';
    track.style.transform = `translateY(-${offset}px)`;
  });

  window.setTimeout(() => {
    spinning = false;
    track.querySelectorAll('.reel__item').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.id === String(pick.id));
    });
    goMovie.hidden = false;
    goMovie.href = `movie.html?id=${pick.id}`;
  }, 2500);
}

document.getElementById('openRoulette').addEventListener('click', openModal);
document.getElementById('closeRoulette').addEventListener('click', closeModal);
document.getElementById('spinBtn').addEventListener('click', spin);
document.getElementById('openFavs').addEventListener('click', () => {
  const favs = new Set(getFavorites());
  if (!favs.size) {
    alert('Пока пусто — нажми «Хочу посмотреть» на карточках.');
    return;
  }
  state.mood = 'all';
  state.time = 'any';
  state.genre = 'all';
  state.country = 'all';
  selects.mood?.setValue('all');
  selects.time?.setValue('any');
  selects.genre?.setValue('all');
  selects.country?.setValue('all');
  const onlyFav = state.movies.filter((m) => favs.has(m.id));
  countEl.textContent = `Избранное: ${onlyFav.length}`;
  catalogEl.replaceChildren(...onlyFav.map((m, i) => card(m, i)));
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

document.querySelectorAll('.segment__btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.segment__btn').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    state.rouletteSource = btn.dataset.source;
    updatePoolHint();
  });
});

try {
  state.movies = await loadMovies();
  buildToolbar();
  syncFavCount();
  render();
} catch (e) {
  catalogEl.textContent = 'Не удалось загрузить данные.';
  console.error(e);
}
