/* =====================================================
   app.js — WBS管理アプリ v5
   ① ↑↓/⠿ を各行の右端に
   ② タイミングヘッダーから ＋人員/＋準備物 を削除
   ③ ＋会場ボタン追加（localStorageで管理）
   ④ innerHTML += バグ修正（全て createElement で構築）
   ===================================================== */

// ===== ストレージキー =====
const LS_DONE = 'wbs_done_', LS_EDIT = 'wbs_edit_';
const LS_CP = 'wbs_custom_personnel', LS_CR = 'wbs_custom_prep';
const LS_CG = 'wbs_custom_groups', LS_CV = 'wbs_custom_venues';
const LS_CLR = 'wbs_colors_';
const LS_DEL = 'wbs_deleted_ids';
const LS_PROJ = 'wbs_project_meta';

// ===== 基本CRUD & ユーティリティ =====
function getDone(id) { return localStorage.getItem(LS_DONE + id) === 'true'; }
function setDone(id, val) { localStorage.setItem(LS_DONE + id, val); }
function getEdit(id) { try { return JSON.parse(localStorage.getItem(LS_EDIT + id)) || {}; } catch { return {}; } }
function saveEdit(id, d) { localStorage.setItem(LS_EDIT + id, JSON.stringify(d)); }
function getColor(id, def = '#3b82f6') { return localStorage.getItem(LS_CLR + id) || def; }
function saveColor(id, c) { localStorage.setItem(LS_CLR + id, c); }
function genId() { return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }
function mergeTask(t) { return { ...t, ...getEdit(t.id), done: getDone(t.id) }; }
function mergeGroup(g) { return { ...g, ...getEdit(g.id) }; }
function toDateStr(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

// プロジェクト情報
function getProj() { try { return JSON.parse(localStorage.getItem(LS_PROJ)) || TASKS.project; } catch { return TASKS.project; } }
function saveProj(p) { localStorage.setItem(LS_PROJ, JSON.stringify(p)); }

function editProject() {
    const p = getProj();
    const name = prompt('プロジェクト名を変更:', p.name);
    if (name === null) return;
    const date = prompt('開催日を変更:', p.date);
    if (date === null) return;
    const venue = prompt('基本会場を変更:', p.venue);
    if (venue === null) return;
    saveProj({ name, date, venue });
    location.reload(); // ヘッダー等全体を更新
}

// 会場・グループ取得
function getCV() { try { return JSON.parse(localStorage.getItem(LS_CV)) || []; } catch { return []; } }
function saveCV(a) { localStorage.setItem(LS_CV, JSON.stringify(a)); }
function getCG() { try { return JSON.parse(localStorage.getItem(LS_CG)) || []; } catch { return []; } }
function saveCG(a) { localStorage.setItem(LS_CG, JSON.stringify(a)); }
function getCP() { try { return JSON.parse(localStorage.getItem(LS_CP)) || []; } catch { return []; } }
function saveCP(a) { localStorage.setItem(LS_CP, JSON.stringify(a)); }
function getCR() { try { return JSON.parse(localStorage.getItem(LS_CR)) || []; } catch { return []; } }
function saveCR(a) { localStorage.setItem(LS_CR, JSON.stringify(a)); }

// 削除済みリスト
function getDeleted() { try { return JSON.parse(localStorage.getItem(LS_DEL)) || []; } catch { return []; } }
function setDeleted(id) { const a = getDeleted(); if(!a.includes(id)){ a.push(id); localStorage.setItem(LS_DEL, JSON.stringify(a)); } }
function isDeleted(id) { return getDeleted().includes(id); }

function getAllVenues() { 
    return [...TASKS.venues, ...getCV()].filter(v => !isDeleted(v.id)); 
}
function getGroupsForVenue(v) { 
    return [...(v.groups || []), ...getCG().filter(g => g.venueId === v.id)]
        .map(mergeGroup)
        .filter(g => !isDeleted(g.id)); 
}

// 階層フィルタ状態
function getFilter() {
    return {
        l1: document.getElementById('filter-l1')?.checked ?? true,
        l2: document.getElementById('filter-l2')?.checked ?? true,
        l3: document.getElementById('filter-l3')?.checked ?? true
    };
}

// 編集・削除プロンプト
function editVenue(v) {
    const n = prompt('会場名を変更:', v.name);
    if (n === null) return;
    if (TASKS.venues.some(x => x.id === v.id)) {
        saveEdit(v.id, { name: n });
    } else {
        const arr = getCV(); const idx = arr.findIndex(x => x.id === v.id);
        if (idx >= 0) { arr[idx].name = n; saveCV(arr); }
    }
    renderAll();
}
function deleteVenue(v) {
    if (!confirm(`会場「${v.name}」を削除しますか？`)) return;
    saveCV(getCV().filter(x => x.id !== v.id)); renderAll();
}
function editGroup(g) {
    const n = prompt('タイムテーブル名を変更:', g.timing);
    if (n === null) return;
    if (getCG().some(x => x.id === g.id)) {
        const arr = getCG(); const idx = arr.findIndex(x => x.id === g.id);
        arr[idx].timing = n; saveCG(arr);
    } else {
        saveEdit(g.id, { timing: n });
    }
    renderAll();
}
function deleteGroup(g) {
    if (!confirm(`タイムテーブル「${g.timing}」を削除しますか？`)) return;
    saveCG(getCG().filter(x => x.id !== g.id)); renderAll();
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

// ===== 全人員 =====
function allPersonnel() {
    const arr = [];
    getAllVenues().forEach(v => getGroupsForVenue(v).forEach(g => {
        const base = g.personnel.map(t => mergeTask({ ...t, venueId: v.id, venueN: v.name, groupId: g.id, groupN: g.timing }));
        const cust = getCP().filter(t => t.groupId === g.id).map(t => mergeTask({ ...t, venueId: v.id, venueN: v.name, groupN: g.timing }));
        arr.push(...applyOrder([...base, ...cust], 'prs_' + g.id).filter(t => !isDeleted(t.id)));
    }));
    return arr;
}

// ===== 全準備物 =====
function allPrepItems() {
    const arr = [];
    getAllVenues().forEach(v => getGroupsForVenue(v).forEach(g => {
        const base = (g.prepItems || []).map(p => ({ ...p, done: getDone(p.id), venueId: v.id, venueN: v.name, groupId: g.id, groupN: g.timing }));
        const cust = getCR().filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id), venueId: v.id, venueN: v.name, groupN: g.timing }));
        arr.push(...applyOrder([...base, ...cust], 'prp_' + g.id).filter(p => !isDeleted(p.id)));
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
let selectedType = 'task'; // 'venue', 'group', 'task'

function openDetail(task, type = 'task') {
    selectedTaskId = task.id;
    selectedType = type;
    document.getElementById('detail-panel').classList.add('open');
    
    // 名称入力
    const name = task.text || task.name || task.timing;
    document.getElementById('d-name-input').value = name;
    document.getElementById('d-title2').textContent = `ID: ${task.id}`;

    document.getElementById('d-tanto').value = task.tanto || '';
    document.getElementById('d-start').value = task.start || '';
    document.getElementById('d-end').value = task.end || '';
    document.getElementById('d-status').value = task.done ? 'done' : 'open';
    document.getElementById('d-prio').value = task.priority || 'mid';
    document.getElementById('d-memo').value = task.memo || '';
    document.getElementById('d-color').value = getColor(task.id);
    
    const isTask = (type === 'task');
    ['d-tanto','d-start','d-end','d-status','d-prio'].forEach(id => {
        document.getElementById(id).parentElement.style.display = isTask ? '' : 'none';
    });
    // メモ欄はタスク・グループ両方で表示
    document.getElementById('d-memo').parentElement.style.display = (type === 'task' || type === 'group') ? '' : 'none';
    const memoLabel = document.getElementById('d-memo').previousElementSibling;
    if (memoLabel) memoLabel.textContent = (type === 'group') ? '業務内容 / 動線' : 'メモ';
}
function closeDetail() {
    document.getElementById('detail-panel').classList.remove('open');
    selectedTaskId = null;
}
function saveDetail() {
    if (!selectedTaskId) return;
    const newName = document.getElementById('d-name-input').value.trim();
    const clr = document.getElementById('d-color').value;
    saveColor(selectedTaskId, clr);

    if (selectedType === 'task') {
        const editData = {
            text: newName,
            tanto: document.getElementById('d-tanto').value,
            start: document.getElementById('d-start').value,
            end: document.getElementById('d-end').value,
            priority: document.getElementById('d-prio').value,
            memo: document.getElementById('d-memo').value,
        };
        saveEdit(selectedTaskId, editData);
        setDone(selectedTaskId, document.getElementById('d-status').value === 'done');
        
        // カスタム配列表も更新（存在する場合）
        let cp = getCP();
        let idx = cp.findIndex(x => x.id === selectedTaskId);
        if (idx >= 0) { cp[idx] = { ...cp[idx], ...editData }; saveCP(cp); }
        
        let cr = getCR();
        let idxR = cr.findIndex(x => x.id === selectedTaskId);
        if (idxR >= 0) { cr[idxR].text = newName; saveCR(cr); }

    } else if (selectedType === 'venue') {
        saveEdit(selectedTaskId, { name: newName });
        let cv = getCV();
        let idxV = cv.findIndex(x => x.id === selectedTaskId);
        if (idxV >= 0) { cv[idxV].name = newName; saveCV(cv); }
        
    } else if (selectedType === 'group') {
        const editData = { timing: newName, memo: document.getElementById('d-memo').value };
        saveEdit(selectedTaskId, editData);
        let cg = getCG();
        let idxG = cg.findIndex(x => x.id === selectedTaskId);
        if (idxG >= 0) { cg[idxG] = { ...cg[idxG], ...editData }; saveCG(cg); }
    }
    closeDetail();
    renderAll();
}
function deleteSelected() {
    if (!selectedTaskId) return;
    if (!confirm('本当に削除しますか？')) return;
    
    setDeleted(selectedTaskId);
    
    if (selectedType === 'task') {
        saveCP(getCP().filter(t => t.id !== selectedTaskId));
        saveCR(getCR().filter(t => t.id !== selectedTaskId));
    } else if (selectedType === 'venue') {
        saveCV(getCV().filter(v => v.id !== selectedTaskId));
    } else if (selectedType === 'group') {
        saveCG(getCG().filter(g => g.id !== selectedTaskId));
    }
    // 不要なデータを整理
    localStorage.removeItem(LS_DONE + selectedTaskId);
    localStorage.removeItem(LS_EDIT + selectedTaskId);
    localStorage.removeItem(LS_CLR + selectedTaskId);
    
    closeDetail(); 
    renderAll();
}

// ===== セクション表示補助 =====
function toggleOpen(body, header, key) {
    const isClose = body.classList.toggle('collapsed');
    header.classList.toggle('collapsed', isClose);
    localStorage.setItem('wbs_open_' + key, isClose ? '0' : '1');
}
function applyOpenState(body, header, key, def = true) {
    const s = localStorage.getItem('wbs_open_' + key);
    const isClose = s === '0' || (!s && !def);
    body.classList.toggle('collapsed', isClose);
    header.classList.toggle('collapsed', isClose);
}

function renderSectionBlock(wrap, title, tasks, isPersonnel) {
    const sec = document.createElement('div'); sec.className = 'section-block';
    const h = document.createElement('div'); h.className = 'section-block-header';
    h.innerHTML = `<span class="section-block-name">${title}</span><span class="section-block-count">${tasks.filter(t => t.done).length}/${tasks.length} 完了</span>`;
    sec.appendChild(h);
    tasks.forEach(t => {
        const row = document.createElement('div'); row.className = `list-row task-row${t.done ? ' done' : ''}`;
        row.innerHTML = `<div class="task-check${t.done ? ' checked' : ''}"></div><span class="task-text">${t.text}</span>`;
        if (isPersonnel) {
            row.appendChild(tantoBadge(t.tanto)); row.appendChild(prioBadge(t.priority));
        }
        row.onclick = () => openDetail(t, 'task');
        sec.appendChild(row);
    });
    wrap.appendChild(sec);
}

// ===== インライン追加フォーム =====
function showAddForm(container, groupId, type) {
    const ex = container.querySelector('.add-form'); if (ex) { ex.remove(); return; }
    const form = document.createElement('div'); form.className = 'add-form';
    const today = toDateStr(new Date());
    if (type === 'personnel') {
        form.innerHTML = `
      <input name="text"  placeholder="タスク名 *" required>
      <input name="tanto" placeholder="担当者">
      <div style="display:flex;gap:4px;align-items:center;">
        <span style="font-size:10px;color:var(--text2)">開始:</span><input name="start" type="date" value="${today}" style="width:125px">
        <span style="font-size:10px;color:var(--text2)">締切:</span><input name="end" type="date" value="${today}" style="width:125px">
      </div>
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
                start: form.querySelector('[name="start"]').value || today,
                end: form.querySelector('[name="end"]').value || today,
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

// ===== ドラッグ & 並べ替え =====
function makeMoveWidget(items, id, orderKey, idx) {
    const handle = document.createElement('span');
    handle.className = 'drag-handle'; handle.textContent = '⠿'; handle.title = 'ドラッグで並べ替え';
    const mb = document.createElement('div'); mb.className = 'move-btns';
    const ub = document.createElement('button'); ub.className = 'move-btn'; ub.textContent = '▲';
    const db = document.createElement('button'); db.className = 'move-btn'; db.textContent = '▼';
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

// ===== 会場サイドバー生成 =====
function createWithSidebar(v, allowEdit = false) {
    const f = getFilter();
    const row = document.createElement('div'); row.className = 'with-sidebar';
    
    if (f.l1) {
        const side = document.createElement('div'); side.className = 'venue-sidebar';
        side.style.backgroundColor = getColor(v.id, '#f1f5f9');
        
        const span = document.createElement('span'); 
        span.textContent = getEdit(v.id).name || v.name;
        side.appendChild(span);

        // L1 並べ替え UI
        const venues = getAllVenues();
        const vIdx = venues.findIndex(x => x.id === v.id);
        const { handle, mb } = makeMoveWidget(venues, v.id, 'vn_all', vIdx);
        mb.appendChild(handle);
        side.appendChild(mb);
        
        // ドラッグ設定
        setupDrag(row, v.id, 'venue', 'all', venues, 'vn_all', handle);

        side.onclick = (e) => {
            if (e.target.closest('.move-btns') || e.target.classList.contains('drag-handle')) return;
            openDetail(v, 'venue');
        };
        row.appendChild(side);
    }
    
    const content = document.createElement('div'); content.className = 'content-area';
    row.appendChild(content);
    return { row, content };
}

// ===== WBS レンダリング =====
function renderWBS() {
    const wrap = document.getElementById('wbs-content'); wrap.innerHTML = '';
    const f = getFilter();

    const addVenueBtn = document.createElement('button');
    addVenueBtn.className = 'add-btn'; addVenueBtn.innerHTML = '🏢 ＋ 会場追加';
    addVenueBtn.onclick = () => showAddVenueForm(wrap);
    wrap.appendChild(addVenueBtn);

    getAllVenues().forEach(v => {
        const { row, content } = createWithSidebar(v, true);
        const groups = applyOrder(getGroupsForVenue(v), 'grp_' + v.id);
        groups.forEach(g => {
            if (!f.l2 && !f.l3) return;
            const tHeader = document.createElement('div'); tHeader.className = 'timing-header';
            tHeader.style.borderLeft = `4px solid ${getColor(g.id, '#3b82f6')}`;
            const tContent = document.createElement('div'); tContent.className = 'timing-content';
            
            if (f.l2) {
                const arrow = document.createElement('span'); arrow.className = 'arrow'; arrow.textContent = '▼';
                tHeader.appendChild(arrow);
                const tName = document.createElement('h3'); tName.textContent = '⏱ ' + (getEdit(g.id).timing || g.timing);
                tHeader.appendChild(tName);
                
                // メモアイコン
                const noteIcon = document.createElement('span');
                noteIcon.className = 'note-icon'; noteIcon.innerHTML = '📓';
                noteIcon.title = '業務内容を表示・編集';
                noteIcon.onclick = (e) => { e.stopPropagation(); openDetail(g, 'group'); };
                tHeader.appendChild(noteIcon);

                // L2 並べ替え UI
                const gIdx = groups.findIndex(x => x.id === g.id);
                const { handle, mb } = makeMoveWidget(groups, g.id, 'grp_' + v.id, gIdx);
                tHeader.appendChild(mb);
                tHeader.appendChild(handle);
                setupDrag(tHeader, g.id, 'group', v.id, groups, 'grp_' + v.id, handle);

                tHeader.onclick = (e) => {
                    if (e.target.closest('.move-btns') || e.target.classList.contains('drag-handle')) return;
                    if (e.target.tagName === 'H3') {
                        openDetail(g, 'group');
                    } else {
                        toggleOpen(tContent, tHeader, g.id);
                    }
                };
                applyOpenState(tContent, tHeader, g.id, true);
            }
            content.appendChild(tHeader);

            // グループメモ表示
            const gMemo = getEdit(g.id).memo || g.memo;
            if (gMemo && f.l2) {
                const memoBlock = document.createElement('div');
                memoBlock.className = 'group-memo-block';
                memoBlock.innerHTML = `<span class="group-memo-label">業務内容 / 動線</span>${gMemo.replace(/\n/g, '<br>')}`;
                content.appendChild(memoBlock);
            }

            if (f.l3) {
                const pBase = g.personnel.map(t => mergeTask(t));
                const pCust = getCP().filter(t => t.groupId === g.id).map(t => mergeTask(t));
                const pItems = applyOrder([...pBase, ...pCust], 'prs_' + g.id).filter(t => !isDeleted(t.id));

                const rBase = (g.prepItems || []).map(p => ({ ...p, done: getDone(p.id) }));
                const rCust = getCR().filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id) }));
                const rItems = applyOrder([...rBase, ...rCust], 'prp_' + g.id).filter(p => !isDeleted(p.id));

                pItems.forEach((item, idx) => {
                    const tRow = document.createElement('div'); tRow.className = `task-row type-personnel${item.done ? ' done' : ''}`;
                    tRow.innerHTML = `<div class="task-check${item.done ? ' checked' : ''}"></div><span class="task-text">${item.text}</span>`;
                    
                    // 担当者・優先度バッジを追加
                    const badgeContainer = document.createElement('div');
                    badgeContainer.style.display = 'flex'; badgeContainer.style.gap = '4px'; badgeContainer.style.marginRight = '8px';
                    badgeContainer.appendChild(tantoBadge(item.tanto));
                    badgeContainer.appendChild(prioBadge(item.priority));
                    tRow.appendChild(badgeContainer);

                    const { handle, mb } = makeMoveWidget(pItems, item.id, 'prs_' + g.id, idx);
                    tRow.appendChild(mb);
                    tRow.appendChild(handle);
                    setupDrag(tRow, item.id, 'task_p', g.id, pItems, 'prs_' + g.id, handle);

                    tRow.onclick = (e) => {
                        if (e.target.closest('.move-btns') || e.target.closest('.drag-handle') || e.target.classList.contains('task-check')) return;
                        openDetail(item, 'task');
                    };
                    tContent.appendChild(tRow);
                });
                rItems.forEach((item, idx) => {
                    const tRow = document.createElement('div'); tRow.className = `task-row type-prep${item.done ? ' done' : ''}`;
                    tRow.innerHTML = `<div class="task-check${item.done ? ' checked' : ''}"></div><span class="task-text">${item.text}</span>`;
                    
                    const { handle, mb } = makeMoveWidget(rItems, item.id, 'prp_' + g.id, idx);
                    tRow.appendChild(mb);
                    tRow.appendChild(handle);
                    setupDrag(tRow, item.id, 'task_r', g.id, rItems, 'prp_' + g.id, handle);

                    tRow.onclick = (e) => {
                        if (e.target.closest('.move-btns') || e.target.closest('.drag-handle')) return;
                        if (e.target.classList.contains('task-check')) {
                            setDone(item.id, !getDone(item.id)); 
                            renderAll();
                        } else {
                            openDetail(item, 'task'); // 準備物も「タスク」扱いで編集可能にする
                        }
                    };
                    tContent.appendChild(tRow);
                });

                // + タスク追加ボタン
                const addT = document.createElement('div');
                addT.style.padding = '4px 16px 4px 48px';
                const addTBtn = document.createElement('button');
                addTBtn.className = 'add-btn';
                addTBtn.innerHTML = '👤 ＋ タスク追加';
                addTBtn.onclick = () => showAddForm(tContent, g.id, 'personnel');
                addT.appendChild(addTBtn);
                tContent.appendChild(addT);

                // + 準備物追加ボタン
                const addP = document.createElement('div');
                addP.style.padding = '4px 16px 8px 48px';
                const addPBtn = document.createElement('button');
                addPBtn.className = 'add-btn';
                addPBtn.innerHTML = '📦 ＋ 準備物追加';
                addPBtn.onclick = () => showAddForm(tContent, g.id, 'prep');
                addP.appendChild(addPBtn);
                tContent.appendChild(addP);
            }
            content.appendChild(tContent);
        });

        // + タイムテーブル追加ボタン
        const addGWrap = document.createElement('div');
        addGWrap.style.padding = '10px 16px';
        const addGBtn = document.createElement('button');
        addGBtn.className = 'add-btn';
        addGBtn.innerHTML = '⏱ ＋ タイムテーブル追加';
        addGBtn.onclick = () => showAddGroupForm(content, v.id);
        addGWrap.appendChild(addGBtn);
        content.appendChild(addGWrap);

        wrap.appendChild(row);
    });
}

function renderGantt() {
    const wrap = document.getElementById('gantt-view'); wrap.innerHTML = '';
    const f = getFilter();
    const today = new Date(); const rangeStart = new Date(today); rangeStart.setDate(today.getDate() - 5); const rangeEnd = new Date(rangeStart); rangeEnd.setMonth(rangeStart.getMonth() + 4);
    const days = []; for(let d=new Date(rangeStart); d<=rangeEnd; d.setDate(d.getDate()+1)) days.push(new Date(d));
    
    // メインコンテナ
    const container = document.createElement('div'); container.className = 'gantt-excel-wrap';
    
    // ヘッダー (日付)
    const hdr = document.createElement('div'); hdr.className = 'gantt-hdr-row';
    
    // 会場サイドバー分（40px相当）のスペーサー
    if (f.l1) {
        const sideSpacer = document.createElement('div');
        sideSpacer.style.width = '40px'; sideSpacer.style.flexShrink = '0'; sideSpacer.style.background = 'var(--bg2)';
        sideSpacer.style.borderRight = '1px solid var(--border2)';
        sideSpacer.style.position = 'sticky'; sideSpacer.style.left = '0'; sideSpacer.style.zIndex = '110';
        hdr.appendChild(sideSpacer);
    }

    const lblCol = document.createElement('div'); lblCol.className = 'gantt-label-col'; lblCol.textContent = 'タスク名';
    hdr.appendChild(lblCol);
    days.forEach(d => {
        const dEl = document.createElement('div'); dEl.className = 'gantt-day-hdr' + (d.getDay()===0?' sun':d.getDay()===6?' sat':'');
        dEl.textContent = `${d.getMonth()+1}/${d.getDate()}`;
        hdr.appendChild(dEl);
    });
    container.appendChild(hdr);

    getAllVenues().forEach(v => {
        const { row, content } = createWithSidebar(v, false);
        const groups = applyOrder(getGroupsForVenue(v), 'grp_' + v.id);
        
        groups.forEach(g => {
            if (!f.l2 && !f.l3) return;
            const gRow = document.createElement('div'); gRow.className = 'gantt-row';
            const gLbl = document.createElement('div'); gLbl.className = 'gantt-task-name'; 
            gLbl.style.backgroundColor = '#f1f5f9'; gLbl.textContent = '⏱ ' + (getEdit(g.id).timing || g.timing);
            gLbl.onclick = () => openDetail(g, 'group');
            gRow.appendChild(gLbl);
            
            const gCells = document.createElement('div'); gCells.className = 'gantt-cells';
            days.forEach(() => { const c = document.createElement('div'); c.className = 'gantt-cell'; gCells.appendChild(c); });
            gRow.appendChild(gCells);
            if (f.l2) content.appendChild(gRow);

            if (f.l3) {
                const tasks = applyOrder([...g.personnel.map(t => mergeTask(t)), ...getCP().filter(t => t.groupId === g.id).map(t => mergeTask(t))], 'prs_' + g.id).filter(t => !isDeleted(t.id));
                tasks.forEach(t => {
                    const tRow = document.createElement('div'); tRow.className = 'gantt-row';
                    const tLbl = document.createElement('div'); tLbl.className = 'gantt-task-name'; tLbl.textContent = t.text;
                    tLbl.onclick = () => openDetail(t, 'task');
                    tRow.appendChild(tLbl);
                    
                    const cells = document.createElement('div'); cells.className = 'gantt-cells';
                    days.forEach(d => {
                        const c = document.createElement('div'); c.className = 'gantt-cell' + (d.getDay()===0?' sun':d.getDay()===6?' sat':'');
                        if (toDateStr(d) === toDateStr(new Date())) c.style.backgroundColor = 'rgba(255, 230, 0, 0.1)';
                        cells.appendChild(c);
                    });
                    
                    if (t.start && t.end) {
                        const sIdx = days.findIndex(d => toDateStr(d) === t.start);
                        const eIdx = days.findIndex(d => toDateStr(d) === t.end);
                        if (sIdx >= 0) {
                            const bar = document.createElement('div'); bar.className = 'gantt-bar' + (t.done?' done':'');
                            bar.style.left = (sIdx * 31) + 'px';
                            bar.style.width = ((eIdx >= 0 ? eIdx - sIdx + 1 : 1) * 31 - 6) + 'px';
                            bar.style.backgroundColor = getColor(g.id, getColor(v.id));
                            cells.appendChild(bar);
                        }
                    }
                    tRow.appendChild(cells);
                    content.appendChild(tRow);
                });
            }
        });
        container.appendChild(row);
    });
    wrap.appendChild(container);
}

// ===== 人員一覧 =====
function renderPersonnelList() {
    const wrap = document.getElementById('personnel-view'); wrap.innerHTML = '';
    const f = getFilter();
    getAllVenues().forEach(v => {
        const { row, content } = createWithSidebar(v, false);
        const groups = applyOrder(getGroupsForVenue(v), 'grp_' + v.id);
        groups.forEach(g => {
            if (!f.l2 && !f.l3) return;
            if (f.l2) {
                const h = document.createElement('div'); h.className = 'section-block-header list-tt-header';
                h.innerHTML = `<span class="section-block-name">⏱ ${getEdit(g.id).timing || g.timing}</span>`;
                content.appendChild(h);
            }
            if (f.l3) {
                const items = applyOrder([...g.personnel.map(t => mergeTask(t)), ...getCP().filter(t => t.groupId === g.id).map(t => mergeTask(t))], 'prs_' + g.id);
                items.forEach(t => {
                    const r = document.createElement('div'); r.className = `list-row task-row${t.done ? ' done' : ''}`;
                    r.innerHTML = `<div class="task-check${t.done ? ' checked' : ''}"></div><span class="task-text">${t.text}</span>`;
                    r.appendChild(tantoBadge(t.tanto)); r.appendChild(prioBadge(t.priority));
                    r.onclick = () => openDetail(t, 'task');
                    content.appendChild(r);
                });
            }
        });
        wrap.appendChild(row);
    });
}

// ===== 準備物一覧 =====
function renderPrepList() {
    const wrap = document.getElementById('prep-view'); wrap.innerHTML = '';
    const f = getFilter();
    getAllVenues().forEach(v => {
        const { row, content } = createWithSidebar(v, false);
        const groups = applyOrder(getGroupsForVenue(v), 'grp_' + v.id);
        groups.forEach(g => {
            if (!f.l2 && !f.l3) return;
            if (f.l2) {
                const h = document.createElement('div'); h.className = 'section-block-header list-tt-header';
                h.innerHTML = `<span class="section-block-name">⏱ ${getEdit(g.id).timing || g.timing}</span>`;
                content.appendChild(h);
            }
            if (f.l3) {
                const items = applyOrder([...(g.prepItems || []).map(p => ({ ...p, done: getDone(p.id) })), ...getCR().filter(p => p.groupId === g.id).map(p => ({ ...p, done: getDone(p.id) }))], 'prp_' + g.id);
                items.forEach(p => {
                    const r = document.createElement('div'); r.className = `list-row${p.done ? ' done' : ''}`;
                    r.innerHTML = `<div class="task-check${p.done ? ' checked' : ''}"></div><span class="task-text">${p.text}</span>`;
                    r.onclick = () => { setDone(p.id, !getDone(p.id)); renderAll(); };
                    content.appendChild(r);
                });
            }
        });
        wrap.appendChild(row);
    });
}

// ===== 担当者別 / 締切日順 =====
function renderAssignee() {
    const wrap = document.getElementById('assignee-view'); wrap.innerHTML = '';
    const map = new Map();
    allPersonnel().forEach(t => { const k = t.tanto || '未定'; if (!map.has(k)) map.set(k, []); map.get(k).push(t); });
    [...map.keys()].sort((a, b) => a === '未定' ? 1 : b === '未定' ? -1 : a.localeCompare(b))
        .forEach(n => renderSectionBlock(wrap, '👤 ' + n, map.get(n).sort((a, b) => (a.end || '').localeCompare(b.end || '')), true));
}
function renderDeadline() {
    const wrap = document.getElementById('deadline-view'); wrap.innerHTML = '';
    const map = new Map();
    allPersonnel().forEach(t => { const k = t.end || '未設定'; if (!map.has(k)) map.set(k, []); map.get(k).push(t); });
    [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([d, ts]) => renderSectionBlock(wrap, '📅 ' + d, ts, true));
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
    ['filter-l1','filter-l2','filter-l3'].forEach(id => {
        document.getElementById(id).addEventListener('change', renderAll);
    });
    
    // プロジェクトヘッダー初期化
    const p = getProj();
    const pn = document.getElementById('proj-name');
    const ps = document.getElementById('proj-sub');
    if (pn) {
        pn.textContent = p.name;
        pn.style.cursor = 'pointer';
        pn.title = 'クリックしてプロジェクト編集';
        pn.addEventListener('click', editProject);
    }
    if (ps) {
        ps.textContent = p.date + '  |  ' + p.venue;
        ps.style.cursor = 'pointer';
        ps.addEventListener('click', editProject);
    }
    document.title = 'WBS | ' + p.name;

    renderAll();
});
