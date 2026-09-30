const DATA = window.OUTINGS_DATA;
const app = document.getElementById('app');

const byCategory = new Map(DATA.categories.map((cat) => [cat.id, cat]));
const byListing = new Map(DATA.listings.map((listing) => [listing.id, listing]));

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

function textPreview(lines = []) {
  const joined = lines.filter(Boolean).slice(0, 3).join(' · ');
  return joined.length > 180 ? joined.slice(0, 177) + '…' : joined;
}

function statsHtml() {
  return `
    <div class="stats" aria-label="Booklet totals">
      <div class="stat"><strong>${DATA.categories.length}</strong><span>categories</span></div>
      <div class="stat"><strong>${DATA.listings.length}</strong><span>entries</span></div>
      <div class="stat"><strong>${DATA.pageCount}</strong><span>source pages</span></div>
      <div class="stat"><strong>1</strong><span>searchable guide</span></div>
    </div>`;
}

function renderHome() {
  app.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <p class="kicker">Navigation Sukkas 5787</p>
        <h1>Where shall we go?</h1>
        <p>The booklet has been organized into website categories. Every extracted entry links back to its printed source page so the original details stay available.</p>
        <div class="hero-actions">
          <a class="btn alt" href="#/all">Search all places</a>
          <a class="btn light" href="#/pages">Open source pages</a>
        </div>
      </div>
    </section>
    ${statsHtml()}
    <section class="section-head">
      <div>
        <h2>Categories from the booklet</h2>
        <p>Choose a category to see every listing extracted from those booklet pages.</p>
      </div>
    </section>
    <div class="grid">
      ${DATA.categories.map(categoryCard).join('')}
    </div>
    <p class="footer-note">Source: ${escapeHtml(DATA.sourceTitle)}. Some extracted text may be compact because it comes from designed booklet artwork; each listing includes the exact source page image for checking the printed details.</p>
  `;
}

function categoryCard(cat) {
  return `
    <a class="card" href="#/category/${encodeURIComponent(cat.id)}">
      <div class="pills">
        <span class="pill green">${cat.count} entries</span>
        <span class="pill">Pages ${escapeHtml(cat.pageRange)}</span>
      </div>
      <h3>${escapeHtml(cat.title)}</h3>
      <p>${escapeHtml(cat.description)}</p>
    </a>`;
}

function listingCard(listing) {
  return `
    <a class="listing-card" href="#/listing/${encodeURIComponent(listing.id)}">
      <div class="pills">
        <span class="pill">Page ${listing.page}</span>
        ${listing.info ? '<span class="pill red">Info</span>' : ''}
      </div>
      <h3>${escapeHtml(listing.name)}</h3>
      <p>${escapeHtml(textPreview(listing.details) || 'Open to view extracted details and the source booklet page.')}</p>
    </a>`;
}

function renderCategory(id) {
  const cat = byCategory.get(id);
  if (!cat) return renderNotFound();
  const listings = DATA.listings.filter((item) => item.categoryId === id);
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Categories</a><span>/</span><span>${escapeHtml(cat.title)}</span></div>
    <section class="panel">
      <div class="pills"><span class="pill green">${listings.length} entries</span><span class="pill">Pages ${escapeHtml(cat.pageRange)}</span></div>
      <h1 class="detail-title">${escapeHtml(cat.title)}</h1>
      <p>${escapeHtml(cat.description)}</p>
      <div class="hero-actions">
        <a class="btn ghost" href="#/all?q=${encodeURIComponent(cat.title)}">Search within all entries</a>
        <a class="btn ghost" href="#/page/${cat.pages[0]}">First source page</a>
      </div>
    </section>
    <section class="section-head"><div><h2>All ${escapeHtml(cat.title)} entries</h2><p>No sample listings here: these are the extracted entries from the booklet source pages.</p></div></section>
    <div class="listings">${listings.map(listingCard).join('')}</div>
  `;
}

function renderAll() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const q = params.get('q') || '';
  const results = filterListings(q);
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Categories</a><span>/</span><span>All places</span></div>
    <section class="panel">
      <h1 class="detail-title">All places</h1>
      <p>Search names, categories, page numbers and extracted booklet details.</p>
      <div class="toolbar">
        <input class="searchbox" id="searchInput" value="${escapeHtml(q)}" placeholder="Search all ${DATA.listings.length} entries…" aria-label="Search all places" />
        <a class="btn ghost" href="#/pages">Source pages</a>
      </div>
      <div id="resultCount" class="pills"><span class="pill green">${results.length} results</span></div>
    </section>
    <section class="section-head"><div><h2>Results</h2><p>Open any result to see extracted text and its exact booklet page.</p></div></section>
    <div id="results" class="listings">${results.length ? results.map(listingCard).join('') : emptyHtml('No matching entries found.')}</div>
  `;
  const input = document.getElementById('searchInput');
  input?.addEventListener('input', (event) => {
    const value = event.target.value;
    const next = filterListings(value);
    document.getElementById('resultCount').innerHTML = `<span class="pill green">${next.length} results</span>`;
    document.getElementById('results').innerHTML = next.length ? next.map(listingCard).join('') : emptyHtml('No matching entries found.');
    history.replaceState(null, '', `#/all${value ? `?q=${encodeURIComponent(value)}` : ''}`);
  });
}

function filterListings(query) {
  const q = normalize(query);
  if (!q) return DATA.listings;
  return DATA.listings.filter((item) => {
    const haystack = normalize([
      item.name,
      item.categoryTitle,
      `page ${item.page}`,
      ...(item.details || [])
    ].join(' '));
    return haystack.includes(q);
  });
}

function renderListing(id) {
  const listing = byListing.get(id);
  if (!listing) return renderNotFound();
  const category = byCategory.get(listing.categoryId);
  const siblingEntries = DATA.listings.filter((item) => item.categoryId === listing.categoryId && item.id !== listing.id).slice(0, 6);
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Categories</a><span>/</span><a href="#/category/${encodeURIComponent(listing.categoryId)}">${escapeHtml(listing.categoryTitle)}</a><span>/</span><span>${escapeHtml(listing.name)}</span></div>
    <div class="detail-layout">
      <article class="panel">
        <div class="pills"><span class="pill green">${escapeHtml(listing.categoryTitle)}</span><span class="pill">Booklet page ${listing.page}</span>${listing.info ? '<span class="pill red">Info entry</span>' : ''}</div>
        <h1 class="detail-title">${escapeHtml(listing.name)}</h1>
        <div class="notice">The exact printed source page is shown on this screen. Use it to check any artwork, Yiddish text, pricing, hours, phone numbers or small print from the booklet.</div>
        <h2>Extracted details</h2>
        ${listing.details?.length ? `<ul class="detail-list">${listing.details.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : '<p class="empty">No separate English detail lines were extracted for this entry. Check the source page image for the printed details.</p>'}
        <div class="hero-actions">
          <a class="btn ghost" href="#/page/${listing.page}">Open full page ${listing.page}</a>
          <a class="btn ghost" href="${escapeHtml(listing.sourceUrl)}" target="_blank" rel="noopener">Open SVG source</a>
        </div>
      </article>
      <aside class="panel">
        <h2>Source booklet page</h2>
        <img class="source-img" src="${escapeHtml(listing.sourceUrl)}" alt="Source booklet page ${listing.page}" loading="lazy" />
      </aside>
    </div>
    ${siblingEntries.length ? `<section class="section-head"><div><h2>More from ${escapeHtml(category?.title || listing.categoryTitle)}</h2></div></section><div class="listings">${siblingEntries.map(listingCard).join('')}</div>` : ''}
  `;
}

function renderPages() {
  const categoryRanges = DATA.categories.map((cat) => `<a class="listing-card" href="#/page/${cat.pages[0]}"><div class="pills"><span class="pill">Pages ${escapeHtml(cat.pageRange)}</span><span class="pill green">${cat.count} entries</span></div><h3>${escapeHtml(cat.title)}</h3><p>${escapeHtml(cat.description)}</p></a>`).join('');
  const pages = Array.from({ length: DATA.pageCount }, (_, index) => index + 1);
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Categories</a><span>/</span><span>Source pages</span></div>
    <section class="panel">
      <h1 class="detail-title">Source pages</h1>
      <p>Open any booklet page directly. Listing detail pages also show their source page beside the extracted text.</p>
    </section>
    <section class="section-head"><div><h2>Category page ranges</h2></div></section>
    <div class="listings">${categoryRanges}</div>
    <section class="section-head"><div><h2>All 212 booklet pages</h2><p>This keeps the full original booklet available for checking details.</p></div></section>
    <div class="page-picker">${pages.map((page) => `<a href="#/page/${page}">${page}</a>`).join('')}</div>
  `;
}

function renderPage(pageValue) {
  const page = Number(pageValue);
  if (!Number.isInteger(page) || page < 1 || page > DATA.pageCount) return renderNotFound();
  const listings = DATA.listings.filter((item) => item.page === page);
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Categories</a><span>/</span><a href="#/pages">Source pages</a><span>/</span><span>Page ${page}</span></div>
    <div class="detail-layout">
      <section class="panel">
        <div class="pills"><span class="pill">Page ${page}</span><span class="pill green">${listings.length} linked entries</span></div>
        <h1 class="detail-title">Booklet page ${page}</h1>
        <div class="hero-actions">
          ${page > 1 ? `<a class="btn ghost" href="#/page/${page - 1}">Previous page</a>` : ''}
          ${page < DATA.pageCount ? `<a class="btn ghost" href="#/page/${page + 1}">Next page</a>` : ''}
          <a class="btn ghost" href="${escapeHtml(pageUrl(page))}" target="_blank" rel="noopener">Open SVG source</a>
        </div>
        <h2>Entries linked to this page</h2>
        ${listings.length ? `<div class="listings">${listings.map(listingCard).join('')}</div>` : emptyHtml('No structured listing was extracted from this page. It may be an ad, review page, divider page, or front/back matter.')}
      </section>
      <aside class="panel">
        <h2>Original page</h2>
        <img class="source-img" src="${escapeHtml(pageUrl(page))}" alt="Booklet page ${page}" loading="eager" />
      </aside>
    </div>
  `;
}

function emptyHtml(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

function renderNotFound() {
  app.innerHTML = `<section class="panel"><h1 class="detail-title">Page not found</h1><p>The item you opened is not in this guide.</p><a class="btn ghost" href="#/">Back to categories</a></section>`;
}

function router() {
  const hash = location.hash || '#/';
  const [path] = hash.slice(2).split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  if (!parts.length) renderHome();
  else if (parts[0] === 'category') renderCategory(parts[1]);
  else if (parts[0] === 'listing') renderListing(parts[1]);
  else if (parts[0] === 'all') renderAll();
  else if (parts[0] === 'pages') renderPages();
  else if (parts[0] === 'page') renderPage(parts[1]);
  else renderNotFound();
  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('hashchange', router);
router();
