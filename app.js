/* =====================================================
   app.js  — WBS管理アプリ ロジック
   ===================================================== */

// ===== ストレージ =====
const LS_PREFIX = 'wbs_done_';
function getDone(id) {
    const v = localStorage.getItem(LS_PREFIX + id);
    return v !== null ? v === 'true' : false;
}
function setDone(id, val) {
    localStorage.setItem(LS_PREFIX + id, val);
}
// 編集データ (memo, tanto など)
const LS_EDIT = 'wbs_edit_';
function getEdit(id) {
    try { return JSON.parse(localStorage.getItem(LS_EDIT + id)) || {}; }
    catch (e) { return {}; }
}
function saveEdit(id, data) {
    localStorage.setItem(LS_EDIT + id, JSON.stringify(data));
}

// ===== ユーティリティ =====
function mergeTask(t) {
    const edit = getEdit(t.id);
    return { ...t, ...edit, done: getDone(t.id) };
}
function allTasks() {
    const arr = [];
    TASKS.venues.forEach(v => {
        v.groups.forEach(g => g.tasks.forEach(t => arr.push(mergeTask(t))));
        v.prepItems.forEach(p => arr.push({ ...p, done: getDone(p.id), _prep: true }));
    });
    TASKS.preTasks.forEach(t => arr.push(mergeTask(t)));
    return arr;
}
function updateProgress() {
    const all = allTasks();
    const done = all.filter(t => t.done).length;
    const pct = all.length ? Math.round(done / all.length * 100) : 0;
    document.getElementById('prog-fill').style.width = pct + '%';
    document.getElementById('prog-label').textContent = `${done} / ${all.length}  (${pct}%)`;
}

// ===== タブ切り替え =====
let activeTab = 'wbs';
function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.view, #wbs-view').forEach(v => {
        const isTarget = v.id === tab + '-view';
        v.classList.toggle('active', isTarget);
    });
    if (tab === 'gantt') renderGantt();
    if (tab === 'assignee') renderAssignee();
}

// ===== 優先度バッジ =====
const PRIO_LABEL = { high: '🔴 高', mid: '🟡 中', low: '🟢 低' };
function prioBadge(p) {
    return `<span class="badge badge-${p}">${PRIO_LABEL[p] || p}</span>`;
}
function tantoBadge(t) {
    if (!t) return `<span class="badge badge-unset">未定</span>`;
    return `<span class="badge badge-tanto">${t}</span>`;
}

// ===== 折りたたみ汎用 =====
function toggleSection(bodyEl, arrowEl) {
    const open = bodyEl.style.display !== 'none';
    bodyEl.style.display = open ? 'none' : '';
    arrowEl.classList.toggle('open', !open);
}

// ===== 詳細パネル =====
let selectedTaskId = null;
function openDetail(task) {
    selectedTaskId = task.id;
    const panel = document.getElementById('detail-panel');
    panel.classList.add('open');
    document.getElementById('d-title').textContent = task.text;
    document.getElementById('d-tanto').value = task.tanto || '';
    document.getElementById('d-status').value = task.done ? 'done' : 'open';
    document.getElementById('d-prio').value = task.priority || 'mid';
    document.getElementById('d-memo').value = task.memo || '';
    // 選択ハイライト
    document.querySelectorAll('.task-row').forEach(r => r.classList.remove('selected'));
    const el = document.querySelector(`.task-row[data-id="${task.id}"]`);
    if (el) el.classList.add('selected');
}
function closeDetail() {
    document.getElementById('detail-panel').classList.remove('open');
    document.querySelectorAll('.task-row').forEach(r => r.classList.remove('selected'));
    selectedTaskId = null;
}
function saveDetail() {
    if (!selectedTaskId) return;
    const data = {
        tanto: document.getElementById('d-tanto').value,
        priority: document.getElementById('d-prio').value,
        memo: document.getElementById('d-memo').value,
    };
    const isDone = document.getElementById('d-status').value === 'done';
    setDone(selectedTaskId, isDone);
    saveEdit(selectedTaskId, data);
    renderAll();
}

// ===== WBS レンダリング =====
function renderWBS() {
    const wrap = document.getElementById('wbs-content');
    wrap.innerHTML = '';

    TASKS.venues.forEach(v => {
        const groups = v.groups;
        const allVenueTasks = groups.flatMap(g => g.tasks.map(t => mergeTask(t)));
        const prepMerged = v.prepItems.map(p => ({ ...p, done: getDone(p.id) }));
        const venueTotal = allVenueTasks.length + prepMerged.length;
        const venueDone = allVenueTasks.filter(t => t.done).length + prepMerged.filter(p => p.done).length;

        const vBlock = document.createElement('div');
        vBlock.className = 'venue-block';

        const vHeader = document.createElement('div');
        vHeader.className = 'venue-header';
        vHeader.innerHTML = `
      <span class="arrow open">▶</span>
      <h2>${v.name}</h2>
      <span class="venue-count">${venueDone}/${venueTotal} 完了</span>`;

        const vBody = document.createElement('div');
        vBody.className = 'venue-body';

        vHeader.addEventListener('click', () => toggleSection(vBody, vHeader.querySelector('.arrow')));

        // グループ別タスク
        groups.forEach(g => {
            const groupTasks = g.tasks.map(t => mergeTask(t));

            const tBlock = document.createElement('div');
            tBlock.className = 'timing-block';

            const tHeader = document.createElement('div');
            tHeader.className = 'timing-header';
            tHeader.innerHTML = `<span class="arrow open">▶</span><h3>${g.timing}</h3>
        <span style="font-size:11px;color:var(--text2);font-family:var(--font-mono)">${groupTasks.filter(t => t.done).length}/${groupTasks.length}</span>`;

            const tList = document.createElement('div');
            tList.className = 'task-list';

            tHeader.addEventListener('click', () => toggleSection(tList, tHeader.querySelector('.arrow')));

            groupTasks.forEach(task => {
                const row = document.createElement('div');
                row.className = `task-row${task.done ? ' done' : ''}`;
                row.dataset.id = task.id;
                row.innerHTML = `
          <div class="task-check${task.done ? ' checked' : ''}" data-check="${task.id}"></div>
          <span class="task-text">${task.text}</span>
          ${tantoBadge(task.tanto)}
          ${prioBadge(task.priority)}
          ${task.memo ? `<span class="task-memo" title="${task.memo}">${task.memo}</span>` : ''}`;

                row.querySelector('[data-check]').addEventListener('click', e => {
                    e.stopPropagation();
                    setDone(task.id, !getDone(task.id));
                    renderAll();
                });
                row.addEventListener('click', () => openDetail(task));
                tList.appendChild(row);
            });

            tBlock.appendChild(tHeader);
            tBlock.appendChild(tList);
            vBody.appendChild(tBlock);
        });

        // 準備物
        const prepMergedFull = v.prepItems.map(p => ({ ...p, done: getDone(p.id) }));
        const prepSec = document.createElement('div');
        prepSec.className = 'prep-section';
        const prepHeader = document.createElement('div');
        prepHeader.className = 'prep-header';
        prepHeader.innerHTML = `<span class="arrow open">▶</span>📦 準備物
      <span style="margin-left:auto;font-size:11px;font-family:var(--font-mono)">${prepMergedFull.filter(p => p.done).length}/${prepMergedFull.length}</span>`;
        const prepList = document.createElement('div');
        prepList.className = 'prep-list';
        prepHeader.addEventListener('click', () => toggleSection(prepList, prepHeader.querySelector('.arrow')));

        prepMergedFull.forEach(p => {
            const row = document.createElement('div');
            row.className = `prep-row${p.done ? ' done' : ''}`;
            row.innerHTML = `
        <div class="task-check${p.done ? ' checked' : ''}" data-check="${p.id}"></div>
        <span class="prep-text">${p.text}</span>`;
            row.querySelector('[data-check]').addEventListener('click', () => {
                setDone(p.id, !getDone(p.id));
                renderAll();
            });
            row.addEventListener('click', () => {
                setDone(p.id, !getDone(p.id));
                renderAll();
            });
            prepList.appendChild(row);
        });

        prepSec.appendChild(prepHeader);
        prepSec.appendChild(prepList);
        vBody.appendChild(prepSec);

        vBlock.appendChild(vHeader);
        vBlock.appendChild(vBody);
        wrap.appendChild(vBlock);
    });

    updateProgress();
}

// ===== ガントチャート レンダリング =====
const GANTT_START = new Date('2026-03-01');
const GANTT_END = new Date('2026-06-30');
const MONTHS = ['3月', '4月', '5月', '6月'];
const MONTH_STARTS = [
    new Date('2026-03-01'), new Date('2026-04-01'),
    new Date('2026-05-01'), new Date('2026-06-01')
];

function daysBetween(a, b) {
    return (b - a) / 86400000;
}
const TOTAL_DAYS = daysBetween(GANTT_START, GANTT_END) + 1;

function pct(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return Math.max(0, Math.min(100, daysBetween(GANTT_START, d) / TOTAL_DAYS * 100));
}
function monthPct(date) {
    const mIdx = MONTHS.length > 0 ? MONTH_STARTS.findIndex((m, i) => {
        const next = MONTH_STARTS[i + 1] || GANTT_END;
        return date >= m && date < next;
    }) : -1;
    if (mIdx < 0) return { col: 0, left: 0, width: 0 };
    const mStart = MONTH_STARTS[mIdx];
    const mEnd = MONTH_STARTS[mIdx + 1] || new Date('2026-07-01');
    const mDays = daysBetween(mStart, mEnd);
    const offset = daysBetween(mStart, date) / mDays * 100;
    return { col: mIdx, left: offset };
}

function ganttRow(task) {
    const t = mergeTask ? mergeTask(task) : task;
    t.done = getDone(t.id);
    const row = document.createElement('div');
    row.className = `gantt-row${t.done ? ' done' : ''}`;

    const label = document.createElement('div');
    label.className = 'gantt-label';
    label.title = t.text;
    label.textContent = t.text;
    row.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'gantt-grid';

    // 4列 (月別)
    MONTHS.forEach(() => {
        const col = document.createElement('div');
        col.className = 'gantt-month-col';
        grid.appendChild(col);
    });

    const start = new Date(t.start);
    const end = new Date(t.end);
    const isPoint = t.start === t.end;

    const totalPct = pct(GANTT_START);
    const startPct = pct(start);
    const endPct = pct(new Date(end.getTime() + 86400000)); // end inclusive

    if (isPoint) {
        // ダイヤモンドマーカー
        const marker = document.createElement('div');
        marker.className = 'gantt-marker';
        marker.textContent = '◆';
        marker.style.left = startPct + '%';
        grid.style.position = 'relative';
        grid.appendChild(marker);
    } else {
        // バー
        const bar = document.createElement('div');
        bar.className = `gantt-bar ${t.priority || ''}${t.done ? ' done' : ''}`;
        bar.style.left = startPct + '%';
        bar.style.width = (endPct - startPct) + '%';
        bar.title = `${t.text}：${t.start} 〜 ${t.end}`;
        grid.style.position = 'relative';
        grid.appendChild(bar);
    }

    row.appendChild(grid);
    return row;
}

function renderGantt() {
    const wrap = document.getElementById('gantt-view');
    wrap.innerHTML = '';

    // 月ヘッダー
    const hRow = document.createElement('div');
    hRow.className = 'gantt-header-row';
    MONTHS.forEach(m => {
        const el = document.createElement('div');
        el.className = 'gantt-month';
        el.textContent = m;
        hRow.appendChild(el);
    });
    wrap.appendChild(hRow);

    // 今日の線 (ガントグリッド全体に)
    const ganttWrap = document.createElement('div');
    ganttWrap.className = 'gantt-wrap';
    ganttWrap.style.position = 'relative';

    // 事前準備タスク
    const preLabel = document.createElement('div');
    preLabel.className = 'gantt-section-label';
    preLabel.textContent = '事前準備';
    ganttWrap.appendChild(preLabel);

    TASKS.preTasks.forEach(t => ganttWrap.appendChild(ganttRow(t)));

    // 当日タスク
    const dayLabel = document.createElement('div');
    dayLabel.className = 'gantt-section-label';
    dayLabel.style.marginTop = '16px';
    dayLabel.textContent = '当日タスク';
    ganttWrap.appendChild(dayLabel);

    TASKS.venues.forEach(v => {
        v.groups.forEach(g => {
            g.tasks.forEach(t => ganttWrap.appendChild(ganttRow(t)));
        });
    });

    // 今日の縦線
    const today = new Date();
    const todayPct = pct(today);
    if (todayPct >= 0 && todayPct <= 100) {
        const line = document.createElement('div');
        line.className = 'today-line';
        const leftOffset = 220 + (ganttWrap.offsetWidth - 220) * todayPct / 100;
        line.style.left = `calc(220px + (100% - 220px) * ${todayPct / 100})`;
        const todayLbl = document.createElement('div');
        todayLbl.className = 'gantt-today-header';
        todayLbl.style.left = `calc(220px + (100% - 220px) * ${todayPct / 100})`;
        todayLbl.textContent = '今日';
        todayLbl.style.position = 'absolute';
        todayLbl.style.top = '0';
        todayLbl.style.color = 'var(--accent)';
        todayLbl.style.fontSize = '10px';
        todayLbl.style.transform = 'translateX(-50%)';
        ganttWrap.appendChild(line);
        ganttWrap.appendChild(todayLbl);
    }

    wrap.appendChild(ganttWrap);
}

// ===== 担当者別ビュー =====
function renderAssignee() {
    const wrap = document.getElementById('assignee-view');
    wrap.innerHTML = '';

    // 全タスク収集
    const all = [];
    TASKS.venues.forEach(v => v.groups.forEach(g => g.tasks.forEach(t => all.push(mergeTask(t)))));
    TASKS.preTasks.forEach(t => all.push(mergeTask(t)));
    all.forEach(t => { t.done = getDone(t.id); });

    // 担当者グループ化
    const map = new Map();
    all.forEach(t => {
        const key = t.tanto || '未定';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(t);
    });

    // ソート：担当者名、未定は最後
    const keys = [...map.keys()].sort((a, b) => {
        if (a === '未定') return 1;
        if (b === '未定') return -1;
        return a.localeCompare(b);
    });

    keys.forEach(name => {
        const tasks = map.get(name).sort((a, b) => a.end.localeCompare(b.end));
        const sec = document.createElement('div');
        sec.className = 'assignee-section';

        const header = document.createElement('div');
        header.className = 'assignee-header';
        header.innerHTML = `
      <span class="assignee-name">${name === '未定' ? '👤 未定' : '👤 ' + name}</span>
      <span class="assignee-count">${tasks.filter(t => t.done).length}/${tasks.length} 完了</span>`;
        sec.appendChild(header);

        const list = document.createElement('div');
        list.className = 'task-list';
        tasks.forEach(task => {
            const row = document.createElement('div');
            row.className = `task-row${task.done ? ' done' : ''}`;
            row.dataset.id = task.id;
            row.innerHTML = `
        <div class="task-check${task.done ? ' checked' : ''}" data-check="${task.id}"></div>
        <span class="task-text">${task.text}</span>
        ${prioBadge(task.priority)}
        <span style="font-size:11px;color:var(--text2);font-family:var(--font-mono);margin-left:auto">${task.end}</span>`;
            row.querySelector('[data-check]').addEventListener('click', e => {
                e.stopPropagation();
                setDone(task.id, !getDone(task.id));
                renderAssignee();
                updateProgress();
            });
            row.addEventListener('click', () => openDetail(task));
            list.appendChild(row);
        });
        sec.appendChild(list);
        wrap.appendChild(sec);
    });
}

function renderAll() {
    if (activeTab === 'wbs') renderWBS();
    if (activeTab === 'gantt') renderGantt();
    if (activeTab === 'assignee') renderAssignee();
    updateProgress();
}

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
    // ヘッダー高さ記録
    const headerH = document.getElementById('header').offsetHeight;
    document.documentElement.style.setProperty('--header-h', headerH + 'px');

    // タブ
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 詳細パネル
    document.getElementById('close-panel').addEventListener('click', closeDetail);
    document.getElementById('save-detail').addEventListener('click', saveDetail);

    // 初期表示
    renderWBS();
    updateProgress();
});
