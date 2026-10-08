const MOOD_TAGS = [
  { id: 'all', label: 'Любое' },
  { id: 'light', label: 'Лёгкое', match: /лёгк|иронич|любопыт|разговорн|комизм/i },
  { id: 'warm', label: 'Тёплое', match: /тёпл|нежн|ностальг|радост/i },
  { id: 'tense', label: 'Тревожное', match: /тревож|напряж|скорб|суров/i },
  { id: 'melancholy', label: 'Меланхолия', match: /меланхол|созерцат|усталост/i },
];

const TIME_TAGS = [
  { id: 'any', label: 'Любая длина', max: Infinity },
  { id: 'short', label: 'До 100 мин', max: 100 },
  { id: 'medium', label: 'До 130 мин', max: 130 },
];

export async function loadMovies() {
  const res = await fetch('movies.json');
  if (!res.ok) throw new Error('Не удалось загрузить movies.json');
  const data = await res.json();
  return data.movies.map(normalizeMovie);
}

function normalizeMovie(raw) {
  const id = raw.identification.kinopoisk_id;
  const moodText = raw.content?.mood || '';
  const moods = MOOD_TAGS.filter((m) => m.match && m.match.test(moodText)).map((m) => m.id);
  return {
    id,
    title: raw.identification.title_ru,
    original: raw.identification.title_original,
    year: raw.identification.year,
    genres: raw.details.genres || [],
    runtime: raw.details.runtime_minutes,
    countries: raw.details.countries || [],
    age: raw.details.age_ratings?.[0]?.rating || null,
    directors: (raw.creators?.directors || [])
      .map((d) => d.name_ru || d.name_original)
      .filter(Boolean),
    cast: (raw.cast || []).slice(0, 6),
    logline: raw.content?.logline || '',
    synopsis: raw.content?.synopsis || '',
    themes: raw.content?.themes || [],
    moodText,
    moods: moods.length ? moods : ['warm'],
    visual: raw.content?.visual_style || '',
    kp: raw.ratings?.kinopoisk?.value ?? null,
    imdb: raw.ratings?.imdb?.value ?? null,
    trailer: raw.links?.official_trailer || null,
    kpUrl: raw.identification.kinopoisk_url,
    poster: raw.poster?.path ? `${raw.poster.path}` : `posters/${id}.jpg`,
  };
}

export function filterMovies(movies, { mood, time, genre, country }) {
  const timeRule = TIME_TAGS.find((t) => t.id === time) || TIME_TAGS[0];
  return movies.filter((m) => {
    if (mood && mood !== 'all' && !m.moods.includes(mood)) return false;
    if (genre && genre !== 'all' && !m.genres.includes(genre)) return false;
    if (country && country !== 'all' && !m.countries.includes(country)) return false;
    if (m.runtime > timeRule.max) return false;
    return true;
  });
}

export function ratingLabel(value) {
  return value == null || value === '' ? '—' : String(value);
}

export { MOOD_TAGS, TIME_TAGS };
