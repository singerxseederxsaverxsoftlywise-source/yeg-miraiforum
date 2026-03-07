/* =====================================================
   app.js — WBS管理アプリ v4
   開閉状態保持 + ドラッグ&↑↓並べ替え
   ===================================================== */

// ===== ストレージキー =====
const LS_DONE = 'wbs_done_';
const LS_EDIT = 'wbs_edit_';
const LS_CP = 'wbs_custom_personnel';
const LS_CR = 'wbs_custom_prep';
const LS_CG = 'wbs_custom_groups';

// ===== 基本ストレージ =====
function getDone(id) { const v = localStorage.getItem(LS_DONE + id); return v !== null ? v === 'true' : false; }
function setDone(id, val) { localStorage.setItem(LS_DONE + id, val); }
function getEdit(id) { try { return JSON.parse(localStorage.getItem(LS_EDIT + id)) || {}; } catch { return {}; } }
function saveEdit(id, d) { localStorage.setItem(LS_EDIT + id, JSON.stringify(d)); }
function genId() { return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }
function mergeTask(t) { return { ...t, ...getEdit(t.id), done: getDone(t.id) }; }

function getCP() { try { return JSON.parse(localStorage.getItem(LS_CP)) || []; } catch { return []; } }
function saveCP(a) { localStorage.setItem(LS_CP, JSON.stringify(a)); }
function getCR() { try { return JSON.parse(localStorage.getItem(LS_CR)) || []; } catch { return []; } }
function saveCR(a) { localStorage.setItem(LS_CR, JSON.stringify(a)); }
function getCG() { try { return JSON.parse(localStorage.getItem(LS_CG)) || []; } catch { return []; } }
function saveCG(a) { localStorage.setItem(LS_CG, JSON.stringify(a)); }

// ===== 開閉状態 =====
function getOpen(key, def = true) { const v = localStorage.getItem('wbs_open_' + key); return v === null ? def : v === 'true'; }
function setOpen(key, val) { localStorage.setItem('wbs_open_' + key, val); }

function applyOpenState(body, arrow, key, def = true) {
    const open = getOpen(key, def);
    body.style.display = open ? '' : 'none';
    if (arrow) arrow.classList.toggle('open', open);
}
function toggleOpen(body, arrow, key) {
    const wasOpen = body.style.display !== 'none';
    body.style.display = wasOpen ? 'none' : '';
    if (arrow) arrow.classList.toggle('open', !wasOpen);
    setOpen(key, !wasOpen);
}

// ===== 並べ替え順序 =====
function getOrder(key) { try { return JSON.parse(localStorage.getItem('wbs_ord_' + key)) || null; } catch { return null; } }
function saveOrder(key, a) { localStorage.setItem('wbs_ord_' + key, JSON.stringify(a)); }

function applyOrder(items, key) {
    const ord = getOrder(key);
    if (!ord) return items;
    const map = new Map(items.map(i => [i.id, i]));
    const result = [];
    ord.forEach(id => { if (map.has(id)) { result.push(map.get(id)); map.delete(id); } });
    map.forEach(v => result.push(v)); // 新規アイテムは末尾
    return result;
}

function moveItem(items, id, dir, key) {
    let ids = applyOrder(items, key).map(i => i.id);
    const idx = ids.indexOf(id);
    if (idx < 0) return;
    if (dir === 'up' && idx > 0) [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    if (dir === 'down' && idx < ids.length - 1) [ids[idx + 1], ids[idx]] = [ids[idx], ids[idx + 1]];
    saveOrder(key, ids);
    renderAll();
}

// ===== 会場＋カスタムグループ取得 =====
function getGroupsForVenue(v) {
    return [...v.groups, ...getCG().filter(g => g.venueId === v.id)];
}

// ===== 全人員タスク =====
function allPersonnel() {
    const arr = [];
    TASKS.venues.forEach(v => getGroupsForVenue(v).forEach(g => {
        const base = g.personnel.map(t => mergeTask({ ...t, venueId: v.id, venueN: v.name, groupId: g.id, groupN: g.timing }));
        const custom = getCP().filter(t => t.groupId === g.id).map(t => mergeTask({ ...t, venueId: v.id, venueN: v.name, groupN: g.timing }));
        arr.push(...applyOrder([...base, ...custom], 'prs_' + g.id));
    }));
    return arr;
}

// ===== 全準備物 =====
function allPrepItems() {
    const arr = [];
    TASKS.venues.forEach(v => getGroupsForVenue(v).forEach(g => {
        const base = (g.prepItems || []).map(p => ({ ...p, done: getDone(p.id), venueId: v.id, venueN: v.name, groupId: g.id, groupN: g.timing }));
        const custom = getCR().filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id), venueId: v.id, venueN: v.name, groupN: g.timing }));
        arr.push(...applyOrder([...base, ...custom], 'prp_' + g.id));
    }));
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
    saveCP(getCP().filter(t => t.id !== selectedTaskId));
    saveCR(getCR().filter(t => t.id !== selectedTaskId));
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
      <input name="end"   type="date" value="${today}" style="width:130px">
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
            const arr = getCP();
            arr.push({
                id: genId(), groupId, text,
                tanto: form.querySelector('[name="tanto"]').value.trim(),
                start: today, end: form.querySelector('[name="end"]').value || today,
                priority: form.querySelector('[name="priority"]').value, done: false, memo: ''
            });
            saveCP(arr);
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
            const arr = getCR();
            arr.push({ id: genId(), groupId, text, done: false });
            saveCR(arr);
            renderAll();
        };
    }
    form.querySelector('.add-cancel-btn').onclick = () => form.remove();
    container.appendChild(form);
    form.querySelector('input').focus();
}

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
        const arr = getCG();
        arr.push({ id: genId(), venueId, timing, personnel: [], prepItems: [] });
        saveCG(arr);
        renderAll();
    };
    form.querySelector('.add-cancel-btn').onclick = () => form.remove();
    container.appendChild(form);
    form.querySelector('input').focus();
}

// ===== ドラッグ変数 =====
let _dragSrc = null, _dragType = null, _dragGroupId = null;

function setupTaskDrag(row, id, orderKey, allItems) {
    row.setAttribute('draggable', true);
    row.addEventListener('dragstart', e => {
        _dragSrc = id; _dragType = 'task'; _dragGroupId = orderKey;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
    });
    row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        _dragSrc = null;
    });
    row.addEventListener('dragover', e => {
        e.preventDefault();
        if (_dragType !== 'task' || _dragGroupId !== orderKey) return;
        const rect = row.getBoundingClientRect();
        const half = rect.top + rect.height / 2;
        document.querySelectorAll('.drag-over-top,.drag-over-bottom').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
        row.classList.add(e.clientY < half ? 'drag-over-top' : 'drag-over-bottom');
    });
    row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    row.addEventListener('drop', e => {
        e.preventDefault(); e.stopPropagation();
        row.classList.remove('drag-over-top', 'drag-over-bottom');
        if (!_dragSrc || _dragSrc === id || _dragGroupId !== orderKey) return;
        const ordered = applyOrder(allItems, orderKey);
        let ids = ordered.map(i => i.id);
        const fromIdx = ids.indexOf(_dragSrc);
        const toIdx = ids.indexOf(id);
        if (fromIdx < 0 || toIdx < 0) return;
        const rect = row.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;
        ids.splice(fromIdx, 1);
        const newTo = insertBefore ? ids.indexOf(id) : ids.indexOf(id) + 1;
        ids.splice(newTo < 0 ? ids.length : newTo, 0, _dragSrc);
        saveOrder(orderKey, ids);
        renderAll();
    });
}

function setupGroupDrag(tBlock, groupId, venueId, allGroups) {
    const handle = tBlock.querySelector('.drag-handle');
    if (!handle) return;
    tBlock.setAttribute('draggable', true);
    tBlock.addEventListener('dragstart', e => {
        _dragSrc = groupId; _dragType = 'group'; _dragGroupId = venueId;
        tBlock.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', groupId);
    });
    tBlock.addEventListener('dragend', () => { tBlock.classList.remove('dragging'); _dragSrc = null; });
    tBlock.addEventListener('dragover', e => {
        e.preventDefault();
        if (_dragType !== 'group' || _dragGroupId !== venueId) return;
        const rect = tBlock.getBoundingClientRect();
        const half = rect.top + rect.height / 2;
        document.querySelectorAll('.timing-block.drag-over-top,.timing-block.drag-over-bottom')
            .forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
        tBlock.classList.add(e.clientY < half ? 'drag-over-top' : 'drag-over-bottom');
    });
    tBlock.addEventListener('dragleave', () => tBlock.classList.remove('drag-over-top', 'drag-over-bottom'));
    tBlock.addEventListener('drop', e => {
        e.preventDefault(); e.stopPropagation();
        tBlock.classList.remove('drag-over-top', 'drag-over-bottom');
        if (!_dragSrc || _dragSrc === groupId || _dragGroupId !== venueId) return;
        const ordered = applyOrder(allGroups, 'grp_' + venueId);
        let ids = ordered.map(g => g.id);
        const fromIdx = ids.indexOf(_dragSrc);
        const toIdx = ids.indexOf(groupId);
        if (fromIdx < 0 || toIdx < 0) return;
        const rect = tBlock.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;
        ids.splice(fromIdx, 1);
        const newTo = insertBefore ? ids.indexOf(groupId) : ids.indexOf(groupId) + 1;
        ids.splice(newTo < 0 ? ids.length : newTo, 0, _dragSrc);
        saveOrder('grp_' + venueId, ids);
        renderAll();
    });
}

// ===== WBS レンダリング =====
function renderWBS() {
    const wrap = document.getElementById('wbs-content');
    wrap.innerHTML = '';

    TASKS.venues.forEach(v => {
        const allGroups = applyOrder(getGroupsForVenue(v), 'grp_' + v.id);

        let vTotal = 0, vDone = 0;
        allGroups.forEach(g => {
            const allP = applyOrder([...g.personnel.map(t => mergeTask(t)), ...getCP().filter(t => t.groupId === g.id).map(t => mergeTask(t))], 'prs_' + g.id);
            const allR = applyOrder([...(g.prepItems || []).map(p => ({ ...p, done: getDone(p.id) })), ...getCR().filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id) }))], 'prp_' + g.id);
            vTotal += allP.length + allR.length;
            vDone += [...allP, ...allR].filter(x => x.done).length;
        });

        const vBlock = document.createElement('div');
        vBlock.className = 'venue-block';

        // 会場ヘッダー
        const vHeader = document.createElement('div');
        vHeader.className = 'venue-header';
        vHeader.innerHTML = `<span class="arrow">▶</span><h2>🏢 ${v.name}</h2><span class="venue-count">${vDone}/${vTotal} 完了</span>`;
        const addGrpBtn = document.createElement('button');
        addGrpBtn.className = 'add-btn'; addGrpBtn.innerHTML = '＋ タイムテーブル'; addGrpBtn.style.marginLeft = '10px';
        addGrpBtn.onclick = e => { e.stopPropagation(); showAddGroupForm(vBlock, v.id); };
        vHeader.appendChild(addGrpBtn);

        const vBody = document.createElement('div');
        vBody.className = 'venue-body';
        applyOpenState(vBody, vHeader.querySelector('.arrow'), 'v_' + v.id, true);
        vHeader.addEventListener('click', e => {
            if (addGrpBtn === e.target || addGrpBtn.contains(e.target)) return;
            toggleOpen(vBody, vHeader.querySelector('.arrow'), 'v_' + v.id);
        });

        // タイムテーブル
        allGroups.forEach((g, gIdx) => {
            const allP = applyOrder([...g.personnel.map(t => mergeTask(t)), ...getCP().filter(t => t.groupId === g.id).map(t => mergeTask(t))], 'prs_' + g.id);
            const allR = applyOrder([...(g.prepItems || []).map(p => ({ ...p, done: getDone(p.id) })), ...getCR().filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id) }))], 'prp_' + g.id);
            const gDone = [...allP, ...allR].filter(x => x.done).length;

            const tBlock = document.createElement('div');
            tBlock.className = 'timing-block';
            tBlock.dataset.gid = g.id;

            const tHeader = document.createElement('div');
            tHeader.className = 'timing-header';

            // ドラッグハンドル＋移動ボタン
            const handle = document.createElement('span');
            handle.className = 'drag-handle'; handle.textContent = '⠿'; handle.title = 'ドラッグで並べ替え';
            const moveBtns = document.createElement('div');
            moveBtns.className = 'move-btns';
            const upBtn = document.createElement('button'); upBtn.className = 'move-btn'; upBtn.textContent = '▲'; upBtn.title = '上へ';
            const dnBtn = document.createElement('button'); dnBtn.className = 'move-btn'; dnBtn.textContent = '▼'; dnBtn.title = '下へ';
            if (gIdx === 0) upBtn.disabled = true;
            if (gIdx === allGroups.length - 1) dnBtn.disabled = true;
            upBtn.onclick = e => { e.stopPropagation(); moveItem(getGroupsForVenue(v), g.id, 'up', 'grp_' + v.id); };
            dnBtn.onclick = e => { e.stopPropagation(); moveItem(getGroupsForVenue(v), g.id, 'down', 'grp_' + v.id); };
            moveBtns.appendChild(upBtn); moveBtns.appendChild(dnBtn);

            tHeader.appendChild(handle);
            tHeader.appendChild(moveBtns);
            tHeader.innerHTML += `<span class="arrow">▶</span><h3>⏱ ${g.timing}</h3><span class="timing-count">${gDone}/${allP.length + allR.length}</span>`;

            const addPBtn = document.createElement('button'); addPBtn.className = 'add-btn'; addPBtn.innerHTML = '＋ 人員';
            const addRBtn = document.createElement('button'); addRBtn.className = 'add-btn'; addRBtn.innerHTML = '＋ 準備物';
            tHeader.appendChild(addPBtn); tHeader.appendChild(addRBtn);

            const tBody = document.createElement('div');
            applyOpenState(tBody, tHeader.querySelector('.arrow'), 'g_' + g.id, true);
            tHeader.addEventListener('click', e => {
                if ([handle, upBtn, dnBtn, addPBtn, addRBtn].some(b => b === e.target || b.contains(e.target))) return;
                toggleOpen(tBody, tHeader.querySelector('.arrow'), 'g_' + g.id);
            });

            const pSec = buildSubSection('👥 人員', allP, g.id, v.id, 'personnel');
            const rSec = buildSubSection('📦 準備物', allR, g.id, v.id, 'prep');

            addPBtn.onclick = e => { e.stopPropagation(); const b = pSec.querySelector('.sub-body'); showAddForm(b, g.id, 'personnel'); };
            addRBtn.onclick = e => { e.stopPropagation(); const b = rSec.querySelector('.sub-body'); showAddForm(b, g.id, 'prep'); };

            tBody.appendChild(pSec); tBody.appendChild(rSec);
            tBlock.appendChild(tHeader); tBlock.appendChild(tBody);
            vBody.appendChild(tBlock);
            setupGroupDrag(tBlock, g.id, v.id, allGroups);
        });

        vBlock.appendChild(vHeader); vBlock.appendChild(vBody);
        wrap.appendChild(vBlock);
    });

    updateProgress();
}

function buildSubSection(title, items, groupId, venueId, type) {
    const sec = document.createElement('div');
    sec.className = 'sub-section';
    const orderKey = type === 'personnel' ? 'prs_' + groupId : 'prp_' + groupId;

    const header = document.createElement('div');
    header.className = 'sub-header';
    const doneCnt = items.filter(i => i.done).length;
    header.innerHTML = `<span class="arrow">▶</span><span class="sub-title">${title}</span><span class="sub-count">${doneCnt}/${items.length}</span>`;

    const body = document.createElement('div');
    body.className = 'sub-body';
    applyOpenState(body, header.querySelector('.arrow'), (type === 'personnel' ? 'sp_' : 'sr_') + groupId, true);
    header.onclick = () => toggleOpen(body, header.querySelector('.arrow'), (type === 'personnel' ? 'sp_' : 'sr_') + groupId);

    const list = document.createElement('div');
    list.className = 'task-list';

    items.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = `task-row${item.done ? ' done' : ''}`;
        row.dataset.id = item.id;

        // ドラッグハンドル
        const dh = document.createElement('span');
        dh.className = 'drag-handle'; dh.textContent = '⠿'; dh.title = 'ドラッグで並べ替え';

        // 移動ボタン
        const mb = document.createElement('div'); mb.className = 'move-btns';
        const ub = document.createElement('button'); ub.className = 'move-btn'; ub.textContent = '▲'; ub.title = '上へ'; if (idx === 0) ub.disabled = true;
        const db = document.createElement('button'); db.className = 'move-btn'; db.textContent = '▼'; db.title = '下へ'; if (idx === items.length - 1) db.disabled = true;
        ub.onclick = e => { e.stopPropagation(); moveItem(items, item.id, 'up', orderKey); };
        db.onclick = e => { e.stopPropagation(); moveItem(items, item.id, 'down', orderKey); };
        mb.appendChild(ub); mb.appendChild(db);

        const chk = document.createElement('div');
        chk.className = `task-check${item.done ? ' checked' : ''}`;
        chk.dataset.check = item.id;

        if (type === 'personnel') {
            row.appendChild(dh); row.appendChild(mb); row.appendChild(chk);
            const txt = document.createElement('span'); txt.className = 'task-text'; txt.textContent = item.text;
            row.appendChild(txt);
            row.insertAdjacentHTML('beforeend', tantoBadge(item.tanto) + prioBadge(item.priority));
            if (item.memo) row.insertAdjacentHTML('beforeend', `<span class="task-memo" title="${item.memo}">${item.memo}</span>`);
            chk.addEventListener('click', e => { e.stopPropagation(); setDone(item.id, !getDone(item.id)); renderAll(); });
            row.addEventListener('click', () => openDetail(item));
        } else {
            row.appendChild(dh); row.appendChild(mb); row.appendChild(chk);
            const txt = document.createElement('span'); txt.className = 'task-text'; txt.textContent = item.text;
            row.appendChild(txt);
            chk.addEventListener('click', () => { setDone(item.id, !getDone(item.id)); renderAll(); });
            row.addEventListener('click', () => { setDone(item.id, !getDone(item.id)); renderAll(); });
        }

        setupTaskDrag(row, item.id, orderKey, items);
        list.appendChild(row);
    });

    const addRow = document.createElement('div'); addRow.className = 'add-row';
    const addBtn = document.createElement('button'); addBtn.className = 'add-btn'; addBtn.innerHTML = '＋ 追加';
    addBtn.onclick = e => { e.stopPropagation(); showAddForm(body, groupId, type); };
    addRow.appendChild(addBtn);
    body.appendChild(list); body.appendChild(addRow);
    sec.appendChild(header); sec.appendChild(body);
    return sec;
}

// ===== ガントチャート =====
const GANTT_START = new Date('2026-03-01');
const GANTT_END = new Date('2026-07-01');
const MONTHS = ['3月', '4月', '5月', '6月'];
const TOTAL_MS = GANTT_END - GANTT_START;

function dayRatio(d) { const dt = typeof d === 'string' ? new Date(d) : d; return Math.max(0, Math.min(1, (dt - GANTT_START) / TOTAL_MS)); }

function makeGanttRow(task) {
    const t = mergeTask(task);
    const row = document.createElement('div');
    row.className = `gantt-row${t.done ? ' done' : ''}`;
    const label = document.createElement('div'); label.className = 'gantt-label'; label.textContent = t.text; label.title = t.text;
    row.appendChild(label);
    const grid = document.createElement('div'); grid.className = 'gantt-grid'; grid.style.position = 'relative';
    MONTHS.forEach(() => { const c = document.createElement('div'); c.className = 'gantt-month-col'; grid.appendChild(c); });
    const sp = dayRatio(t.start) * 100;
    const ep = (dayRatio(t.end) + 1 / (TOTAL_MS / 86400000)) * 100;
    if (t.start === t.end) {
        const m = document.createElement('div'); m.className = 'gantt-marker'; m.style.left = sp + '%'; m.textContent = '◆';
        if (t.done) m.style.color = '#cbd5e1'; grid.appendChild(m);
    } else {
        const b = document.createElement('div'); b.className = `gantt-bar ${t.done ? 'done' : (t.priority || '')}`;
        b.style.left = sp + '%'; b.style.width = Math.max(0.5, ep - sp) + '%';
        b.title = `${t.text}：${t.start} 〜 ${t.end}`; grid.appendChild(b);
    }
    row.appendChild(grid); return row;
}

function renderGantt() {
    const wrap = document.getElementById('gantt-view');
    wrap.innerHTML = '';
    const hRow = document.createElement('div'); hRow.className = 'gantt-header-row';
    MONTHS.forEach(m => { const el = document.createElement('div'); el.className = 'gantt-month'; el.textContent = m; hRow.appendChild(el); });
    wrap.appendChild(hRow);
    const gw = document.createElement('div'); gw.className = 'gantt-wrap'; gw.style.position = 'relative';

    TASKS.venues.forEach(v => {
        const allGroups = applyOrder(getGroupsForVenue(v), 'grp_' + v.id);
        allGroups.forEach(g => {
            const tasks = applyOrder([...g.personnel, ...getCP().filter(t => t.groupId === g.id)], 'prs_' + g.id);
            if (!tasks.length) return;
            const lbl = document.createElement('div'); lbl.className = 'gantt-section-label'; lbl.textContent = `🏢 ${v.name}  ＞  ${g.timing}`; gw.appendChild(lbl);
            tasks.forEach(t => gw.appendChild(makeGanttRow(t)));
        });
    });

    // 週ごとのグレー縦線
    let d = new Date(GANTT_START);
    while (d <= GANTT_END) {
        const r = dayRatio(d);
        const line = document.createElement('div');
        line.style.cssText = `position:absolute;top:0;bottom:0;width:1px;background:rgba(0,0,0,0.07);pointer-events:none;z-index:4;left:calc(200px + (100% - 200px) * ${r})`;
        const lbl = document.createElement('div');
        lbl.style.cssText = `position:absolute;top:2px;font-size:9px;color:#94a3b8;font-family:var(--font-mono);transform:translateX(-50%);background:#fff;padding:0 2px;white-space:nowrap;z-index:5;left:calc(200px + (100% - 200px) * ${r})`;
        lbl.textContent = `${d.getMonth() + 1}/${d.getDate()}`;
        gw.appendChild(line); gw.appendChild(lbl);
        d = new Date(d.getTime() + 7 * 86400000);
    }
    [new Date('2026-04-01'), new Date('2026-05-01'), new Date('2026-06-01')].forEach(md => {
        const r = dayRatio(md); const line = document.createElement('div');
        line.style.cssText = `position:absolute;top:0;bottom:0;width:1.5px;background:rgba(59,130,246,0.18);pointer-events:none;z-index:3;left:calc(200px + (100% - 200px) * ${r})`;
        gw.appendChild(line);
    });
    const todayR = dayRatio(new Date());
    if (todayR >= 0 && todayR <= 1) {
        const line = document.createElement('div'); line.className = 'today-line'; line.style.left = `calc(200px + (100% - 200px) * ${todayR})`;
        const lbl = document.createElement('div'); lbl.className = 'today-label'; lbl.style.left = `calc(200px + (100% - 200px) * ${todayR})`; lbl.textContent = '今日';
        gw.appendChild(line); gw.appendChild(lbl);
    }
    wrap.appendChild(gw);
}

// ===== 担当者別 =====
function renderAssignee() {
    const wrap = document.getElementById('assignee-view'); wrap.innerHTML = '';
    const map = new Map();
    allPersonnel().forEach(t => { const k = t.tanto || '未定'; if (!map.has(k)) map.set(k, []); map.get(k).push(t); });
    [...map.keys()].sort((a, b) => a === '未定' ? 1 : b === '未定' ? -1 : a.localeCompare(b))
        .forEach(name => renderSectionBlock(wrap, '👤 ' + name, map.get(name).sort((a, b) => (a.end || '').localeCompare(b.end || '')), true));
}

// ===== 締切日順 =====
function renderDeadline() {
    const wrap = document.getElementById('deadline-view'); wrap.innerHTML = '';
    const map = new Map();
    allPersonnel().forEach(t => { const k = t.end || '未設定'; if (!map.has(k)) map.set(k, []); map.get(k).push(t); });
    [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, tasks]) => renderSectionBlock(wrap, '📅 ' + date, tasks, true));
}

// ===== 人員一覧 =====
function renderPersonnelList() {
    const wrap = document.getElementById('personnel-view'); wrap.innerHTML = '';
    TASKS.venues.forEach(v => {
        applyOrder(getGroupsForVenue(v), 'grp_' + v.id).forEach(g => {
            const items = applyOrder([...g.personnel.map(t => mergeTask(t)), ...getCP().filter(t => t.groupId === g.id).map(t => mergeTask(t))], 'prs_' + g.id);
            if (!items.length) return;
            renderSectionBlock(wrap, `🏢 ${v.name} ＞ ${g.timing}`, items, true);
        });
    });
}

// ===== 準備物一覧 =====
function renderPrepList() {
    const wrap = document.getElementById('prep-view'); wrap.innerHTML = '';
    TASKS.venues.forEach(v => {
        applyOrder(getGroupsForVenue(v), 'grp_' + v.id).forEach(g => {
            const items = applyOrder([...(g.prepItems || []).map(p => ({ ...p, done: getDone(p.id) })), ...getCR().filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id) }))], 'prp_' + g.id);
            if (!items.length) return;
            const sec = document.createElement('div'); sec.className = 'section-block';
            const h = document.createElement('div'); h.className = 'section-block-header';
            h.innerHTML = `<span class="section-block-name">🏢 ${v.name} ＞ ${g.timing}</span><span class="section-block-count">${items.filter(i => i.done).length}/${items.length} 完了</span>`;
            sec.appendChild(h);
            items.forEach(p => {
                const row = document.createElement('div'); row.className = `list-row${p.done ? ' done' : ''}`;
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
    const sec = document.createElement('div'); sec.className = 'section-block';
    const h = document.createElement('div'); h.className = 'section-block-header';
    h.innerHTML = `<span class="section-block-name">${title}</span><span class="section-block-count">${tasks.filter(t => t.done).length}/${tasks.length} 完了</span>`;
    sec.appendChild(h);
    tasks.forEach(t => {
        const row = document.createElement('div'); row.className = `list-row task-row${t.done ? ' done' : ''}`;
        row.dataset.id = t.id;
        row.innerHTML = `<div class="task-check${t.done ? ' checked' : ''}" data-check="${t.id}"></div>
      <span class="task-text">${t.text}</span>
      ${isPersonnel ? tantoBadge(t.tanto) : ''}${isPersonnel ? prioBadge(t.priority) : ''}
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
