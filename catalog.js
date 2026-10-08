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
  wheelPool: [],
  wheelRotation: 0,
};

const catalogEl = document.getElementById('catalog');
const countEl = document.getElementById('resultCount');
const favCountEl = document.getElementById('favCount');
const toolbar = document.getElementById('toolbar');
const modal = document.getElementById('rouletteModal');
const disc = document.getElementById('wheelDisc');
const poolEl = document.getElementById('roulettePool');
const goMovie = document.getElementById('goMovie');
const wheelPoster = document.getElementById('wheelPoster');
const wheelTitle = document.getElementById('wheelTitle');
const wheelHint = document.getElementById('wheelHint');

let selects = {};
let spinning = false;

const SLICE_A = '#141414';
const SLICE_B = '#0a0a0a';
const SLICE_ACCENT = '#8b2a3a';

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
      ? `В избранном ${pool.length} — на колесе только они`
      : 'В избранном пусто — лайкни фильмы в каталоге';
  } else {
    poolEl.textContent = pool.length
      ? `На колесе ${pool.length} фильм(ов) по фильтрам`
      : 'По фильтрам ничего нет — смягчи условия';
  }
  paintWheel(pool);
}

function shortTitle(title) {
  return title.length > 18 ? `${title.slice(0, 17)}…` : title;
}

function paintWheel(pool) {
  state.wheelPool = pool;
  disc.innerHTML = '';
  disc.style.transition = 'none';
  disc.style.transform = `rotate(${state.wheelRotation}deg)`;

  if (!pool.length) {
    disc.style.background = '#111';
    wheelHint.hidden = false;
    wheelHint.textContent = 'Нечего крутить';
    wheelTitle.hidden = true;
    wheelPoster.hidden = true;
    return;
  }

  const n = pool.length;
  const step = 360 / n;
  const stops = pool
    .map((_, i) => {
      const color = n === 1 ? SLICE_ACCENT : i % 2 === 0 ? SLICE_A : SLICE_B;
      const edge =
        n > 1 ? `${SLICE_ACCENT} ${i * step}deg ${i * step + 0.55}deg, ` : '';
      return `${edge}${color} ${i * step}deg ${(i + 1) * step}deg`;
    })
    .join(', ');

  // 0deg = top; slices go clockwise
  disc.style.background = `conic-gradient(from 0deg, ${stops})`;

  pool.forEach((movie, i) => {
    const label = document.createElement('span');
    label.className = 'wheel__slice-label';
    label.textContent = shortTitle(movie.title);
    // CSS rotate 0 = right, so top is -90deg
    const mid = -90 + i * step + step / 2;
    label.style.transform = `rotate(${mid}deg)`;
    disc.append(label);
  });

  if (!state.lastPick) {
    wheelHint.hidden = false;
    wheelHint.textContent = 'Нажми «Крутить»';
    wheelTitle.hidden = true;
    wheelPoster.hidden = true;
  }
}

function showPick(movie) {
  wheelHint.hidden = true;
  wheelTitle.hidden = false;
  wheelTitle.textContent = movie.title;
  wheelPoster.hidden = false;
  wheelPoster.src = movie.poster;
  goMovie.hidden = false;
  goMovie.href = `movie.html?id=${movie.id}`;
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
    if (!modal.hidden) updatePoolHint();
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
      if (!modal.hidden) updatePoolHint();
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
      if (!modal.hidden) updatePoolHint();
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
      if (!modal.hidden) updatePoolHint();
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
      if (!modal.hidden) updatePoolHint();
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
    if (!modal.hidden) updatePoolHint();
  });

  toolbar.replaceChildren(
    selects.mood.el,
    selects.time.el,
    selects.genre.el,
    selects.country.el,
    reset,
  );
}

function openModal() {
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  state.lastPick = null;
  goMovie.hidden = true;
  state.wheelRotation = 0;
  updatePoolHint();
}

function closeModal() {
  if (spinning) return;
  modal.hidden = true;
  document.body.style.overflow = '';
}

function spin() {
  const pool = roulettePool();
  if (!pool.length || spinning) return;

  spinning = true;
  goMovie.hidden = true;
  wheelHint.hidden = false;
  wheelHint.textContent = '…';
  wheelTitle.hidden = true;
  wheelPoster.hidden = true;

  const pickIndex = Math.floor(Math.random() * pool.length);
  const pick = pool[pickIndex];
  state.lastPick = pick;

  const n = pool.length;
  const step = 360 / n;
  // Bring center of slice pickIndex to the top pointer.
  const targetMod = -((pickIndex * step + step / 2) % 360);
  const currentMod = ((state.wheelRotation % 360) + 360) % 360;
  const wantMod = ((targetMod % 360) + 360) % 360;
  let delta = wantMod - currentMod;
  if (delta <= 0) delta += 360;
  const turns = 5 + Math.floor(Math.random() * 2);
  const finalRotation = state.wheelRotation + turns * 360 + delta;

  requestAnimationFrame(() => {
    disc.style.transition = 'transform 4s cubic-bezier(0.12, 0.75, 0.08, 1)';
    disc.style.transform = `rotate(${finalRotation}deg)`;
    state.wheelRotation = finalRotation;
  });

  window.setTimeout(() => {
    spinning = false;
    showPick(pick);
  }, 4100);
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
    if (spinning) return;
    document.querySelectorAll('.segment__btn').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    state.rouletteSource = btn.dataset.source;
    state.lastPick = null;
    goMovie.hidden = true;
    state.wheelRotation = 0;
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
