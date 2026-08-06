'use strict';

// ── tiny utils ──────────────────────────────────────────────────────────────

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function fmtNum(n) {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.round(n));
}

function fmtInt(n) {
  return n == null ? '—' : Math.round(n).toLocaleString('fr-FR');
}

function fmtPct(x) {
  return x == null ? '—' : `${Math.round(x * 100)}%`;
}

function fmtBytes(bytes) {
  if (bytes == null) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let v = bytes, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtShortDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'à l\'instant';
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) node.appendChild(c);
  return node;
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** "Nice" round ticks (0 included) spanning [0, maxVal]. */
function niceTicks(maxVal, count = 4) {
  if (maxVal <= 0) return [0, 1];
  const rough = maxVal / (count - 1);
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const ticks = [];
  for (let v = 0; v <= maxVal + step * 0.001; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks.length > 1 ? ticks : [0, step];
}

function toSvgPoint(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

// ── API ─────────────────────────────────────────────────────────────────────

async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    ...opts,
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── chart card scaffold (title, hint, table-view toggle) ───────────────────

function chartCard({ title, hint }) {
  const wrap = el('div', { class: 'card' });
  const head = el('div', { class: 'card-head' });
  head.appendChild(el('h3', { text: title }));
  const right = el('div', { style: 'display:flex; align-items:center; gap:10px;' });
  if (hint) right.appendChild(el('span', { class: 'hint', text: hint }));
  const toggleBtn = el('button', { class: 'table-toggle', text: 'Tableau' });
  right.appendChild(toggleBtn);
  head.appendChild(right);
  wrap.appendChild(head);
  const chartWrap = el('div', { class: 'chart-wrap' });
  const tableWrap = el('div', { class: 'hidden' });
  wrap.appendChild(chartWrap);
  wrap.appendChild(tableWrap);
  let showingTable = false;
  toggleBtn.addEventListener('click', () => {
    showingTable = !showingTable;
    chartWrap.classList.toggle('hidden', showingTable);
    tableWrap.classList.toggle('hidden', !showingTable);
    toggleBtn.textContent = showingTable ? 'Graphique' : 'Tableau';
  });
  return { wrap, chartWrap, tableWrap };
}

function renderTable(container, columns, rows) {
  container.innerHTML = '';
  const table = el('table', { class: 'data-table' });
  const thead = el('tr');
  for (const c of columns) thead.appendChild(el('th', { text: c.label }));
  table.appendChild(el('thead', {}, thead));
  const tbody = el('tbody');
  for (const row of rows) {
    const tr = el('tr');
    for (const c of columns) {
      const td = el('td', c.numeric === false ? {} : {});
      if (c.numeric === false) td.classList.add('name-cell');
      td.textContent = c.format ? c.format(row) : String(row[c.key] ?? '—');
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}

// ── tooltip helper ──────────────────────────────────────────────────────────

function makeTooltip(hostEl) {
  const tip = el('div', { class: 'tooltip' });
  hostEl.appendChild(tip);
  return {
    show(xPx, yPx, html) {
      tip.innerHTML = html;
      tip.style.left = `${xPx}px`;
      tip.style.top = `${yPx}px`;
      tip.classList.add('show');
    },
    hide() { tip.classList.remove('show'); },
  };
}

// ── line chart (single series, time axis) ───────────────────────────────────

function renderLineChart(chartWrap, { data, dateKey, valueKey, color, valueFmt = fmtInt }) {
  chartWrap.innerHTML = '';
  if (!data.length) {
    chartWrap.appendChild(el('div', { class: 'chart-empty', text: 'Pas de données' }));
    return;
  }
  const W = 600, H = 200, padL = 34, padR = 10, padT = 14, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxVal = Math.max(...data.map((d) => d[valueKey]), 1);
  const ticks = niceTicks(maxVal, 4);
  const yMax = ticks[ticks.length - 1];
  const x = (i) => padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => padT + innerH - (v / yMax) * innerH;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Graphique en ligne' });

  const gridColor = css('--grid');
  const textColor = css('--text-tertiary');
  for (const t of ticks) {
    svg.appendChild(svgEl('line', { x1: padL, x2: W - padR, y1: y(t), y2: y(t), stroke: gridColor, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: 4, y: y(t) + 3, 'font-size': 9, fill: textColor }));
    svg.lastChild.textContent = fmtNum(t);
  }

  const linePoints = data.map((d, i) => `${x(i)},${y(d[valueKey])}`).join(' ');
  const areaPoints = `${x(0)},${y(0)} ${linePoints} ${x(data.length - 1)},${y(0)}`;
  svg.appendChild(svgEl('polygon', { points: areaPoints, fill: color, opacity: 0.1 }));
  svg.appendChild(svgEl('polyline', {
    points: linePoints, fill: 'none', stroke: color, 'stroke-width': 2,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  }));

  // end marker + direct label
  const lastI = data.length - 1;
  const lastX = x(lastI), lastY = y(data[lastI][valueKey]);
  svg.appendChild(svgEl('circle', { cx: lastX, cy: lastY, r: 4, fill: color, stroke: css('--card'), 'stroke-width': 2 }));
  const labelText = valueFmt(data[lastI][valueKey]);
  svg.appendChild(svgEl('text', {
    x: Math.min(lastX + 6, W - padR - 4 - labelText.length * 5.5), y: lastY - 8,
    'font-size': 11, 'font-weight': 700, fill: css('--text'), 'text-anchor': 'start',
  }));
  svg.lastChild.textContent = labelText;

  // x-axis: first/last date
  svg.appendChild(svgEl('text', { x: x(0), y: H - 6, 'font-size': 9, fill: textColor, 'text-anchor': 'start' }));
  svg.lastChild.textContent = fmtShortDate(data[0][dateKey]);
  svg.appendChild(svgEl('text', { x: x(lastI), y: H - 6, 'font-size': 9, fill: textColor, 'text-anchor': 'end' }));
  svg.lastChild.textContent = fmtShortDate(data[lastI][dateKey]);

  // hover layer
  const crosshair = svgEl('line', { x1: 0, x2: 0, y1: padT, y2: H - padB, stroke: css('--text-tertiary'), 'stroke-width': 1, opacity: 0 });
  svg.appendChild(crosshair);
  const hoverDot = svgEl('circle', { r: 5, fill: color, stroke: css('--card'), 'stroke-width': 2, opacity: 0 });
  svg.appendChild(hoverDot);
  const hitRect = svgEl('rect', { x: padL, y: padT, width: innerW, height: innerH, fill: 'transparent' });
  svg.appendChild(hitRect);

  chartWrap.style.position = 'relative';
  chartWrap.appendChild(svg);
  const tooltip = makeTooltip(chartWrap);

  function onMove(clientX, clientY) {
    const pt = toSvgPoint(svg, clientX, clientY);
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(((pt.x - padL) / innerW) * (data.length - 1))));
    const d = data[idx];
    const px = x(idx), py = y(d[valueKey]);
    crosshair.setAttribute('x1', px); crosshair.setAttribute('x2', px); crosshair.setAttribute('opacity', 1);
    hoverDot.setAttribute('cx', px); hoverDot.setAttribute('cy', py); hoverDot.setAttribute('opacity', 1);
    const rect = svg.getBoundingClientRect();
    const scaleX = rect.width / W, scaleY = rect.height / H;
    tooltip.show(
      px * scaleX,
      py * scaleY,
      `<div class="t-val">${valueFmt(d[valueKey])}</div><div class="t-label">${fmtShortDate(d[dateKey])}</div>`
    );
  }
  hitRect.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  hitRect.addEventListener('mouseleave', () => { crosshair.setAttribute('opacity', 0); hoverDot.setAttribute('opacity', 0); tooltip.hide(); });
  hitRect.addEventListener('touchmove', (e) => { if (e.touches[0]) { onMove(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); } }, { passive: false });
  hitRect.addEventListener('touchend', () => { crosshair.setAttribute('opacity', 0); hoverDot.setAttribute('opacity', 0); tooltip.hide(); });
}

// ── vertical bar chart (small category counts — rank / goal distribution) ──

function renderBarChart(chartWrap, { data, labelKey, valueKey, colorFor, valueFmt = fmtInt }) {
  chartWrap.innerHTML = '';
  const maxVal = Math.max(...data.map((d) => d[valueKey]), 1);
  if (maxVal === 0 && data.every((d) => d[valueKey] === 0)) {
    // still draw an empty axis rather than "no data" — zero counts are meaningful here
  }
  const W = 600, H = 200, padL = 30, padR = 10, padT = 20, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = data.length;
  const slot = innerW / n;
  const barW = Math.min(40, slot * 0.55);
  const ticks = niceTicks(maxVal, 4);
  const yMax = ticks[ticks.length - 1];
  const y = (v) => padT + innerH - (v / yMax) * innerH;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Graphique en barres' });
  const gridColor = css('--grid'), textColor = css('--text-tertiary');
  for (const t of ticks) {
    svg.appendChild(svgEl('line', { x1: padL, x2: W - padR, y1: y(t), y2: y(t), stroke: gridColor, 'stroke-width': 1 }));
  }

  const tooltip = makeTooltip(chartWrap);
  chartWrap.style.position = 'relative';

  data.forEach((d, i) => {
    const cx = padL + slot * i + slot / 2;
    const barH = Math.max(0, (d[valueKey] / yMax) * innerH);
    const barY = padT + innerH - barH;
    const color = colorFor(d, i);
    const rectEl = svgEl('rect', {
      x: cx - barW / 2, y: barY, width: barW, height: Math.max(barH, 1), rx: 4, ry: 4, fill: color,
    });
    svg.appendChild(rectEl);
    // value on top
    svg.appendChild(svgEl('text', { x: cx, y: barY - 6, 'font-size': 11, 'font-weight': 700, fill: css('--text'), 'text-anchor': 'middle' }));
    svg.lastChild.textContent = valueFmt(d[valueKey]);
    // category label
    svg.appendChild(svgEl('text', { x: cx, y: H - 8, 'font-size': 9.5, fill: textColor, 'text-anchor': 'middle' }));
    svg.lastChild.textContent = d[labelKey];

    const hit = svgEl('rect', { x: padL + slot * i, y: padT, width: slot, height: innerH, fill: 'transparent' });
    hit.addEventListener('mouseenter', () => rectEl.setAttribute('opacity', 0.8));
    hit.addEventListener('mouseleave', () => { rectEl.setAttribute('opacity', 1); tooltip.hide(); });
    hit.addEventListener('mousemove', (e) => {
      const rect = svg.getBoundingClientRect();
      const scaleX = rect.width / W, scaleY = rect.height / H;
      tooltip.show(cx * scaleX, barY * scaleY, `<div class="t-val">${valueFmt(d[valueKey])}</div><div class="t-label">${d[labelKey]}</div>`);
    });
    svg.appendChild(hit);
  });

  chartWrap.appendChild(svg);
}

// ── ranked horizontal bars (HTML, for long labels — top exercises) ─────────

function renderRankedBars(container, { data, labelKey, valueKey, subKey, subLabel, color }) {
  container.innerHTML = '';
  if (!data.length) {
    container.appendChild(el('div', { class: 'chart-empty', text: 'Pas de données' }));
    return;
  }
  const maxVal = Math.max(...data.map((d) => d[valueKey]), 1);
  const list = el('div', { style: 'display:flex; flex-direction:column; gap:12px;' });
  data.forEach((d, i) => {
    const pct = Math.max(4, (d[valueKey] / maxVal) * 100);
    const row = el('div');
    const top = el('div', { style: 'display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px; gap:8px;' });
    const name = el('span', { style: 'font-size:13px; font-weight:600;' });
    name.textContent = `${i + 1}. ${d[labelKey]}`;
    const val = el('span', { style: 'font-size:12.5px; color:var(--text-secondary); flex:none; font-variant-numeric:tabular-nums;' });
    val.textContent = subKey ? `${fmtInt(d[valueKey])} · ${d[subKey]} ${subLabel}` : fmtInt(d[valueKey]);
    top.appendChild(name); top.appendChild(val);
    const track = el('div', { style: 'height:10px; border-radius:5px; background:var(--card-raised); overflow:hidden;' });
    const fill = el('div', { style: `height:100%; width:${pct}%; border-radius:5px; background:${color};` });
    track.appendChild(fill);
    row.appendChild(top); row.appendChild(track);
    list.appendChild(row);
  });
  container.appendChild(list);
}

// ── stat tiles ───────────────────────────────────────────────────────────────

function renderTiles(container, tiles) {
  container.innerHTML = '';
  for (const t of tiles) {
    const tile = el('div', { class: 'tile' });
    tile.appendChild(el('p', { class: 'label', text: t.label }));
    tile.appendChild(el('p', { class: 'value', text: t.value }));
    if (t.sub) tile.appendChild(el('p', { class: 'sub', text: t.sub }));
    container.appendChild(tile);
  }
}

// ── theme toggle ───────────────────────────────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem('ningyma-admin-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('theme-toggle');
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme')
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ningyma-admin-theme', next);
  });
}

// ── auth flow ────────────────────────────────────────────────────────────────

const RANK_NAMES = ['Fer', 'Bronze', 'Acier', 'Argent', 'Or', 'Légende'];
const RANK_VARS = ['--rank-1', '--rank-2', '--rank-3', '--rank-4', '--rank-5', '--rank-6'];
const GOAL_LABELS = { cut: 'Sèche', maintain: 'Maintien', bulk: 'Prise de masse' };
const GOAL_VARS = { cut: '--div-cut', maintain: '--div-maintain', bulk: '--div-bulk' };

async function showLogin(message) {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  const err = document.getElementById('login-error');
  err.textContent = message || '';
}

async function boot() {
  initTheme();
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button');
    btn.disabled = true;
    try {
      await api('/login', {
        method: 'POST',
        body: JSON.stringify({
          username: document.getElementById('login-username').value,
          password: document.getElementById('login-password').value,
        }),
      });
      await enterDashboard();
    } catch {
      showLogin('Identifiants incorrects.');
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api('/logout', { method: 'POST' }).catch(() => {});
    showLogin();
  });

  try {
    await api('/me');
    await enterDashboard();
  } catch {
    showLogin();
  }
}

async function enterDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  await loadDashboard(30);

  let activePeriod = 30;
  document.querySelectorAll('.period-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const days = Number(pill.dataset.days);
      if (days === activePeriod) return;
      activePeriod = days;
      document.querySelectorAll('.period-pill').forEach((p) => p.classList.toggle('active', p === pill));
      loadTimeSeries(days);
    });
  });
}

async function loadTimeSeries(days) {
  const [growth, activity] = await Promise.all([
    api(`/growth?days=${days}`),
    api(`/activity?days=${days}`),
  ]);
  const gold = css('--gold');
  const cGrowth = chartCards.growth;
  renderLineChart(cGrowth.chartWrap, { data: growth, dateKey: 'date', valueKey: 'count', color: gold });
  renderTable(cGrowth.tableWrap, [
    { key: 'date', label: 'Date', format: (r) => fmtShortDate(r.date) },
    { key: 'count', label: 'Nouveaux comptes' },
  ], growth);

  const cSessions = chartCards.sessions;
  renderLineChart(cSessions.chartWrap, { data: activity, dateKey: 'date', valueKey: 'sessions', color: gold });
  renderTable(cSessions.tableWrap, [
    { key: 'date', label: 'Date', format: (r) => fmtShortDate(r.date) },
    { key: 'sessions', label: 'Séances loguées' },
  ], activity);

  const cActive = chartCards.activeUsers;
  renderLineChart(cActive.chartWrap, { data: activity, dateKey: 'date', valueKey: 'activeUsers', color: gold });
  renderTable(cActive.tableWrap, [
    { key: 'date', label: 'Date', format: (r) => fmtShortDate(r.date) },
    { key: 'activeUsers', label: 'Utilisateurs actifs' },
  ], activity);
}

const chartCards = {};

async function loadDashboard(days) {
  const [overview, rankDist, goalDist, topExercises, recentUsers, system] = await Promise.all([
    api('/overview'),
    api('/rank-distribution'),
    api('/goal-distribution'),
    api('/top-exercises?limit=10'),
    api('/recent-users?limit=15'),
    api('/system'),
  ]);

  // ── KPI tiles ──
  renderTiles(document.getElementById('tiles'), [
    { label: 'Utilisateurs', value: fmtInt(overview.totalUsers), sub: `+${overview.newUsers7d} sur 7j` },
    { label: 'Nouveaux (30j)', value: fmtInt(overview.newUsers30d) },
    { label: 'Actifs (7j)', value: fmtInt(overview.activeUsers7d), sub: overview.totalUsers ? `${fmtPct(overview.activeUsers7d / overview.totalUsers)} de la base` : null },
    { label: 'Séances loguées', value: fmtNum(overview.totalSessions) },
    { label: 'Séries loguées', value: fmtNum(overview.totalSets) },
    { label: 'Onboarding complété', value: fmtPct(overview.onboardingCompletionRate) },
    { label: 'Notifs push activées', value: fmtPct(overview.pushOptInRate) },
    { label: 'Nutrition active (7j)', value: fmtInt(overview.nutritionUsers7d) },
  ]);

  // ── time series cards (mount once) ──
  const growthCol = document.getElementById('chart-growth');
  const sessionsCol = document.getElementById('chart-sessions');
  const activeCol = document.getElementById('chart-active');
  if (!chartCards.growth) {
    chartCards.growth = chartCard({ title: 'Nouveaux comptes' });
    growthCol.appendChild(chartCards.growth.wrap);
    chartCards.sessions = chartCard({ title: 'Séances par jour' });
    sessionsCol.appendChild(chartCards.sessions.wrap);
    chartCards.activeUsers = chartCard({ title: 'Utilisateurs actifs par jour' });
    activeCol.appendChild(chartCards.activeUsers.wrap);
  }
  await loadTimeSeries(days);

  // ── rank distribution ──
  const rankCard = chartCard({ title: 'Répartition des rangs', hint: 'saison en cours' });
  document.getElementById('chart-ranks').innerHTML = '';
  document.getElementById('chart-ranks').appendChild(rankCard.wrap);
  renderBarChart(rankCard.chartWrap, {
    data: rankDist,
    labelKey: 'rank',
    valueKey: 'count',
    colorFor: (d) => css(RANK_VARS[RANK_NAMES.indexOf(d.rank)] ?? '--gold'),
  });
  renderTable(rankCard.tableWrap, [{ key: 'rank', label: 'Rang', numeric: false }, { key: 'count', label: 'Utilisateurs' }], rankDist);

  // ── goal distribution ──
  const goalCard = chartCard({ title: 'Objectifs' });
  document.getElementById('chart-goals').innerHTML = '';
  document.getElementById('chart-goals').appendChild(goalCard.wrap);
  renderBarChart(goalCard.chartWrap, {
    data: goalDist.map((d) => ({ ...d, labelFr: GOAL_LABELS[d.goal] })),
    labelKey: 'labelFr',
    valueKey: 'count',
    colorFor: (d) => css(GOAL_VARS[d.goal]),
  });
  renderTable(goalCard.tableWrap, [
    { key: 'goal', label: 'Objectif', numeric: false, format: (r) => GOAL_LABELS[r.goal] },
    { key: 'count', label: 'Utilisateurs' },
  ], goalDist);

  // ── top exercises ──
  const exCard = chartCard({ title: 'Exercices les plus loggés' });
  document.getElementById('chart-exercises').innerHTML = '';
  document.getElementById('chart-exercises').appendChild(exCard.wrap);
  renderRankedBars(exCard.chartWrap, {
    data: topExercises, labelKey: 'name', valueKey: 'setsCount', subKey: 'usersCount', subLabel: 'utilisateurs',
    color: css('--gold'),
  });
  renderTable(exCard.tableWrap, [
    { key: 'name', label: 'Exercice', numeric: false },
    { key: 'setsCount', label: 'Séries' },
    { key: 'usersCount', label: 'Utilisateurs' },
  ], topExercises);

  // ── recent users table ──
  const usersBody = document.getElementById('recent-users-table');
  renderTable(usersBody, [
    { key: 'username', label: 'Pseudo', numeric: false },
    { key: 'rank', label: 'Rang', numeric: false, format: (r) => r.rank ? `${r.rank} ${r.division ?? ''}`.trim() : '—' },
    { key: 'sessionsCount', label: 'Séances' },
    { key: 'lastSessionDate', label: 'Dernière séance', numeric: false, format: (r) => r.lastSessionDate ? fmtShortDate(r.lastSessionDate) : '—' },
    { key: 'createdAt', label: 'Inscrit', numeric: false, format: (r) => fmtShortDate(String(r.createdAt).slice(0, 10)) },
  ], recentUsers);

  // ── system health ──
  const sysContainer = document.getElementById('system-health');
  sysContainer.innerHTML = '';
  const apple = system.appleReview;
  const appleGood = apple?.state === 'READY_FOR_SALE' || apple?.state === 'ACCEPTED';
  const appleBad = apple?.state === 'REJECTED' || apple?.state === 'DEVELOPER_REJECTED';
  sysContainer.appendChild(statusRow({
    dot: appleGood ? 'good' : appleBad ? 'bad' : 'warn',
    title: 'Statut App Store',
    sub: apple ? `${apple.state} · v${apple.versionString} · vérifié ${timeAgo(apple.checkedAt)}` : 'Aucune donnée',
  }));
  const backups = system.backups;
  const backupStale = backups?.latestAt && (Date.now() - new Date(backups.latestAt).getTime()) > 36 * 3600 * 1000;
  sysContainer.appendChild(statusRow({
    dot: !backups ? 'bad' : backupStale ? 'warn' : 'good',
    title: 'Sauvegarde base de données',
    sub: backups
      ? `${fmtDateTime(backups.latestAt)} · ${fmtBytes(backups.latestSizeBytes)} · ${backups.count} conservées (${fmtBytes(backups.totalBytes)})`
      : 'Aucune donnée',
  }));
}

function statusRow({ dot, title, sub }) {
  const row = el('div', { class: 'status-row' });
  row.appendChild(el('span', { class: `status-dot ${dot}` }));
  const text = el('div');
  text.appendChild(el('p', { class: 's-title', text: title }));
  text.appendChild(el('p', { class: 's-sub', text: sub }));
  row.appendChild(text);
  return row;
}

boot();
