/* =====================================================
   app.js — WBS管理アプリ v2
   ===================================================== */

// ===== ユーティリティ =====
const LS_DONE = 'wbs_done_';
const LS_EDIT = 'wbs_edit_';
const LS_CUSTOM_PERSONNEL = 'wbs_custom_personnel';
const LS_CUSTOM_PREP = 'wbs_custom_prep';

function getDone(id) {
    const v = localStorage.getItem(LS_DONE + id);
    return v !== null ? v === 'true' : false;
}
function setDone(id, val) { localStorage.setItem(LS_DONE + id, val); }

function getEdit(id) {
    try { return JSON.parse(localStorage.getItem(LS_EDIT + id)) || {}; } catch { return {}; }
}
function saveEdit(id, data) { localStorage.setItem(LS_EDIT + id, JSON.stringify(data)); }

function mergeTask(t) {
    const e = getEdit(t.id);
    return { ...t, ...e, done: getDone(t.id) };
}

// カスタムタスク管理 (localStorage)
function getCustomPersonnel() {
    try { return JSON.parse(localStorage.getItem(LS_CUSTOM_PERSONNEL)) || []; } catch { return []; }
}
function saveCustomPersonnel(arr) { localStorage.setItem(LS_CUSTOM_PERSONNEL, JSON.stringify(arr)); }
function getCustomPrep() {
    try { return JSON.parse(localStorage.getItem(LS_CUSTOM_PREP)) || []; } catch { return []; }
}
function saveCustomPrep(arr) { localStorage.setItem(LS_CUSTOM_PREP, JSON.stringify(arr)); }

function genId() { return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }

// 全タスク（人員）収集
function allPersonnel() {
    const arr = [];
    TASKS.venues.forEach(v => v.groups.forEach(g => {
        const base = g.personnel.map(t => mergeTask({ ...t, venueId: v.id, venueN: v.name, groupId: g.id, groupN: g.timing }));
        const custom = getCustomPersonnel()
            .filter(t => t.groupId === g.id)
            .map(t => mergeTask({ ...t, venueId: v.id, venueN: v.name, groupN: g.timing }));
        arr.push(...base, ...custom);
    }));
    arr.push(...TASKS.preTasks.map(t => mergeTask({ ...t, venueId: 'pre', venueN: '事前準備', groupId: 'pre', groupN: '事前準備' })));
    return arr;
}

// 全準備物収集
function allPrepItems() {
    const arr = [];
    TASKS.venues.forEach(v => v.groups.forEach(g => {
        const base = g.prepItems.map(p => ({ ...p, done: getDone(p.id), venueId: v.id, venueN: v.name, groupId: g.id, groupN: g.timing }));
        const custom = getCustomPrep()
            .filter(p => p.groupId === g.id)
            .map(p => ({ ...p, done: getDone(p.id), venueId: v.id, venueN: v.name, groupN: g.timing }));
        arr.push(...base, ...custom);
    }));
    return arr;
}

// 進捗更新
function updateProgress() {
    const personnel = allPersonnel();
    const prep = allPrepItems();
    const all = [...personnel, ...prep];
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
    // wbs-view は flex にする特別処理
    document.getElementById('wbs-view').classList.toggle('active', tab === 'wbs');
    ['gantt', 'assignee', 'deadline', 'personnel', 'prep'].forEach(id => {
        const el = document.getElementById(id + '-view');
        if (el) el.classList.toggle('active', id === tab);
    });
    if (tab === 'gantt') renderGantt();
    if (tab === 'assignee') renderAssignee();
    if (tab === 'deadline') renderDeadline();
    if (tab === 'personnel') renderPersonnelList();
    if (tab === 'prep') renderPrepList();
}

// ===== バッジ =====
const PRIO_LABEL = { high: '🔴 高', mid: '🟡 中', low: '🟢 低' };
function prioBadge(p) { return `<span class="badge badge-${p}">${PRIO_LABEL[p] || p}</span>`; }
function tantoBadge(t) {
    if (!t) return `<span class="badge badge-unset">未定</span>`;
    return `<span class="badge badge-tanto">${t}</span>`;
}

// 折りたたみ
function toggleSection(bodyEl, arrowEl) {
    const open = bodyEl.style.display !== 'none';
    bodyEl.style.display = open ? 'none' : '';
    if (arrowEl) arrowEl.classList.toggle('open', !open);
}

// ===== 詳細パネル =====
let selectedTaskId = null;
function openDetail(task) {
    selectedTaskId = task.id;
    const panel = document.getElementById('detail-panel');
    panel.classList.add('open');
    document.getElementById('d-title').textContent = task.text;
    document.getElementById('d-tanto').value = task.tanto || '';
    document.getElementById('d-start').value = task.start || '';
    document.getElementById('d-end').value = task.end || '';
    document.getElementById('d-status').value = task.done ? 'done' : 'open';
    document.getElementById('d-prio').value = task.priority || 'mid';
    document.getElementById('d-memo').value = task.memo || '';
    document.querySelectorAll('.task-row').forEach(r => r.classList.remove('selected'));
    document.querySelectorAll(`.task-row[data-id="${task.id}"]`).forEach(r => r.classList.add('selected'));
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
        start: document.getElementById('d-start').value,
        end: document.getElementById('d-end').value,
        priority: document.getElementById('d-prio').value,
        memo: document.getElementById('d-memo').value,
    };
    setDone(selectedTaskId, document.getElementById('d-status').value === 'done');
    saveEdit(selectedTaskId, data);
    renderAll();
}
function deleteSelected() {
    if (!selectedTaskId) return;
    // カスタムタスクの場合は削除、ベースタスクはdoneと編集をクリア
    const customP = getCustomPersonnel().filter(t => t.id !== selectedTaskId);
    saveCustomPersonnel(customP);
    const customR = getCustomPrep().filter(t => t.id !== selectedTaskId);
    saveCustomPrep(customR);
    localStorage.removeItem(LS_DONE + selectedTaskId);
    localStorage.removeItem(LS_EDIT + selectedTaskId);
    closeDetail();
    renderAll();
}

// ===== インライン追加フォーム =====
function showAddForm(container, groupId, type) {
    // すでに表示中なら閉じる
    const existing = container.querySelector('.add-form');
    if (existing) { existing.remove(); return; }

    const form = document.createElement('div');
    form.className = 'add-form';
    if (type === 'personnel') {
        form.innerHTML = `
      <input name="text"  placeholder="タスク名 *" required>
      <input name="tanto" placeholder="担当者">
      <input name="end"   type="date" title="締切日" style="width:130px">
      <select name="priority">
        <option value="high">🔴 高</option>
        <option value="mid" selected>🟡 中</option>
        <option value="low">🟢 低</option>
      </select>
      <div class="add-form-btns">
        <button class="add-ok-btn">追加</button>
        <button class="add-cancel-btn">×</button>
      </div>`;
        form.querySelector('.add-ok-btn').addEventListener('click', () => {
            const text = form.querySelector('[name="text"]').value.trim();
            if (!text) return;
            const customs = getCustomPersonnel();
            const today = new Date().toISOString().slice(0, 10);
            customs.push({
                id: genId(), groupId,
                text, tanto: form.querySelector('[name="tanto"]').value.trim(),
                start: today,
                end: form.querySelector('[name="end"]').value || today,
                priority: form.querySelector('[name="priority"]').value,
                done: false, memo: ''
            });
            saveCustomPersonnel(customs);
            renderAll();
        });
        form.querySelector('.add-cancel-btn').addEventListener('click', () => form.remove());
    } else {
        form.innerHTML = `
      <input name="text" placeholder="準備物名 *" required style="flex:1;min-width:180px">
      <div class="add-form-btns">
        <button class="add-ok-btn">追加</button>
        <button class="add-cancel-btn">×</button>
      </div>`;
        form.querySelector('.add-ok-btn').addEventListener('click', () => {
            const text = form.querySelector('[name="text"]').value.trim();
            if (!text) return;
            const customs = getCustomPrep();
            customs.push({ id: genId(), groupId, text, done: false });
            saveCustomPrep(customs);
            renderAll();
        });
        form.querySelector('.add-cancel-btn').addEventListener('click', () => form.remove());
    }
    container.appendChild(form);
    form.querySelector('input').focus();
}

// ===== WBS レンダリング =====
function renderWBS() {
    const wrap = document.getElementById('wbs-content');
    wrap.innerHTML = '';
    const customP = getCustomPersonnel();
    const customR = getCustomPrep();

    TASKS.venues.forEach(v => {
        let vTotal = 0, vDone = 0;
        v.groups.forEach(g => {
            const gP = g.personnel.map(t => mergeTask(t));
            const gPc = customP.filter(t => t.groupId === g.id).map(t => mergeTask(t));
            const gR = g.prepItems.map(p => ({ ...p, done: getDone(p.id) }));
            const gRc = customR.filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id) }));
            const allG = [...gP, ...gPc, ...gR, ...gRc];
            vTotal += allG.length;
            vDone += allG.filter(x => x.done).length;
        });

        const vBlock = document.createElement('div');
        vBlock.className = 'venue-block';

        const vHeader = document.createElement('div');
        vHeader.className = 'venue-header';
        vHeader.innerHTML = `<span class="arrow open">▶</span>
      <h2>🏢 ${v.name}</h2>
      <span class="venue-count">${vDone}/${vTotal} 完了</span>`;

        const vBody = document.createElement('div');
        vBody.className = 'venue-body';
        vHeader.onclick = () => toggleSection(vBody, vHeader.querySelector('.arrow'));

        v.groups.forEach(g => {
            const gP = g.personnel.map(t => mergeTask(t));
            const gPc = customP.filter(t => t.groupId === g.id).map(t => mergeTask(t));
            const gR = g.prepItems.map(p => ({ ...p, done: getDone(p.id) }));
            const gRc = customR.filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id) }));
            const allP = [...gP, ...gPc];
            const allR = [...gR, ...gRc];
            const gTotal = allP.length + allR.length;
            const gDone = [...allP, ...allR].filter(x => x.done).length;

            const tBlock = document.createElement('div');
            tBlock.className = 'timing-block';

            const tHeader = document.createElement('div');
            tHeader.className = 'timing-header';
            tHeader.innerHTML = `<span class="arrow open">▶</span>
        <h3>⏱ ${g.timing}</h3>
        <span class="timing-count">${gDone}/${gTotal}</span>`;

            const tBody = document.createElement('div');
            tHeader.onclick = () => toggleSection(tBody, tHeader.querySelector('.arrow'));

            // 人員セクション
            const pSec = buildSubSection('👥 人員', allP, g.id, 'personnel', gPc);
            // 準備物セクション
            const rSec = buildSubSection('📦 準備物', allR, g.id, 'prep', gRc);

            tBody.appendChild(pSec);
            tBody.appendChild(rSec);
            tBlock.appendChild(tHeader);
            tBlock.appendChild(tBody);
            vBody.appendChild(tBlock);
        });

        vBlock.appendChild(vHeader);
        vBlock.appendChild(vBody);
        wrap.appendChild(vBlock);
    });

    updateProgress();
}

function buildSubSection(title, items, groupId, type, customItems) {
    const sec = document.createElement('div');
    sec.className = 'sub-section';

    const header = document.createElement('div');
    header.className = 'sub-header';
    const doneCnt = items.filter(i => i.done).length;
    header.innerHTML = `<span class="arrow open">▶</span>
    <span class="sub-title">${title}</span>
    <span class="sub-count">${doneCnt}/${items.length}</span>`;

    const body = document.createElement('div');
    header.onclick = () => toggleSection(body, header.querySelector('.arrow'));

    const list = document.createElement('div');
    list.className = 'task-list';

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = `task-row${item.done ? ' done' : ''}`;
        row.dataset.id = item.id;
        if (type === 'personnel') {
            row.innerHTML = `
        <div class="task-check${item.done ? ' checked' : ''}" data-check="${item.id}"></div>
        <span class="task-text">${item.text}</span>
        ${tantoBadge(item.tanto)}
        ${prioBadge(item.priority)}
        ${item.memo ? `<span class="task-memo" title="${item.memo}">${item.memo}</span>` : ''}`;
            row.querySelector('[data-check]').addEventListener('click', e => {
                e.stopPropagation();
                setDone(item.id, !getDone(item.id));
                renderAll();
            });
            row.addEventListener('click', () => openDetail(item));
        } else {
            row.innerHTML = `
        <div class="task-check${item.done ? ' checked' : ''}" data-check="${item.id}"></div>
        <span class="task-text">${item.text}</span>`;
            row.querySelector('[data-check]').addEventListener('click', () => {
                setDone(item.id, !getDone(item.id));
                renderAll();
            });
            row.addEventListener('click', () => {
                setDone(item.id, !getDone(item.id));
                renderAll();
            });
        }
        list.appendChild(row);
    });

    // 追加ボタン
    const addRow = document.createElement('div');
    addRow.className = 'add-row';
    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.innerHTML = '＋ 追加';
    addBtn.addEventListener('click', e => { e.stopPropagation(); showAddForm(body, groupId, type); });
    addRow.appendChild(addBtn);

    body.appendChild(list);
    body.appendChild(addRow);
    sec.appendChild(header);
    sec.appendChild(body);
    return sec;
}

// ===== ガントチャート =====
const GANTT_START = new Date('2026-03-01');
const GANTT_END = new Date('2026-07-01');
const MONTHS = ['3月', '4月', '5月', '6月'];
const TOTAL_DAYS = (GANTT_END - GANTT_START) / 86400000;

function pct(dateStr) {
    const d = new Date(dateStr);
    return Math.max(0, Math.min(100, (d - GANTT_START) / (GANTT_END - GANTT_START) * 100));
}

function makeGanttRow(task) {
    const t = mergeTask(task);
    const row = document.createElement('div');
    row.className = `gantt-row${t.done ? ' done' : ''}`;

    const label = document.createElement('div');
    label.className = 'gantt-label';
    label.textContent = t.text;
    label.title = t.text;
    row.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'gantt-grid';
    grid.style.position = 'relative';
    MONTHS.forEach(() => {
        const col = document.createElement('div');
        col.className = 'gantt-month-col';
        grid.appendChild(col);
    });

    const isPoint = t.start === t.end;
    const sp = pct(t.start);
    const ep = pct(t.end) + (1 / TOTAL_DAYS * 100); // end inclusive

    if (isPoint) {
        const marker = document.createElement('div');
        marker.className = 'gantt-marker';
        marker.style.left = sp + '%';
        marker.textContent = '◆';
        if (t.done) marker.style.color = '#cbd5e1';
        grid.appendChild(marker);
    } else {
        const bar = document.createElement('div');
        bar.className = `gantt-bar ${t.done ? 'done' : (t.priority || '')}`;
        bar.style.left = sp + '%';
        bar.style.width = Math.max(0.5, ep - sp) + '%';
        bar.title = `${t.text}：${t.start} 〜 ${t.end}`;
        grid.appendChild(bar);
    }

    row.appendChild(grid);
    return row;
}

function renderGantt() {
    const wrap = document.getElementById('gantt-view');
    wrap.innerHTML = '';

    // ヘッダー
    const hRow = document.createElement('div');
    hRow.className = 'gantt-header-row';
    MONTHS.forEach(m => {
        const el = document.createElement('div');
        el.className = 'gantt-month';
        el.textContent = m;
        hRow.appendChild(el);
    });
    wrap.appendChild(hRow);

    const ganttWrap = document.createElement('div');
    ganttWrap.className = 'gantt-wrap';

    // 事前準備タスク
    const preLabel = document.createElement('div');
    preLabel.className = 'gantt-section-label';
    preLabel.textContent = '事前準備タスク';
    ganttWrap.appendChild(preLabel);
    TASKS.preTasks.forEach(t => ganttWrap.appendChild(makeGanttRow(t)));

    // WBSで登録された人員タスク（当日含む）
    const wbsLabel = document.createElement('div');
    wbsLabel.className = 'gantt-section-label';
    wbsLabel.textContent = 'WBS 人員タスク';
    ganttWrap.appendChild(wbsLabel);

    const customP = getCustomPersonnel();
    TASKS.venues.forEach(v => {
        v.groups.forEach(g => {
            g.personnel.forEach(t => ganttWrap.appendChild(makeGanttRow(t)));
            customP.filter(t => t.groupId === g.id).forEach(t => ganttWrap.appendChild(makeGanttRow(t)));
        });
    });

    // 今日ライン
    const today = new Date();
    const todayPct = (today - GANTT_START) / (GANTT_END - GANTT_START) * 100;
    if (todayPct >= 0 && todayPct <= 100) {
        const line = document.createElement('div');
        line.className = 'today-line';
        line.style.left = `calc(200px + (100% - 200px) * ${todayPct / 100})`;
        const lbl = document.createElement('div');
        lbl.className = 'today-label';
        lbl.style.left = `calc(200px + (100% - 200px) * ${todayPct / 100})`;
        lbl.textContent = '今日';
        ganttWrap.appendChild(line);
        ganttWrap.appendChild(lbl);
    }

    wrap.appendChild(ganttWrap);
}

// ===== 担当者別 =====
function renderAssignee() {
    const wrap = document.getElementById('assignee-view');
    wrap.innerHTML = '';
    const all = allPersonnel();
    const map = new Map();
    all.forEach(t => {
        const key = t.tanto || '未定';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(t);
    });
    const keys = [...map.keys()].sort((a, b) => (a === '未定' ? 1 : b === '未定' ? -1 : a.localeCompare(b)));
    keys.forEach(name => renderSectionBlock(wrap, '👤 ' + name, map.get(name).sort((a, b) => a.end.localeCompare(b.end)), true));
}

// ===== 締切日順 =====
function renderDeadline() {
    const wrap = document.getElementById('deadline-view');
    wrap.innerHTML = '';
    const all = [...allPersonnel(), ...TASKS.preTasks.map(t => mergeTask(t))];
    all.sort((a, b) => (a.end || '').localeCompare(b.end || ''));
    // 日付でグルーピング
    const map = new Map();
    all.forEach(t => {
        const key = t.end || '未定';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(t);
    });
    [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, tasks]) => {
        renderSectionBlock(wrap, '📅 ' + date, tasks, true);
    });
}

// ===== 人員一覧 =====
function renderPersonnelList() {
    const wrap = document.getElementById('personnel-view');
    wrap.innerHTML = '';
    const customP = getCustomPersonnel();
    TASKS.venues.forEach(v => {
        v.groups.forEach(g => {
            const gP = g.personnel.map(t => mergeTask(t));
            const gPc = customP.filter(t => t.groupId === g.id).map(t => mergeTask(t));
            const items = [...gP, ...gPc];
            if (!items.length) return;
            renderSectionBlock(wrap, `🏢 ${v.name} ＞ ${g.timing}`, items, true);
        });
    });
    // 事前準備も含む
    renderSectionBlock(wrap, '📋 事前準備タスク', TASKS.preTasks.map(t => mergeTask(t)), true);
}

// ===== 準備物一覧 =====
function renderPrepList() {
    const wrap = document.getElementById('prep-view');
    wrap.innerHTML = '';
    const customR = getCustomPrep();
    TASKS.venues.forEach(v => {
        v.groups.forEach(g => {
            const gR = g.prepItems.map(p => ({ ...p, done: getDone(p.id) }));
            const gRc = customR.filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id) }));
            const items = [...gR, ...gRc];
            if (!items.length) return;
            const sec = document.createElement('div');
            sec.className = 'section-block';
            const header = document.createElement('div');
            header.className = 'section-block-header';
            header.innerHTML = `<span class="section-block-name">🏢 ${v.name} ＞ ${g.timing}</span>
        <span class="section-block-count">${items.filter(i => i.done).length}/${items.length} 完了</span>`;
            sec.appendChild(header);
            items.forEach(p => {
                const row = document.createElement('div');
                row.className = `list-row${p.done ? ' done' : ''}`;
                row.innerHTML = `<div class="task-check${p.done ? ' checked' : ''}" data-check="${p.id}"></div>
          <span class="task-text">${p.text}</span>`;
                row.querySelector('[data-check]').addEventListener('click', () => {
                    setDone(p.id, !getDone(p.id)); renderAll();
                });
                row.addEventListener('click', () => { setDone(p.id, !getDone(p.id)); renderAll(); });
                sec.appendChild(row);
            });
            wrap.appendChild(sec);
        });
    });
}

function renderSectionBlock(wrap, title, tasks, isPersonnel) {
    const sec = document.createElement('div');
    sec.className = 'section-block';
    const header = document.createElement('div');
    header.className = 'section-block-header';
    header.innerHTML = `<span class="section-block-name">${title}</span>
    <span class="section-block-count">${tasks.filter(t => t.done).length}/${tasks.length} 完了</span>`;
    sec.appendChild(header);
    tasks.forEach(t => {
        const row = document.createElement('div');
        row.className = `list-row task-row${t.done ? ' done' : ''}`;
        row.dataset.id = t.id;
        row.innerHTML = `
      <div class="task-check${t.done ? ' checked' : ''}" data-check="${t.id}"></div>
      <span class="task-text">${t.text}</span>
      ${isPersonnel ? tantoBadge(t.tanto) : ''}
      ${isPersonnel ? prioBadge(t.priority) : ''}
      <span style="font-size:10px;color:var(--text3);margin-left:auto;font-family:var(--font-mono)">${t.end || ''}</span>`;
        row.querySelector('[data-check]').addEventListener('click', e => {
            e.stopPropagation();
            setDone(t.id, !getDone(t.id));
            renderAll();
        });
        if (isPersonnel) row.addEventListener('click', () => openDetail(t));
        sec.appendChild(row);
    });
    wrap.appendChild(sec);
}

function renderAll() {
    if (activeTab === 'wbs') renderWBS();
    if (activeTab === 'gantt') renderGantt();
    if (activeTab === 'assignee') renderAssignee();
    if (activeTab === 'deadline') renderDeadline();
    if (activeTab === 'personnel') renderPersonnelList();
    if (activeTab === 'prep') renderPrepList();
    updateProgress();
}

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    document.getElementById('close-panel').addEventListener('click', closeDetail);
    document.getElementById('save-detail').addEventListener('click', saveDetail);
    document.getElementById('del-task').addEventListener('click', deleteSelected);
    renderWBS();
    updateProgress();
});
