import { loadMovies, ratingLabel } from './data.js';
import { isFavorite, toggleFavorite } from './favorites.js';

const root = document.getElementById('movieRoot');
const id = Number(new URLSearchParams(location.search).get('id'));

try {
  const movies = await loadMovies();
  const movie = movies.find((m) => m.id === id);
  if (!movie) {
    root.innerHTML = `<p class="empty">Фильм не найден. <a href="index.html">В каталог</a></p>`;
  } else {
    document.title = `${movie.title} — Сегодня вечером`;
    const liked = isFavorite(movie.id);
    const cast = movie.cast
      .map((c) => `${c.name_ru || c.name_original}${c.role ? ` — ${c.role}` : ''}`)
      .join('<br />');

    root.innerHTML = `
      <article class="detail">
        <div class="detail__visual">
          <img class="detail__poster" src="${movie.poster}" alt="" />
        </div>
        <div class="detail__content">
          <p class="hero__role">${movie.year} · ${movie.runtime} мин · ${movie.countries.slice(0, 2).join(', ')}</p>
          <h1 class="detail__title">${movie.title}</h1>
          <p class="detail__original">${movie.original}</p>
          <div class="scores">
            <div><span>Кинопоиск</span><strong>${ratingLabel(movie.kp)}</strong></div>
            <div><span>IMDb</span><strong>${ratingLabel(movie.imdb)}</strong></div>
          </div>
          <p class="detail__lead">${movie.logline}</p>
          <div class="hero__actions">
            <button type="button" class="btn ${liked ? 'btn--primary' : 'btn--ghost'}" id="likeBtn">
              ${liked ? '♥ В избранном' : '♡ Хочу посмотреть'}
            </button>
            ${
              movie.trailer
                ? `<a class="btn btn--ghost" href="${movie.trailer}" target="_blank" rel="noreferrer">Трейлер</a>`
                : ''
            }
            <a class="btn btn--ghost" href="${movie.kpUrl}" target="_blank" rel="noreferrer">Кинопоиск</a>
          </div>
          <section class="block">
            <h2>Почему сегодня</h2>
            <p>${movie.moodText}</p>
          </section>
          <section class="block">
            <h2>О фильме</h2>
            <p>${movie.synopsis}</p>
          </section>
          <section class="block block--split">
            <div>
              <h2>Режиссёр</h2>
              <p>${movie.directors.join(', ') || '—'}</p>
            </div>
            <div>
              <h2>Жанры</h2>
              <p>${movie.genres.join(', ')}</p>
            </div>
          </section>
          <section class="block">
            <h2>В ролях</h2>
            <p class="cast">${cast || '—'}</p>
          </section>
        </div>
      </article>
    `;

    document.getElementById('likeBtn').addEventListener('click', (e) => {
      const next = toggleFavorite(movie.id);
      const on = next.includes(movie.id);
      e.currentTarget.textContent = on ? '♥ В избранном' : '♡ Хочу посмотреть';
      e.currentTarget.classList.toggle('btn--primary', on);
      e.currentTarget.classList.toggle('btn--ghost', !on);
    });
  }
} catch (e) {
  root.innerHTML = `<p class="empty">Ошибка загрузки.</p>`;
  console.error(e);
}
