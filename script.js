// script.js - 駅伝部マネージャー

// ==== Global State ====
let runners = [];
let laps = [];       // { id, runnerId, lapNumber, timeMs, comment }
let sessionActive = false;
let startTime = 0;
let timerInterval = null;
let lapDistance = 300; // default meters
let animationId = null; // requestAnimationFrame handle

// ==== DOM refs ====
const runnerForm          = document.getElementById('runnerForm');
const runnerNameInput     = document.getElementById('runnerName');
const runnerList          = document.getElementById('runnerList');
const lapDistanceSelect   = document.getElementById('lapDistance');
const lapDistanceCustom   = document.getElementById('lapDistanceCustom');
const startSessionBtn     = document.getElementById('startSession');
const recordingView       = document.getElementById('recordingView');
const resultSection       = document.getElementById('resultSection');
const summaryView         = document.getElementById('summaryView');
const runnerButtonsDiv    = document.getElementById('runnerButtons');
const timerDisplay        = document.getElementById('timerDisplay');
const recordAllBtn        = document.getElementById('recordAll');
const resultContainer     = document.getElementById('resultContainer');
const exportCsvBtn        = document.getElementById('exportCsv');
const summaryContainer    = document.getElementById('summaryContainer');
const showRecordingBtn    = document.getElementById('showRecording');
const showSummaryBtn      = document.getElementById('showSummary');
const themeToggleBtn      = document.getElementById('themeToggle');
const endSessionBtn       = document.getElementById('endSession');
const trackCanvas         = document.getElementById('trackCanvas');

// ==== Utilities ====
function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

/** elapsed ms → "MM:SS.ss" */
function formatTime(ms) {
  if (ms == null || ms < 0) return '-';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

/** pace ms for distanceM → "M:SS/km" */
function formatPace(ms, distanceM) {
  if (!ms || !distanceM || ms <= 0) return '-';
  const minPerKm = (ms / 1000 / 60) / (distanceM / 1000);
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${String(s).padStart(2,'0')}/km`;
}

/** per-lap elapsed ms (subtract previous lap's timeMs) */
function getPerLapMs(runnerId, lapNumber) {
  const rl = laps.filter(l => l.runnerId === runnerId).sort((a,b) => a.lapNumber - b.lapNumber);
  const cur = rl.find(l => l.lapNumber === lapNumber);
  if (!cur) return null;
  if (lapNumber === 1) return cur.timeMs;
  const prev = rl.find(l => l.lapNumber === lapNumber - 1);
  return prev ? cur.timeMs - prev.timeMs : cur.timeMs;
}

// ==== Theme ====
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
}
themeToggleBtn.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(cur === 'light' ? 'dark' : 'light');
});
setTheme(localStorage.getItem('theme') || 'light');

// ==== Color palette ====
function getSelectedColor() {
  const checked = document.querySelector('input[name="runnerColor"]:checked');
  return checked ? checked.value : '#ff6b6b';
}

// ==== Runner Registration ====
function renderRunnerList() {
  runnerList.innerHTML = '';
  runners.forEach(r => {
    const li = document.createElement('li');
    li.style.borderLeft = `4px solid ${r.color}`;
    li.innerHTML = `<span>${r.name}</span>`;
    const del = document.createElement('button');
    del.textContent = '✕';
    del.className = 'del-btn';
    del.onclick = () => {
      runners = runners.filter(x => x.id !== r.id);
      renderRunnerList();
    };
    li.appendChild(del);
    runnerList.appendChild(li);
  });
}

runnerForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = runnerNameInput.value.trim();
  if (!name) return;
  runners.push({ id: generateId(), name, color: getSelectedColor() });
  runnerNameInput.value = '';
  renderRunnerList();
  // Auto-advance color palette to next swatch
  const radios = Array.from(document.querySelectorAll('input[name="runnerColor"]'));
  const currentIdx = radios.findIndex(r => r.checked);
  radios[(currentIdx + 1) % radios.length].checked = true;
});

// ==== Lap distance: show custom input ====
lapDistanceSelect.addEventListener('change', e => {
  if (e.target.value === 'custom') {
    lapDistanceCustom.classList.remove('hidden');
    lapDistanceCustom.focus();
  } else {
    lapDistanceCustom.classList.add('hidden');
  }
});

// ==== Session Start ====
startSessionBtn.addEventListener('click', () => {
  if (runners.length === 0) {
    alert('ランナーを最低1人登録してください。');
    return;
  }
  if (lapDistanceSelect.value === 'custom') {
    const v = parseInt(lapDistanceCustom.value, 10);
    if (!v || v < 1) {
      alert('ラップ距離を正しく入力してください。');
      lapDistanceCustom.focus();
      return;
    }
    lapDistance = v;
  } else {
    lapDistance = parseInt(lapDistanceSelect.value, 10);
  }
  sessionActive = true;
  document.getElementById('registration').classList.add('hidden');
  document.getElementById('sessionSetup').classList.add('hidden');
  recordingView.classList.remove('hidden');
  document.getElementById('trackSection').classList.remove('hidden');
  resultSection.classList.remove('hidden');
  createRunnerButtons();
  startTimer();
  startTrackAnimation();
});

// ==== Timer ====
function startTimer() {
  startTime = performance.now();
  timerInterval = setInterval(() => {
    timerDisplay.textContent = formatTime(performance.now() - startTime);
  }, 50);
}
function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// ==== Runner Buttons ====
function createRunnerButtons() {
  runnerButtonsDiv.innerHTML = '';
  runners.forEach(r => {
    const btn = document.createElement('button');
    btn.textContent = r.name;
    btn.style.background = r.color;
    btn.dataset.runnerId = r.id;
    btn.className = 'runner-btn';
    btn.addEventListener('click', () => {
      if (!sessionActive) return;
      recordLap(r.id);
    });
    runnerButtonsDiv.appendChild(btn);
  });
}

// ==== Lap Recording ====
function recordLap(runnerId) {
  const now = performance.now() - startTime;
  const lapNumber = laps.filter(l => l.runnerId === runnerId).length + 1;
  laps.push({ id: generateId(), runnerId, lapNumber, timeMs: now, comment: '' });
  renderResultTable();
  updateSummary();
}

recordAllBtn.addEventListener('click', () => {
  if (!sessionActive) return;
  const now = performance.now() - startTime;
  runners.forEach(r => {
    const lapNumber = laps.filter(l => l.runnerId === r.id).length + 1;
    laps.push({ id: generateId(), runnerId: r.id, lapNumber, timeMs: now, comment: '' });
  });
  renderResultTable();
  updateSummary();
});

// ==== Result Table (cross-tab: runner rows × lap columns) ====
function renderResultTable() {
  if (!resultContainer) return;
  const maxLap = laps.reduce((m, l) => Math.max(m, l.lapNumber), 0);
  if (maxLap === 0) { resultContainer.innerHTML = ''; return; }

  // Build header (newest lap = leftmost column: maxLap → 1)
  let html = '<div class="table-scroll"><table class="result-table"><thead><tr>';
  html += '<th class="sticky-col">ランナー</th>';
  for (let lap = maxLap; lap >= 1; lap--) {
    html += `<th colspan="2">Lap ${lap}</th>`;
  }
  html += '</tr><tr>';
  html += '<th class="sticky-col"></th>';
  for (let lap = maxLap; lap >= 1; lap--) {
    html += '<th>タイム</th><th>ペース</th>';
  }
  html += '</tr></thead><tbody>';

  runners.forEach(r => {
    const runnerLaps = laps.filter(l => l.runnerId === r.id);
    html += `<tr>`;
    html += `<td class="sticky-col runner-name-cell" style="border-left:4px solid ${r.color}">${r.name}</td>`;
    for (let lap = maxLap; lap >= 1; lap--) {
      const lapEntry = runnerLaps.find(l => l.lapNumber === lap);
      if (lapEntry) {
        const perLapMs = getPerLapMs(r.id, lap);
        html += `<td>${formatTime(lapEntry.timeMs)}</td>`;
        html += `<td class="pace-cell">${formatPace(perLapMs, lapDistance)}</td>`;
      } else {
        html += '<td>-</td><td>-</td>';
      }
    }
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  resultContainer.innerHTML = html;
}

// ==== Summary (with pace & speed calculations) ====
function updateSummary() {
  if (!summaryContainer) return;
  const maxLap = laps.reduce((m, l) => Math.max(m, l.lapNumber), 0);
  if (maxLap === 0) {
    summaryContainer.innerHTML = '';
    drawRankChart(); // clears chart
    return;
  }
  drawRankChart();

  const stats = runners.map(r => {
    const runnerLaps = laps.filter(l => l.runnerId === r.id).sort((a,b) => a.lapNumber - b.lapNumber);
    const lapCount = runnerLaps.length;
    if (lapCount === 0) return { runner: r, lapCount: 0, totalMs: 0, avgMs: 0, bestMs: 0, totalKm: 0, avgPaceMs: 0, avgSpeed: 0 };

    // per-lap times array
    const perLapMsArr = runnerLaps.map(l => getPerLapMs(r.id, l.lapNumber));
    const bestPerLapMs = Math.min(...perLapMsArr);
    const totalMs = runnerLaps[runnerLaps.length - 1].timeMs; // elapsed at last lap
    const avgMs = perLapMsArr.reduce((s,v) => s+v, 0) / lapCount;
    const totalKm = (lapCount * lapDistance) / 1000;
    const avgPaceMs = avgMs; // per lapDistance
    const avgSpeed = totalMs > 0 ? (totalKm / (totalMs / 1000 / 3600)) : 0;

    return { runner: r, lapCount, totalMs, avgMs, bestPerLapMs, totalKm, avgPaceMs, avgSpeed };
  });

  // Rank by total elapsed time (ascending); runners with 0 laps go last
  const ranked = [...stats].sort((a,b) => {
    if (a.lapCount === 0 && b.lapCount === 0) return 0;
    if (a.lapCount === 0) return 1;
    if (b.lapCount === 0) return -1;
    if (a.lapCount !== b.lapCount) return b.lapCount - a.lapCount; // more laps = better
    return a.totalMs - b.totalMs;
  });

  let html = '<div class="table-scroll"><table class="summary-table"><thead><tr>';
  html += '<th>順位</th><th>ランナー</th><th>周回数</th><th>総時間</th>';
  html += '<th>平均ラップ</th><th>ベストラップ</th>';
  html += `<th>総距離(km)</th><th>平均速度(km/h)</th><th>平均ペース(min/km)</th>`;
  html += '</tr></thead><tbody>';

  ranked.forEach((s, idx) => {
    const paceStr = s.lapCount > 0 ? formatPace(s.avgMs, lapDistance) : '-';
    const speedStr = s.lapCount > 0 ? s.avgSpeed.toFixed(2) : '-';

    html += '<tr>';
    html += `<td><strong>${idx + 1}</strong></td>`;
    html += `<td style="border-left:4px solid ${s.runner.color};font-weight:600">${s.runner.name}</td>`;
    html += `<td>${s.lapCount}</td>`;
    html += `<td>${s.lapCount > 0 ? formatTime(s.totalMs) : '-'}</td>`;
    html += `<td>${s.lapCount > 0 ? formatTime(s.avgMs) : '-'}</td>`;
    html += `<td>${s.lapCount > 0 ? formatTime(s.bestPerLapMs) : '-'}</td>`;
    html += `<td>${s.lapCount > 0 ? s.totalKm.toFixed(3) : '-'}</td>`;
    html += `<td>${speedStr}</td>`;
    html += `<td>${paceStr}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  summaryContainer.innerHTML = html;
}

// ==== End Session ====
function endSession() {
  sessionActive = false;
  stopTimer();
  stopTrackAnimation();
  drawTrackFrame(); // freeze final frame
  document.querySelectorAll('.runner-btn').forEach(b => b.disabled = true);
  recordAllBtn.disabled = true;
  endSessionBtn.disabled = true;
  // show summary immediately
  showSummaryBtn.click();
}

endSessionBtn.addEventListener('click', () => {
  if (!sessionActive) return;
  if (confirm('セッションを終了しますか？')) endSession();
});

// ==== Restart Session (keep runners, reset laps & timer) ====
const restartSessionBtn = document.getElementById('restartSession');
restartSessionBtn.addEventListener('click', () => {
  if (!confirm('計測をリセットして最初から開始しますか？\n（ランナー登録はそのまま保持されます）')) return;
  // clear laps
  laps = [];
  sessionActive = true;
  document.querySelectorAll('.runner-btn').forEach(b => b.disabled = false);
  recordAllBtn.disabled = false;
  endSessionBtn.disabled = false;
  restartSessionBtn.disabled = false;
  resultContainer.innerHTML = '';
  summaryContainer.innerHTML = '';
  stopTimer();
  startTimer();
  stopTrackAnimation();
  startTrackAnimation();
  showRecordingBtn.click();
});

// ==== CSV Export ====
exportCsvBtn.addEventListener('click', () => {
  const maxLap = laps.reduce((m, l) => Math.max(m, l.lapNumber), 0);
  const headers = ['ランナー', '周回数'];
  for (let i = 1; i <= maxLap; i++) headers.push(`Lap${i}タイム`, `Lap${i}ペース(min/km)`);

  const rows = runners.map(r => {
    const runnerLaps = laps.filter(l => l.runnerId === r.id);
    const row = [r.name, runnerLaps.length];
    for (let i = 1; i <= maxLap; i++) {
      const entry = runnerLaps.find(l => l.lapNumber === i);
      if (entry) {
        const perMs = getPerLapMs(r.id, i);
        row.push(formatTime(entry.timeMs), formatPace(perMs, lapDistance));
      } else {
        row.push('-', '-');
      }
    }
    return row;
  });

  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'laps.csv'; a.click();
  URL.revokeObjectURL(url);
});

// ==== Tab Switching ====
showRecordingBtn.addEventListener('click', () => {
  if (sessionActive || laps.length > 0) {
    recordingView.classList.remove('hidden');
    resultSection.classList.remove('hidden');
  }
  summaryView.classList.add('hidden');
  showRecordingBtn.classList.add('active');
  showSummaryBtn.classList.remove('active');
});

showSummaryBtn.addEventListener('click', () => {
  recordingView.classList.add('hidden');
  resultSection.classList.remove('hidden');
  summaryView.classList.remove('hidden');
  showSummaryBtn.classList.add('active');
  showRecordingBtn.classList.remove('active');
  updateSummary();
});

// ================================================================
// ==== Track Animation ============================================
// ================================================================

/** Compute track geometry from canvas pixel dimensions */
function getTrackGeometry(w, h) {
  const pad = 28;
  const curveR = Math.max(20, (h - 2 * pad) / 2);
  const straightW = Math.max(20, w / 2 - pad - curveR);
  return { cx: w / 2, cy: h / 2, curveR, straightW };
}

/**
 * Returns (x, y) on the track centerline at progress t ∈ [0, 1).
 * Clockwise: top-left → top-right → right curve → bottom-right → bottom-left → left curve.
 */
function getTrackPoint(t, { cx, cy, curveR, straightW }) {
  const t0 = ((t % 1) + 1) % 1;
  const L1 = 2 * straightW;          // top straight
  const L2 = Math.PI * curveR;       // right semicircle
  const L3 = 2 * straightW;          // bottom straight
  const L4 = Math.PI * curveR;       // left semicircle
  const total = L1 + L2 + L3 + L4;
  const d = t0 * total;

  if (d < L1) {
    // Top straight: left → right
    return { x: cx - straightW + (d / L1) * 2 * straightW, y: cy - curveR };
  } else if (d < L1 + L2) {
    const a = (d - L1) / curveR;
    return { x: cx + straightW + curveR * Math.sin(a), y: cy - curveR * Math.cos(a) };
  } else if (d < L1 + L2 + L3) {
    const s = (d - L1 - L2) / L3;
    return { x: cx + straightW - s * 2 * straightW, y: cy + curveR };
  } else {
    const a = (d - L1 - L2 - L3) / curveR;
    return { x: cx - straightW - curveR * Math.sin(a), y: cy + curveR * Math.cos(a) };
  }
}

/** Draw the track background and start/finish line */
function drawTrackBackground(ctx, geom) {
  const { cx, cy, curveR, straightW } = geom;
  const w = ctx.canvas.width, h = ctx.canvas.height;

  ctx.fillStyle = '#101622';
  ctx.fillRect(0, 0, w, h);

  function mkPath() {
    ctx.beginPath();
    ctx.moveTo(cx - straightW, cy - curveR);
    ctx.lineTo(cx + straightW, cy - curveR);
    ctx.arc(cx + straightW, cy, curveR, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(cx - straightW, cy + curveR);
    ctx.arc(cx - straightW, cy, curveR, Math.PI / 2, 3 * Math.PI / 2);
    ctx.closePath();
  }

  // Track border (light ring)
  mkPath(); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 26; ctx.stroke();
  // Track surface
  mkPath(); ctx.strokeStyle = '#1c3060'; ctx.lineWidth = 22; ctx.stroke();
  // Center dashed reference line
  mkPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 7]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Start / Finish line (vertical bar on top-left of top straight)
  const sp = getTrackPoint(0, geom);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(sp.x, sp.y - 13);
  ctx.lineTo(sp.x, sp.y + 13);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('S/F', sp.x + 3, sp.y - 14);

  // Distance label
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`${lapDistance}m/周`, 6, 5);
}

/**
 * Draw a downward-pointing triangle marker.
 * The TIP (apex) sits exactly on (x, y) = track centerline.
 * The BASE is above the tip. Rank number is shown inside the triangle.
 */
function drawRunnerMarker(ctx, x, y, color, rank) {
  const tw = 15, th = 17;
  ctx.beginPath();
  ctx.moveTo(x, y);               // tip — on track
  ctx.lineTo(x - tw / 2, y - th); // base left
  ctx.lineTo(x + tw / 2, y - th); // base right
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Rank inside
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(rank), x, y - th * 0.58);
}

/** Sync canvas pixel size to its CSS display size */
function syncCanvasSize() {
  if (!trackCanvas) return false;
  const cardPad = 44; // .card padding both sides
  const cw = Math.max(100, (trackCanvas.parentElement?.clientWidth ?? 400) - cardPad);
  const ch = 170;
  if (trackCanvas.width !== cw || trackCanvas.height !== ch) {
    trackCanvas.width = cw;
    trackCanvas.height = ch;
  }
  return true;
}

/** Render one animation frame */
function drawTrackFrame() {
  if (!trackCanvas) return;
  syncCanvasSize();
  const w = trackCanvas.width, h = trackCanvas.height;
  const ctx = trackCanvas.getContext('2d');
  const geom = getTrackGeometry(w, h);

  ctx.clearRect(0, 0, w, h);
  drawTrackBackground(ctx, geom);

  if (!runners.length) return;

  const elapsed = sessionActive
    ? performance.now() - startTime
    : (laps.length ? Math.max(...laps.map(l => l.timeMs)) : 0);

  const positions = runners.map(r => {
    const rl = laps.filter(l => l.runnerId === r.id)
                   .sort((a, b) => a.lapNumber - b.lapNumber);
    const last = rl.length > 0 ? rl[rl.length - 1] : null;
    let trackPos = 0;
    if (last && sessionActive) {
      const perMs = getPerLapMs(r.id, last.lapNumber);
      if (perMs > 0) {
        const since = elapsed - last.timeMs;
        trackPos = ((since % perMs) + perMs) % perMs / perMs;
      }
    }
    return { runner: r, lapCount: rl.length, trackPos, eff: rl.length + trackPos };
  });

  // Rank: descending by (laps + track progress)
  const sorted = [...positions].sort((a, b) => b.eff - a.eff);
  const rankMap = {};
  sorted.forEach((p, i) => { rankMap[p.runner.id] = i + 1; });

  // Draw each runner's marker
  positions.forEach(p => {
    const pt = getTrackPoint(p.trackPos, geom);
    drawRunnerMarker(ctx, pt.x, pt.y, p.runner.color, rankMap[p.runner.id]);
  });
}

function startTrackAnimation() {
  stopTrackAnimation();
  (function loop() {
    drawTrackFrame();
    animationId = requestAnimationFrame(loop);
  })();
}

function stopTrackAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

// ================================================================
// ==== Rank Transition Chart (Bump Chart) =========================
// ================================================================

/**
 * Returns runners sorted by rank after completing `lapNum` laps.
 * Runners who haven't completed that lap rank below those who have.
 */
function getRankingsAtLap(lapNum) {
  return [...runners].sort((a, b) => {
    const aLap = laps.find(l => l.runnerId === a.id && l.lapNumber === lapNum);
    const bLap = laps.find(l => l.runnerId === b.id && l.lapNumber === lapNum);
    if (aLap && !bLap) return -1; // a completed, b didn't → a ranks first
    if (!aLap && bLap) return 1;
    if (aLap && bLap) return aLap.timeMs - bLap.timeMs; // both: faster = better
    // neither completed: rank by most laps done
    const aCount = laps.filter(l => l.runnerId === a.id && l.lapNumber < lapNum).length;
    const bCount = laps.filter(l => l.runnerId === b.id && l.lapNumber < lapNum).length;
    return bCount - aCount;
  });
}

function drawRankChart() {
  const canvas = document.getElementById('rankChart');
  if (!canvas) return;

  const maxLap = laps.reduce((m, l) => Math.max(m, l.lapNumber), 0);
  const n = runners.length;

  if (maxLap === 0 || n === 0) {
    // Clear canvas
    canvas.width = canvas.offsetWidth || 300;
    canvas.height = 0;
    return;
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const labelColor  = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const headerColor = isDark ? 'rgba(255,255,255,0.7)'  : 'rgba(0,0,0,0.65)';

  // ---- Sizing ----
  const nameMaxLen = Math.max(...runners.map(r => r.name.length));
  const mRight = Math.min(100, nameMaxLen * 9 + 24);
  const mLeft  = 36;
  const mTop   = 32;
  const mBot   = 16;
  const rowH   = Math.max(22, Math.min(38, 200 / n));
  const chartH = n * rowH;
  const totalH = mTop + chartH + mBot;

  const parentW = (canvas.parentElement?.clientWidth ?? 400) - 44;
  const totalW  = Math.max(200, parentW);

  canvas.width  = totalW;
  canvas.height = totalH;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, totalW, totalH);

  const chartW = totalW - mLeft - mRight;

  // ---- Rank data for each lap ----
  const rankMatrix = []; // rankMatrix[lapIdx][runnerId] = rank (1-based)
  for (let lap = 1; lap <= maxLap; lap++) {
    const sorted = getRankingsAtLap(lap);
    const map = {};
    sorted.forEach((r, i) => { map[r.id] = i + 1; });
    rankMatrix.push(map);
  }

  // ---- X positions (one per lap) ----
  const xPos = (lapIdx) =>
    maxLap === 1
      ? mLeft + chartW / 2
      : mLeft + (lapIdx / (maxLap - 1)) * chartW;

  // ---- Y position for rank ----
  const yForRank = (rank) =>
    mTop + ((rank - 1) / Math.max(1, n - 1)) * chartH;

  // ---- Draw horizontal grid lines ----
  for (let rank = 1; rank <= n; rank++) {
    const y = yForRank(rank);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mLeft, y);
    ctx.lineTo(totalW - mRight, y);
    ctx.stroke();

    // Rank number (left axis)
    ctx.fillStyle = labelColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(rank, mLeft - 5, y);
  }

  // ---- Draw vertical lines & lap labels ----
  for (let i = 0; i < maxLap; i++) {
    const x = xPos(i);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, mTop);
    ctx.lineTo(x, mTop + chartH);
    ctx.stroke();

    ctx.fillStyle = headerColor;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Lap ${i + 1}`, x, mTop - 4);
  }

  // ---- Draw each runner's rank line ----
  runners.forEach(r => {
    const points = rankMatrix.map((rankMap, i) => ({
      x: xPos(i),
      y: yForRank(rankMap[r.id] ?? n)
    }));

    // Line
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else         ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Dots at each lap
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = r.color;
      ctx.fill();
      ctx.strokeStyle = isDark ? '#1e1e1e' : '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Runner name + final rank (right side)
    const last = points[points.length - 1];
    const finalRank = rankMatrix[rankMatrix.length - 1][r.id] ?? n;
    ctx.fillStyle = r.color;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${finalRank} ${r.name}`, last.x + 10, last.y);
  });
}
