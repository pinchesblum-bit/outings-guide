const DATA = window.OUTINGS_DATA;
const app = document.getElementById('app');

const byCategory = new Map(DATA.categories.map((cat) => [cat.id, cat]));
const byGroup = new Map((DATA.groups || []).map((group) => [group.id, group]));
const byListing = new Map(DATA.listings.map((listing) => [listing.id, listing]));
const savedKey = 'outings-guide-trip-list';
const defaultLimit = 18;

// Light colors echo each cover's scenery without competing with the listings.
const categoryPalettes = {
  'indoor-fun': ['#f7f2e3', '#f3d783', '#cce8e5'],
  'outdoor-fun': ['#edf3e5', '#c4dbb2', '#d0e7ee'],
  'water-fun': ['#eaf3f0', '#b7dcd9', '#dce8c7'],
  'zoos-aquariums': ['#f1f3e6', '#d5dfae', '#c1e0df'],
  'museums-history': ['#f6eee1', '#e5ceb0', '#eee1c9'],
  'parks-farms': ['#f0f2df', '#d5dfa6', '#f0d5ab'],
  malls: ['#f3f1e9', '#e1d6be', '#d9e6e2'],
  catskills: ['#eaf1e7', '#c6d9b8', '#c0dce2'],
  airports: ['#edf3f4', '#cddfe9', '#e3dfd4'],
  'niagara-falls': ['#e8f3ef', '#b7ded5', '#d5e5d2'],
  'newport-rhode-island': ['#f0f3ed', '#cbdfe4', '#e5d6bb'],
  poconos: ['#edf2e6', '#c9dbb7', '#d1e0d9'],
  'hudson-valley-catskills': ['#edf2e7', '#cbd9b9', '#cbdfe7'],
  'amish-town': ['#f3f3e3', '#d9e1ae', '#e9dbc4'],
  'washington-dc': ['#f1f3ed', '#dde4d0', '#d0e3ed'],
  'palm-springs': ['#f5eee3', '#e9d4b5', '#d4e4ea'],
  'tucson-arizona': ['#f5edde', '#e7c9a2', '#dce0ba'],
  'casa-grande': ['#f6ecdc', '#ebcda6', '#e4dbbd'],
  'myrtle-beach': ['#f4f2e6', '#f0ddb1', '#c6e4e4'],
  'west-palm': ['#eff4e9', '#d8e4b9', '#c9e4e6'],
  'north-miami': ['#ecf1e1', '#c4d6a2', '#d8e2bd'],
  'tampa-florida': ['#edf3ed', '#c7dfdc', '#e8d9b9'],
  'local-rentals': ['#f2f1e3', '#d5dfb8', '#e8d7bb'],
};

function categoryImage(cat) {
  return `category-images/${encodeURIComponent(cat.id)}-v3.webp`;
}

function applyCategoryTheme(cat) {
  document.body.classList.toggle('is-category', Boolean(cat));
  ['--category-base', '--category-tint', '--category-glow'].forEach((property, index) => {
    if (cat) document.body.style.setProperty(property, (categoryPalettes[cat.id] || categoryPalettes['outdoor-fun'])[index]);
    else document.body.style.removeProperty(property);
  });
}

const filterLabels = {
  q: 'Search',
  setting: 'Indoor/Outdoor',
  region: 'Area',
  distanceBand: 'How far',
  ageFit: 'Who is coming',
  priceLevel: 'Budget',
  vibes: 'Vibe',
  seasonWeather: 'Weather',
  practical: 'Practical',
};

const valueLabels = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  both: 'Indoor + outdoor',
  'under-30': 'Under 30 min',
  '30-60': '30-60 min',
  '1-2-hours': '1-2 hours',
  overnight: 'Overnight',
  toddlers: 'Toddlers',
  kids: 'Kids',
  teens: 'Teens',
  'all-ages': 'All ages',
  free: 'Free',
  '$': '$',
  '$$': '$$',
  '$$$': '$$$',
  thrill: 'Thrill',
  relaxing: 'Relaxing',
  educational: 'Educational',
  water: 'Water',
  animals: 'Animals',
  food: 'Food',
  'rainy-day': 'Rainy day',
  summer: 'Summer',
  winter: 'Winter',
  'year-round': 'Year-round',
  'stroller-friendly': 'Stroller friendly',
  'kosher-food-nearby': 'Kosher food nearby',
  'shabbos-friendly': 'Shabbos-friendly',
};

const moodTiles = [
  { title: 'Rainy Day', icon: 'Rain', params: { seasonWeather: 'rainy-day' } },
  { title: 'Burn Energy', icon: 'Move', params: { vibes: 'thrill' } },
  { title: 'Cool Off', icon: 'Water', params: { vibes: 'water' } },
  { title: 'Relaxing', icon: 'Calm', params: { vibes: 'relaxing' } },
  { title: 'Toddler-Friendly', icon: 'Little', params: { ageFit: 'toddlers' } },
  { title: 'Free/Cheap', icon: '$', params: { priceLevel: 'free', sort: 'free' } },
];

const quickChips = [
  ['setting', 'indoor', 'Indoor'],
  ['setting', 'outdoor', 'Outdoor'],
  ['priceLevel', 'free', 'Free'],
  ['distanceBand', 'under-30', 'Under 30 min'],
  ['ageFit', 'toddlers', 'Ages 0-5'],
  ['vibes', 'water', 'Water'],
];

function pageUrl(page) {
  return DATA.sourceBase.replace('{}', page);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function label(value) {
  return valueLabels[value] || String(value || '').replaceAll('-', ' ');
}

function textPreview(lines = [], max = 130) {
  const joined = lines.filter(Boolean).slice(0, 3).join(' · ');
  return joined.length > max ? joined.slice(0, max - 1) + '...' : joined;
}

function compactSummary(listing) {
  return listing.summary || textPreview(listing.details, 118) || 'Open details to check the booklet source page.';
}

function cleanFactLine(value = '') {
  return String(value)
    .replaceAll('·', ' ')
    .replace(/\s+/g, ' ')
    .replace(/,(\S)/g, ', $1')
    .replace(/([a-z])([A-Z]{2})(,?\s*\d{5})/g, '$1, $2 $3')
    .replace(/([A-Z]{2}),\s*(\d{5})/g, '$1 $2')
    .replace(/Startsat/gi, 'Starts at ')
    .replace(/Generaladmission/gi, 'General admission ')
    .replace(/childrenunder/gi, 'children under ')
    .trim();
}

function looksLikeAddress(value = '') {
  const text = cleanFactLine(value);
  if (!/\d/.test(text)) return false;
  if (/\d{3}[.\-\s]\d{3}[.\-\s]\d{4}/.test(text)) return false;
  return /\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|pike|parkway|place|plaza|way|ct|court|loop|hwy|highway|ny|nj|pa|ct|fl|az|ca|ri|dc)\b/i.test(text);
}

function extractAddress(listing) {
  const lines = [];
  for (const line of listing.details || []) {
    const text = cleanFactLine(line);
    if (!text || /^monsey:?$/i.test(text) || /^monroe:?$/i.test(text) || /\d{3}[.\-\s]\d{3}/.test(text) || /minute|hour|admission|starting|children|adult|senior|\$/i.test(text)) {
      break;
    }
    lines.push(text);
    if (/\b[A-Z]{2}\s*\d{5}\b/.test(text) || lines.length >= 2) break;
  }
  const address = cleanFactLine(lines.join(' '));
  return looksLikeAddress(address) ? address : '';
}

function mapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function extractPrice(listing) {
  const priceLines = (listing.details || [])
    .map(cleanFactLine)
    .filter((line) => /\$|free|admission|donation|starting/i.test(line))
    .slice(0, 2);
  if (priceLines.length) return priceLines.join(' ');
  if (listing.priceLevel && listing.priceLevel !== 'unknown') return label(listing.priceLevel);
  return 'Price not listed';
}

function extractTiming(listing) {
  const timingLines = (listing.details || [])
    .map(cleanFactLine)
    .filter((line) => /\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|am|pm|hours?|open|closed)\b/i.test(line))
    .filter((line) => !looksLikeAddress(line))
    .slice(0, 3);
  return timingLines.length ? timingLines.join(' ') : 'Timing not listed in booklet';
}

function getSavedIds() {
  const account = window.OutingsAccount?.status();
  return account?.user ? account.ids : [];
}

function isSaved(id) {
  return getSavedIds().includes(id);
}

function currentParams() {
  return new URLSearchParams(location.hash.split('?')[1] || '');
}

function paramsToObject(params) {
  return Object.fromEntries(params.entries());
}

function hashFor(route, values = {}) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value && value !== 'unknown') params.set(key, value);
  });
  const query = params.toString();
  return `${route}${query ? `?${query}` : ''}`;
}

function setHash(route, values = {}) {
  location.hash = hashFor(route, values);
}

function optionHtml(values, selected) {
  return values.map((value) => `<option value="${escapeHtml(value)}" ${selected === value ? 'selected' : ''}>${escapeHtml(label(value))}</option>`).join('');
}

function regionOptions() {
  return [...new Set(DATA.listings.map((item) => item.region).filter((value) => value && value !== 'Unknown'))].sort((a, b) => a.localeCompare(b));
}

function filterOptions(name) {
  if (name === 'region') return regionOptions();
  return DATA.filters[name] || [];
}

function savedCount() {
  return getSavedIds().length;
}

function activeFilterCount(params = currentParams()) {
  let count = 0;
  params.forEach((value, key) => {
    if (value && !['limit', 'sort', 'q'].includes(key)) count += 1;
  });
  return count;
}

function resultRoute(prefix, params, changes = {}) {
  const next = paramsToObject(params);
  delete next.limit;
  Object.entries(changes).forEach(([key, value]) => {
    if (value) next[key] = value;
    else delete next[key];
  });
  return hashFor(prefix, next);
}

function statsHtml() {
  return `
    <div class="stats" aria-label="Booklet totals">
      <div class="stat"><strong>${DATA.categories.length}</strong><span>categories</span></div>
      <div class="stat"><strong>${DATA.listings.length}</strong><span>places</span></div>
      <div class="stat"><strong>${DATA.pageCount}</strong><span>source pages</span></div>
      <div class="stat"><strong>${getSavedIds().length}</strong><span>saved</span></div>
    </div>`;
}

function renderHome() {
  app.innerHTML = `
    <section class="hero home-hero">
      <div class="hero-copy home-hero-copy">
        <h1>Outings <span>Guide</span></h1>
      </div>
    </section>
    <div class="home-content">
      <section class="section-head home-category-head">
        <h2>Browse outing ideas</h2>
        <a class="all-places-link" href="#/explore">View all <span aria-hidden="true">&rarr;</span></a>
      </section>
      <div class="category-strip home-categories">${DATA.categories.map(categoryCard).join('')}</div>
    </div>
  `;
  bindInteractiveControls();
}

function plannerBox() {
  return `
    <form class="find-box" id="homePlanner">
      <h2>Find my outing</h2>
      <label>Who's coming?
        <select name="ageFit">
          <option value="">Any ages</option>
          ${optionHtml(DATA.filters.ageFit || [], '')}
        </select>
      </label>
      <label>Indoor / Outdoor
        <select name="setting">
          <option value="">Either</option>
          ${optionHtml(DATA.filters.setting || [], '')}
        </select>
      </label>
      <label>How far?
        <select name="distanceBand">
          <option value="">Any distance</option>
          ${optionHtml(DATA.filters.distanceBand || [], '')}
        </select>
      </label>
      <label>Budget
        <select name="priceLevel">
          <option value="">Any budget</option>
          ${optionHtml(DATA.filters.priceLevel || [], '')}
        </select>
      </label>
      <div class="planner-actions">
        <button class="btn primary" type="submit">Show places</button>
        <button class="btn ghost" type="button" data-surprise="#/search">Surprise me</button>
      </div>
    </form>`;
}

function moodTile(tile) {
  return `
    <a class="mood-card" href="${escapeHtml(hashFor('#/search', tile.params))}">
      <span class="mood-icon">${escapeHtml(tile.icon)}</span>
      <strong>${escapeHtml(tile.title)}</strong>
    </a>`;
}

function groupCard(group) {
  const categories = DATA.categories.filter((cat) => cat.groupId === group.id);
  return `
    <a class="group-card" href="#/group/${encodeURIComponent(group.id)}">
      <div class="group-art" aria-hidden="true"><span>${escapeHtml(group.title.split(' ').map((word) => word[0]).join('').slice(0, 3))}</span></div>
      <div class="pills">
        <span class="pill teal">${group.count} places</span>
        <span class="pill">${categories.length} categories</span>
      </div>
      <h3>${escapeHtml(group.title)}</h3>
      <p>${escapeHtml(group.description)}</p>
      <span class="group-cats">${categories.map((cat) => escapeHtml(cat.title)).join(' · ')}</span>
    </a>`;
}

function categoryCard(cat) {
  return `
    <a class="category-card photo-category-card" href="#/category/${encodeURIComponent(cat.id)}">
      <img class="category-photo category-photo-${escapeHtml(cat.id)}" src="${categoryImage(cat)}" alt="" width="900" height="600" loading="lazy" decoding="async" />
      <div class="category-caption">
        <h3>${escapeHtml(cat.title)}</h3>
        <span class="category-place-count">${cat.count} places</span>
      </div>
    </a>`;
}

function categoryInitials(title) {
  return title.split(/[\s/&]+/).filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
}

function categoryBrowseSections(title = 'Browse all categories', intro = '') {
  return `
    <section class="section-head browse-head">
      <div>
        <p class="eyebrow">All categories</p>
        <h2>${escapeHtml(title)}</h2>
        ${intro ? `<p>${escapeHtml(intro)}</p>` : ''}
      </div>
    </section>
    <div class="category-groups">
      ${DATA.groups.map((group) => {
        const cats = DATA.categories.filter((cat) => cat.groupId === group.id);
        return `
          <section class="category-group">
            <div class="category-group-title">
              <h3>${escapeHtml(group.title)}</h3>
              <span>${group.count} places</span>
            </div>
            <div class="category-strip compact-categories">${cats.map(categoryCard).join('')}</div>
          </section>`;
      }).join('')}
    </div>`;
}

function categoryReport() {
  return `
    <section class="bottom-report">
      <div class="section-head">
        <div>
          <p class="eyebrow">Report</p>
          <h2>How many places are in each category</h2>
        </div>
      </div>
      <div class="report-list">
        ${DATA.categories.map((cat) => `
          <div class="report-row">
            <span>${escapeHtml(cat.title)}</span>
            <strong>${cat.count}</strong>
          </div>`).join('')}
      </div>
      <p class="source-note">Details come from the booklet. Always confirm hours and prices before you go.</p>
    </section>`;
}

function outingCard(listing) {
  const saved = isSaved(listing.id);
  const tags = (listing.tags || []).slice(0, 3);
  const address = extractAddress(listing);
  const price = extractPrice(listing);
  return `
    <article class="outing-card">
      <button class="save-btn ${saved ? 'saved' : ''}" type="button" data-save-id="${escapeHtml(listing.id)}" aria-pressed="${saved ? 'true' : 'false'}" aria-label="${saved ? 'Remove from saved' : 'Save'} ${escapeHtml(listing.name)}">${saved ? 'Saved' : 'Save'}</button>
      <div class="card-topline">
        <span>${escapeHtml(listing.categoryTitle)}</span>
        <button class="page-badge" type="button" data-page-modal="${listing.page}">Booklet p. ${listing.page}</button>
      </div>
      <h3>${escapeHtml(listing.name)}</h3>
      <p>${address ? `<a class="outing-address" href="${escapeHtml(mapsUrl(address))}" data-map-address="${escapeHtml(address)}" aria-haspopup="dialog">${escapeHtml(address)}</a>` : escapeHtml(compactSummary(listing))}</p>
      <div class="pills card-tags">
        ${tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <div class="card-facts">
        <span>${escapeHtml(listing.region || 'Area unknown')}</span>
        <span>${escapeHtml(price)}</span>
      </div>
      <div class="card-actions">
        <a class="details-link" href="#/listing/${encodeURIComponent(listing.id)}">Details</a>
        ${address ? `<a class="details-link map-link" href="${escapeHtml(mapsUrl(address))}" data-map-address="${escapeHtml(address)}" aria-haspopup="dialog">Map</a>` : ''}
      </div>
    </article>`;
}

function miniResult(listing) {
  const address = extractAddress(listing);
  const price = extractPrice(listing);
  const saved = isSaved(listing.id);
  return `
    <article class="mini-result">
      <div>
        <div class="mini-topline">
          <span>${escapeHtml(listing.categoryTitle)}</span>
          <button class="page-badge" type="button" data-page-modal="${listing.page}">Booklet p. ${listing.page}</button>
        </div>
        <h3>${escapeHtml(listing.name)}</h3>
        <p>${escapeHtml(compactSummary(listing))}</p>
        <div class="mini-facts">
          ${address ? `<a href="${escapeHtml(mapsUrl(address))}" data-map-address="${escapeHtml(address)}" aria-haspopup="dialog">${escapeHtml(address)}</a>` : '<span>Address not listed</span>'}
          <span>${escapeHtml(price)}</span>
        </div>
      </div>
      <div class="mini-actions">
        <button class="save-btn inline ${saved ? 'saved' : ''}" type="button" data-save-id="${escapeHtml(listing.id)}">${saved ? 'Saved' : 'Save'}</button>
        <a class="details-link" href="#/listing/${encodeURIComponent(listing.id)}">Details</a>
      </div>
    </article>`;
}

function filterBar(route, params, resultCount, expanded = false) {
  const count = activeFilterCount(params);
  return `
    <section class="filter-shell results-tools ${expanded ? 'filter-page sheet-open' : ''}" aria-label="Outing filters">
      <form class="result-search" id="filterSearchForm" data-route="${escapeHtml(route)}">
        <label class="search-field">Search
          <input name="q" value="${escapeHtml(params.get('q') || '')}" placeholder="Search name, town, category, tag..." />
        </label>
        <button class="btn ghost filter-toggle" type="button" data-open-filters>Filters${count ? ` (${count})` : ''}</button>
        <label>Sort
          <select name="sort">
            <option value="top" ${params.get('sort') === 'top' || !params.get('sort') ? 'selected' : ''}>${normalize(params.get('q') || '') ? 'Best matches' : 'Top picks'}</option>
            <option value="free" ${params.get('sort') === 'free' ? 'selected' : ''}>Free first</option>
            <option value="az" ${params.get('sort') === 'az' ? 'selected' : ''}>A-Z</option>
          </select>
        </label>
      </form>
      ${quickChipRow(route, params)}
      ${activeFilterChips(route, params)}
      <form class="filter-panel filter-sheet ${expanded ? 'open' : ''}" id="filterForm" data-route="${escapeHtml(route)}">
        <div class="sheet-head">
          <div>
            <p class="eyebrow">Filters</p>
            <h2>${resultCount} places</h2>
          </div>
          <button class="sheet-close" type="button" data-close-filters>Close</button>
        </div>
        ${filterSelect('setting', params)}
        ${filterSelect('region', params)}
        ${filterSelect('distanceBand', params)}
        ${filterSelect('ageFit', params)}
        ${filterSelect('priceLevel', params)}
        ${filterSelect('vibes', params)}
        ${filterSelect('seasonWeather', params)}
        ${filterSelect('practical', params)}
        <div class="sheet-footer">
          <a class="btn ghost" href="${escapeHtml(route)}">Clear all</a>
          <button class="btn primary" type="submit">Show ${resultCount} places</button>
        </div>
      </form>
    </section>`;
}

function filterSelect(name, params) {
  return `
    <label>${escapeHtml(filterLabels[name])}
      <select name="${escapeHtml(name)}">
        <option value="">Any</option>
        ${optionHtml(filterOptions(name), params.get(name) || '')}
      </select>
    </label>`;
}

function quickChipRow(route, params) {
  return `
    <div class="quick-chip-row" aria-label="Quick filters">
      ${quickChips.map(([key, value, text]) => {
        const active = params.get(key) === value;
        const next = new URLSearchParams(params);
        if (active) next.delete(key);
        else next.set(key, value);
        next.delete('limit');
        return `<a class="quick-chip ${active ? 'active' : ''}" href="${escapeHtml(hashFor(route, paramsToObject(next)))}">${escapeHtml(text)}</a>`;
      }).join('')}
    </div>`;
}

function activeFilterChips(route, params) {
  const chips = [];
  params.forEach((value, key) => {
    if (!value || key === 'limit' || key === 'sort') return;
    const next = new URLSearchParams(params);
    next.delete(key);
    chips.push(`<a class="active-chip" href="${escapeHtml(hashFor(route, paramsToObject(next)))}">${escapeHtml(filterLabels[key] || key)}: ${escapeHtml(label(value))} x</a>`);
  });
  if (!chips.length) return '';
  return `<div class="active-filters">${chips.join('')}</div>`;
}

function renderGroup(id) {
  const group = byGroup.get(id);
  if (!group) return renderNotFound();
  const cats = DATA.categories.filter((cat) => cat.groupId === id);
  const listings = DATA.listings.filter((item) => item.groupId === id);
  const route = `#/group/${encodeURIComponent(id)}`;
  renderResultsPage({
    route,
    title: group.title,
    intro: group.description,
    listings,
    beforeResults: `<div class="category-strip">${cats.map(categoryCard).join('')}</div>`,
  });
}

function renderCategory(id) {
  const cat = byCategory.get(id);
  if (!cat) return renderNotFound();
  const listings = DATA.listings.filter((item) => item.categoryId === id);
  const route = `#/category/${encodeURIComponent(id)}`;
  const topPicks = topListings(listings).slice(0, 3);
  renderResultsPage({
    route,
    title: cat.title,
    category: cat,
    intro: cat.description,
    meta: `${cat.count} places · Pages ${cat.pageRange} · ${cat.groupTitle}`,
    listings,
    beforeResults: `
      <section class="section-head small-head"><div><h2>Top picks in this category</h2></div></section>
      <div class="outing-grid compact">${topPicks.map(outingCard).join('')}</div>
    `,
    afterResults: nearbyCategories(cat),
  });
}

function compactResults(route, params, filtered, emptyMessage = 'No matches. Try removing a filter.') {
  const limit = Number(params.get('limit') || defaultLimit);
  const visible = filtered.slice(0, limit);
  return `
    <section class="section-head">
      <div>
        <h2>Results</h2>
        <p>Showing ${visible.length} of ${filtered.length}</p>
      </div>
    </section>
    <div class="outing-grid results-grid">${visible.length ? visible.map(outingCard).join('') : emptyResults(route, emptyMessage)}</div>
    ${filtered.length > visible.length ? `<div class="show-more-wrap"><a class="btn primary" href="${escapeHtml(resultRoute(route, params, { limit: String(limit + defaultLimit) }))}">Show more</a></div>` : ''}`;
}

function hasRealFilters(params) {
  return [...params.entries()].some(([key, value]) => value && !['limit', 'sort'].includes(key));
}

function renderSearch(openFilters = false, mode = 'search') {
  if (mode === 'search') return renderSimpleSearch();
  const params = currentParams();
  const route = '#/explore';
  const query = normalize(params.get('q') || '');
  const filtered = sortListings(applyFilters(DATA.listings, params), params.get('sort') || 'top', query);
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Home</a><span>/</span><span>Explore</span></div>
    <section class="page-hero">
      <div>
        <p class="eyebrow">Explore</p>
        <h1>Explore places</h1>
        <p>Browse all ${DATA.listings.length} places. Choose filters to find the outings that fit your day.</p>
      </div>
    </section>
    ${filterBar(route, params, filtered.length, openFilters)}
    ${compactResults(route, params, filtered)}
  `;
  bindInteractiveControls();
  bindFilters();
}

function searchPage(matches, requestedPage) {
  const totalPages = Math.max(1, Math.ceil(matches.length / defaultLimit));
  const number = Number(requestedPage);
  const page = Math.min(totalPages, Math.max(1, Number.isFinite(number) ? Math.floor(number) : 1));
  const start = (page - 1) * defaultLimit;
  return { page, totalPages, start, visible: matches.slice(start, start + defaultLimit) };
}

function searchPagination(query, page, totalPages) {
  const link = (number, text, extra = '') => `<a href="${escapeHtml(hashFor('#/search', { q: query, page: String(number) }))}" ${extra}>${text}</a>`;
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter(number => number >= 1 && number <= totalPages).sort((a, b) => a - b);
  let previous = 0;
  const numbers = pages.map(number => {
    const gap = previous && number - previous > 1 ? '<span class="page-gap" aria-hidden="true">…</span>' : '';
    previous = number;
    return gap + link(number, number, `class="page-number${Math.abs(number - page) > 1 ? ' page-distant' : ''}" aria-label="Page ${number}"${number === page ? ' aria-current="page"' : ''}`);
  }).join('');
  const direction = (number, name, enabled) => {
    const icon = `<svg class="page-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${name === 'Previous' ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'}"/></svg>`;
    const content = `${icon}<span class="page-direction-label">${name}</span>`;
    return enabled ? link(number, content, `class="page-direction" rel="${name === 'Previous' ? 'prev' : 'next'}" aria-label="${name} page"`)
      : `<span class="page-direction" aria-disabled="true" aria-label="${name} page">${content}</span>`;
  };
  return `<nav class="search-pagination" aria-label="Search result pages">
    <div class="page-controls">
      ${direction(page - 1, 'Previous', page > 1)}
      <div class="page-numbers">${numbers}</div>
      ${direction(page + 1, 'Next', page < totalPages)}
    </div>
    <p class="page-count"><span class="page-count-full">Page ${page} of ${totalPages}</span><span class="page-count-short" aria-hidden="true">${page} / ${totalPages}</span></p>
  </nav>`;
}

function renderSimpleSearch() {
  const params = currentParams();
  const rawQuery = params.get('q') || '';
  const query = rawQuery.trim();
  const searchParams = new URLSearchParams({ q: query });
  const matches = normalize(query) ? sortListings(applyFilters(DATA.listings, searchParams), 'top', query) : [];
  const { page, totalPages, start, visible } = searchPage(matches, params.get('page'));
  app.innerHTML = `
    <section class="search-start simple-search">
      <h1>Search places</h1>
      <form class="result-search" id="filterSearchForm" data-route="#/search" role="search">
        <label class="search-field"><span class="search-input-label">Place, activity or town</span>
          <input type="search" name="q" value="${escapeHtml(rawQuery)}" placeholder="Zoo, boating, a town…" autocomplete="off" enterkeyhint="search" aria-label="Search places, activities or towns" />
        </label>
        <button class="btn primary" type="submit">Search</button>
      </form>
    </section>
    ${normalize(query) ? `<section class="simple-search-results" aria-label="Search results">
      <p class="search-result-count" role="status">${matches.length} ${matches.length === 1 ? 'place' : 'places'} found for “${escapeHtml(query)}”${matches.length ? ` · Showing ${start + 1}–${start + visible.length}` : ''}</p>
      ${visible.length ? `<div class="outing-grid results-grid">${visible.map(outingCard).join('')}</div>` : '<div class="empty"><h2>No places found</h2><p>Try a different place, activity or town.</p></div>'}
      ${matches.length ? searchPagination(query, page, totalPages) : ''}
    </section>` : ''}`;
  bindInteractiveControls();
  const form = document.getElementById('filterSearchForm');
  const input = form.querySelector('input[name="q"]');
  // Keep the input and keyboard untouched while typing. Search only on submit.
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.isConnected) return;
    const next = hashFor('#/search', { q: input.value.trim() });
    input.blur();
    if (location.hash !== next) history.pushState(null, '', next);
    router();
  });
}

function renderFilter() {
  renderSearch(true, 'explore');
}

function renderAll() {
  renderSearch(false, 'explore');
}

function renderPlan() {
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Home</a><span>/</span><span>Plan a Day</span></div>
    <section class="page-hero plan-page">
      <div>
        <p class="eyebrow">Plan a Day</p>
        <h1>Choose what fits today</h1>
        <p>Use the quick pickers to make a short list, then save the places you like.</p>
      </div>
      ${plannerBox()}
    </section>
    <section class="section-head"><div><h2>Popular ways to start</h2></div></section>
    <div class="mood-grid">${moodTiles.map((tile) => moodTile(tile)).join('')}</div>
  `;
  bindHomePlanner();
  bindInteractiveControls();
}

function renderBrowse() {
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Home</a><span>/</span><span>Browse</span></div>
    <section class="page-hero">
      <div>
        <p class="eyebrow">Browse</p>
        <h1>Browse by trip type</h1>
        <p>Choose a larger group first, or scroll down to all original booklet categories.</p>
      </div>
    </section>
    <div class="group-grid">${DATA.groups.map(groupCard).join('')}</div>
    ${categoryBrowseSections('All categories', 'Compact tiles, still in the original booklet order inside each group.')}
  `;
  bindInteractiveControls();
}

function renderResultsPage({ route, title, intro, meta = '', listings, beforeResults = '', afterResults = '', category = null }) {
  const params = currentParams();
  const filtered = sortListings(applyFilters(listings, params), params.get('sort') || 'top', params.get('q') || '');
  const limit = Number(params.get('limit') || defaultLimit);
  const visible = filtered.slice(0, limit);
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Home</a><span>/</span><span>${escapeHtml(title)}</span></div>
    <section class="page-hero${category ? ' category-hero' : ''}">
      ${category ? `<img class="category-hero-image" src="${categoryImage(category)}" alt="" width="900" height="600" fetchpriority="high" />` : ''}
      <div class="page-hero-copy">
        <p class="eyebrow">${escapeHtml(meta || 'Outings Guide')}</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(intro)}</p>
      </div>
    </section>
    ${filterBar(route, params, filtered.length)}
    ${beforeResults}
    <section class="section-head">
      <div>
        <h2>Results</h2>
        <p>Showing ${visible.length} of ${filtered.length}. Open details to check the booklet source page.</p>
      </div>
      <button class="btn ghost" data-surprise="${escapeHtml(route)}">Surprise me</button>
    </section>
    <div class="outing-grid">${visible.length ? visible.map(outingCard).join('') : emptyHtml('No outings match these filters yet.')}</div>
    ${filtered.length > visible.length ? `<div class="show-more-wrap"><a class="btn primary" href="${escapeHtml(resultRoute(route, params, { limit: String(limit + defaultLimit) }))}">Show more</a></div>` : ''}
    ${afterResults}
  `;
  bindFilters();
  bindInteractiveControls();
}

function nearbyCategories(cat) {
  const nearby = DATA.categories.filter((item) => item.groupId === cat.groupId && item.id !== cat.id).slice(0, 6);
  if (!nearby.length) return '';
  return `
    <section class="section-head"><div><h2>Nearby categories</h2></div></section>
    <div class="category-strip">${nearby.map(categoryCard).join('')}</div>`;
}

function searchWords(value) {
  return normalize(value).split(' ').filter(Boolean).map((word) =>
    word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word);
}

// Activity aliases supplement sparse booklet records, without treating every
// venue in a mixed category as the same activity. Sources: SEARCH-NOTES.md.
const activitySearchCache = new WeakMap();
function activitySearchText(item) {
  if (activitySearchCache.has(item)) return activitySearchCache.get(item);
  const name = normalize(item.name);
  const descriptiveLines = (item.details || []).filter(line => !looksLikeAddress(line));
  const description = normalize([item.summary || '', ...descriptiveLines].join(' '));
  const evidence = `${name} ${description}`;
  const aliases = [];
  const indoorCategory = item.categoryId === 'indoor-fun';
  const knownPlayPark = /^(billy beez|sky ?zone|bounce u|catch air playground|kids empire|pump it up|thrillz|space club)$/.test(name);
  const playType = /\b(playground|playcenter|playland|playspace|playhouse|trampoline|ninja park|adventure park)\b/.test(evidence);
  const indoorPlayPark = knownPlayPark || (indoorCategory && playType) || /\bindoor (playground|play park|play center|play area|water park)\b/.test(evidence);
  if (indoorPlayPark) aliases.push('indoor park playground play center play area');
  if (/^sky ?zone$/.test(name) || /\btrampoline/.test(evidence)) aliases.push('trampoline jumping jump park');
  if (/^(bounce u|pump it up)$/.test(name) || /\binflatable/.test(evidence)) aliases.push('inflatable bounce house bouncy castle');
  if (/\b(kayak|canoe|rowboat|paddle ?boat|boat rental)/.test(evidence)) aliases.push('boating boat');
  if (/\b(rock climb|climbing gym)/.test(evidence)) aliases.push('climbing rock climb');
  if (/\bwater ?park/.test(evidence)) aliases.push('water park waterslide');
  const setting = indoorPlayPark ? 'indoor' : item.setting;
  const text = [setting, ...aliases, ...(item.searchTerms || []), ...(item.tags || []), ...(item.vibes || [])].map(label).join(' ');
  activitySearchCache.set(item, text);
  return text;
}

function searchRelevance(item, query) {
  const terms = searchWords(query);
  if (!terms.length) return 0;
  const matches = (value) => {
    const words = searchWords(value);
    return terms.every((term) => words.some((word) => word.startsWith(term)));
  };
  const name = normalize(item.name);
  const phrase = normalize(query);
  if (matches(name)) {
    if (name === phrase) return 1000;
    if (name.startsWith(phrase)) return 900;
    return 800;
  }
  const activities = activitySearchText(item);
  // A street containing ‘Park’ does not make an indoor business a play park.
  if (terms.includes('indoor') && terms.includes('park') && !normalize(activities).includes('indoor park')) return 0;
  const location = [extractAddress(item), item.region].filter(Boolean).join(' ');
  if (matches(`${name} ${location}`)) return 600;
  if (matches(`${name} ${activities} ${location}`)) return 400;
  // A full category name is useful; one word from a mixed category is too broad.
  const categoryWords = searchWords(item.categoryTitle);
  if (terms.length === categoryWords.length && categoryWords.every((word) => terms.includes(word))) return 300;
  return 0;
}

function applyFilters(listings, params) {
  const q = normalize(params.get('q') || '');
  return listings.filter((item) => {
    if (q && searchRelevance(item, q) === 0) return false;
    return ['setting', 'region', 'distanceBand', 'priceLevel'].every((field) => {
      const value = params.get(field);
      return !value || item[field] === value;
    }) && ['ageFit', 'vibes', 'seasonWeather', 'practical'].every((field) => {
      const value = params.get(field);
      return !value || (item[field] || []).includes(value);
    });
  });
}

function topListings(listings) {
  return sortListings(listings.filter((item) => !item.info), 'top');
}

function sortListings(listings, sort, query = '') {
  const distanceRank = { 'under-30': 0, '30-60': 1, '1-2-hours': 2, overnight: 3, unknown: 4 };
  const priceRank = { free: 0, '$': 1, '$$': 2, '$$$': 3, unknown: 4 };
  const scored = [...listings];
  if (sort === 'az') return scored.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'closest') return scored.sort((a, b) => (distanceRank[a.distanceBand] ?? 9) - (distanceRank[b.distanceBand] ?? 9) || a.name.localeCompare(b.name));
  if (sort === 'free') return scored.sort((a, b) => (priceRank[a.priceLevel] ?? 9) - (priceRank[b.priceLevel] ?? 9) || a.name.localeCompare(b.name));
  if (normalize(query)) return scored.sort((a, b) => searchRelevance(b, query) - searchRelevance(a, query) || a.name.localeCompare(b.name));
  return scored.sort((a, b) => listingScore(b) - listingScore(a) || a.name.localeCompare(b.name));
}

function listingScore(item) {
  let score = 0;
  if (!item.info) score += 10;
  if (item.summary) score += 6;
  if (item.priceLevel && item.priceLevel !== 'unknown') score += 5;
  if (item.region && item.region !== 'Unknown') score += 4;
  if (item.setting && item.setting !== 'unknown') score += 3;
  if ((item.vibes || [])[0] !== 'unknown') score += 3;
  if ((item.tags || []).length >= 3) score += 3;
  score += Math.min((item.details || []).length, 8);
  return score;
}

function renderListing(id) {
  const listing = byListing.get(id);
  if (!listing) return renderNotFound();
  const similar = topListings(DATA.listings.filter((item) => item.id !== listing.id && (item.categoryId === listing.categoryId || item.groupId === listing.groupId || intersects(item.vibes, listing.vibes)))).slice(0, 4);
  const address = extractAddress(listing);
  const price = extractPrice(listing);
  const facts = [
    ['Address', address ? `<a href="${escapeHtml(mapsUrl(address))}" data-map-address="${escapeHtml(address)}" aria-haspopup="dialog">${escapeHtml(address)}</a>` : 'Address not listed', true],
    ['Booklet price', price],
    ['Ages', (listing.ageFit || []).filter((value) => value !== 'unknown').map(label).join(', ') || 'Unknown'],
    ['Setting', label(listing.setting || 'unknown')],
    ['Distance', label(listing.distanceBand || 'unknown')],
  ];
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Home</a><span>/</span><a href="#/category/${encodeURIComponent(listing.categoryId)}">${escapeHtml(listing.categoryTitle)}</a><span>/</span><span>${escapeHtml(listing.name)}</span></div>
    <article class="detail-card">
      <div class="detail-visual" aria-hidden="true"></div>
      <div class="detail-main">
        <div class="pills">${(listing.tags || []).slice(0, 5).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join('')}<span class="pill teal">Booklet p. ${listing.page}</span></div>
        <h1>${escapeHtml(listing.name)}</h1>
        <div class="detail-buttons">
          <button class="btn primary" type="button" data-save-id="${escapeHtml(listing.id)}">${isSaved(listing.id) ? 'Saved to trip list' : 'Save to trip list'}</button>
          <button class="btn ghost" type="button" data-share-listing="${escapeHtml(listing.id)}">Share</button>
        </div>
      </div>
    </article>
    <section class="quick-facts">
      ${facts.map(([name, value, isHtml]) => `<div><strong>${escapeHtml(name)}</strong><span>${isHtml ? value : escapeHtml(value)}</span></div>`).join('')}
    </section>
    <div class="detail-layout">
      <section class="panel">
        <h2>Booklet details</h2>
        ${listing.details?.length ? `<ul class="detail-list">${listing.details.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : '<p class="empty">No separate English detail lines were extracted for this entry.</p>'}
        ${address ? `<a class="btn primary direction-btn" href="${escapeHtml(mapsUrl(address))}" data-map-address="${escapeHtml(address)}" aria-haspopup="dialog">Map / Directions</a>` : ''}
      </section>
      <details class="panel source-box">
        <summary>From the ${escapeHtml(DATA.sourceTitle)} booklet, p. ${listing.page}</summary>
        <p>Last verified: ${escapeHtml(listing.lastVerified || 'booklet year')}.</p>
        <button class="btn ghost" type="button" data-page-modal="${listing.page}">View page</button>
        <a class="btn ghost" href="${escapeHtml(listing.sourceUrl)}" target="_blank" rel="noopener">Open source file</a>
      </details>
    </div>
    ${similar.length ? `<section class="section-head"><div><h2>You might also like</h2></div></section><div class="outing-grid compact">${similar.map(outingCard).join('')}</div>` : ''}
  `;
  bindInteractiveControls();
}

function intersects(a = [], b = []) {
  return a.some((value) => b.includes(value) && value !== 'unknown');
}

function renderAccount() {
  if (window.OutingsAccount) return window.OutingsAccount.render();
  app.innerHTML = `
    <section class="account-panel" aria-labelledby="account-title">
      <div class="account-emblem" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg></div>
      <h1 id="account-title">Sign in to My Trips</h1>
      <p role="status">Loading sign-in options…</p>
      <p>Your saved places will be available after you sign in.</p>
      <a class="btn ghost" href="#/">Keep exploring</a>
    </section>
  `;
}

function renderSaved() {
  const account = window.OutingsAccount?.status();
  if (!account?.user || !account.ready) return renderAccount();
  const ids = getSavedIds();
  const listings = ids.map((id) => byListing.get(id)).filter(Boolean);
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Home</a><span>/</span><span>My Trip List</span></div>
    <section class="page-hero saved-hero">
      <div>
        <p class="eyebrow">Saved outings</p>
        <h1>My Trip List</h1>
        <p>Save outings while browsing, then print or share this list when you are ready to plan the day.</p>
        <p class="saved-account-note">Your trips are saved to your account. <a href="#/account">Manage account</a></p>
      </div>
      <div class="hero-actions">
        <button class="btn primary" type="button" data-print>Print</button>
        <button class="btn ghost" type="button" data-share-trip>Share</button>
      </div>
    </section>
    <div class="outing-grid">${listings.length ? listings.map(outingCard).join('') : emptyHtml('No saved outings yet. Tap Save on any outing card.')}</div>
  `;
  bindInteractiveControls();
}

function renderIdeas() {
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Home</a><span>/</span><span>Ideas</span></div>
    <section class="page-hero">
      <div>
        <p class="eyebrow">Moods</p>
        <h1>Ideas for today</h1>
        <p>Start with the type of day you want, then use filters to narrow the list.</p>
      </div>
    </section>
    <div class="mood-grid wide">${moodTiles.map((tile) => moodTile(tile)).join('')}</div>
  `;
}

function renderPages() {
  const categoryRanges = DATA.categories.map((cat) => `<a class="category-card" href="#/page/${cat.pages[0]}"><span class="tile-icon" aria-hidden="true">${escapeHtml(categoryInitials(cat.title))}</span><div class="category-count"><strong>${cat.count}</strong><span>places</span></div><h3>${escapeHtml(cat.title)}</h3></a>`).join('');
  const pages = Array.from({ length: DATA.pageCount }, (_, index) => index + 1);
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Home</a><span>/</span><span>Source pages</span></div>
    <section class="page-hero">
      <div>
        <p class="eyebrow">Booklet source</p>
        <h1>Source pages</h1>
        <p>Use these only when you need to check the original booklet page. Outing cards keep the pages tucked into a small badge.</p>
      </div>
    </section>
    <section class="section-head"><div><h2>Category page ranges</h2></div></section>
    <div class="category-strip">${categoryRanges}</div>
    <section class="section-head"><div><h2>All booklet pages</h2><p>Clicking a page opens it in a lightbox.</p></div></section>
    <div class="page-picker">${pages.map((page) => `<button type="button" data-page-modal="${page}">${page}</button>`).join('')}</div>
  `;
  bindInteractiveControls();
}

function renderPage(pageValue) {
  const page = Number(pageValue);
  if (!Number.isInteger(page) || page < 1 || page > DATA.pageCount) return renderNotFound();
  const listings = DATA.listings.filter((item) => item.page === page);
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Home</a><span>/</span><a href="#/pages">Source pages</a><span>/</span><span>Page ${page}</span></div>
    <section class="page-hero">
      <div>
        <p class="eyebrow">${listings.length} linked entries</p>
        <h1>Booklet page ${page}</h1>
        <p>Open the page image in a lightbox, or choose a structured entry below.</p>
      </div>
      <button class="btn primary" type="button" data-page-modal="${page}">View page</button>
    </section>
    <div class="outing-grid">${listings.length ? listings.map(outingCard).join('') : emptyHtml('No structured listing was extracted from this page.')}</div>
  `;
  bindInteractiveControls();
}

function emptyHtml(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

function emptyResults(route, message) {
  return `<div class="empty"><p>${escapeHtml(message)}</p><a class="btn ghost" href="${escapeHtml(route)}">Clear filters</a></div>`;
}

function renderNotFound() {
  app.innerHTML = `<section class="panel"><h1>Page not found</h1><p>The item you opened is not in this guide.</p><a class="btn ghost" href="#/">Back home</a></section>`;
}

function bindHomePlanner() {
  const form = document.getElementById('homePlanner');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    setHash('#/search', values);
  });
}

function bindSearchForm() {
  const form = document.getElementById('searchForm');
  if (!form) return;
  const route = form.dataset.route;
  const update = () => {
    const values = Object.fromEntries(new FormData(form).entries());
    setHash(route, values);
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    update();
  });
  form.querySelector('select')?.addEventListener('change', update);
}

function bindFilters() {
  const filterForm = document.getElementById('filterForm');
  const searchForm = document.getElementById('filterSearchForm');
  const route = filterForm?.dataset.route || searchForm?.dataset.route;
  if (!route) return;
  const submitValues = (changes = {}) => {
    const current = paramsToObject(currentParams());
    delete current.limit;
    const filterValues = filterForm ? Object.fromEntries(new FormData(filterForm).entries()) : {};
    const searchValues = searchForm ? Object.fromEntries(new FormData(searchForm).entries()) : {};
    setHash(route, { ...current, ...filterValues, ...searchValues, ...changes });
  };
  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    submitValues();
  });
  searchForm?.querySelector('select')?.addEventListener('change', () => submitValues());
  searchForm?.querySelector('input[name="q"]')?.addEventListener('input', debounce(() => submitValues(), 320));
  filterForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    submitValues();
  });
}

function mapChoices(address, android = false) {
  const query = encodeURIComponent(address);
  const choices = [
    ['Google Maps', mapsUrl(address)],
    ['Waze', `https://waze.com/ul?q=${query}`],
    ['Apple Maps', `https://maps.apple.com/?q=${query}`],
  ];
  if (android) choices.push(['Other map apps', `geo:0,0?q=${query}`]);
  return choices;
}

function openMapChooser(address, trigger) {
  document.querySelector('.map-chooser')?.close();
  const dialog = document.createElement('dialog');
  dialog.className = 'map-chooser';
  dialog.setAttribute('aria-labelledby', 'map-chooser-title');
  dialog.setAttribute('aria-describedby', 'map-chooser-address');
  dialog.innerHTML = `
    <div class="map-chooser-head"><h2 id="map-chooser-title">Open in maps</h2><button type="button" class="map-chooser-close" aria-label="Close map choices">×</button></div>
    <p id="map-chooser-address">${escapeHtml(address)}</p>
    <div class="map-choices">${mapChoices(address, /Android/i.test(navigator.userAgent)).map(([name, url]) => `<a href="${escapeHtml(url)}"${url.startsWith('https:') ? ' target="_blank" rel="noopener"' : ''}>${escapeHtml(name)}</a>`).join('')}</div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    }
  });
  dialog.querySelectorAll('.map-choices a').forEach(link => link.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }, { once: true });
  dialog.showModal();
}

function bindInteractiveControls() {
  document.querySelectorAll('[data-map-address]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      openMapChooser(link.dataset.mapAddress, link);
    });
  });
  document.querySelectorAll('[data-save-id]').forEach((button) => {
    button.addEventListener('click', () => toggleSave(button.dataset.saveId));
  });
  document.querySelectorAll('[data-open-filters]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector('.results-tools')?.classList.add('sheet-open');
      document.getElementById('filterForm')?.classList.add('open');
    });
  });
  document.querySelectorAll('[data-close-filters]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector('.results-tools')?.classList.remove('sheet-open');
      document.getElementById('filterForm')?.classList.remove('open');
    });
  });
  document.querySelectorAll('[data-page-modal]').forEach((button) => {
    button.addEventListener('click', () => openPageModal(button.dataset.pageModal));
  });
  document.querySelectorAll('[data-surprise]').forEach((button) => {
    button.addEventListener('click', () => surpriseMe(button.dataset.surprise));
  });
  document.querySelectorAll('[data-print]').forEach((button) => {
    button.addEventListener('click', () => window.print());
  });
  document.querySelectorAll('[data-share-trip]').forEach((button) => {
    button.addEventListener('click', shareTripList);
  });
  document.querySelectorAll('[data-share-listing]').forEach((button) => {
    button.addEventListener('click', () => shareListing(button.dataset.shareListing));
  });
}

function updateBottomNavigation(path) {
  const current = !path ? 'home' : ['saved', 'account'].includes(path) ? path : ['search', 'all'].includes(path) ? 'search' : 'explore';
  document.querySelectorAll('[data-nav-page]').forEach((link) => {
    if (link.dataset.navPage === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function updateSavedBadges() {
  document.querySelectorAll('[data-saved-count]').forEach((badge) => {
    badge.textContent = String(savedCount());
    badge.hidden = savedCount() === 0;
  });
}

function toggleSave(id) {
  const account = window.OutingsAccount?.status();
  if (account && (!account.ready || account.busy)) return;
  if (account?.user) {
    window.OutingsAccount.toggle(id);
    return;
  }
  location.hash = '/saved';
}

function openPageModal(page) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="source-modal" role="dialog" aria-modal="true" aria-label="Booklet page ${escapeHtml(page)}">
      <div class="modal-head">
        <strong>Booklet p. ${escapeHtml(page)}</strong>
        <button type="button" data-close-modal>Close</button>
      </div>
      <img src="${escapeHtml(pageUrl(page))}" alt="Booklet page ${escapeHtml(page)}" />
      <div class="modal-foot">
        <a href="${escapeHtml(pageUrl(page))}" target="_blank" rel="noopener">Open source file</a>
        <a href="mailto:?subject=Outings Guide correction&body=Please check booklet page ${escapeHtml(page)}">Report outdated info</a>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target.matches('[data-close-modal]')) modal.remove();
  });
}

function surpriseMe(route) {
  const params = currentParams();
  let scope = DATA.listings;
  if (route.startsWith('#/category/')) {
    const id = decodeURIComponent(route.split('/').pop());
    scope = scope.filter((item) => item.categoryId === id);
  }
  if (route.startsWith('#/group/')) {
    const id = decodeURIComponent(route.split('/').pop());
    scope = scope.filter((item) => item.groupId === id);
  }
  const options = applyFilters(scope, params).filter((item) => !item.info);
  const pool = options.length ? options : scope;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  if (pick) location.hash = `#/listing/${encodeURIComponent(pick.id)}`;
}

async function shareTripList() {
  const listings = getSavedIds().map((id) => byListing.get(id)).filter(Boolean);
  const text = listings.map((item) => `${item.name} - Booklet p. ${item.page} - ${location.origin}${location.pathname}#/listing/${item.id}`).join('\n');
  if (navigator.share) {
    await navigator.share({ title: 'My Outings Guide Trip List', text });
  } else {
    await navigator.clipboard?.writeText(text);
    alert('Trip list copied.');
  }
}

async function shareListing(id) {
  const listing = byListing.get(id);
  const url = `${location.origin}${location.pathname}#/listing/${id}`;
  if (!listing) return;
  const address = extractAddress(listing) || 'Address not listed in booklet';
  const price = extractPrice(listing);
  const timing = extractTiming(listing);
  const text = [
    listing.name,
    `Category: ${listing.categoryTitle}`,
    `Area: ${listing.region || 'Area not listed'}`,
    `Address: ${address}`,
    `Timing: ${timing}`,
    `Price: ${price}`,
    `Booklet p. ${listing.page}`,
    `Link: ${url}`,
    'Details come from the booklet. Always confirm hours and prices before you go.',
  ].join('\n');
  if (navigator.share) {
    await navigator.share({ title: listing.name, text, url });
  } else {
    await navigator.clipboard?.writeText(text);
    alert('Place details copied.');
  }
}

function debounce(fn, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

function guideFooter() {
  return `
    <footer class="guide-footer">
      <div>
        <h2>Use the guide wisely</h2>
        <p>Details come from the booklet. Always confirm hours and prices before you go. Category artwork is illustrative.</p>
      </div>
      <div class="footer-links">
        <a href="#/browse">Browse categories</a>
        <a href="#/search">Search places</a>
        <a href="#/saved">My Trip List</a>
        <a href="mailto:?subject=Outings Guide correction">Report a correction</a>
      </div>
    </footer>`;
}

function router(resetScroll = true) {
  document.querySelector('.map-chooser')?.close();
  const previousSearch = document.querySelector('#filterSearchForm input[name="q"]');
  const editingSearch = previousSearch && document.activeElement === previousSearch;
  const selection = editingSearch ? [previousSearch.selectionStart, previousSearch.selectionEnd] : null;
  const hash = location.hash || '#/';
  const [path] = hash.slice(2).split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const isHome = !parts.length;
  document.body.classList.toggle('is-home', isHome);
  document.body.classList.toggle('is-search', parts[0] === 'search');
  applyCategoryTheme(parts[0] === 'category' ? byCategory.get(parts[1]) : null);
  if (isHome) renderHome();
  else if (parts[0] === 'plan') renderPlan();
  else if (parts[0] === 'browse') renderBrowse();
  else if (parts[0] === 'group') renderGroup(parts[1]);
  else if (parts[0] === 'category') renderCategory(parts[1]);
  else if (parts[0] === 'listing') renderListing(parts[1]);
  else if (parts[0] === 'all') renderAll();
  else if (parts[0] === 'search') renderSearch();
  else if (parts[0] === 'explore') renderSearch(false, 'explore');
  else if (parts[0] === 'filter') renderFilter();
  else if (parts[0] === 'ideas') renderIdeas();
  else if (parts[0] === 'saved') renderSaved();
  else if (parts[0] === 'account') renderAccount();
  else if (parts[0] === 'pages') renderPages();
  else if (parts[0] === 'page') renderPage(parts[1]);
  else renderNotFound();
  if (!isHome && parts[0] !== 'search' && parts[0] !== 'account') app.insertAdjacentHTML('beforeend', guideFooter());
  updateBottomNavigation(parts[0]);
  updateSavedBadges();
  const account = window.OutingsAccount?.status();
  window.OutingsAccount?.renderNav?.();
  if (account && (!account.ready || account.busy || (account.user && account.error))) {
    document.querySelectorAll('[data-save-id]').forEach(button => { button.disabled = true; });
  }
  if (account?.user && account.error && parts[0] !== 'account') {
    app.insertAdjacentHTML('afterbegin', `<aside class="sync-notice" role="status">${escapeHtml(account.error)} <a href="#/account">Open account to retry</a></aside>`);
  }
  app.focus({ preventScroll: true });
  if (editingSearch) {
    const nextSearch = document.querySelector('#filterSearchForm input[name="q"]');
    nextSearch?.focus({ preventScroll: true });
    if (nextSearch && selection) nextSearch.setSelectionRange(...selection);
  }
  if (resetScroll && !editingSearch) window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('hashchange', () => router());
window.addEventListener('outings-account-change', () => router(false));
router();
