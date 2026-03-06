/* =====================================================
   app.js — WBS管理アプリ v3
   ===================================================== */

// ===== ストレージキー =====
const LS_DONE = 'wbs_done_';
const LS_EDIT = 'wbs_edit_';
const LS_CUSTOM_PERSONNEL = 'wbs_custom_personnel';
const LS_CUSTOM_PREP = 'wbs_custom_prep';
const LS_CUSTOM_GROUPS = 'wbs_custom_groups';

// ===== ユーティリティ =====
function getDone(id) { const v = localStorage.getItem(LS_DONE + id); return v !== null ? v === 'true' : false; }
function setDone(id, val) { localStorage.setItem(LS_DONE + id, val); }
function getEdit(id) { try { return JSON.parse(localStorage.getItem(LS_EDIT + id)) || {}; } catch { return {}; } }
function saveEdit(id, d) { localStorage.setItem(LS_EDIT + id, JSON.stringify(d)); }
function genId() { return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }

function mergeTask(t) { return { ...t, ...getEdit(t.id), done: getDone(t.id) }; }

// カスタム人員タスク
function getCustomPersonnel() { try { return JSON.parse(localStorage.getItem(LS_CUSTOM_PERSONNEL)) || []; } catch { return []; } }
function saveCustomPersonnel(a) { localStorage.setItem(LS_CUSTOM_PERSONNEL, JSON.stringify(a)); }

// カスタム準備物
function getCustomPrep() { try { return JSON.parse(localStorage.getItem(LS_CUSTOM_PREP)) || []; } catch { return []; } }
function saveCustomPrep(a) { localStorage.setItem(LS_CUSTOM_PREP, JSON.stringify(a)); }

// カスタムタイムテーブルグループ
function getCustomGroups() { try { return JSON.parse(localStorage.getItem(LS_CUSTOM_GROUPS)) || []; } catch { return []; } }
function saveCustomGroups(a) { localStorage.setItem(LS_CUSTOM_GROUPS, JSON.stringify(a)); }

// 全人員タスク収集（WBS人員 + カスタム、preTasks除外）
function allPersonnel() {
    const arr = [];
    const allGroups = getAllGroups(); // base + custom groups
    allGroups.forEach(({ v, g }) => {
        const base = g.personnel.map(t => mergeTask({ ...t, venueId: v.id, venueN: v.name, groupId: g.id, groupN: g.timing }));
        const custom = getCustomPersonnel().filter(t => t.groupId === g.id).map(t => mergeTask({ ...t, venueId: v.id, venueN: v.name, groupN: g.timing }));
        arr.push(...base, ...custom);
    });
    return arr;
}

// 全グループ（ベース + カスタム）を venue と合わせて返す
function getAllGroups() {
    const result = [];
    const customGroups = getCustomGroups();
    TASKS.venues.forEach(v => {
        v.groups.forEach(g => result.push({ v, g }));
        customGroups.filter(g => g.venueId === v.id).forEach(g => result.push({ v, g }));
    });
    return result;
}

// 全準備物収集
function allPrepItems() {
    const arr = [];
    getAllGroups().forEach(({ v, g }) => {
        const base = (g.prepItems || []).map(p => ({ ...p, done: getDone(p.id), venueId: v.id, venueN: v.name, groupId: g.id, groupN: g.timing }));
        const custom = getCustomPrep().filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id), venueId: v.id, venueN: v.name, groupN: g.timing }));
        arr.push(...base, ...custom);
    });
    return arr;
}

// 進捗更新
function updateProgress() {
    const all = [...allPersonnel(), ...allPrepItems()];
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
    document.getElementById('wbs-view').classList.toggle('active', tab === 'wbs');
    ['gantt', 'assignee', 'deadline', 'personnel', 'prep'].forEach(id => {
        const el = document.getElementById(id + '-view');
        if (el) el.classList.toggle('active', id === tab);
    });
    const renders = { gantt: renderGantt, assignee: renderAssignee, deadline: renderDeadline, personnel: renderPersonnelList, prep: renderPrepList };
    if (renders[tab]) renders[tab]();
}

// ===== バッジ =====
const PRIO_LABEL = { high: '🔴 高', mid: '🟡 中', low: '🟢 低' };
function prioBadge(p) { return `<span class="badge badge-${p}">${PRIO_LABEL[p] || p}</span>`; }
function tantoBadge(t) { return t ? `<span class="badge badge-tanto">${t}</span>` : `<span class="badge badge-unset">未定</span>`; }

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
    document.getElementById('detail-panel').classList.add('open');
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
    setDone(selectedTaskId, document.getElementById('d-status').value === 'done');
    saveEdit(selectedTaskId, {
        tanto: document.getElementById('d-tanto').value,
        start: document.getElementById('d-start').value,
        end: document.getElementById('d-end').value,
        priority: document.getElementById('d-prio').value,
        memo: document.getElementById('d-memo').value,
    });
    renderAll();
}
function deleteSelected() {
    if (!selectedTaskId) return;
    saveCustomPersonnel(getCustomPersonnel().filter(t => t.id !== selectedTaskId));
    saveCustomPrep(getCustomPrep().filter(t => t.id !== selectedTaskId));
    localStorage.removeItem(LS_DONE + selectedTaskId);
    localStorage.removeItem(LS_EDIT + selectedTaskId);
    closeDetail();
    renderAll();
}

// ===== インライン追加フォーム =====
function showAddForm(container, groupId, type) {
    const existing = container.querySelector('.add-form');
    if (existing) { existing.remove(); return; }
    const form = document.createElement('div');
    form.className = 'add-form';
    const today = new Date().toISOString().slice(0, 10);

    if (type === 'personnel') {
        form.innerHTML = `
      <input name="text"  placeholder="タスク名 *" required>
      <input name="tanto" placeholder="担当者">
      <input name="end"   type="date" title="締切日" style="width:130px" value="${today}">
      <select name="priority">
        <option value="high">🔴 高</option>
        <option value="mid" selected>🟡 中</option>
        <option value="low">🟢 低</option>
      </select>
      <div class="add-form-btns">
        <button class="add-ok-btn">追加</button>
        <button class="add-cancel-btn">×</button>
      </div>`;
        form.querySelector('.add-ok-btn').onclick = () => {
            const text = form.querySelector('[name="text"]').value.trim();
            if (!text) return;
            const arr = getCustomPersonnel();
            arr.push({
                id: genId(), groupId, text,
                tanto: form.querySelector('[name="tanto"]').value.trim(),
                start: today, end: form.querySelector('[name="end"]').value || today,
                priority: form.querySelector('[name="priority"]').value, done: false, memo: ''
            });
            saveCustomPersonnel(arr);
            renderAll();
        };
    } else {
        form.innerHTML = `
      <input name="text" placeholder="準備物名 *" required style="flex:1;min-width:200px">
      <div class="add-form-btns">
        <button class="add-ok-btn">追加</button>
        <button class="add-cancel-btn">×</button>
      </div>`;
        form.querySelector('.add-ok-btn').onclick = () => {
            const text = form.querySelector('[name="text"]').value.trim();
            if (!text) return;
            const arr = getCustomPrep();
            arr.push({ id: genId(), groupId, text, done: false });
            saveCustomPrep(arr);
            renderAll();
        };
    }
    form.querySelector('.add-cancel-btn').onclick = () => form.remove();
    container.appendChild(form);
    form.querySelector('input').focus();
}

// タイムテーブルグループ追加フォーム（会場レベル）
function showAddGroupForm(container, venueId) {
    const existing = container.querySelector('.add-form');
    if (existing) { existing.remove(); return; }
    const form = document.createElement('div');
    form.className = 'add-form';
    form.style.padding = '8px 16px';
    form.innerHTML = `
    <input name="timing" placeholder="タイムテーブル名 *（例：搬入・準備）" required style="flex:1;min-width:220px">
    <div class="add-form-btns">
      <button class="add-ok-btn">追加</button>
      <button class="add-cancel-btn">×</button>
    </div>`;
    form.querySelector('.add-ok-btn').onclick = () => {
        const timing = form.querySelector('[name="timing"]').value.trim();
        if (!timing) return;
        const arr = getCustomGroups();
        arr.push({ id: genId(), venueId, timing, personnel: [], prepItems: [] });
        saveCustomGroups(arr);
        renderAll();
    };
    form.querySelector('.add-cancel-btn').onclick = () => form.remove();
    container.appendChild(form);
    form.querySelector('input').focus();
}

// ===== WBS レンダリング =====
function renderWBS() {
    const wrap = document.getElementById('wbs-content');
    wrap.innerHTML = '';
    const customP = getCustomPersonnel();
    const customR = getCustomPrep();
    const customGroups = getCustomGroups();

    TASKS.venues.forEach(v => {
        // ベースグループ + カスタムグループ
        const allGroupsForVenue = [
            ...v.groups,
            ...customGroups.filter(g => g.venueId === v.id)
        ];

        // 会場の合計カウント
        let vTotal = 0, vDone = 0;
        allGroupsForVenue.forEach(g => {
            const items = [
                ...g.personnel.map(t => mergeTask(t)),
                ...customP.filter(t => t.groupId === g.id).map(t => mergeTask(t)),
                ...(g.prepItems || []).map(p => ({ ...p, done: getDone(p.id) })),
                ...customR.filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id) })),
            ];
            vTotal += items.length;
            vDone += items.filter(x => x.done).length;
        });

        const vBlock = document.createElement('div');
        vBlock.className = 'venue-block';

        // 会場ヘッダー（＋タイムテーブル追加ボタン付き）
        const vHeader = document.createElement('div');
        vHeader.className = 'venue-header';
        vHeader.innerHTML = `
      <span class="arrow open">▶</span>
      <h2>🏢 ${v.name}</h2>
      <span class="venue-count">${vDone}/${vTotal} 完了</span>`;
        // ＋ タイムテーブル追加ボタン
        const addGroupBtn = document.createElement('button');
        addGroupBtn.className = 'add-btn';
        addGroupBtn.innerHTML = '＋ タイムテーブル';
        addGroupBtn.style.marginLeft = '10px';
        addGroupBtn.onclick = e => { e.stopPropagation(); showAddGroupForm(vBlock, v.id); };
        vHeader.appendChild(addGroupBtn);

        const vBody = document.createElement('div');
        vBody.className = 'venue-body';
        vHeader.addEventListener('click', e => {
            if (e.target === addGroupBtn || addGroupBtn.contains(e.target)) return;
            toggleSection(vBody, vHeader.querySelector('.arrow'));
        });

        // 各タイムテーブル
        allGroupsForVenue.forEach(g => {
            const allP = [
                ...g.personnel.map(t => mergeTask(t)),
                ...customP.filter(t => t.groupId === g.id).map(t => mergeTask(t))
            ];
            const allR = [
                ...(g.prepItems || []).map(p => ({ ...p, done: getDone(p.id) })),
                ...customR.filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id) }))
            ];
            const gTotal = allP.length + allR.length;
            const gDone = [...allP, ...allR].filter(x => x.done).length;

            const tBlock = document.createElement('div');
            tBlock.className = 'timing-block';

            // タイムテーブルヘッダー（＋人員追加ボタン付き）
            const tHeader = document.createElement('div');
            tHeader.className = 'timing-header';
            tHeader.innerHTML = `
        <span class="arrow open">▶</span>
        <h3>⏱ ${g.timing}</h3>
        <span class="timing-count">${gDone}/${gTotal}</span>`;
            // ＋ 人員追加ボタン（タイムテーブルレベル）
            const addPersonBtn = document.createElement('button');
            addPersonBtn.className = 'add-btn';
            addPersonBtn.innerHTML = '＋ 人員';
            addPersonBtn.style.marginLeft = '8px';
            const addPrepBtn = document.createElement('button');
            addPrepBtn.className = 'add-btn';
            addPrepBtn.innerHTML = '＋ 準備物';

            tHeader.appendChild(addPersonBtn);
            tHeader.appendChild(addPrepBtn);

            const tBody = document.createElement('div');
            tHeader.addEventListener('click', e => {
                if ([addPersonBtn, addPrepBtn].some(b => b === e.target || b.contains(e.target))) return;
                toggleSection(tBody, tHeader.querySelector('.arrow'));
            });

            // 人員・準備物サブセクション
            const pSec = buildSubSection('👥 人員', allP, g.id, 'personnel');
            const rSec = buildSubSection('📦 準備物', allR, g.id, 'prep');

            // タイムテーブルレベルの追加ボタンはサブセクションの追加フォームを使う
            addPersonBtn.onclick = e => { e.stopPropagation(); showAddForm(pSec.querySelector('.sub-body') || tBody, g.id, 'personnel'); };
            addPrepBtn.onclick = e => { e.stopPropagation(); showAddForm(rSec.querySelector('.sub-body') || tBody, g.id, 'prep'); };

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

function buildSubSection(title, items, groupId, type) {
    const sec = document.createElement('div');
    sec.className = 'sub-section';

    const header = document.createElement('div');
    header.className = 'sub-header';
    const doneCnt = items.filter(i => i.done).length;
    header.innerHTML = `<span class="arrow open">▶</span>
    <span class="sub-title">${title}</span>
    <span class="sub-count">${doneCnt}/${items.length}</span>`;

    const body = document.createElement('div');
    body.className = 'sub-body';
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
            row.querySelector('[data-check]').addEventListener('click', e => { e.stopPropagation(); setDone(item.id, !getDone(item.id)); renderAll(); });
            row.addEventListener('click', () => openDetail(item));
        } else {
            row.innerHTML = `
        <div class="task-check${item.done ? ' checked' : ''}" data-check="${item.id}"></div>
        <span class="task-text">${item.text}</span>`;
            row.querySelector('[data-check]').addEventListener('click', () => { setDone(item.id, !getDone(item.id)); renderAll(); });
            row.addEventListener('click', () => { setDone(item.id, !getDone(item.id)); renderAll(); });
        }
        list.appendChild(row);
    });

    // 各サブセクションにも ＋ 追加ボタン
    const addRow = document.createElement('div');
    addRow.className = 'add-row';
    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.innerHTML = '＋ 追加';
    addBtn.onclick = e => { e.stopPropagation(); showAddForm(body, groupId, type); };
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
const TOTAL_MS = GANTT_END - GANTT_START;

function dayRatio(dateStr) {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return Math.max(0, Math.min(1, (d - GANTT_START) / TOTAL_MS));
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
    MONTHS.forEach(() => { const col = document.createElement('div'); col.className = 'gantt-month-col'; grid.appendChild(col); });

    const sp = dayRatio(t.start) * 100;
    const ep = (dayRatio(t.end) + 1 / (TOTAL_MS / 86400000)) * 100;

    if (t.start === t.end) {
        const m = document.createElement('div');
        m.className = 'gantt-marker';
        m.style.left = sp + '%';
        m.textContent = '◆';
        if (t.done) m.style.color = '#cbd5e1';
        grid.appendChild(m);
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

    const gw = document.createElement('div');
    gw.className = 'gantt-wrap';
    gw.style.position = 'relative';

    // WBSの人員タスクのみ（会場 > タイムテーブル順）
    const customP = getCustomPersonnel();
    const customGroups = getCustomGroups();

    TASKS.venues.forEach(v => {
        const allGroupsForVenue = [...v.groups, ...customGroups.filter(g => g.venueId === v.id)];
        allGroupsForVenue.forEach(g => {
            const tasks = [
                ...g.personnel,
                ...customP.filter(t => t.groupId === g.id)
            ];
            if (!tasks.length) return;
            const lbl = document.createElement('div');
            lbl.className = 'gantt-section-label';
            lbl.textContent = `🏢 ${v.name}  ＞  ${g.timing}`;
            gw.appendChild(lbl);
            tasks.forEach(t => gw.appendChild(makeGanttRow(t)));
        });
    });

    // 週ごとのグレー縦線 + 日付ラベル
    let d = new Date(GANTT_START);
    while (d <= GANTT_END) {
        const r = dayRatio(d);
        const line = document.createElement('div');
        line.style.cssText = `position:absolute;top:0;bottom:0;width:1px;background:rgba(0,0,0,0.07);pointer-events:none;z-index:4;left:calc(200px + (100% - 200px) * ${r})`;
        const lbl = document.createElement('div');
        lbl.style.cssText = `position:absolute;top:2px;font-size:9px;color:#94a3b8;font-family:var(--font-mono);transform:translateX(-50%);background:#fff;padding:0 2px;white-space:nowrap;z-index:5;left:calc(200px + (100% - 200px) * ${r})`;
        lbl.textContent = `${d.getMonth() + 1}/${d.getDate()}`;
        gw.appendChild(line);
        gw.appendChild(lbl);
        d = new Date(d.getTime() + 7 * 86400000);
    }

    // 月境界線（少し濃いめ青）
    [new Date('2026-04-01'), new Date('2026-05-01'), new Date('2026-06-01')].forEach(md => {
        const r = dayRatio(md);
        const line = document.createElement('div');
        line.style.cssText = `position:absolute;top:0;bottom:0;width:1.5px;background:rgba(59,130,246,0.18);pointer-events:none;z-index:3;left:calc(200px + (100% - 200px) * ${r})`;
        gw.appendChild(line);
    });

    // 今日ライン
    const todayR = dayRatio(new Date());
    if (todayR >= 0 && todayR <= 1) {
        const line = document.createElement('div');
        line.className = 'today-line';
        line.style.left = `calc(200px + (100% - 200px) * ${todayR})`;
        const lbl = document.createElement('div');
        lbl.className = 'today-label';
        lbl.style.left = `calc(200px + (100% - 200px) * ${todayR})`;
        lbl.textContent = '今日';
        gw.appendChild(line);
        gw.appendChild(lbl);
    }

    wrap.appendChild(gw);
}

// ===== 担当者別 =====
function renderAssignee() {
    const wrap = document.getElementById('assignee-view');
    wrap.innerHTML = '';
    const map = new Map();
    allPersonnel().forEach(t => {
        const key = t.tanto || '未定';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(t);
    });
    [...map.keys()].sort((a, b) => a === '未定' ? 1 : b === '未定' ? -1 : a.localeCompare(b))
        .forEach(name => renderSectionBlock(wrap, '👤 ' + name, map.get(name).sort((a, b) => (a.end || '').localeCompare(b.end || '')), true));
}

// ===== 締切日順 =====
function renderDeadline() {
    const wrap = document.getElementById('deadline-view');
    wrap.innerHTML = '';
    const all = allPersonnel().sort((a, b) => (a.end || 'zzz').localeCompare(b.end || 'zzz'));
    const map = new Map();
    all.forEach(t => { const k = t.end || '未設定'; if (!map.has(k)) map.set(k, []); map.get(k).push(t); });
    [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, tasks]) => renderSectionBlock(wrap, '📅 ' + date, tasks, true));
}

// ===== 人員一覧 =====
function renderPersonnelList() {
    const wrap = document.getElementById('personnel-view');
    wrap.innerHTML = '';
    const customP = getCustomPersonnel();
    const customGroups = getCustomGroups();
    TASKS.venues.forEach(v => {
        [...v.groups, ...customGroups.filter(g => g.venueId === v.id)].forEach(g => {
            const items = [...g.personnel.map(t => mergeTask(t)), ...customP.filter(t => t.groupId === g.id).map(t => mergeTask(t))];
            if (!items.length) return;
            renderSectionBlock(wrap, `🏢 ${v.name} ＞ ${g.timing}`, items, true);
        });
    });
}

// ===== 準備物一覧 =====
function renderPrepList() {
    const wrap = document.getElementById('prep-view');
    wrap.innerHTML = '';
    const customR = getCustomPrep();
    const customGroups = getCustomGroups();
    TASKS.venues.forEach(v => {
        [...v.groups, ...customGroups.filter(g => g.venueId === v.id)].forEach(g => {
            const items = [
                ...(g.prepItems || []).map(p => ({ ...p, done: getDone(p.id) })),
                ...customR.filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id) }))
            ];
            if (!items.length) return;
            const sec = document.createElement('div');
            sec.className = 'section-block';
            const h = document.createElement('div');
            h.className = 'section-block-header';
            h.innerHTML = `<span class="section-block-name">🏢 ${v.name} ＞ ${g.timing}</span>
        <span class="section-block-count">${items.filter(i => i.done).length}/${items.length} 完了</span>`;
            sec.appendChild(h);
            items.forEach(p => {
                const row = document.createElement('div');
                row.className = `list-row${p.done ? ' done' : ''}`;
                row.innerHTML = `<div class="task-check${p.done ? ' checked' : ''}" data-check="${p.id}"></div><span class="task-text">${p.text}</span>`;
                row.querySelector('[data-check]').addEventListener('click', () => { setDone(p.id, !getDone(p.id)); renderAll(); });
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
    const h = document.createElement('div');
    h.className = 'section-block-header';
    h.innerHTML = `<span class="section-block-name">${title}</span>
    <span class="section-block-count">${tasks.filter(t => t.done).length}/${tasks.length} 完了</span>`;
    sec.appendChild(h);
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
        row.querySelector('[data-check]').addEventListener('click', e => { e.stopPropagation(); setDone(t.id, !getDone(t.id)); renderAll(); });
        if (isPersonnel) row.addEventListener('click', () => openDetail(t));
        sec.appendChild(row);
    });
    wrap.appendChild(sec);
}

function renderAll() {
    const renders = { wbs: renderWBS, gantt: renderGantt, assignee: renderAssignee, deadline: renderDeadline, personnel: renderPersonnelList, prep: renderPrepList };
    if (renders[activeTab]) renders[activeTab]();
    updateProgress();
}

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    document.getElementById('close-panel').addEventListener('click', closeDetail);
    document.getElementById('save-detail').addEventListener('click', saveDetail);
    document.getElementById('del-task').addEventListener('click', deleteSelected);
    renderWBS();
    updateProgress();
});
