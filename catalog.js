import { loadMovies, filterMovies, MOOD_TAGS, TIME_TAGS, ratingLabel } from './data.js';
import { getFavorites, isFavorite, toggleFavorite } from './favorites.js';

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
const moodEl = document.getElementById('mood');
const timeEl = document.getElementById('time');
const genreEl = document.getElementById('genre');
const countryEl = document.getElementById('country');
const modal = document.getElementById('rouletteModal');
const stage = document.getElementById('rouletteStage');
const poolEl = document.getElementById('roulettePool');
const goMovie = document.getElementById('goMovie');

function fillSelect(el, options) {
  el.replaceChildren(
    ...options.map((o) => {
      const opt = document.createElement('option');
      opt.value = o.id ?? o;
      opt.textContent = o.label ?? o;
      return opt;
    }),
  );
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
    <a class="work__preview" href="./movie.html?id=${movie.id}" aria-label="${movie.title}">
      <img src="${movie.poster}" alt="" loading="lazy" />
    </a>
    <div class="work__body">
      <div class="work__meta">
        <span>${movie.year} · ${movie.runtime} мин</span>
        <span class="badge">КП ${ratingLabel(movie.kp)}</span>
      </div>
      <h3 class="work__title">
        <a href="./movie.html?id=${movie.id}">${movie.title}</a>
      </h3>
      <p class="work__subtitle">${movie.genres.slice(0, 3).join(' · ')}</p>
      <p class="work__desc">${movie.logline}</p>
      <div class="work__links">
        <a href="./movie.html?id=${movie.id}">Открыть →</a>
        <button type="button" class="like ${liked ? 'is-on' : ''}" data-id="${movie.id}" aria-pressed="${liked}" aria-label="В избранное">
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

function openModal() {
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  updatePoolHint();
  stage.innerHTML = '<p class="roulette-stage__hint">Нажми «Крутить»</p>';
  goMovie.hidden = true;
  state.lastPick = null;
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
}

function spin() {
  const pool = roulettePool();
  if (!pool.length) {
    stage.innerHTML = `<p class="roulette-stage__hint">${
      state.rouletteSource === 'favorites'
        ? 'Сначала добавь фильмы в избранное'
        : 'По фильтрам пусто'
    }</p>`;
    goMovie.hidden = true;
    return;
  }

  const frames = 14;
  let i = 0;
  stage.classList.add('is-spinning');
  const tick = () => {
    const temp = pool[i % pool.length];
    stage.innerHTML = `
      <img src="${temp.poster}" alt="" />
      <div>
        <p class="roulette-stage__label">Выпадает…</p>
        <p class="roulette-stage__title">${temp.title}</p>
      </div>
    `;
    i += 1;
    if (i < frames) {
      setTimeout(tick, 70 + i * 18);
    } else {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      state.lastPick = pick;
      stage.classList.remove('is-spinning');
      stage.innerHTML = `
        <img src="${pick.poster}" alt="" />
        <div>
          <p class="roulette-stage__label">Сегодня вечером</p>
          <p class="roulette-stage__title">${pick.title}</p>
          <p class="roulette-stage__meta">${pick.year} · ${pick.runtime} мин · ${pick.genres.slice(0, 2).join(', ')}</p>
        </div>
      `;
      goMovie.hidden = false;
      goMovie.href = `./movie.html?id=${pick.id}`;
    }
  };
  tick();
}

document.getElementById('resetFilters').addEventListener('click', () => {
  state.mood = 'all';
  state.time = 'any';
  state.genre = 'all';
  state.country = 'all';
  moodEl.value = 'all';
  timeEl.value = 'any';
  genreEl.value = 'all';
  countryEl.value = 'all';
  render();
  updatePoolHint();
});

moodEl.addEventListener('change', () => {
  state.mood = moodEl.value;
  render();
  updatePoolHint();
});
timeEl.addEventListener('change', () => {
  state.time = timeEl.value;
  render();
  updatePoolHint();
});
genreEl.addEventListener('change', () => {
  state.genre = genreEl.value;
  render();
  updatePoolHint();
});
countryEl.addEventListener('change', () => {
  state.country = countryEl.value;
  render();
  updatePoolHint();
});

document.getElementById('openRoulette').addEventListener('click', openModal);
document.getElementById('closeRoulette').addEventListener('click', closeModal);
document.getElementById('spinBtn').addEventListener('click', spin);
document.getElementById('openFavs').addEventListener('click', () => {
  const favs = new Set(getFavorites());
  if (!favs.size) {
    alert('Пока пусто — нажми «Хочу посмотреть» на карточках.');
    return;
  }
  state.genre = 'all';
  state.country = 'all';
  state.mood = 'all';
  state.time = 'any';
  moodEl.value = 'all';
  timeEl.value = 'any';
  genreEl.value = 'all';
  countryEl.value = 'all';
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
  fillSelect(moodEl, MOOD_TAGS);
  fillSelect(timeEl, TIME_TAGS);
  const genres = [...new Set(state.movies.flatMap((m) => m.genres))].sort((a, b) =>
    a.localeCompare(b, 'ru'),
  );
  const countries = [...new Set(state.movies.flatMap((m) => m.countries))].sort((a, b) =>
    a.localeCompare(b, 'ru'),
  );
  fillSelect(genreEl, [{ id: 'all', label: 'Все жанры' }, ...genres.map((g) => ({ id: g, label: g }))]);
  fillSelect(countryEl, [
    { id: 'all', label: 'Все страны' },
    ...countries.map((c) => ({ id: c, label: c })),
  ]);
  syncFavCount();
  render();
} catch (e) {
  catalogEl.textContent = 'Не удалось загрузить данные.';
  console.error(e);
}
