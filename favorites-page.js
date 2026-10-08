import { loadMovies, ratingLabel } from './data.js';
import { getFavorites, isFavorite, toggleFavorite } from './favorites.js';

const ITEM_H = 84;

const catalogEl = document.getElementById('catalog');
const countEl = document.getElementById('resultCount');
const modal = document.getElementById('rouletteModal');
const stage = document.getElementById('rouletteStage');
const track = document.getElementById('reelTrack');
const poolEl = document.getElementById('roulettePool');
const goMovie = document.getElementById('goMovie');

let movies = [];
let spinning = false;

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function favList() {
  const ids = new Set(getFavorites());
  return movies.filter((m) => ids.has(m.id));
}

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

function updatePoolHint() {
  const pool = favList();
  poolEl.textContent = pool.length
    ? `В избранном ${pool.length} — крутим только их`
    : 'Избранное пусто — добавь фильмы в каталоге';
}

function card(movie) {
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
    render();
    if (!modal.hidden) updatePoolHint();
  });

  return article;
}

function render() {
  const list = favList();
  countEl.textContent = list.length ? `${list.length} в избранном` : '';

  if (!list.length) {
    catalogEl.innerHTML = `
      <div class="empty empty--page">
        <p>Пока пусто.</p>
        <p>Отмечай фильмы в каталоге кнопкой «Хочу посмотреть».</p>
        <a class="btn btn--primary" href="index.html">В каталог</a>
      </div>
    `;
    return;
  }

  catalogEl.replaceChildren(...list.map((m) => card(m)));
}

function openModal() {
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
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
  const pool = favList();
  if (spinning) return;

  if (!pool.length) {
    stage.classList.add('is-idle');
    track.innerHTML = '<div class="reel__empty">Сначала добавь фильмы в избранное</div>';
    goMovie.hidden = true;
    return;
  }

  spinning = true;
  goMovie.hidden = true;
  stage.classList.remove('is-idle');

  const pick = pool[Math.floor(Math.random() * pool.length)];
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

try {
  movies = await loadMovies();
  render();
} catch (e) {
  catalogEl.textContent = 'Не удалось загрузить данные.';
  console.error(e);
}
