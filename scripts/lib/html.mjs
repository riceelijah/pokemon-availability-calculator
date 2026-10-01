const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  eacute: 'é',
  Eacute: 'É',
  mdash: '—',
  ndash: '–',
  middot: '·',
  rsquo: '’',
  lsquo: '‘',
  hellip: '…',
  times: '×',
  laquo: '«',
  raquo: '»',
  male: '♂',
  female: '♀'
};

export function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name] ?? match);
}

export function stripTags(html) {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .replace(/ ([,.;:)])/g, '$1')
    .replace(/\( /g, '(')
    .trim();
}

// Returns the HTML between the element with `id` and the next element with any of `stopIds`.
export function sectionBetween(html, startMarker, stopMarkers) {
  const start = html.indexOf(startMarker);
  if (start === -1) {
    return '';
  }
  let end = html.length;
  for (const marker of stopMarkers) {
    const index = html.indexOf(marker, start + startMarker.length);
    if (index !== -1 && index < end) {
      end = index;
    }
  }
  return html.slice(start, end);
}

export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/♀/g, '-f')
    .replace(/♂/g, '-m')
    .replace(/['’.%:]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
