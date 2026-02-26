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
    { key: 'Info',    label: 'Info',    visible: false, type: 'str' },
  ],

  fc:   { cards: [], index: 0 },
  quiz: { cards: [], index: 0, correct: 0, total: 0, answered: false },
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
  infoTooltip:     $('infoTooltip'),
  infoTooltipBody: $('infoTooltipBody'),

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
    visibleCols.forEach(col => {
      const td = document.createElement('td');
      const val = String(row[col.key] ?? '');

      if (col.key === 'Subject') {
        td.innerHTML = `<span class="subject-badge">${esc(val)}</span>`;

      } else if (col.key === 'Answer') {
        // ── Answer cell: text + optional ⓘ icon ──
        // The td uses display:flex (set in CSS) to align text and icon.
        td.className = 'col-answer';
        const info = String(row.Info || '').trim();

        if (info) {
          // Encode info text safely into a data attribute.
          // JS tooltip handler reads this on mouseenter.
          td.innerHTML =
            `<span>${search ? highlight(esc(val), search) : esc(val)}</span>` +
            `<button class="info-icon" data-info="${esc(info)}" aria-label="Research note — hover to read" tabindex="0">ⓘ</button>`;
        } else {
          td.innerHTML = `<span>${search ? highlight(esc(val), search) : esc(val)}</span>`;
        }

      } else if (['Pkey','Qkey','Year','Round','Match'].includes(col.key)) {
        td.className = 'col-num';
        td.textContent = val;

      } else if (col.key === 'Question') {
        td.className = 'col-question';
        td.innerHTML = search ? highlight(esc(val), search) : esc(val);

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
//  INFO TOOLTIP
//
//  A single floating div lives at body level (see index.html).
//  We use event delegation on tableBody so it works across all
//  paginated renders without re-attaching listeners.
//
//  Positioning logic:
//    1. Get the icon's bounding rect.
//    2. Try to place the tooltip below the icon (most common).
//    3. If it would overflow the viewport bottom, flip it above.
//    4. Clamp horizontally so it never clips off screen edges.
// ════════════════════════════════════
let _tooltipHideTimer = null;

function showTooltip(iconEl) {
  clearTimeout(_tooltipHideTimer);

  const raw  = iconEl.dataset.info || '';
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return;

  // Populate content
  dom.infoTooltipBody.innerHTML = lines.map(l => `<p>${esc(l)}</p>`).join('');
  dom.infoTooltip.setAttribute('aria-hidden', 'false');

  // Position
  positionTooltip(iconEl);

  // Show
  dom.infoTooltip.classList.add('visible');
}

function positionTooltip(iconEl) {
  const GAP     = 8;  // px between icon and tooltip
  const MARGIN  = 12; // min px from viewport edges
  const tip     = dom.infoTooltip;
  const rect    = iconEl.getBoundingClientRect();
  const tipW    = tip.offsetWidth  || 320;
  const tipH    = tip.offsetHeight || 200;
  const vw      = window.innerWidth;
  const vh      = window.innerHeight;

  // Default: below icon, left-aligned to icon
  let top  = rect.bottom + GAP + window.scrollY;
  let left = rect.left   + window.scrollX;

  // Flip above if overflows bottom of viewport
  if (rect.bottom + GAP + tipH > vh) {
    top = rect.top - GAP - tipH + window.scrollY;
  }

  // Clamp horizontal — don't clip off right edge
  if (left + tipW > vw - MARGIN) {
    left = vw - tipW - MARGIN + window.scrollX;
  }
  // Don't clip off left edge
  if (left < MARGIN + window.scrollX) {
    left = MARGIN + window.scrollX;
  }

  tip.style.top  = `${top}px`;
  tip.style.left = `${left}px`;
}

function hideTooltip(delay = 120) {
  _tooltipHideTimer = setTimeout(() => {
    dom.infoTooltip.classList.remove('visible');
    dom.infoTooltip.setAttribute('aria-hidden', 'true');
  }, delay);
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
  dom.fcQuestion.textContent = card.Question;
  dom.fcAnswer.textContent   = card.Answer;
  dom.fcMeta.innerHTML = `
    <span class="meta-tag">${card.Subject}</span>
    <span class="meta-tag">Yr ${card.Year}</span>
    <span class="meta-tag">Rd ${card.Round}</span>
    <span class="meta-tag">Mtch ${card.Match}</span>`;
  dom.fcProgressBar.style.width = `${((i + 1) / cards.length) * 100}%`;

  // ── Research note on the back of the card ──
  // Displayed below the answer, separated by a subtle border.
  const info = String(card.Info || '').trim();
  if (info) {
    const lines = info.split('\n').map(l => l.trim()).filter(Boolean);
    dom.fcInfo.style.display = 'block';
    dom.fcInfo.innerHTML =
      `<div class="fc-info-label">◈ Comment(s)</div>` +
      lines.map(l => `<p>${esc(l)}</p>`).join('');
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
  dom.quizQuestion.textContent = card.Question;
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

  dom.quizRevealAnswer.textContent = card.Answer;
  dom.quizFeedback.textContent = isCorrect ? '✓ Correct!' : '✗ Incorrect';
  dom.quizFeedback.className   = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
  dom.quizReveal.hidden        = false;
  dom.quizInput.disabled       = true;

  // ── Show research note below the answer when available ──
  const info = String(card.Info || '').trim();
  if (info) {
    const lines = info.split('\n').map(l => l.trim()).filter(Boolean);
    dom.quizRevealInfo.style.display = 'block';
    dom.quizRevealInfo.innerHTML =
      `<div class="quiz-reveal-info-label">◈ Comment(s)</div>` +
      lines.map(l => `<p>${esc(l)}</p>`).join('');
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
  hideTooltip(0); // hide tooltip when switching modes
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
  dom.tableBody.addEventListener('mouseover', e => {
    const icon = e.target.closest('.info-icon');
    if (icon) showTooltip(icon);
  });
  dom.tableBody.addEventListener('mouseout', e => {
    const icon = e.target.closest('.info-icon');
    if (icon) hideTooltip();
  });
  // Keep tooltip alive when mouse moves into the tooltip itself
  dom.infoTooltip.addEventListener('mouseenter', () => clearTimeout(_tooltipHideTimer));
  dom.infoTooltip.addEventListener('mouseleave', () => hideTooltip());

  // Keyboard accessibility: show on focus, hide on blur
  dom.tableBody.addEventListener('focusin', e => {
    const icon = e.target.closest('.info-icon');
    if (icon) showTooltip(icon);
  });
  dom.tableBody.addEventListener('focusout', e => {
    const icon = e.target.closest('.info-icon');
    if (icon) hideTooltip(200);
  });
  // Press Escape to dismiss tooltip
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hideTooltip(0);
  });
  // Scroll/resize: reposition live if tooltip is visible
  window.addEventListener('scroll', () => {
    if (dom.infoTooltip.classList.contains('visible')) {
      const activeIcon = dom.tableBody.querySelector('.info-icon:focus, .info-icon:hover');
      if (activeIcon) positionTooltip(activeIcon);
      else hideTooltip(0);
    }
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
