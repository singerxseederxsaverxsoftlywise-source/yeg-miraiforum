/* =====================================================
   app.js — WBS管理アプリ v5
   ① ↑↓/⠿ を各行の右端に
   ② タイミングヘッダーから ＋人員/＋準備物 を削除
   ③ ＋会場ボタン追加（localStorageで管理）
   ④ innerHTML += バグ修正（全て createElement で構築）
   ===================================================== */

// ===== ストレージキー =====
const LS_DONE = 'wbs_done_', LS_EDIT = 'wbs_edit_';
const LS_CP = 'wbs_custom_personnel';
const LS_CR = 'wbs_custom_prep';
const LS_CG = 'wbs_custom_groups';
const LS_CV = 'wbs_custom_venues';   // ③ 新規会場

// ===== 基本CRUD =====
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
function getCV() { try { return JSON.parse(localStorage.getItem(LS_CV)) || []; } catch { return []; } }
function saveCV(a) { localStorage.setItem(LS_CV, JSON.stringify(a)); }

// ===== 開閉状態 =====
function getOpen(key, def = true) { const v = localStorage.getItem('wbs_open_' + key); return v === null ? def : v === 'true'; }
function setOpen(key, val) { localStorage.setItem('wbs_open_' + key, val); }
function applyOpenState(body, arrow, key, def = true) {
    const o = getOpen(key, def);
    body.style.display = o ? '' : 'none';
    if (arrow) arrow.classList.toggle('open', o);
}
function toggleOpen(body, arrow, key) {
    const was = body.style.display !== 'none';
    body.style.display = was ? 'none' : '';
    if (arrow) arrow.classList.toggle('open', !was);
    setOpen(key, !was);
}

// ===== 並べ替え順序 =====
function getOrder(key) { try { return JSON.parse(localStorage.getItem('wbs_ord_' + key)) || null; } catch { return null; } }
function saveOrder(key, a) { localStorage.setItem('wbs_ord_' + key, JSON.stringify(a)); }
function applyOrder(items, key) {
    const ord = getOrder(key); if (!ord) return items;
    const map = new Map(items.map(i => [i.id, i]));
    const res = []; ord.forEach(id => { if (map.has(id)) { res.push(map.get(id)); map.delete(id); } });
    map.forEach(v => res.push(v)); return res;
}
function moveItem(items, id, dir, key) {
    let ids = applyOrder(items, key).map(i => i.id);
    const idx = ids.indexOf(id); if (idx < 0) return;
    if (dir === 'up' && idx > 0) [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    if (dir === 'down' && idx < ids.length - 1) [ids[idx + 1], ids[idx]] = [ids[idx], ids[idx + 1]];
    saveOrder(key, ids); renderAll();
}

// ===== 全会場（base + カスタム）=====
function getAllVenues() { return [...TASKS.venues, ...getCV()]; }
function getGroupsForVenue(v) { return [...(v.groups || []), ...getCG().filter(g => g.venueId === v.id)]; }

// ===== 全人員 =====
function allPersonnel() {
    const arr = [];
    getAllVenues().forEach(v => getGroupsForVenue(v).forEach(g => {
        const base = g.personnel.map(t => mergeTask({ ...t, venueId: v.id, venueN: v.name, groupId: g.id, groupN: g.timing }));
        const cust = getCP().filter(t => t.groupId === g.id).map(t => mergeTask({ ...t, venueId: v.id, venueN: v.name, groupN: g.timing }));
        arr.push(...applyOrder([...base, ...cust], 'prs_' + g.id));
    }));
    return arr;
}

// ===== 全準備物 =====
function allPrepItems() {
    const arr = [];
    getAllVenues().forEach(v => getGroupsForVenue(v).forEach(g => {
        const base = (g.prepItems || []).map(p => ({ ...p, done: getDone(p.id), venueId: v.id, venueN: v.name, groupId: g.id, groupN: g.timing }));
        const cust = getCR().filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id), venueId: v.id, venueN: v.name, groupN: g.timing }));
        arr.push(...applyOrder([...base, ...cust], 'prp_' + g.id));
    }));
    return arr;
}

// 進捗
function updateProgress() {
    const all = [...allPersonnel(), ...allPrepItems()];
    const done = all.filter(t => t.done).length;
    const pct = all.length ? Math.round(done / all.length * 100) : 0;
    document.getElementById('prog-fill').style.width = pct + '%';
    document.getElementById('prog-label').textContent = `${done} / ${all.length}  (${pct}%)`;
}

// ===== タブ =====
let activeTab = 'wbs';
function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('wbs-view').classList.toggle('active', tab === 'wbs');
    ['gantt', 'assignee', 'deadline', 'personnel', 'prep'].forEach(id => {
        const el = document.getElementById(id + '-view'); if (el) el.classList.toggle('active', id === tab);
    });
    const R = { gantt: renderGantt, assignee: renderAssignee, deadline: renderDeadline, personnel: renderPersonnelList, prep: renderPrepList };
    if (R[tab]) R[tab]();
}

// ===== バッジ =====
const PRIO_LABEL = { high: '🔴 高', mid: '🟡 中', low: '🟢 低' };
function prioBadge(p) { const s = document.createElement('span'); s.className = `badge badge-${p}`; s.textContent = PRIO_LABEL[p] || p; return s; }
function tantoBadge(t) { const s = document.createElement('span'); s.className = 'badge ' + (t ? 'badge-tanto' : 'badge-unset'); s.textContent = t || '未定'; return s; }

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
    closeDetail(); renderAll();
}

// ===== インライン追加フォーム =====
function showAddForm(container, groupId, type) {
    const ex = container.querySelector('.add-form'); if (ex) { ex.remove(); return; }
    const form = document.createElement('div'); form.className = 'add-form';
    const today = new Date().toISOString().slice(0, 10);
    if (type === 'personnel') {
        form.innerHTML = `
      <input name="text"  placeholder="タスク名 *" required>
      <input name="tanto" placeholder="担当者">
      <input name="end" type="date" value="${today}" style="width:130px">
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
            const text = form.querySelector('[name="text"]').value.trim(); if (!text) return;
            const arr = getCP();
            arr.push({
                id: genId(), groupId, text, tanto: form.querySelector('[name="tanto"]').value.trim(),
                start: today, end: form.querySelector('[name="end"]').value || today,
                priority: form.querySelector('[name="priority"]').value, done: false, memo: ''
            });
            saveCP(arr); renderAll();
        };
    } else {
        form.innerHTML = `
      <input name="text" placeholder="準備物名 *" required style="flex:1;min-width:200px">
      <div class="add-form-btns"><button class="add-ok-btn">追加</button><button class="add-cancel-btn">×</button></div>`;
        form.querySelector('.add-ok-btn').onclick = () => {
            const text = form.querySelector('[name="text"]').value.trim(); if (!text) return;
            const arr = getCR(); arr.push({ id: genId(), groupId, text, done: false }); saveCR(arr); renderAll();
        };
    }
    form.querySelector('.add-cancel-btn').onclick = () => form.remove();
    container.appendChild(form); form.querySelector('input').focus();
}

function showAddGroupForm(container, venueId) {
    const ex = container.querySelector('.add-form'); if (ex) { ex.remove(); return; }
    const form = document.createElement('div'); form.className = 'add-form'; form.style.padding = '8px 16px';
    form.innerHTML = `
    <input name="timing" placeholder="タイムテーブル名 *（例：搬入・準備）" required style="flex:1;min-width:220px">
    <div class="add-form-btns"><button class="add-ok-btn">追加</button><button class="add-cancel-btn">×</button></div>`;
    form.querySelector('.add-ok-btn').onclick = () => {
        const timing = form.querySelector('[name="timing"]').value.trim(); if (!timing) return;
        const arr = getCG(); arr.push({ id: genId(), venueId, timing, personnel: [], prepItems: [] }); saveCG(arr); renderAll();
    };
    form.querySelector('.add-cancel-btn').onclick = () => form.remove();
    container.appendChild(form); form.querySelector('input').focus();
}

// ③ 会場追加フォーム
function showAddVenueForm(container) {
    const ex = container.querySelector('.venue-add-form'); if (ex) { ex.remove(); return; }
    const form = document.createElement('div'); form.className = 'add-form venue-add-form'; form.style.cssText = 'padding:10px 16px;margin-bottom:8px;border-radius:8px;border:1px dashed #cbd5e1;';
    form.innerHTML = `
    <input name="name" placeholder="会場名 *（例：別会場ホール）" required style="flex:1;min-width:220px">
    <div class="add-form-btns"><button class="add-ok-btn">追加</button><button class="add-cancel-btn">×</button></div>`;
    form.querySelector('.add-ok-btn').onclick = () => {
        const name = form.querySelector('[name="name"]').value.trim(); if (!name) return;
        const arr = getCV(); arr.push({ id: genId(), name, groups: [], prepItems: [] }); saveCV(arr); renderAll();
    };
    form.querySelector('.add-cancel-btn').onclick = () => form.remove();
    container.prepend(form);
}

// ===== ドラッグ =====
let _dragSrc = null, _dragType = null, _dragScope = null;

function makeMoveWidget(items, id, orderKey, idx, isGroup) {
    // ドラッグハンドル
    const handle = document.createElement('span');
    handle.className = 'drag-handle'; handle.textContent = '⠿'; handle.title = 'ドラッグで並べ替え';

    // ↑↓ ボタン
    const mb = document.createElement('div'); mb.className = 'move-btns';
    const ub = document.createElement('button'); ub.className = 'move-btn'; ub.textContent = '▲'; ub.title = '上へ';
    const db = document.createElement('button'); db.className = 'move-btn'; db.textContent = '▼'; db.title = '下へ';
    if (idx === 0) ub.disabled = true;
    if (idx === items.length - 1) db.disabled = true;
    ub.onclick = e => { e.stopPropagation(); moveItem(items, id, 'up', orderKey); };
    db.onclick = e => { e.stopPropagation(); moveItem(items, id, 'down', orderKey); };
    mb.appendChild(ub); mb.appendChild(db);

    return { handle, mb };
}

function setupDrag(el, id, type, scope, items, orderKey, handle) {
    handle.setAttribute('draggable', true);
    handle.addEventListener('dragstart', e => {
        _dragSrc = id; _dragType = type; _dragScope = scope;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        e.stopPropagation();
    });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); _dragSrc = null; });
    el.addEventListener('dragover', e => {
        e.preventDefault();
        if (_dragType !== type || _dragScope !== scope) return;
        const rect = el.getBoundingClientRect(), half = rect.top + rect.height / 2;
        el.parentElement.querySelectorAll('.drag-over-top,.drag-over-bottom').forEach(x => x.classList.remove('drag-over-top', 'drag-over-bottom'));
        el.classList.add(e.clientY < half ? 'drag-over-top' : 'drag-over-bottom');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over-top', 'drag-over-bottom'));
    el.addEventListener('drop', e => {
        e.preventDefault(); e.stopPropagation();
        el.classList.remove('drag-over-top', 'drag-over-bottom');
        if (!_dragSrc || _dragSrc === id || _dragScope !== scope) return;
        const ordered = applyOrder(items, orderKey);
        let ids = ordered.map(i => i.id);
        const fromIdx = ids.indexOf(_dragSrc), toIdx = ids.indexOf(id);
        if (fromIdx < 0 || toIdx < 0) return;
        const rect = el.getBoundingClientRect(), ins = e.clientY < rect.top + rect.height / 2;
        ids.splice(fromIdx, 1);
        const newTo = ins ? ids.indexOf(id) : ids.indexOf(id) + 1;
        ids.splice(newTo < 0 ? ids.length : newTo, 0, _dragSrc);
        saveOrder(orderKey, ids); renderAll();
    });
}

// ===== WBS レンダリング =====
function renderWBS() {
    const wrap = document.getElementById('wbs-content');
    wrap.innerHTML = '';

    // ③ ＋会場ボタン（一番上）
    const addVenueRow = document.createElement('div');
    addVenueRow.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:10px;';
    const addVenueBtn = document.createElement('button');
    addVenueBtn.className = 'add-btn'; addVenueBtn.innerHTML = '🏢 ＋ 会場を追加';
    addVenueBtn.onclick = () => showAddVenueForm(wrap);
    addVenueRow.appendChild(addVenueBtn);
    wrap.appendChild(addVenueRow);

    getAllVenues().forEach(v => {
        const allGroups = applyOrder(getGroupsForVenue(v), 'grp_' + v.id);
        let vTotal = 0, vDone = 0;
        allGroups.forEach(g => {
            const aP = applyOrder([...g.personnel.map(t => mergeTask(t)), ...getCP().filter(t => t.groupId === g.id).map(t => mergeTask(t))], 'prs_' + g.id);
            const aR = applyOrder([...(g.prepItems || []).map(p => ({ ...p, done: getDone(p.id) })), ...getCR().filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id) }))], 'prp_' + g.id);
            vTotal += aP.length + aR.length; vDone += [...aP, ...aR].filter(x => x.done).length;
        });

        const vBlock = document.createElement('div'); vBlock.className = 'venue-block';

        // --- 会場ヘッダー（createElement のみ、innerHTML +=なし）---
        const vHeader = document.createElement('div'); vHeader.className = 'venue-header';
        const vArrow = document.createElement('span'); vArrow.className = 'arrow'; vArrow.textContent = '▶';
        const vH2 = document.createElement('h2'); vH2.textContent = '🏢 ' + v.name;
        const vCnt = document.createElement('span'); vCnt.className = 'venue-count'; vCnt.textContent = `${vDone}/${vTotal} 完了`;
        const addGrpBtn = document.createElement('button'); addGrpBtn.className = 'add-btn'; addGrpBtn.innerHTML = '＋ タイムテーブル'; addGrpBtn.style.marginLeft = '10px';
        addGrpBtn.onclick = e => { e.stopPropagation(); showAddGroupForm(vBlock, v.id); };
        vHeader.appendChild(vArrow); vHeader.appendChild(vH2); vHeader.appendChild(vCnt); vHeader.appendChild(addGrpBtn);

        const vBody = document.createElement('div'); vBody.className = 'venue-body';
        applyOpenState(vBody, vArrow, 'v_' + v.id, true);
        vHeader.addEventListener('click', e => {
            if (addGrpBtn === e.target || addGrpBtn.contains(e.target)) return;
            toggleOpen(vBody, vArrow, 'v_' + v.id);
        });

        // --- タイムテーブル ---
        allGroups.forEach((g, gIdx) => {
            const allP = applyOrder([...g.personnel.map(t => mergeTask(t)), ...getCP().filter(t => t.groupId === g.id).map(t => mergeTask(t))], 'prs_' + g.id);
            const allR = applyOrder([...(g.prepItems || []).map(p => ({ ...p, done: getDone(p.id) })), ...getCR().filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id) }))], 'prp_' + g.id);
            const gDone = [...allP, ...allR].filter(x => x.done).length;

            const tBlock = document.createElement('div'); tBlock.className = 'timing-block'; tBlock.dataset.gid = g.id;

            // ② タイミングヘッダー：arrow / h3 / count / [右端] handle + ↑↓
            const tHeader = document.createElement('div'); tHeader.className = 'timing-header';
            const tArrow = document.createElement('span'); tArrow.className = 'arrow'; tArrow.textContent = '▶';
            const tH3 = document.createElement('h3'); tH3.textContent = '⏱ ' + g.timing;
            const tCnt = document.createElement('span'); tCnt.className = 'timing-count'; tCnt.textContent = `${gDone}/${allP.length + allR.length}`;

            // ① 右端の ↑↓ + drag-handle
            const { handle: gHandle, mb: gMb } = makeMoveWidget(allGroups, g.id, 'grp_' + v.id, gIdx, true);

            tHeader.appendChild(tArrow); tHeader.appendChild(tH3); tHeader.appendChild(tCnt);
            tHeader.appendChild(gHandle); tHeader.appendChild(gMb);

            const tBody = document.createElement('div');
            applyOpenState(tBody, tArrow, 'g_' + g.id, true);
            tHeader.addEventListener('click', e => {
                if ([gHandle, gMb].some(b => b === e.target || b.contains(e.target))) return;
                toggleOpen(tBody, tArrow, 'g_' + g.id);
            });

            // ② サブセクション（人員・準備物のみ。ヘッダーに＋ボタン不要）
            const pSec = buildSubSection('👥 人員', allP, g.id, 'personnel');
            const rSec = buildSubSection('📦 準備物', allR, g.id, 'prep');
            tBody.appendChild(pSec); tBody.appendChild(rSec);
            tBlock.appendChild(tHeader); tBlock.appendChild(tBody);
            vBody.appendChild(tBlock);

            setupDrag(tBlock, g.id, 'group', v.id, allGroups, 'grp_' + v.id, gHandle);
        });

        vBlock.appendChild(vHeader); vBlock.appendChild(vBody);
        wrap.appendChild(vBlock);
    });

    updateProgress();
}

function buildSubSection(title, items, groupId, type) {
    const sec = document.createElement('div'); sec.className = 'sub-section';
    const orderKey = (type === 'personnel' ? 'prs_' : 'prp_') + groupId;
    const stateKey = (type === 'personnel' ? 'sp_' : 'sr_') + groupId;

    const header = document.createElement('div'); header.className = 'sub-header';
    const hArrow = document.createElement('span'); hArrow.className = 'arrow'; hArrow.textContent = '▶';
    const hTitle = document.createElement('span'); hTitle.className = 'sub-title'; hTitle.textContent = title;
    const hCnt = document.createElement('span'); hCnt.className = 'sub-count'; hCnt.textContent = `${items.filter(i => i.done).length}/${items.length}`;
    header.appendChild(hArrow); header.appendChild(hTitle); header.appendChild(hCnt);

    const body = document.createElement('div'); body.className = 'sub-body';
    applyOpenState(body, hArrow, stateKey, true);
    header.onclick = () => toggleOpen(body, hArrow, stateKey);

    const list = document.createElement('div'); list.className = 'task-list';

    items.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = `task-row${item.done ? ' done' : ''}`;
        row.dataset.id = item.id;

        const chk = document.createElement('div');
        chk.className = `task-check${item.done ? ' checked' : ''}`;
        chk.dataset.check = item.id;
        const txtEl = document.createElement('span'); txtEl.className = 'task-text'; txtEl.textContent = item.text;

        // ① 右端に ↑↓ + drag-handle
        const { handle, mb } = makeMoveWidget(items, item.id, orderKey, idx, false);

        if (type === 'personnel') {
            chk.addEventListener('click', e => { e.stopPropagation(); setDone(item.id, !getDone(item.id)); renderAll(); });
            row.addEventListener('click', () => openDetail(item));
            row.appendChild(chk); row.appendChild(txtEl);
            row.appendChild(tantoBadge(item.tanto));
            row.appendChild(prioBadge(item.priority));
            if (item.memo) { const m = document.createElement('span'); m.className = 'task-memo'; m.title = item.memo; m.textContent = item.memo; row.appendChild(m); }
        } else {
            chk.addEventListener('click', () => { setDone(item.id, !getDone(item.id)); renderAll(); });
            row.addEventListener('click', () => { setDone(item.id, !getDone(item.id)); renderAll(); });
            row.appendChild(chk); row.appendChild(txtEl);
        }
        // 右端に配置
        row.appendChild(handle); row.appendChild(mb);

        setupDrag(row, item.id, type, groupId, items, orderKey, handle);
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
const GANTT_START = new Date('2026-03-01'), GANTT_END = new Date('2026-07-01');
const MONTHS = ['3月', '4月', '5月', '6月'], TOTAL_MS = GANTT_END - GANTT_START;
function dayRatio(d) { const dt = typeof d === 'string' ? new Date(d) : d; return Math.max(0, Math.min(1, (dt - GANTT_START) / TOTAL_MS)); }

function makeGanttRow(task) {
    const t = mergeTask(task);
    const row = document.createElement('div'); row.className = `gantt-row${t.done ? ' done' : ''}`;
    const label = document.createElement('div'); label.className = 'gantt-label'; label.textContent = t.text; label.title = t.text;
    row.appendChild(label);
    const grid = document.createElement('div'); grid.className = 'gantt-grid'; grid.style.position = 'relative';
    MONTHS.forEach(() => { const c = document.createElement('div'); c.className = 'gantt-month-col'; grid.appendChild(c); });
    const sp = dayRatio(t.start) * 100, ep = (dayRatio(t.end) + 1 / (TOTAL_MS / 86400000)) * 100;
    if (t.start === t.end) {
        const m = document.createElement('div'); m.className = 'gantt-marker'; m.style.left = sp + '%'; m.textContent = '◆';
        if (t.done) m.style.color = '#cbd5e1'; grid.appendChild(m);
    } else {
        const b = document.createElement('div'); b.className = `gantt-bar ${t.done ? 'done' : (t.priority || '')}`;
        b.style.left = sp + '%'; b.style.width = Math.max(0.5, ep - sp) + '%'; b.title = `${t.text}：${t.start} 〜 ${t.end}`; grid.appendChild(b);
    }
    row.appendChild(grid); return row;
}

function renderGantt() {
    const wrap = document.getElementById('gantt-view'); wrap.innerHTML = '';
    const hRow = document.createElement('div'); hRow.className = 'gantt-header-row';
    MONTHS.forEach(m => { const el = document.createElement('div'); el.className = 'gantt-month'; el.textContent = m; hRow.appendChild(el); });
    wrap.appendChild(hRow);
    const gw = document.createElement('div'); gw.className = 'gantt-wrap'; gw.style.position = 'relative';

    getAllVenues().forEach(v => {
        applyOrder(getGroupsForVenue(v), 'grp_' + v.id).forEach(g => {
            const tasks = applyOrder([...g.personnel, ...getCP().filter(t => t.groupId === g.id)], 'prs_' + g.id);
            if (!tasks.length) return;
            const lbl = document.createElement('div'); lbl.className = 'gantt-section-label'; lbl.textContent = `🏢 ${v.name}  ＞  ${g.timing}`; gw.appendChild(lbl);
            tasks.forEach(t => gw.appendChild(makeGanttRow(t)));
        });
    });

    // 週グレー縦線
    let d = new Date(GANTT_START);
    while (d <= GANTT_END) {
        const r = dayRatio(d);
        const line = document.createElement('div'); line.style.cssText = `position:absolute;top:0;bottom:0;width:1px;background:rgba(0,0,0,0.07);pointer-events:none;z-index:4;left:calc(200px + (100% - 200px) * ${r})`;
        const lbl = document.createElement('div'); lbl.style.cssText = `position:absolute;top:2px;font-size:9px;color:#94a3b8;font-family:var(--font-mono);transform:translateX(-50%);background:#fff;padding:0 2px;white-space:nowrap;z-index:5;left:calc(200px + (100% - 200px) * ${r})`;
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
        .forEach(n => renderSectionBlock(wrap, '👤 ' + n, map.get(n).sort((a, b) => (a.end || '').localeCompare(b.end || '')), true));
}

// ===== 締切日順 =====
function renderDeadline() {
    const wrap = document.getElementById('deadline-view'); wrap.innerHTML = '';
    const map = new Map();
    allPersonnel().forEach(t => { const k = t.end || '未設定'; if (!map.has(k)) map.set(k, []); map.get(k).push(t); });
    [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([d, ts]) => renderSectionBlock(wrap, '📅 ' + d, ts, true));
}

// ===== 人員一覧 =====
function renderPersonnelList() {
    const wrap = document.getElementById('personnel-view'); wrap.innerHTML = '';
    getAllVenues().forEach(v => applyOrder(getGroupsForVenue(v), 'grp_' + v.id).forEach(g => {
        const items = applyOrder([...g.personnel.map(t => mergeTask(t)), ...getCP().filter(t => t.groupId === g.id).map(t => mergeTask(t))], 'prs_' + g.id);
        if (!items.length) return;
        renderSectionBlock(wrap, `🏢 ${v.name} ＞ ${g.timing}`, items, true);
    }));
}

// ===== 準備物一覧 =====
function renderPrepList() {
    const wrap = document.getElementById('prep-view'); wrap.innerHTML = '';
    getAllVenues().forEach(v => applyOrder(getGroupsForVenue(v), 'grp_' + v.id).forEach(g => {
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
    }));
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
      <span style="font-size:10px;color:var(--text3);margin-left:auto;font-family:var(--font-mono)">${t.end || ''}</span>`;
        if (isPersonnel) {
            row.insertBefore(tantoBadge(t.tanto), row.querySelector('span[style]'));
            row.insertBefore(prioBadge(t.priority), row.querySelector('span[style]'));
        }
        row.querySelector('[data-check]').addEventListener('click', e => { e.stopPropagation(); setDone(t.id, !getDone(t.id)); renderAll(); });
        if (isPersonnel) row.addEventListener('click', () => openDetail(t));
        sec.appendChild(row);
    });
    wrap.appendChild(sec);
}

function renderAll() {
    const R = { wbs: renderWBS, gantt: renderGantt, assignee: renderAssignee, deadline: renderDeadline, personnel: renderPersonnelList, prep: renderPrepList };
    if (R[activeTab]) R[activeTab]();
    updateProgress();
}

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    document.getElementById('close-panel').addEventListener('click', closeDetail);
    document.getElementById('save-detail').addEventListener('click', saveDetail);
    document.getElementById('del-task').addEventListener('click', deleteSelected);
    renderWBS(); updateProgress();
});
