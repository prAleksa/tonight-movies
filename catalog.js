import { loadMovies, filterMovies, MOOD_TAGS, TIME_TAGS, ratingLabel } from './data.js';
import { getFavorites, isFavorite, toggleFavorite } from './favorites.js';
import { createSelect } from './select.js';

const ITEM_H = 84; // 72px row + 12px gap

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
const heroStack = document.getElementById('heroStack');

let selects = {};
let spinning = false;

function paintHeroStack(movies) {
  if (!heroStack || !movies.length) return;
  const picks = shuffle(movies).slice(0, 3);
  heroStack.innerHTML = picks
    .map(
      (m) => `
      <div class="hero__poster">
        <img src="${m.poster}" alt="" loading="eager" />
      </div>
    `,
    )
    .join('');
}

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
      ? `В барабане ${pool.length} фильм(ов) по фильтрам`
      : 'По фильтрам ничего нет — смягчи условия';
  }
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Build cycles of the unique pool so neighbours never repeat when pool > 1. */
function buildReelSequence(pool, pick, cycles = 4) {
  const seq = [];
  for (let c = 0; c < cycles; c += 1) {
    const round = shuffle(pool);
    if (seq.length && pool.length > 1 && round[0].id === seq.at(-1).id) {
      const swapAt = round.findIndex((m, idx) => idx > 0 && m.id !== seq.at(-1).id);
      if (swapAt > 0) [round[0], round[swapAt]] = [round[swapAt], round[0]];
    }
    seq.push(...round);
  }

  // Land on an occurrence of pick in the last cycle
  const start = seq.length - pool.length;
  let target = seq.findIndex((m, i) => i >= start && m.id === pick.id);
  if (target < 0) {
    if (seq.at(-1)?.id === pick.id && pool.length > 1) {
      const other = pool.find((m) => m.id !== pick.id);
      if (other) seq.push(other);
    }
    seq.push(pick);
    target = seq.length - 1;
  }
  return { seq, target };
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

function resetReel() {
  stage.classList.add('is-idle');
  track.innerHTML = '<div class="reel__empty">Нажми «Крутить»</div>';
  track.style.transition = 'none';
  track.style.transform = 'translateY(0)';
}

function card(movie, index) {
  const article = document.createElement('article');
  article.className = 'work';
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
  resetReel();
  updatePoolHint();
}

function closeModal() {
  if (spinning) return;
  modal.hidden = true;
  document.body.style.overflow = '';
}

function spin() {
  const pool = roulettePool();
  if (spinning) return;

  if (!pool.length) {
    stage.classList.add('is-idle');
    track.innerHTML = `<div class="reel__empty">${
      state.rouletteSource === 'favorites'
        ? 'Сначала добавь фильмы в избранное'
        : 'По фильтрам пусто'
    }</div>`;
    goMovie.hidden = true;
    return;
  }

  spinning = true;
  goMovie.hidden = true;
  stage.classList.remove('is-idle');

  const pick = pool[Math.floor(Math.random() * pool.length)];
  state.lastPick = pick;
  const { seq, target } = buildReelSequence(pool, pick, 4);

  track.innerHTML = seq.map((m, i) => reelItem(m, i === target)).join('');
  track.style.transition = 'none';
  track.style.transform = 'translateY(0)';

  const offset = target * ITEM_H;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      track.style.transition = 'transform 2.8s cubic-bezier(0.12, 0.75, 0.12, 1)';
      track.style.transform = `translateY(-${offset}px)`;
    });
  });

  window.setTimeout(() => {
    spinning = false;
    track.querySelectorAll('.reel__item').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.id === String(pick.id));
    });
    goMovie.hidden = false;
    goMovie.href = `movie.html?id=${pick.id}`;
  }, 2900);
}

document.getElementById('openRoulette').addEventListener('click', openModal);
document.getElementById('closeRoulette').addEventListener('click', closeModal);
document.getElementById('spinBtn').addEventListener('click', spin);

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
    resetReel();
    updatePoolHint();
  });
});

try {
  state.movies = await loadMovies();
  paintHeroStack(state.movies);
  buildToolbar();
  syncFavCount();
  render();
} catch (e) {
  catalogEl.textContent = 'Не удалось загрузить данные.';
  console.error(e);
}
