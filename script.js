/* ═══════════════════════════════════════════════════════════
   QUIZ BUZZERS — Question Bank
   script.js — Vanilla JavaScript
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ════════════════════════════════════
//  STATE
// ════════════════════════════════════
const state = {
  allData:      [],
  filteredData: [],
  sortCol:      null,
  sortDir:      'asc',
  currentPage:  1,
  pageSize:     50,
  currentMode:  'table',

  columns: [
    { key: 'Pkey',    label: 'Pkey',    visible: false, type: 'num' },
    { key: 'Qkey',    label: 'Qkey',    visible: false, type: 'num' },
    { key: 'Year',    label: 'Year',    visible: true,  type: 'num' },
    { key: 'Round',   label: 'Round',   visible: true,  type: 'num' },
    { key: 'Match',   label: 'Match',   visible: true,  type: 'num' },
    { key: 'Subject', label: 'Subject', visible: true,  type: 'str' },
    { key: 'Question',label: 'Question',visible: true,  type: 'str' },
    { key: 'Answer',  label: 'Answer',  visible: true,  type: 'str' },
    { key: 'Section', label: 'Section', visible: true,  type: 'str' },
    // Info is intentionally hidden as a column — its content is shown
    // via the ⓘ tooltip widget on the Answer cell instead.
    { key: 'Info',         label: 'Info',        visible: false, type: 'str' },
    // AudioUrl and LocalImageUrl are hidden columns — surfaced only via
    // their dedicated icons on the Question cell, never as table columns.
    { key: 'AudioUrl',     label: 'Audio',       visible: false, type: 'str' },
    { key: 'LocalImageUrl',label: 'Local Image', visible: false, type: 'str' },
  ],

  fc:   { cards: [], index: 0 },
  quiz: { cards: [], index: 0, correct: 0, total: 0, answered: false },

  // TTS — Text-to-speech state
  // readAll: when true, the read-question icon speaks the entire question
  //          with language switching; when false, speaks only foreign segments.
  tts: { readAll: false },

  // Table visibility toggles
  // answersHidden: globally hides answer text in all rows
  // contentHidden: globally hides all cell content in all rows
  // rowOverrides:  per-row explicit override (keyed by Pkey)
  //   'shown'  → row content visible regardless of global state
  //   'hidden' → row content hidden regardless of global state
  tableToggles: { answersHidden: false, contentHidden: false, rowOverrides: {} },
};

// ════════════════════════════════════
//  DOM REFS
// ════════════════════════════════════
const $ = id => document.getElementById(id);
const dom = {
  loadingOverlay:  $('loadingOverlay'),
  recordCount:     $('recordCount'),
  themeToggle:     $('themeToggle'),
  globalSearch:    $('globalSearch'),
  searchClear:     $('searchClear'),
  filterYear:      $('filterYear'),
  filterRound:     $('filterRound'),
  filterMatch:     $('filterMatch'),
  filterSubject:   $('filterSubject'),
  filterSection:   $('filterSection'),
  clearFilters:    $('clearFilters'),
  exportBtn:       $('exportBtn'),
  colToggleBtn:    $('colToggleBtn'),
  colPanel:        $('colPanel'),
  colChecks:       $('colChecks'),
  // TTS and table toggle toolbar buttons
  readAllBtn:        $('readAllBtn'),
  toggleAnswersBtn:  $('toggleAnswersBtn'),
  toggleContentBtn:  $('toggleContentBtn'),
  tableHead:       $('tableHead'),
  tableBody:       $('tableBody'),
  emptyState:      $('emptyState'),
  pagination:      $('pagination'),
  pageInfo:        $('pageInfo'),
  pageSize:        $('pageSize'),
  prevPage:        $('prevPage'),
  nextPage:        $('nextPage'),
  pageNums:        $('pageNums'),
  toast:           $('toast'),

  // Global info tooltip
  infoTooltip:      $('infoTooltip'),
  infoTooltipBody:  $('infoTooltipBody'),
  infoTooltipTitle: $('infoTooltipTitle'),
  infoTooltipIcon:  $('infoTooltipIcon'),
  tooltipPinBtn:    $('tooltipPinBtn'),
  tooltipCloseBtn:  $('tooltipCloseBtn'),
  tooltipResizeHandle: $('tooltipResizeHandle'),

  // Local image popup
  localImgPopup:        $('localImgPopup'),
  localImgPopupBody:    $('localImgPopupBody'),
  localImgPopupImg:     $('localImgPopupImg'),
  localImgPopupTitle:   $('localImgPopupTitle'),
  localImgPinBtn:       $('localImgPinBtn'),
  localImgCloseBtn:     $('localImgCloseBtn'),
  localImgResizeHandle: $('localImgResizeHandle'),

  // Flashcard
  fcCounter:    $('fcCounter'),
  fcShuffle:    $('fcShuffle'),
  fcReset:      $('fcReset'),
  flashcard:    $('flashcard'),
  fcInner:      $('fcInner'),
  fcMeta:       $('fcMeta'),
  fcQuestion:   $('fcQuestion'),
  fcAnswer:     $('fcAnswer'),
  fcInfo:       $('fcInfo'),
  fcProgressBar:$('fcProgressBar'),
  fcFooter:     $('fcFooter'),

  // Quiz
  quizCorrect:     $('quizCorrect'),
  quizTotal:       $('quizTotal'),
  quizPct:         $('quizPct'),
  quizShuffle:     $('quizShuffle'),
  quizRestart:     $('quizRestart'),
  quizRestart2:    $('quizRestart2'),
  quizProgressBar: $('quizProgressBar'),
  quizCard:        $('quizCard'),
  quizMeta:        $('quizMeta'),
  quizQNum:        $('quizQNum'),
  quizQuestion:    $('quizQuestion'),
  quizInput:       $('quizInput'),
  quizSubmit:      $('quizSubmit'),
  quizReveal:      $('quizReveal'),
  quizRevealAnswer:$('quizRevealAnswer'),
  quizRevealInfo:  $('quizRevealInfo'),
  quizFeedback:    $('quizFeedback'),
  quizNextQ:       $('quizNextQ'),
  quizFinished:    $('quizFinished'),
  finishedScore:   $('finishedScore'),

  // Stats
  statTotal:    $('statTotal'),
  statSubjects: $('statSubjects'),
  statRounds:   $('statRounds'),
  statMatches:  $('statMatches'),
  chartSubject: $('chartSubject'),
  chartRound:   $('chartRound'),
  chartMatch:   $('chartMatch'),
};

// ════════════════════════════════════
//  INIT
// ════════════════════════════════════
async function init() {
  try {
    const res = await fetch('db.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.allData = await res.json();
    state.filteredData = [...state.allData];

    buildFilterOptions();
    buildColPanel();
    buildTableHead();
    applyFilters();

    // Table is the default mode — activate its toolbar controls immediately
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) toolbar.classList.add('tbl-mode-active');

    hideLoading();
    setupEventListeners();
  } catch (err) {
    dom.loadingOverlay.innerHTML = `
      <p style="color:var(--incorrect);font-family:var(--font-mono);text-align:center;padding:20px">
        ✕ Failed to load db.json<br>
        <span style="font-size:0.8rem;color:var(--text-muted)">${err.message}</span>
      </p>`;
    console.error('Failed to load db.json:', err);
  }
}

function hideLoading() {
  dom.loadingOverlay.classList.add('hidden');
  setTimeout(() => dom.loadingOverlay.style.display = 'none', 350);
}


// ════════════════════════════════════
//  FILTER DROPDOWNS
// ════════════════════════════════════
function buildFilterOptions() {
  const unique = key => [...new Set(state.allData.map(r => r[key]).filter(Boolean))]
    .sort((a, b) => isNaN(a) ? a.localeCompare(b) : Number(a) - Number(b));

  const populate = (el, values) => values.forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v;
    el.appendChild(o);
  });

  populate(dom.filterYear,    unique('Year'));
  populate(dom.filterRound,   unique('Round'));
  populate(dom.filterMatch,   unique('Match'));
  populate(dom.filterSubject, unique('Subject'));
  populate(dom.filterSection, unique('Section'));
}


// ════════════════════════════════════
//  COLUMN PANEL
// ════════════════════════════════════
function buildColPanel() {
  dom.colChecks.innerHTML = '';
  state.columns.forEach(col => {
    const label = document.createElement('label');
    label.className = 'col-check-label' + (col.visible ? ' checked' : '');
    label.innerHTML = `<input type="checkbox" ${col.visible ? 'checked' : ''}>${col.label}`;
    const input = label.querySelector('input');
    input.addEventListener('change', () => {
      col.visible = input.checked;
      label.classList.toggle('checked', input.checked);
      buildTableHead();
      renderTable();
    });
    dom.colChecks.appendChild(label);
  });
}


// ════════════════════════════════════
//  TABLE HEAD
// ════════════════════════════════════
function buildTableHead() {
  dom.tableHead.innerHTML = '';

  // Fixed row-toggle column (not in state.columns — always first)
  const toggleTh = document.createElement('th');
  toggleTh.className = 'row-toggle-th';
  toggleTh.title = 'Toggle individual row visibility';
  toggleTh.textContent = '◎';
  dom.tableHead.appendChild(toggleTh);

  state.columns.filter(c => c.visible).forEach(col => {
    const th = document.createElement('th');
    th.className = 'sortable';
    th.dataset.key = col.key;
    let indicator = '↕';
    if (state.sortCol === col.key) {
      indicator = state.sortDir === 'asc' ? '↑' : '↓';
      th.classList.add(`sort-${state.sortDir}`);
    }
    th.innerHTML = `${col.label} <span class="sort-indicator">${indicator}</span>`;
    th.addEventListener('click', () => handleSort(col.key));
    dom.tableHead.appendChild(th);
  });
}


// ════════════════════════════════════
//  SORTING
// ════════════════════════════════════
function handleSort(key) {
  if (state.sortCol === key) {
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortCol = key;
    state.sortDir = 'asc';
  }
  sortData();
  buildTableHead();
  renderTable();
}

function sortData() {
  if (!state.sortCol) return;
  const col = state.columns.find(c => c.key === state.sortCol);
  state.filteredData.sort((a, b) => {
    let av = a[state.sortCol], bv = b[state.sortCol];
    if (col && col.type === 'num') { av = parseFloat(av) || 0; bv = parseFloat(bv) || 0; }
    else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
    if (av < bv) return state.sortDir === 'asc' ? -1 : 1;
    if (av > bv) return state.sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}


// ════════════════════════════════════
//  FILTERING
// ════════════════════════════════════
function applyFilters() {
  const search  = dom.globalSearch.value.trim().toLowerCase();
  const year    = dom.filterYear.value;
  const round   = dom.filterRound.value;
  const match   = dom.filterMatch.value;
  const subject = dom.filterSubject.value;
  const section = dom.filterSection.value;

  dom.searchClear.classList.toggle('visible', search.length > 0);

  state.filteredData = state.allData.filter(row => {
    if (year    && String(row.Year)    !== year)    return false;
    if (round   && String(row.Round)   !== round)   return false;
    if (match   && String(row.Match)   !== match)   return false;
    if (subject && row.Subject         !== subject) return false;
    if (section && row.Section         !== section) return false;
    if (search) {
      const haystack = Object.values(row).join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  sortData();
  state.currentPage = 1;
  renderTable();
  updateRecordCount();
  syncFlashcards();
  syncQuiz();
}

function updateRecordCount() {
  const total = state.allData.length;
  const shown = state.filteredData.length;
  dom.recordCount.textContent = shown === total
    ? `${total} questions`
    : `${shown} / ${total} questions`;
}


// ════════════════════════════════════
//  RENDER TABLE
// ════════════════════════════════════
function renderTable() {
  const visibleCols = state.columns.filter(c => c.visible);
  const data  = state.filteredData;
  const search = dom.globalSearch.value.trim().toLowerCase();

  if (data.length === 0) {
    dom.tableBody.innerHTML = '';
    dom.emptyState.hidden = false;
    dom.pagination.style.display = 'none';
    return;
  }
  dom.emptyState.hidden = true;
  dom.pagination.style.display = 'flex';

  const ps = parseInt(dom.pageSize.value);
  const totalPages = ps >= 9999 ? 1 : Math.ceil(data.length / ps);
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  const start    = ps >= 9999 ? 0 : (state.currentPage - 1) * ps;
  const end      = ps >= 9999 ? data.length : Math.min(start + ps, data.length);
  const pageData = data.slice(start, end);

  const fragment = document.createDocumentFragment();
  pageData.forEach(row => {
    const tr = document.createElement('tr');

    // ── Determine effective row visibility ──
    const vis = getRowVisibility(row.Pkey);
    if (!vis.content) tr.classList.add('row-content-hidden');
    else if (!vis.answer) tr.classList.add('row-answer-hidden');

    // ── Fixed row-toggle cell (always first) ──
    const toggleTd = document.createElement('td');
    toggleTd.className = 'row-toggle-cell';
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'row-toggle-btn' + (!vis.content ? ' row-is-hidden' : '');
    toggleBtn.dataset.pkey = row.Pkey;
    toggleBtn.title = vis.content ? 'Hide this row\'s content' : 'Reveal this row\'s content';
    toggleBtn.setAttribute('aria-label', vis.content ? 'Hide row' : 'Show row');
    toggleBtn.textContent = vis.content ? '●' : '○';
    toggleTd.appendChild(toggleBtn);
    tr.appendChild(toggleTd);

    visibleCols.forEach(col => {
      const td = document.createElement('td');
      const val = String(row[col.key] ?? '');

      if (col.key === 'Subject') {
        td.innerHTML = `<span class="subject-badge">${esc(val)}</span>`;

      } else if (col.key === 'Answer') {
        td.className = 'col-answer';
        const info     = String(row.Info       || '').trim();
        const imageUrl = String(row.ImageUrl   || '').trim();
        const ytUrl    = String(row.YoutubeUrl || '').trim();
        const hasMedia = info || imageUrl || ytUrl;
        const renderedAnswer = search
          ? highlight(renderWithLangTags(val), search)
          : renderWithLangTags(val);

        if (hasMedia) {
          td.innerHTML =
            `<span>${renderedAnswer}</span>` +
            `<button class="info-icon"` +
            ` data-info="${esc(info)}"` +
            ` data-image="${esc(imageUrl)}"` +
            ` data-youtube="${esc(ytUrl)}"` +
            ` aria-label="Details — hover to view" tabindex="0">ⓘ</button>`;
        } else {
          td.innerHTML = `<span>${renderedAnswer}</span>`;
        }

      } else if (['Pkey','Qkey','Year','Round','Match'].includes(col.key)) {
        td.className = 'col-num';
        td.textContent = val;

      } else if (col.key === 'Question') {
        td.className = 'col-question';
        const qHtml       = search ? highlight(renderWithLangTags(val), search) : renderWithLangTags(val);
        const audioUrl    = String(row.AudioUrl      || '').trim();
        const localImgUrl = String(row.LocalImageUrl || '').trim();
        const hasLangTags = _LANG_TAG_RE.test(val);

        // Build the icon cluster — TTS read button always included;
        // audio and local-image only when their URL fields are populated.
        let iconHtml = '';

        // TTS read-question icon (always shown on every question)
        const ttsTitle = state.tts.readAll
          ? 'Read entire question (Read All is ON)'
          : (hasLangTags
            ? 'Speak foreign-language segments only (Read All is OFF)'
            : 'Read question aloud');
        iconHtml +=
          `<button class="tts-read-btn"` +
          ` data-rawtext="${esc(val)}"` +
          ` aria-label="${esc(ttsTitle)}" title="${esc(ttsTitle)}">▶</button>`;

        if (audioUrl) {
          iconHtml +=
            `<button class="audio-icon"` +
            ` data-audio="${esc(audioUrl)}"` +
            ` aria-label="Play audio clip" title="Play audio clip">♪</button>`;
        }
        if (localImgUrl) {
          iconHtml +=
            `<button class="local-img-icon"` +
            ` data-localimg="${esc(localImgUrl)}"` +
            ` aria-label="View image" title="View image">◫</button>`;
        }

        td.innerHTML =
          `<div class="q-cell-inner">` +
          `<span class="q-text">${qHtml}</span>` +
          `<span class="q-icons">${iconHtml}</span>` +
          `</div>`;

      } else {
        td.innerHTML = search ? highlight(esc(val), search) : esc(val);
      }

      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });

  dom.tableBody.innerHTML = '';
  dom.tableBody.appendChild(fragment);

  dom.prevPage.disabled = state.currentPage <= 1;
  dom.nextPage.disabled = state.currentPage >= totalPages;
  dom.pageInfo.textContent = `Showing ${start + 1}–${end} of ${data.length}`;
  renderPageNums(totalPages);
}

function renderPageNums(totalPages) {
  dom.pageNums.innerHTML = '';
  if (totalPages <= 1) return;

  const cur = state.currentPage;
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (cur > 3) pages.push('...');
    for (let i = Math.max(2, cur - 1); i <= Math.min(totalPages - 1, cur + 1); i++) pages.push(i);
    if (cur < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  pages.forEach(p => {
    if (p === '...') {
      const el = document.createElement('span');
      el.className = 'page-ellipsis'; el.textContent = '…';
      dom.pageNums.appendChild(el);
    } else {
      const btn = document.createElement('button');
      btn.className = 'page-num-btn' + (p === cur ? ' active' : '');
      btn.textContent = p;
      btn.addEventListener('click', () => { state.currentPage = p; renderTable(); });
      dom.pageNums.appendChild(btn);
    }
  });
}


// ════════════════════════════════════
//  YOUTUBE ID EXTRACTOR
//
//  Handles the three common YouTube URL formats:
//    https://www.youtube.com/watch?v=VIDEO_ID
//    https://youtu.be/VIDEO_ID
//    https://www.youtube.com/embed/VIDEO_ID
//  Returns the 11-character video ID, or null if not matched.
// ════════════════════════════════════
function extractYouTubeId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}


// ════════════════════════════════════
//  INFO TOOLTIP
//
//  A single floating div lives at body level (see index.html).
//  We use event delegation on tableBody so it works across all
//  paginated renders without re-attaching listeners.
//
//  The tooltip is a rich media panel that can show any combination of:
//    • An image   (from ImageUrl field in db.json)
//    • A YouTube  (from YoutubeUrl field in db.json)  — plays inline
//    • Info text  (from Info field in db.json)         — typeset
//
//  Positioning logic:
//    1. Set width based on whether media is present.
//    2. Get the icon's bounding rect.
//    3. Try to place the tooltip below the icon (most common).
//    4. If it would overflow the viewport bottom, flip it above.
//    5. Clamp horizontally so it never clips off screen edges.
// ════════════════════════════════════
// ════════════════════════════════════
//  INFO TOOLTIP — PIN STATE
//
//  _tooltipPinned: when true the panel is locked open and will not
//  close on mouseout, scroll, or any automatic trigger.
//  Only forceHideTooltip() can close it (close button, Escape, mode switch).
//
//  _tooltipAnchorIcon: the ⓘ button that opened the current tooltip,
//  used for live repositioning on scroll when pinned.
// ════════════════════════════════════
let _tooltipHideTimer  = null;
let _tooltipPinned     = false;
let _tooltipAnchorIcon = null;
let _tooltipDragged    = false;  // true after user manually drags the panel

// ════════════════════════════════════
//  AUDIO PLAYER — GLOBAL STATE
//
//  Only one clip plays at a time. _currentAudio is the active Audio object;
//  _currentAudioIcon is the button that triggered it so we can reset its
//  visual state when playback ends or is stopped by another icon.
// ════════════════════════════════════
let _currentAudio     = null;
let _currentAudioIcon = null;

// ════════════════════════════════════
//  LOCAL IMAGE POPUP — GLOBAL STATE
//
//  Parallel to the info-tooltip state variables.
//  _localImgAnchorIcon: the ◫ button that opened the popup, used to toggle
//  it closed if clicked again and to restore .active state on close.
// ════════════════════════════════════
let _localImgPinned      = false;
let _localImgAnchorIcon  = null;
let _localImgDragged     = false;

function showTooltip(iconEl, clientX, clientY) {
  // If pinned, the user has locked the panel — do not replace its content.
  if (_tooltipPinned) return;

  clearTimeout(_tooltipHideTimer);
  _tooltipAnchorIcon = iconEl;

  const rawInfo  = iconEl.dataset.info    || '';
  const imageUrl = (iconEl.dataset.image  || '').trim();
  const ytUrl    = (iconEl.dataset.youtube|| '').trim();

  const hasInfo  = rawInfo.trim().length > 0;
  const hasImage = imageUrl.length > 0;
  const hasYT    = ytUrl.length > 0;

  if (!hasInfo && !hasImage && !hasYT) return;

  // ── Build header title dynamically ──
  let titleText = 'Comment(s)';
  let iconText  = '◈';
  if (hasImage && hasYT)        { titleText = 'Details';  iconText = '◈'; }
  else if (hasImage && hasInfo) { titleText = 'Details';  iconText = '◈'; }
  else if (hasYT    && hasInfo) { titleText = 'Details';  iconText = '◈'; }
  else if (hasImage)            { titleText = 'Visual';   iconText = '⬡'; }
  else if (hasYT)               { titleText = 'Media';    iconText = '▶'; }

  dom.infoTooltipTitle.textContent = titleText;
  dom.infoTooltipIcon.textContent  = iconText;

  // ── Build body HTML ──
  let html = '';

  // Image section — shown at the top of the panel
  if (hasImage) {
    html += `<div class="tooltip-media-wrap">` +
      `<img src="${esc(imageUrl)}" alt="Visual reference" class="tooltip-media-img"` +
      ` onerror="this.closest('.tooltip-media-wrap').style.display='none'" loading="lazy" />` +
      `</div>`;
  }

  // YouTube section — responsive 16:9 iframe that plays inline
  if (hasYT) {
    const ytId = extractYouTubeId(ytUrl);
    if (ytId) {
      html += `<div class="tooltip-youtube-wrap">` +
        `<iframe id="tooltipYtFrame"` +
        ` src="https://www.youtube.com/embed/${ytId}"` +
        ` frameborder="0"` +
        ` allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"` +
        ` allowfullscreen></iframe>` +
        `</div>`;
    }
  }

  // Info / comments section
  if (hasInfo) {
    const lines = rawInfo.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length) {
      html += `<div class="tooltip-info-section">` +
        lines.map(l => `<p>${renderContent(l)}</p>`).join('') +
        `</div>`;
    }
  }

  dom.infoTooltipBody.innerHTML = html;
  dom.infoTooltip.setAttribute('aria-hidden', 'false');

  // ── Widen when media present; clear any manually resized height so each
  //    new open starts fresh — user can drag/resize again as needed. ──
  dom.infoTooltip.style.width  = (hasImage || hasYT) ? '400px' : '320px';
  dom.infoTooltip.style.height = '';

  // Reset drag flag so auto-positioning takes effect for this open.
  _tooltipDragged = false;

  // Reset pin visuals whenever fresh content is loaded into the panel
  _setTooltipPinned(false);

  // ── Position at the pointer so the header is immediately under the cursor/finger ──
  positionAtPointer(clientX, clientY);

  // ── Show ──
  dom.infoTooltip.classList.add('visible');
}

// ════════════════════════════════════
//  POSITION AT POINTER
//
//  Places the panel so its top-left sits just below the cursor/finger,
//  meaning the header is immediately under the pointer on first appearance.
//  The user can therefore grab it and drag or tap Pin without any extra
//  movement across the screen.
//
//  Falls back to viewport centre if no coordinates are supplied (e.g.
//  keyboard focus via focusin, which has no pointer position).
//
//  All coordinates are viewport-relative (clientX/Y), matching the
//  panel's position:fixed coordinate space — no scrollY adjustment needed.
// ════════════════════════════════════
function positionAtPointer(clientX, clientY) {
  const GAP    = 12;  // px gap between pointer and panel top edge
  const MARGIN = 8;   // min px from any viewport edge
  const tip    = dom.infoTooltip;
  const tipW   = tip.offsetWidth  || parseInt(tip.style.width) || 320;
  const tipH   = tip.offsetHeight || 200;
  const vw     = window.innerWidth;
  const vh     = window.innerHeight;

  // Fallback: centre of viewport (keyboard focus has no pointer coords)
  const px = (clientX != null) ? clientX : vw / 2;
  const py = (clientY != null) ? clientY : vh / 2;

  // Default: open just below the pointer
  let top  = py + GAP;
  let left = px;

  // Flip above if panel would overflow the bottom of the viewport
  if (top + tipH > vh - MARGIN) {
    top = py - GAP - tipH;
  }

  // Clamp horizontal so panel never clips off left or right edge
  left = Math.max(MARGIN, Math.min(left, vw - tipW - MARGIN));

  // Clamp vertical so panel never clips off top edge (after possible flip)
  top = Math.max(MARGIN, top);

  // position:fixed → set viewport coordinates directly, no scrollY offset
  tip.style.left = `${left}px`;
  tip.style.top  = `${top}px`;
}

// Called by hover/focus-out — respects the pin lock.
function hideTooltip(delay = 120) {
  if (_tooltipPinned) return;
  clearTimeout(_tooltipHideTimer);
  _tooltipHideTimer = setTimeout(_doHide, delay);
}

// Called by close button, Escape, and mode switch — always closes.
function forceHideTooltip() {
  clearTimeout(_tooltipHideTimer);
  _setTooltipPinned(false);
  _doHide();
}

// Shared internal close routine used by both hide functions.
function _doHide() {
  _tooltipAnchorIcon = null;
  _tooltipDragged    = false;
  dom.infoTooltip.classList.remove('visible');
  dom.infoTooltip.setAttribute('aria-hidden', 'true');
  // Stop YouTube playback by blanking the iframe src.
  // This is the most reliable cross-browser method without the YT JS API.
  const ytFrame = document.getElementById('tooltipYtFrame');
  if (ytFrame) ytFrame.src = '';
}

// Toggle or set the pin state and update button appearance accordingly.
function _setTooltipPinned(pinned) {
  _tooltipPinned = pinned;
  const btn = dom.tooltipPinBtn;
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(pinned));
  btn.classList.toggle('pinned', pinned);
  btn.title = pinned
    ? 'Pinned — click to unpin and allow auto-close'
    : 'Pin open — click to keep this panel visible';
  const label = btn.querySelector('.pin-label');
  if (label) label.textContent = pinned ? 'Pinned' : 'Pin';
  // Reflect the pinned state on the tooltip border for a clear visual signal
  dom.infoTooltip.classList.toggle('pinned', pinned);
}


// ════════════════════════════════════
//  TOOLTIP DRAG  (Pointer Events — mouse, touch, stylus, all devices)
//
//  Uses the Pointer Events API (pointerdown / pointermove / pointerup)
//  which is a single unified system covering mouse, touch finger, and
//  stylus across desktop, laptop, tablet, and mobile without needing
//  separate mouse and touch handlers.
//
//  setPointerCapture() routes all subsequent events for that pointer ID
//  to the header element even when the pointer leaves it, so fast drags
//  never "lose" the element mid-gesture.
//
//  touch-action:none on the header (in CSS) tells the browser to hand
//  full pointer control to JS instead of using the gesture for scrolling
//  or zooming.
// ════════════════════════════════════
function _initTooltipDrag() {
  const tip    = dom.infoTooltip;
  const header = tip.querySelector('.info-tooltip-header');

  let dragging = false;
  let startPtrX, startPtrY, startTipLeft, startTipTop;

  header.addEventListener('pointerdown', e => {
    // Ignore taps/clicks on buttons inside the header
    if (e.target.closest('button')) return;

    e.preventDefault();
    header.setPointerCapture(e.pointerId); // all moves route here, even outside

    const rect   = tip.getBoundingClientRect();
    startTipLeft = rect.left;
    startTipTop  = rect.top;
    startPtrX    = e.clientX;
    startPtrY    = e.clientY;

    dragging = true;
    tip.classList.add('is-dragging');
  });

  header.addEventListener('pointermove', e => {
    if (!dragging) return;
    e.preventDefault();

    const MARGIN = 8;
    const dx     = e.clientX - startPtrX;
    const dy     = e.clientY - startPtrY;
    const vw     = window.innerWidth;
    const vh     = window.innerHeight;
    const tipW   = tip.offsetWidth;

    let newLeft = Math.max(MARGIN, Math.min(startTipLeft + dx, vw - tipW - MARGIN));
    let newTop  = Math.max(MARGIN, Math.min(startTipTop  + dy, vh - 40));

    tip.style.left = `${newLeft}px`;
    tip.style.top  = `${newTop}px`;
  });

  header.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging        = false;
    _tooltipDragged = true;
    tip.classList.remove('is-dragging');
    header.releasePointerCapture(e.pointerId);
  });

  // Also end drag cleanly if pointer is cancelled (e.g. incoming call on mobile)
  header.addEventListener('pointercancel', e => {
    if (!dragging) return;
    dragging = false;
    tip.classList.remove('is-dragging');
    header.releasePointerCapture(e.pointerId);
  });
}


// ════════════════════════════════════
//  TOOLTIP RESIZE  (Pointer Events — mouse, touch, stylus, all devices)
//
//  The custom .tooltip-resize-handle div sits at the bottom-right corner.
//  On pointerdown we capture the tooltip's current width/height and the
//  pointer's viewport position, then on pointermove we compute the delta
//  and apply it as new dimensions, clamped to sensible min/max bounds.
//
//  touch-action:none on the handle element (in CSS) is essential — without
//  it the browser intercepts the touch gesture for page scrolling before JS
//  ever sees the pointermove events.
// ════════════════════════════════════
function _initTooltipResize() {
  const tip    = dom.infoTooltip;
  const handle = dom.tooltipResizeHandle;

  let resizing = false;
  let startPtrX, startPtrY, startW, startH;

  handle.addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation(); // don't bubble to header drag listener
    handle.setPointerCapture(e.pointerId);

    startPtrX = e.clientX;
    startPtrY = e.clientY;
    startW    = tip.offsetWidth;
    startH    = tip.offsetHeight;

    resizing = true;
    tip.classList.add('is-resizing');
  });

  handle.addEventListener('pointermove', e => {
    if (!resizing) return;
    e.preventDefault();

    const MIN_W = 240;
    const MIN_H = 120;
    const MAX_W = window.innerWidth  - 16;
    const MAX_H = window.innerHeight - 16;

    const newW = Math.max(MIN_W, Math.min(startW + (e.clientX - startPtrX), MAX_W));
    const newH = Math.max(MIN_H, Math.min(startH + (e.clientY - startPtrY), MAX_H));

    tip.style.width  = `${newW}px`;
    tip.style.height = `${newH}px`;
  });

  handle.addEventListener('pointerup', e => {
    if (!resizing) return;
    resizing = false;
    tip.classList.remove('is-resizing');
    handle.releasePointerCapture(e.pointerId);
  });

  handle.addEventListener('pointercancel', e => {
    if (!resizing) return;
    resizing = false;
    tip.classList.remove('is-resizing');
    handle.releasePointerCapture(e.pointerId);
  });
}


// ════════════════════════════════════
//  AUDIO PLAYER
//
//  A singleton HTML Audio element so only one clip plays at a time.
//  The ♪ button on the Question cell toggles play / stop.
//  When a new icon is clicked while audio is playing, the current
//  clip stops first then the new one starts.
//
//  Visual states on the button:
//    Default  (♪)  — idle, no clip playing from this button
//    Playing  (■)  — clip is active; .playing class adds a pulsing ring
// ════════════════════════════════════
function stopCurrentAudio() {
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio.currentTime = 0;
    _currentAudio = null;
  }
  if (_currentAudioIcon) {
    _currentAudioIcon.textContent = '♪';
    _currentAudioIcon.classList.remove('playing');
    _currentAudioIcon.title = 'Play audio clip';
    _currentAudioIcon.setAttribute('aria-label', 'Play audio clip');
    _currentAudioIcon = null;
  }
}

function playAudioClip(url, iconBtn) {
  // Clicking the same button while playing → stop
  if (_currentAudioIcon === iconBtn) {
    stopCurrentAudio();
    return;
  }

  // Stop any currently playing clip first
  stopCurrentAudio();

  // Create and play the new clip
  const audio = new Audio(url);
  _currentAudio     = audio;
  _currentAudioIcon = iconBtn;

  iconBtn.textContent = '■';
  iconBtn.classList.add('playing');
  iconBtn.title = 'Stop audio clip';
  iconBtn.setAttribute('aria-label', 'Stop audio clip');

  audio.play().catch(err => {
    // Play failed (network error, format unsupported, etc.) — reset silently
    console.warn('Audio play failed:', err.message);
    stopCurrentAudio();
    showToast('Could not play audio clip');
  });

  // When clip ends naturally, reset the button back to idle state
  audio.addEventListener('ended', () => {
    if (_currentAudio === audio) stopCurrentAudio();
  }, { once: true });
}


// ════════════════════════════════════
//  LOCAL IMAGE POPUP
//
//  A lightbox-style fixed panel displaying the LocalImageUrl image.
//  Opened exclusively by the ◫ icon on the Question cell.
//  Shares the same pin / close / drag / resize conventions as the
//  info-tooltip but is a completely independent system.
//
//  Positioning: centres the popup in the lower portion of the viewport
//  near the clicked icon, then clamps to keep it fully on-screen.
// ════════════════════════════════════
function showLocalImgPopup(iconEl, clientX, clientY) {
  const url = iconEl.dataset.localimg || '';
  if (!url) return;

  // If pinned, don't replace until user unpins
  if (_localImgPinned) return;

  // Remove .active from any previously active icon
  if (_localImgAnchorIcon && _localImgAnchorIcon !== iconEl) {
    _localImgAnchorIcon.classList.remove('active');
  }
  _localImgAnchorIcon = iconEl;
  iconEl.classList.add('active');

  // Set popup title from question text (trimmed to 60 chars)
  const row  = iconEl.closest('tr');
  const qCell = row ? row.querySelector('.q-text') : null;
  const label = qCell ? (qCell.textContent.trim().slice(0, 60) + (qCell.textContent.length > 60 ? '…' : '')) : 'Image';
  dom.localImgPopupTitle.textContent = label;

  // Load image — reset src first so the browser fires load/error for repeated URLs
  const img = dom.localImgPopupImg;
  img.src   = '';
  img.alt   = 'Question image';
  img.src   = url;

  // Reset drag flag and pin state for fresh open
  _localImgDragged = false;
  _setLocalImgPinned(false);

  // Default size — wide enough for a proper image view
  dom.localImgPopup.style.width  = '560px';
  dom.localImgPopup.style.height = '';

  // Show first, then position (need offsetWidth/Height for clamping)
  dom.localImgPopup.classList.add('visible');
  dom.localImgPopup.setAttribute('aria-hidden', 'false');

  _positionLocalImgPopup(clientX, clientY);
}

function _positionLocalImgPopup(clientX, clientY) {
  const GAP    = 14;
  const MARGIN = 8;
  const popup  = dom.localImgPopup;
  const popW   = popup.offsetWidth  || 560;
  const popH   = popup.offsetHeight || 400;
  const vw     = window.innerWidth;
  const vh     = window.innerHeight;

  const px = (clientX != null) ? clientX : vw / 2;
  const py = (clientY != null) ? clientY : vh / 2;

  // Prefer opening below the click point
  let top  = py + GAP;
  let left = px - popW / 2; // centre under pointer horizontally

  // Flip above if it would overflow the bottom
  if (top + popH > vh - MARGIN) top = py - GAP - popH;

  // Clamp to viewport edges
  left = Math.max(MARGIN, Math.min(left, vw - popW - MARGIN));
  top  = Math.max(MARGIN, top);

  popup.style.left = `${left}px`;
  popup.style.top  = `${top}px`;
}

function forceHideLocalImgPopup() {
  _setLocalImgPinned(false);
  _doHideLocalImg();
}

function _doHideLocalImg() {
  if (_localImgAnchorIcon) {
    _localImgAnchorIcon.classList.remove('active');
    _localImgAnchorIcon = null;
  }
  _localImgDragged = false;
  dom.localImgPopup.classList.remove('visible');
  dom.localImgPopup.setAttribute('aria-hidden', 'true');
  // Clear the image src so the browser releases memory
  dom.localImgPopupImg.src = '';
}

function _setLocalImgPinned(pinned) {
  _localImgPinned = pinned;
  const btn = dom.localImgPinBtn;
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(pinned));
  btn.classList.toggle('pinned', pinned);
  btn.title = pinned
    ? 'Pinned — click to unpin and allow auto-close'
    : 'Pin open — click to keep this panel visible';
  const label = btn.querySelector('.pin-label');
  if (label) label.textContent = pinned ? 'Pinned' : 'Pin';
  dom.localImgPopup.classList.toggle('pinned', pinned);
}

// ── Drag (Pointer Events) ──
function _initLocalImgDrag() {
  const popup  = dom.localImgPopup;
  const header = popup.querySelector('.local-img-popup-header');

  let dragging = false;
  let startPtrX, startPtrY, startLeft, startTop;

  header.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    header.setPointerCapture(e.pointerId);

    const rect = popup.getBoundingClientRect();
    startLeft  = rect.left;
    startTop   = rect.top;
    startPtrX  = e.clientX;
    startPtrY  = e.clientY;

    dragging = true;
    popup.classList.add('is-dragging');
  });

  header.addEventListener('pointermove', e => {
    if (!dragging) return;
    e.preventDefault();

    const MARGIN = 8;
    const dx     = e.clientX - startPtrX;
    const dy     = e.clientY - startPtrY;
    const vw     = window.innerWidth;
    const vh     = window.innerHeight;
    const popW   = popup.offsetWidth;

    const newLeft = Math.max(MARGIN, Math.min(startLeft + dx, vw - popW - MARGIN));
    const newTop  = Math.max(MARGIN, Math.min(startTop  + dy, vh - 40));

    popup.style.left = `${newLeft}px`;
    popup.style.top  = `${newTop}px`;
  });

  header.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging         = false;
    _localImgDragged = true;
    popup.classList.remove('is-dragging');
    header.releasePointerCapture(e.pointerId);
  });

  header.addEventListener('pointercancel', e => {
    if (!dragging) return;
    dragging = false;
    popup.classList.remove('is-dragging');
    header.releasePointerCapture(e.pointerId);
  });
}

// ── Resize (Pointer Events) ──
function _initLocalImgResize() {
  const popup  = dom.localImgPopup;
  const handle = dom.localImgResizeHandle;

  let resizing = false;
  let startPtrX, startPtrY, startW, startH;

  handle.addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation();
    handle.setPointerCapture(e.pointerId);

    startPtrX = e.clientX;
    startPtrY = e.clientY;
    startW    = popup.offsetWidth;
    startH    = popup.offsetHeight;

    resizing = true;
    popup.classList.add('is-resizing');
  });

  handle.addEventListener('pointermove', e => {
    if (!resizing) return;
    e.preventDefault();

    const MIN_W = 280;
    const MIN_H = 160;
    const MAX_W = window.innerWidth  - 16;
    const MAX_H = window.innerHeight - 16;

    const newW = Math.max(MIN_W, Math.min(startW + (e.clientX - startPtrX), MAX_W));
    const newH = Math.max(MIN_H, Math.min(startH + (e.clientY - startPtrY), MAX_H));

    popup.style.width  = `${newW}px`;
    popup.style.height = `${newH}px`;
  });

  handle.addEventListener('pointerup', e => {
    if (!resizing) return;
    resizing = false;
    popup.classList.remove('is-resizing');
    handle.releasePointerCapture(e.pointerId);
  });

  handle.addEventListener('pointercancel', e => {
    if (!resizing) return;
    resizing = false;
    popup.classList.remove('is-resizing');
    handle.releasePointerCapture(e.pointerId);
  });
}
// ════════════════════════════════════
//  LANGUAGE TAG SYSTEM
//
//  Supports ISO 639-1 two-letter (and some three-letter) language codes
//  embedded in question/answer text using XML-style tags:
//    <fr>bonjour</fr>     → French
//    <es>te amo</es>      → Spanish
//    <pt>obrigado</pt>    → Portuguese
//    <de>Guten Tag</de>   → German  …and so on.
//
//  parseLangSegments(raw) splits the raw string into an array of:
//    { type:'text', text }      — plain English (or any untagged) text
//    { type:'lang', lang, text} — a delimited foreign-language chunk
//
//  renderWithLangTags(raw) wraps renderContent() and injects an inline
//  speaker badge (<button class="lang-speak-btn">) after each tagged chunk
//  so the user can click it to hear that segment pronounced by the browser.
// ════════════════════════════════════

// BCP-47 locale codes for each supported ISO 639-1 tag
const LANG_MAP = {
  'af':'af-ZA','ar':'ar-SA','bg':'bg-BG','bn':'bn-IN',
  'cs':'cs-CZ','cy':'cy-GB','da':'da-DK','de':'de-DE',
  'el':'el-GR','en':'en-US','eo':'eo',  'es':'es-ES',
  'et':'et-EE','eu':'eu-ES','fa':'fa-IR','fi':'fi-FI',
  'fr':'fr-FR','ga':'ga-IE','gl':'gl-ES','gu':'gu-IN',
  'he':'he-IL','hi':'hi-IN','hr':'hr-HR','hu':'hu-HU',
  'hy':'hy-AM','id':'id-ID','is':'is-IS','it':'it-IT',
  'ja':'ja-JP','ka':'ka-GE','kn':'kn-IN','ko':'ko-KR',
  'la':'la',   'lt':'lt-LT','lv':'lv-LV','mk':'mk-MK',
  'ml':'ml-IN','mr':'mr-IN','ms':'ms-MY','mt':'mt-MT',
  'nl':'nl-NL','no':'nb-NO','pa':'pa-IN','pl':'pl-PL',
  'pt':'pt-PT','ro':'ro-RO','ru':'ru-RU','sk':'sk-SK',
  'sl':'sl-SI','sq':'sq-AL','sr':'sr-RS','sv':'sv-SE',
  'sw':'sw-KE','ta':'ta-IN','te':'te-IN','th':'th-TH',
  'tl':'tl-PH','tr':'tr-TR','uk':'uk-UA','ur':'ur-PK',
  'vi':'vi-VN','zh':'zh-CN','zu':'zu-ZA',
};

// Human-readable language names for tooltip text
const LANG_NAMES = {
  'af':'Afrikaans','ar':'Arabic',    'bg':'Bulgarian','bn':'Bengali',
  'cs':'Czech',    'cy':'Welsh',     'da':'Danish',   'de':'German',
  'el':'Greek',    'en':'English',   'eo':'Esperanto','es':'Spanish',
  'et':'Estonian', 'eu':'Basque',    'fa':'Persian',  'fi':'Finnish',
  'fr':'French',   'ga':'Irish',     'gl':'Galician', 'gu':'Gujarati',
  'he':'Hebrew',   'hi':'Hindi',     'hr':'Croatian', 'hu':'Hungarian',
  'hy':'Armenian', 'id':'Indonesian','is':'Icelandic','it':'Italian',
  'ja':'Japanese', 'ka':'Georgian',  'kn':'Kannada',  'ko':'Korean',
  'la':'Latin',    'lt':'Lithuanian','lv':'Latvian',  'mk':'Macedonian',
  'ml':'Malayalam','mr':'Marathi',   'ms':'Malay',    'mt':'Maltese',
  'nl':'Dutch',    'no':'Norwegian', 'pa':'Punjabi',  'pl':'Polish',
  'pt':'Portuguese','ro':'Romanian', 'ru':'Russian',  'sk':'Slovak',
  'sl':'Slovenian','sq':'Albanian',  'sr':'Serbian',  'sv':'Swedish',
  'sw':'Swahili',  'ta':'Tamil',     'te':'Telugu',   'th':'Thai',
  'tl':'Filipino', 'tr':'Turkish',   'uk':'Ukrainian','ur':'Urdu',
  'vi':'Vietnamese','zh':'Chinese',  'zu':'Zulu',
};

// Regex used to detect and extract language tags.
// Matches <xx>...</xx> or <xxx>...</xxx> (2-3 letter ISO codes, non-greedy).
// The 's' flag is NOT used — tags should not span newlines in practice.
const _LANG_TAG_RE = /<([a-z]{2,3})>([\s\S]*?)<\/\1>/g;

function parseLangSegments(raw) {
  if (!raw || typeof raw !== 'string') return [{ type:'text', text: raw || '' }];

  const segments = [];
  let lastIdx    = 0;
  // Reset lastIndex — the regex is module-level so we must reset it each call.
  _LANG_TAG_RE.lastIndex = 0;

  let m;
  while ((m = _LANG_TAG_RE.exec(raw)) !== null) {
    // Plain text before this tag
    if (m.index > lastIdx) {
      segments.push({ type:'text', text: raw.slice(lastIdx, m.index) });
    }
    // Language segment
    segments.push({ type:'lang', lang: m[1], text: m[2] });
    lastIdx = _LANG_TAG_RE.lastIndex;
  }
  // Trailing plain text after the last tag
  if (lastIdx < raw.length) {
    segments.push({ type:'text', text: raw.slice(lastIdx) });
  }
  return segments.length > 0 ? segments : [{ type:'text', text: raw }];
}

function renderWithLangTags(raw) {
  if (!raw || typeof raw !== 'string') return '';

  // Fast path — if no language tags, go straight to renderContent
  _LANG_TAG_RE.lastIndex = 0;
  if (!_LANG_TAG_RE.test(raw)) return renderContent(raw);

  const segments = parseLangSegments(raw);

  return segments.map(seg => {
    if (seg.type === 'text') {
      return renderContent(seg.text);
    }
    // Language segment: render text + inline speaker badge
    const langName = LANG_NAMES[seg.lang] || seg.lang.toUpperCase();
    const bcp47    = LANG_MAP[seg.lang]   || seg.lang;
    const rendered = renderContent(seg.text);
    const badge =
      `<button class="lang-speak-btn"` +
      ` data-lang="${esc(bcp47)}"` +
      ` data-text="${esc(seg.text)}"` +
      ` title="Click to hear pronunciation in ${esc(langName)}"` +
      ` aria-label="Speak in ${esc(langName)}">${seg.lang.toUpperCase()}</button>`;
    return `<span class="lang-segment">${rendered}</span>${badge}`;
  }).join('');
}


// ════════════════════════════════════
//  TEXT-TO-SPEECH  (Web Speech API)
//
//  Only one utterance chain runs at a time.
//  stopTTS() cancels any in-progress speech and resets button visuals.
//
//  speakSingleLangSegment(text, bcp47, btn)
//    — speaks one delimited segment; called by the inline lang badge.
//
//  speakQuestionSegments(rawText, readAll, btn)
//    — reads a whole question field.
//      readAll=true  → every segment (English in en-US, foreign in their lang)
//      readAll=false → only the foreign-delimited chunks (user reads English)
//      If no foreign chunks exist and readAll=false → falls back to full read.
// ════════════════════════════════════
let _ttsSpeakingBtn = null; // the btn currently showing the speaking animation

function stopTTS() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (_ttsSpeakingBtn) {
    _ttsSpeakingBtn.classList.remove('speaking');
    _ttsSpeakingBtn = null;
  }
  // Also clear any lang-speak-btn speaking states left over
  document.querySelectorAll('.lang-speak-btn.speaking, .tts-read-btn.speaking')
    .forEach(b => b.classList.remove('speaking'));
}

function _ttsAvailable() {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    showToast('Text-to-speech is not supported in this browser');
    return false;
  }
  return true;
}

function _bestVoice(bcp47) {
  const voices = window.speechSynthesis.getVoices();
  // Exact match first, then language prefix match
  return voices.find(v => v.lang === bcp47)
      || voices.find(v => v.lang.startsWith(bcp47.slice(0, 2)))
      || null;
}

// Chain an array of {text, lang (bcp47)} items sequentially using the
// SpeechSynthesis queue.  Calls onDone when all items have finished.
function _speakChain(items, idx, onDone) {
  if (idx >= items.length) { if (onDone) onDone(); return; }
  const item  = items[idx];
  const utter = new SpeechSynthesisUtterance(item.text);
  utter.lang  = item.lang;
  const voice = _bestVoice(item.lang);
  if (voice) utter.voice = voice;
  utter.onend   = () => _speakChain(items, idx + 1, onDone);
  utter.onerror = () => _speakChain(items, idx + 1, onDone); // skip on error
  window.speechSynthesis.speak(utter);
}

function speakSingleLangSegment(text, bcp47, btn) {
  if (!_ttsAvailable()) return;

  // Clicking an already-speaking badge stops it
  if (btn && btn.classList.contains('speaking')) {
    stopTTS();
    return;
  }

  stopTTS();

  if (btn) { btn.classList.add('speaking'); _ttsSpeakingBtn = btn; }

  _speakChain([{ text, lang: bcp47 }], 0, () => {
    if (btn) btn.classList.remove('speaking');
    if (_ttsSpeakingBtn === btn) _ttsSpeakingBtn = null;
  });
}

function speakQuestionSegments(rawText, readAll, btn) {
  if (!_ttsAvailable()) return;

  if (btn && btn.classList.contains('speaking')) {
    stopTTS();
    return;
  }

  stopTTS();

  const segments = parseLangSegments(rawText);
  const foreignOnly = segments.filter(s => s.type === 'lang');

  // Decide what to speak
  let items;
  if (readAll) {
    // Speak everything: plain text in English, tagged text in their language
    items = segments
      .filter(s => s.text.trim()) // skip empty segments
      .map(s => ({
        text: s.text,
        lang: s.type === 'lang' ? (LANG_MAP[s.lang] || s.lang) : 'en-US',
      }));
  } else {
    // Speak only foreign segments; fall back to full English read if none
    if (foreignOnly.length === 0) {
      items = [{ text: rawText.replace(/<[^>]+>/g, ''), lang: 'en-US' }];
    } else {
      items = foreignOnly.map(s => ({
        text: s.text,
        lang: LANG_MAP[s.lang] || s.lang,
      }));
    }
  }

  if (items.length === 0) { showToast('Nothing to speak'); return; }

  if (btn) { btn.classList.add('speaking'); _ttsSpeakingBtn = btn; }

  _speakChain(items, 0, () => {
    if (btn) btn.classList.remove('speaking');
    if (_ttsSpeakingBtn === btn) _ttsSpeakingBtn = null;
  });
}


// ════════════════════════════════════
//  TABLE VISIBILITY HELPERS
// ════════════════════════════════════

// Compute the effective visibility for a given row's Pkey.
// Returns { content: bool, answer: bool }
//   content:true  → row cells are shown
//   answer:true   → answer cell text is shown (only relevant when content:true)
function getRowVisibility(pkey) {
  const override = state.tableToggles.rowOverrides[String(pkey)];
  if (override === 'shown')  return { content: true,  answer: true  };
  if (override === 'hidden') return { content: false, answer: false };
  // No per-row override — use global state
  const contentOk = !state.tableToggles.contentHidden;
  const answerOk  = contentOk && !state.tableToggles.answersHidden;
  return { content: contentOk, answer: answerOk };
}

// Toggle a single row's override. Smart logic:
//   If content is currently shown → hide it (set override:'hidden')
//   If content is currently hidden → show it (set override:'shown')
// This always reflects the user's intent regardless of global state.
function toggleSingleRow(pkey) {
  const vis = getRowVisibility(pkey);
  state.tableToggles.rowOverrides[String(pkey)] = vis.content ? 'hidden' : 'shown';
  renderTable();
}

// Update the visual and aria state of a toolbar toggle button
function _setToggleBtn(btn, active, labelOn, labelOff) {
  btn.setAttribute('aria-pressed', String(active));
  btn.classList.toggle('toggle-active', active);
  btn.title = active ? labelOn : labelOff;
}

// ════════════════════════════════════
//  HIGHLIGHT & ESCAPE
// ════════════════════════════════════
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function highlight(escapedStr, term) {
  if (!term) return escapedStr;
  const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
  return escapedStr.replace(re, '<span class="highlight">$1</span>');
}


// ════════════════════════════════════
//  SCIENTIFIC NOTATION RENDERER
//
//  Converts plain-text scientific/chemistry/math notation into
//  properly typeset HTML using <sup> and <sub> tags.
//
//  Handled patterns (all found in db.json):
//    ^N  / ^-N     →  superscript  e.g. x^2 → x²,  10^-4 → 10⁻⁴,  dm^3 → dm³
//    ESym + digits →  subscript    e.g. H2O → H₂O,  C6H6 → C₆H₆,  Na2SO3 → Na₂SO₃
//    \n            →  <br>
//
//  Handles its own HTML escaping — do NOT pre-escape the input string.
//  Returns an HTML string safe for assignment to innerHTML.
// ════════════════════════════════════
function renderSci(raw) {
  if (!raw) return '';

  // Full periodic table symbol set. Two-char symbols (Na, Mg, Cu …) are stored
  // alongside single-char ones. The tokeniser always tries 2-char first so that
  // e.g. "Na2" is recognised as Sodium rather than Nitrogen + "a2".
  const ELEMENTS = new Set([
    'H','He','Li','Be','B','C','N','O','F','Ne',
    'Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca',
    'Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn',
    'Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr',
    'Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn',
    'Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd',
    'Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb',
    'Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg',
    'Tl','Pb','Bi','Po','At','Rn','Fr','Ra','Ac','Th',
    'Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm',
    'Md','No','Lr'
  ]);

  // Process line-by-line; join with <br> at the end.
  return raw.split('\n').map(line => {
    let out = '';
    let i = 0;
    const n = line.length;

    while (i < n) {
      const ch = line[i];

      // ── Superscript: ^ followed by optional sign then one or more digits ──
      // Covers: x^2, 10^-4, dm^3, cm^2, m^2, a^2, Cr2O7^2-, x^6 …
      if (ch === '^' && i + 1 < n) {
        let j = i + 1;
        if (line[j] === '-' || line[j] === '+') j++;  // optional sign character
        const numStart = j;
        while (j < n && /\d/.test(line[j])) j++;      // consume digit run
        if (j > numStart) {                            // at least one digit found
          out += `<sup>${esc(line.slice(i + 1, j))}</sup>`;
          i = j;
          continue;
        }
      }

      // ── Chemical subscript: ElementSymbol immediately followed by digits ──
      // Covers: H2O, C6H6, Na2SO3, C12H22O11, NH4NO3, CuSO4, MgSiO3 …
      if (/[A-Z]/.test(ch)) {
        let sym = null;
        // Try two-character symbol first (Na, Mg, Cl, Br, …)
        if (
          i + 1 < n &&
          /[a-z]/.test(line[i + 1]) &&
          ELEMENTS.has(line[i] + line[i + 1])
        ) {
          sym = line[i] + line[i + 1];
        } else if (ELEMENTS.has(ch)) {
          sym = ch;
        }

        if (sym) {
          let j = i + sym.length;
          const numStart = j;
          while (j < n && /\d/.test(line[j])) j++;    // consume trailing digits
          if (j > numStart) {                          // digits found → subscript
            out += esc(sym) + `<sub>${esc(line.slice(numStart, j))}</sub>`;
            i = j;
            continue;
          }
        }
      }

      // ── Default: HTML-escape the character and advance ─────────────────────
      out += esc(ch);
      i++;
    }
    return out;
  }).join('<br>');
}


// ════════════════════════════════════
//  CONTENT RENDERER (KaTeX + renderSci)
//
//  renderContent(raw) is the single entry point used everywhere
//  text is placed into innerHTML.  It gives you two layers:
//
//  ┌─ Manual (KaTeX) ─────────────────────────────────────────┐
//  │  Wrap text in these delimiters for full LaTeX control:   │
//  │   $...$        inline math    e.g. $E = mc^2$            │
//  │   $$...$$      display math   e.g. $$\frac{a}{b}$$       │
//  │   \ce{...}     chemistry      e.g. \ce{H2SO4}            │
//  │                (mhchem; works standalone, no $ needed)    │
//  └──────────────────────────────────────────────────────────┘
//  └─ Automatic (renderSci) ──────────────────────────────────┘
//     Plain text segments (not wrapped above) are still
//     auto-detected: H2O → H₂O,  x^2 → x²,  Na2SO3 → Na₂SO₃
//  └──────────────────────────────────────────────────────────┘
//
//  The two layers do NOT overlap: KaTeX segments are extracted
//  first and bypass renderSci entirely, so there is no
//  double-processing.  Existing plain-text data works unchanged.
// ════════════════════════════════════

// Regex that matches the three supported KaTeX delimiter forms.
// Capturing group 1  →  the whole matched token (passed to KaTeX).
// Matching order: $$…$$ before $…$ so display blocks are not split.
const _KATEX_RE = /(\\ce\{[^}]*\}|\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g;

function renderContent(raw) {
  if (!raw || typeof raw !== 'string') return '';

  // If KaTeX is not yet loaded (e.g. network issue), fall through to renderSci.
  const hasKatex = typeof window !== 'undefined' && typeof window.katex !== 'undefined';

  if (!hasKatex) return renderSci(raw);

  const parts = raw.split(_KATEX_RE);
  // split() with a capturing group interleaves plain and matched segments:
  // ['plain', 'matched', 'plain', 'matched', 'plain', …]

  return parts.map((part, idx) => {
    if (!part) return '';

    // Odd indices are captured KaTeX tokens
    if (idx % 2 === 1) {
      try {
        let expr, displayMode;

        if (part.startsWith('$$')) {
          // Display / block math
          expr        = part.slice(2, -2).trim();
          displayMode = true;
        } else if (part.startsWith('$')) {
          // Inline math
          expr        = part.slice(1, -1);
          displayMode = false;
        } else {
          // \ce{...} — chemistry shorthand, rendered as inline KaTeX
          expr        = part;          // e.g.  \ce{H2SO4}
          displayMode = false;
        }

        return window.katex.renderToString(expr, {
          displayMode,
          throwOnError: false,   // show error glyph rather than crash
          trust:        false,
        });
      } catch (e) {
        // If KaTeX itself throws, return the raw token escaped so the user
        // can see what went wrong without breaking the page.
        console.warn('KaTeX render error:', e.message, '→', part);
        return esc(part);
      }
    }

    // Even indices are plain-text segments — use the auto-detector.
    return renderSci(part);
  }).join('');
}


// ════════════════════════════════════
//  SHARED MEDIA HTML BUILDER
//
//  Used by both Flashcard and Quiz modes to build the inline
//  media panel (image + YouTube + info) shown after an answer.
//  Returns an HTML string, or '' if the card has no media/info.
//
//  idSuffix is an optional string appended to the iframe id so
//  that flashcard and quiz iframes have distinct ids (useful if
//  both modes are in the DOM simultaneously, though only one is
//  ever visible at a time).
// ════════════════════════════════════
function buildMediaHTML(card, idSuffix = '') {
  const imageUrl = String(card.ImageUrl   || '').trim();
  const ytUrl    = String(card.YoutubeUrl || '').trim();
  const info     = String(card.Info       || '').trim();

  const hasImage = imageUrl.length > 0;
  const hasYT    = ytUrl.length > 0;
  const hasInfo  = info.length > 0;

  if (!hasImage && !hasYT && !hasInfo) return '';

  let html = '';

  // Image
  if (hasImage) {
    html += `<div class="media-image-wrap">` +
      `<img src="${esc(imageUrl)}" alt="Visual reference" class="media-img"` +
      ` onerror="this.closest('.media-image-wrap').style.display='none'" loading="lazy" />` +
      `</div>`;
  }

  // YouTube — responsive 16:9 iframe
  if (hasYT) {
    const ytId = extractYouTubeId(ytUrl);
    if (ytId) {
      html += `<div class="media-youtube-wrap">` +
        `<iframe id="mediaYtFrame${idSuffix}"` +
        ` src="https://www.youtube.com/embed/${ytId}"` +
        ` frameborder="0"` +
        ` allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"` +
        ` allowfullscreen></iframe>` +
        `</div>`;
    }
  }

  // Info / comments
  if (hasInfo) {
    const lines = info.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length) {
      html += `<div class="media-info-section">` +
        `<div class="media-info-label">◈ Comment(s)</div>` +
        lines.map(l => `<p>${renderWithLangTags(l)}</p>`).join('') +
        `</div>`;
    }
  }

  return html;
}


// ════════════════════════════════════
//  EXPORT CSV
// ════════════════════════════════════
function exportCSV() {
  const visibleCols = state.columns.filter(c => c.visible);
  const headers = visibleCols.map(c => c.label).join(',');
  const rows = state.filteredData.map(row =>
    visibleCols.map(col => {
      const val = String(row[col.key] ?? '');
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g,'""')}"` : val;
    }).join(',')
  );
  const csv  = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `quiz-buzzers-${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast(`Exported ${state.filteredData.length} rows to CSV`);
}


// ════════════════════════════════════
//  FLASHCARDS
// ════════════════════════════════════
function syncFlashcards() {
  state.fc.cards = [...state.filteredData];
  state.fc.index = 0;
  if (state.currentMode === 'flashcard') renderFlashcard();
}

function renderFlashcard() {
  const cards = state.fc.cards;
  const i = state.fc.index;

  if (cards.length === 0) {
    dom.fcCounter.textContent   = 'No cards';
    dom.fcQuestion.textContent  = 'No questions match current filters.';
    dom.fcAnswer.textContent    = '';
    dom.fcMeta.innerHTML        = '';
    dom.fcInfo.style.display    = 'none';
    dom.fcProgressBar.style.width = '0%';
    dom.fcFooter.textContent    = '';
    return;
  }

  const card = cards[i];
  dom.fcCounter.textContent = `Card ${i + 1} of ${cards.length}`;
  dom.fcQuestion.innerHTML = renderWithLangTags(card.Question);
  dom.fcAnswer.innerHTML   = renderWithLangTags(card.Answer);
  dom.fcMeta.innerHTML = `
    <span class="meta-tag">${card.Subject}</span>
    <span class="meta-tag">Yr ${card.Year}</span>
    <span class="meta-tag">Rd ${card.Round}</span>
    <span class="meta-tag">Mtch ${card.Match}</span>`;
  dom.fcProgressBar.style.width = `${((i + 1) / cards.length) * 100}%`;

  // ── Media panel on the back of the card (image, YouTube, info) ──
  const fcMediaHtml = buildMediaHTML(card, 'Fc');
  if (fcMediaHtml) {
    dom.fcInfo.style.display = 'block';
    dom.fcInfo.innerHTML = fcMediaHtml;
  } else {
    dom.fcInfo.style.display = 'none';
  }

  // Reset flip state when navigating to a new card
  dom.flashcard.classList.remove('flipped');

  const sections = [...new Set(cards.map(c => c.Section))].join(', ');
  dom.fcFooter.textContent = `Section: ${sections} · Press Space or click to flip`;
}


// ════════════════════════════════════
//  QUIZ
// ════════════════════════════════════
function syncQuiz() {
  state.quiz.cards    = [...state.filteredData];
  state.quiz.index    = 0;
  state.quiz.correct  = 0;
  state.quiz.total    = 0;
  state.quiz.answered = false;
  if (state.currentMode === 'quiz') {
    renderQuizQuestion();
    updateQuizScore();
  }
}

function renderQuizQuestion() {
  const q = state.quiz;
  dom.quizFinished.hidden      = true;
  dom.quizCard.hidden          = false;
  dom.quizReveal.hidden        = true;
  dom.quizRevealInfo.style.display = 'none';
  dom.quizInput.value          = '';
  dom.quizInput.disabled       = false;
  q.answered = false;

  if (q.cards.length === 0) {
    dom.quizQuestion.textContent = 'No questions match current filters.';
    dom.quizMeta.innerHTML   = '';
    dom.quizQNum.textContent = '';
    dom.quizProgressBar.style.width = '0%';
    return;
  }

  const card = q.cards[q.index];
  dom.quizQNum.textContent     = `Question ${q.index + 1} of ${q.cards.length}`;
  dom.quizQuestion.innerHTML   = renderWithLangTags(card.Question);
  dom.quizMeta.innerHTML = `
    <span class="meta-tag">${card.Subject}</span>
    <span class="meta-tag">Yr ${card.Year}</span>
    <span class="meta-tag">Rd ${card.Round}</span>
    <span class="meta-tag">Mtch ${card.Match}</span>`;
  dom.quizProgressBar.style.width = `${(q.index / q.cards.length) * 100}%`;
  dom.quizInput.focus();
}

function submitQuizAnswer() {
  const q = state.quiz;
  if (q.answered || q.cards.length === 0) return;

  const card        = q.cards[q.index];
  const userAnswer  = dom.quizInput.value.trim().toLowerCase();
  const correctAnswer = String(card.Answer).trim().toLowerCase();
  const isCorrect   = userAnswer === correctAnswer ||
    (correctAnswer.includes(userAnswer) && userAnswer.length > 2);

  q.answered = true;
  q.total++;
  if (isCorrect) q.correct++;

  dom.quizRevealAnswer.innerHTML = renderWithLangTags(card.Answer);
  dom.quizFeedback.textContent = isCorrect ? '✓ Correct!' : '✗ Incorrect';
  dom.quizFeedback.className   = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
  dom.quizReveal.hidden        = false;
  dom.quizInput.disabled       = true;

  // ── Media panel below the answer (image, YouTube, info) ──
  const quizMediaHtml = buildMediaHTML(card, 'Quiz');
  if (quizMediaHtml) {
    dom.quizRevealInfo.style.display = 'block';
    dom.quizRevealInfo.innerHTML = quizMediaHtml;
  } else {
    dom.quizRevealInfo.style.display = 'none';
  }

  updateQuizScore();
}

function nextQuizQuestion() {
  const q = state.quiz;
  dom.quizInput.disabled = false;

  if (q.index >= q.cards.length - 1) {
    dom.quizCard.hidden     = true;
    dom.quizFinished.hidden = false;
    dom.quizProgressBar.style.width = '100%';
    const pct = q.total > 0 ? Math.round((q.correct / q.total) * 100) : 0;
    dom.finishedScore.textContent = `${q.correct} / ${q.total} correct (${pct}%)`;
  } else {
    q.index++;
    renderQuizQuestion();
  }
}

function updateQuizScore() {
  const q = state.quiz;
  dom.quizCorrect.textContent = q.correct;
  dom.quizTotal.textContent   = q.total;
  const pct = q.total > 0 ? Math.round((q.correct / q.total) * 100) : null;
  dom.quizPct.textContent = pct !== null ? `${pct}%` : '—';
  dom.quizPct.style.color = pct === null
    ? 'var(--text-muted)'
    : pct >= 70 ? 'var(--correct)' : pct >= 40 ? 'var(--accent)' : 'var(--incorrect)';
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


// ════════════════════════════════════
//  STATS
// ════════════════════════════════════
function renderStats() {
  const data = state.filteredData;
  dom.statTotal.textContent    = data.length;
  dom.statSubjects.textContent = new Set(data.map(r => r.Subject)).size;
  dom.statRounds.textContent   = new Set(data.map(r => r.Round)).size;
  dom.statMatches.textContent  = new Set(data.map(r => r.Match)).size;
  renderBarChart(dom.chartSubject, countBy(data, 'Subject'));
  renderBarChart(dom.chartRound,   countBy(data, 'Round'));
  renderMatchChart(data);
}

function countBy(data, key) {
  const counts = {};
  data.forEach(r => { const v = r[key] || '?'; counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function renderBarChart(container, entries) {
  container.innerHTML = '';
  const max = Math.max(...entries.map(e => e[1]), 1);
  entries.forEach(([label, count]) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <span class="bar-label" title="${esc(label)}">${esc(label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:0%" data-target="${(count/max*100).toFixed(1)}%"></div></div>
      <span class="bar-count">${count}</span>`;
    container.appendChild(row);
  });
  requestAnimationFrame(() => {
    container.querySelectorAll('.bar-fill').forEach(el => { el.style.width = el.dataset.target; });
  });
}

function renderMatchChart(data) {
  const rounds = [...new Set(data.map(r => r.Round))].sort();
  const entries = [];
  rounds.forEach(round => {
    const rd = data.filter(r => r.Round === round);
    const matches = [...new Set(rd.map(r => r.Match))].sort((a,b)=>Number(a)-Number(b));
    matches.forEach(match => {
      entries.push([`Rd ${round} · Match ${match}`, rd.filter(r => r.Match === match).length]);
    });
  });
  renderBarChart(dom.chartMatch, entries);
}


// ════════════════════════════════════
//  TOAST
// ════════════════════════════════════
let toastTimer = null;
function showToast(msg) {
  dom.toast.textContent = msg;
  dom.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 2500);
}


// ════════════════════════════════════
//  MODE SWITCHING
// ════════════════════════════════════
function switchMode(mode) {
  state.currentMode = mode;
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
    tab.setAttribute('aria-selected', tab.dataset.mode === mode);
  });
  document.querySelectorAll('.mode-section').forEach(sec => {
    const active = sec.id === `mode-${mode}`;
    sec.hidden = !active;
    sec.classList.toggle('active', active);
  });

  // Show table-specific toolbar buttons only in table mode
  const toolbar = document.querySelector('.toolbar');
  if (toolbar) toolbar.classList.toggle('tbl-mode-active', mode === 'table');

  forceHideTooltip();      // dismiss info tooltip
  forceHideLocalImgPopup(); // dismiss local image popup
  stopCurrentAudio();       // stop any playing audio clip
  stopTTS();                // stop any active TTS

  if (mode === 'stats')     renderStats();
  if (mode === 'flashcard') renderFlashcard();
  if (mode === 'quiz')      renderQuizQuestion();
}


// ════════════════════════════════════
//  EVENT LISTENERS
// ════════════════════════════════════
function setupEventListeners() {

  // Theme
  dom.themeToggle.addEventListener('click', () => {
    const html  = document.documentElement;
    const dark  = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', dark ? 'light' : 'dark');
    dom.themeToggle.querySelector('.theme-icon').textContent = dark ? '☾' : '☀';
    showToast(dark ? 'Light mode' : 'Dark mode');
  });

  // Mode tabs
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });

  // Filters
  dom.globalSearch.addEventListener('input', applyFilters);
  dom.searchClear.addEventListener('click', () => {
    dom.globalSearch.value = '';
    applyFilters();
    dom.globalSearch.focus();
  });
  dom.filterYear.addEventListener('change',    applyFilters);
  dom.filterRound.addEventListener('change',   applyFilters);
  dom.filterMatch.addEventListener('change',   applyFilters);
  dom.filterSubject.addEventListener('change', applyFilters);
  dom.filterSection.addEventListener('change', applyFilters);
  dom.clearFilters.addEventListener('click', () => {
    dom.globalSearch.value = '';
    dom.filterYear.value    = '';
    dom.filterRound.value   = '';
    dom.filterMatch.value   = '';
    dom.filterSubject.value = '';
    dom.filterSection.value = '';
    applyFilters();
    showToast('Filters cleared');
  });

  // Export
  dom.exportBtn.addEventListener('click', exportCSV);

  // Column toggle
  dom.colToggleBtn.addEventListener('click', () => {
    dom.colPanel.hidden = !dom.colPanel.hidden;
  });

  // ── ReadAll TTS toggle ──
  dom.readAllBtn.addEventListener('click', () => {
    state.tts.readAll = !state.tts.readAll;
    _setToggleBtn(
      dom.readAllBtn,
      state.tts.readAll,
      'Read All ON — click to read foreign segments only',
      'Read All OFF — click to read entire text with language switching'
    );
    stopTTS();
    showToast(state.tts.readAll ? 'Read All: ON' : 'Read All: OFF');
    // Re-render table to update TTS button tooltips
    if (state.currentMode === 'table') renderTable();
  });

  // ── Toggle All Answers ──
  dom.toggleAnswersBtn.addEventListener('click', () => {
    state.tableToggles.answersHidden = !state.tableToggles.answersHidden;
    _setToggleBtn(
      dom.toggleAnswersBtn,
      state.tableToggles.answersHidden,
      'Answers hidden — click to reveal all answers',
      'Toggle all answers — hide answer text across all rows'
    );
    renderTable();
    showToast(state.tableToggles.answersHidden ? 'Answers hidden' : 'Answers visible');
  });

  // ── Toggle All Content ──
  dom.toggleContentBtn.addEventListener('click', () => {
    state.tableToggles.contentHidden = !state.tableToggles.contentHidden;
    // When toggling global content, clear per-row overrides so the
    // global state is uniformly applied across all rows.
    state.tableToggles.rowOverrides = {};
    _setToggleBtn(
      dom.toggleContentBtn,
      state.tableToggles.contentHidden,
      'Content hidden — click to reveal all row content',
      'Toggle all content — hide every cell across all rows'
    );
    renderTable();
    showToast(state.tableToggles.contentHidden ? 'Content hidden' : 'Content visible');
  });

  // ── TTS read-question icon — event delegation on tableBody ──
  dom.tableBody.addEventListener('click', e => {
    const btn = e.target.closest('.tts-read-btn');
    if (!btn) return;
    e.stopPropagation();
    speakQuestionSegments(btn.dataset.rawtext, state.tts.readAll, btn);
  });

  // ── Inline language badge — document-level delegation ──
  // Placed on document (not tableBody) so it also works in flashcard/quiz modes.
  document.addEventListener('click', e => {
    const btn = e.target.closest('.lang-speak-btn');
    if (!btn) return;
    speakSingleLangSegment(btn.dataset.text, btn.dataset.lang, btn);
  });

  // ── Row toggle button — event delegation on tableBody ──
  dom.tableBody.addEventListener('click', e => {
    const btn = e.target.closest('.row-toggle-btn');
    if (!btn) return;
    e.stopPropagation();
    toggleSingleRow(btn.dataset.pkey);
  });

  // Pagination
  dom.prevPage.addEventListener('click', () => {
    if (state.currentPage > 1) { state.currentPage--; renderTable(); }
  });
  dom.nextPage.addEventListener('click', () => {
    const ps    = parseInt(dom.pageSize.value);
    const total = Math.ceil(state.filteredData.length / ps);
    if (state.currentPage < total) { state.currentPage++; renderTable(); }
  });
  dom.pageSize.addEventListener('change', () => {
    state.currentPage = 1;
    state.pageSize    = parseInt(dom.pageSize.value);
    renderTable();
  });

  // ══ INFO TOOLTIP — event delegation on tableBody ══
  // Using delegation means we don't need to re-attach listeners after each render.
  //
  // DESKTOP (mouse): hover over ⓘ to open, move away to close.
  // TOUCH (tablet/phone): tap ⓘ to open and auto-pin; use close button or
  //   Escape to dismiss. There is no hover on touch so auto-pin is the only
  //   sensible behaviour — the panel must stay visible until the user is done.
  //
  // We distinguish touch from mouse via e.pointerType on the click event.
  // Both device types fire 'click', so one listener handles both cleanly.

  // Mouse-only: hover to show / move away to hide
  dom.tableBody.addEventListener('mouseover', e => {
    if (e.pointerType === 'touch') return; // handled by click below
    const icon = e.target.closest('.info-icon');
    if (icon) showTooltip(icon, e.clientX, e.clientY);
  });
  dom.tableBody.addEventListener('mouseout', e => {
    if (e.pointerType === 'touch') return;
    const icon = e.target.closest('.info-icon');
    if (icon) hideTooltip();
  });

  // All devices: click/tap the ⓘ icon
  dom.tableBody.addEventListener('click', e => {
    const icon = e.target.closest('.info-icon');
    if (!icon) return;

    // On touch: first tap opens + auto-pins; second tap closes.
    // On mouse: click while the panel is visible acts as a quick pin toggle.
    if (dom.infoTooltip.classList.contains('visible') && _tooltipAnchorIcon === icon) {
      // Same icon tapped again — toggle: close if pinned, pin if not
      if (_tooltipPinned) forceHideTooltip();
      else _setTooltipPinned(true);
    } else {
      // Different icon or panel was hidden — open fresh
      showTooltip(icon, e.clientX, e.clientY);
      // Auto-pin on touch so the panel doesn't immediately vanish
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        _setTooltipPinned(true);
      }
    }
  });

  // Keep tooltip alive when mouse moves into the tooltip itself.
  // Guard against touch: touchmove inside the body fires mouseleave on some
  // browsers, which would dismiss the panel mid-scroll.
  dom.infoTooltip.addEventListener('mouseenter', e => {
    if (e.pointerType === 'touch') return;
    clearTimeout(_tooltipHideTimer);
  });
  dom.infoTooltip.addEventListener('mouseleave', e => {
    if (e.pointerType === 'touch') return;
    hideTooltip();
  });

  // ── Pin button — toggle pin state ──
  dom.tooltipPinBtn.addEventListener('click', e => {
    e.stopPropagation();
    _setTooltipPinned(!_tooltipPinned);
  });

  // ── Close button — always dismisses, even when pinned ──
  dom.tooltipCloseBtn.addEventListener('click', e => {
    e.stopPropagation();
    forceHideTooltip();
  });

  // ── Drag — pointer events handle mouse, touch, and stylus ──
  _initTooltipDrag();

  // ── Resize — custom handle, pointer events, all devices ──
  _initTooltipResize();

  // ────────────────────────────────────
  // AUDIO ICON — event delegation on tableBody
  // A single click listener handles play/stop for all ♪ buttons across
  // all paginated renders without re-attaching after each render.
  // ────────────────────────────────────
  dom.tableBody.addEventListener('click', e => {
    const audioBtn = e.target.closest('.audio-icon');
    if (!audioBtn) return;
    e.stopPropagation(); // don't bubble into the row or other listeners
    playAudioClip(audioBtn.dataset.audio, audioBtn);
  });

  // ────────────────────────────────────
  // LOCAL IMAGE ICON — event delegation on tableBody
  // Same-icon tap toggles the popup open/closed.
  // Different-icon tap closes the current popup and opens the new one.
  // ────────────────────────────────────
  dom.tableBody.addEventListener('click', e => {
    const imgBtn = e.target.closest('.local-img-icon');
    if (!imgBtn) return;
    e.stopPropagation();

    if (dom.localImgPopup.classList.contains('visible') && _localImgAnchorIcon === imgBtn) {
      // Same icon clicked again → close (or pin/unpin if pinned)
      if (_localImgPinned) forceHideLocalImgPopup();
      else forceHideLocalImgPopup();
    } else {
      // Different icon, or popup was hidden → open fresh
      showLocalImgPopup(imgBtn, e.clientX, e.clientY);
      // Auto-pin on touch so panel doesn't vanish immediately
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        _setLocalImgPinned(true);
      }
    }
  });

  // ── Local image popup: pin button ──
  dom.localImgPinBtn.addEventListener('click', e => {
    e.stopPropagation();
    _setLocalImgPinned(!_localImgPinned);
  });

  // ── Local image popup: close button ──
  dom.localImgCloseBtn.addEventListener('click', e => {
    e.stopPropagation();
    forceHideLocalImgPopup();
  });

  // ── Local image popup: drag + resize ──
  _initLocalImgDrag();
  _initLocalImgResize();

  // Keyboard accessibility: show on focus, hide on blur.
  // No pointer coordinates available for keyboard focus — positionAtPointer
  // will fall back to viewport centre, which is always reachable.
  dom.tableBody.addEventListener('focusin', e => {
    const icon = e.target.closest('.info-icon');
    if (!icon) return;
    const r = icon.getBoundingClientRect();
    showTooltip(icon, r.left + r.width / 2, r.bottom);
  });
  dom.tableBody.addEventListener('focusout', e => {
    const icon = e.target.closest('.info-icon');
    if (icon) hideTooltip(200);
  });
  // Press Escape to force-dismiss tooltip (works even when pinned)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      forceHideTooltip();
      forceHideLocalImgPopup();
      stopCurrentAudio();
      stopTTS();
    }
  });
  // Scroll: the panel is position:fixed so it doesn't move with the page.
  // All we need to do is hide it if the user scrolls the anchor icon
  // completely off-screen (and the panel isn't pinned or manually dragged).
  window.addEventListener('scroll', () => {
    if (!dom.infoTooltip.classList.contains('visible')) return;
    if (_tooltipPinned || _tooltipDragged) return;
    if (!_tooltipAnchorIcon) return;
    const r = _tooltipAnchorIcon.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) hideTooltip(0);
  }, { passive: true });

  // ── Flashcard ──
  dom.flashcard.addEventListener('click', () => dom.flashcard.classList.toggle('flipped'));
  dom.flashcard.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); dom.flashcard.classList.toggle('flipped'); }
    if (e.key === 'ArrowLeft')  { dom.flashcard.classList.remove('flipped'); fcNav(-1); }
    if (e.key === 'ArrowRight') { dom.flashcard.classList.remove('flipped'); fcNav(1); }
  });
  dom.fcShuffle.addEventListener('click', () => {
    shuffleArray(state.fc.cards); state.fc.index = 0;
    renderFlashcard(); showToast('Cards shuffled');
  });
  dom.fcReset.addEventListener('click', () => {
    state.fc.cards = [...state.filteredData]; state.fc.index = 0;
    renderFlashcard(); showToast('Cards reset');
  });
  document.getElementById('fcPrev').addEventListener('click', () => fcNav(-1));
  document.getElementById('fcNext').addEventListener('click', () => fcNav(1));

  // ── Quiz ──
  dom.quizSubmit.addEventListener('click', submitQuizAnswer);
  dom.quizInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (!state.quiz.answered) submitQuizAnswer();
      else nextQuizQuestion();
    }
  });
  dom.quizNextQ.addEventListener('click', nextQuizQuestion);
  dom.quizShuffle.addEventListener('click', () => {
    shuffleArray(state.quiz.cards);
    Object.assign(state.quiz, { index:0, correct:0, total:0, answered:false });
    dom.quizInput.disabled = false;
    renderQuizQuestion(); updateQuizScore();
    showToast('Questions shuffled');
  });
  const quizRestartFn = () => {
    Object.assign(state.quiz, { index:0, correct:0, total:0, answered:false });
    dom.quizInput.disabled = false;
    renderQuizQuestion(); updateQuizScore();
    showToast('Quiz restarted');
  };
  dom.quizRestart.addEventListener('click',  quizRestartFn);
  dom.quizRestart2.addEventListener('click', quizRestartFn);
}

function fcNav(dir) {
  const cards = state.fc.cards;
  if (!cards.length) return;
  state.fc.index = (state.fc.index + dir + cards.length) % cards.length;
  renderFlashcard();
}


// ════════════════════════════════════
//  KICK OFF
// ════════════════════════════════════
document.addEventListener('DOMContentLoaded', init);
