import { loadMovies, ratingLabel } from './data.js';

const root = document.getElementById('movieRoot');
const params = new URLSearchParams(location.search);
const id = Number(params.get('id'));

function pickAnother(movies, currentId) {
  const others = movies.filter((m) => m.id !== currentId);
  if (!others.length) return null;
  return others[Math.floor(Math.random() * others.length)];
}

try {
  const movies = await loadMovies();
  const movie = movies.find((m) => m.id === id);
  if (!movie) {
    root.innerHTML = `<p class="empty">Фильм не найден. <a href="./index.html">Вернуться в каталог</a></p>`;
  } else {
    document.title = `${movie.title} — Сегодня вечером`;
    const other = pickAnother(movies, movie.id);
    const cast = movie.cast
      .map((c) => `${c.name_ru || c.name_original}${c.role ? ` — ${c.role}` : ''}`)
      .join('<br />');

    root.innerHTML = `
      <article class="detail">
        <div class="detail__visual">
          <img class="detail__poster" src="${movie.poster}" alt="Постер: ${movie.title}" />
        </div>
        <div class="detail__content">
          <p class="detail__eyebrow">${movie.year} · ${movie.runtime} мин · ${movie.countries.slice(0, 2).join(', ')}</p>
          <h1 class="detail__title">${movie.title}</h1>
          <p class="detail__original">${movie.original}</p>
          <div class="detail__scores">
            <div><span>Кинопоиск</span><strong>${ratingLabel(movie.kp)}</strong></div>
            <div><span>IMDb</span><strong>${ratingLabel(movie.imdb)}</strong></div>
          </div>
          <p class="detail__logline">${movie.logline}</p>
          <div class="detail__actions">
            ${
              movie.trailer
                ? `<a class="btn btn--primary" href="${movie.trailer}" target="_blank" rel="noreferrer">Трейлер</a>`
                : ''
            }
            <a class="btn btn--primary" href="${movie.kpUrl}" target="_blank" rel="noreferrer">Открыть на Кинопоиске</a>
            ${
              other
                ? `<a class="btn btn--ghost" href="./movie.html?id=${other.id}">Другой на вечер</a>`
                : ''
            }
            <a class="btn btn--ghost" href="./index.html">Назад к каталогу</a>
          </div>
          <section class="detail__block">
            <h2>Почему сегодня</h2>
            <p>${movie.moodText}</p>
          </section>
          <section class="detail__block">
            <h2>О фильме</h2>
            <p>${movie.synopsis}</p>
          </section>
          <section class="detail__block detail__grid">
            <div>
              <h2>Режиссёр</h2>
              <p>${movie.directors.join(', ') || '—'}</p>
            </div>
            <div>
              <h2>Жанры</h2>
              <p>${movie.genres.join(', ')}</p>
            </div>
          </section>
          <section class="detail__block">
            <h2>В ролях</h2>
            <p class="detail__cast">${cast || '—'}</p>
          </section>
          ${
            movie.visual
              ? `<section class="detail__block"><h2>Визуальный стиль</h2><p>${movie.visual}</p></section>`
              : ''
          }
        </div>
      </article>
    `;
  }
} catch (e) {
  root.innerHTML = `<p class="empty">Ошибка загрузки.</p>`;
  console.error(e);
}
