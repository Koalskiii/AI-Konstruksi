/* =========================================================
   AIKON — LOCATION HIERARCHY
   Project -> Building -> Floor -> Room -> Item
   Visible (read-only) to every logged-in user.
   Create / edit / deactivate is admin-only (also enforced by
   Supabase RLS — hiding buttons here is just UX, not security).
========================================================= */

(() => {
  const URL = 'https://kiyneeejluyqzvgdfljt.supabase.co';
  const KEY = 'sb_publishable_NGf9sH1tagHPRfPJRcUvtg_vFJIPF6W';
  const db = window.aikonSupabaseClient || window.supabase.createClient(URL, KEY);

  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const notify = text => { const el = $('#toast'); if (!el) return; el.textContent = text; el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 2800); };
  const adminCheck = async () => { const { data: { user } } = await db.auth.getUser(); if (!user) return false; const result = await db.from('profiles').select('role').eq('id', user.id).single(); return !result.error && result.data?.role === 'admin'; };

  let isAdmin = false;
  let sites = [], buildings = [], floors = [], rooms = [], items = [];
  // view.level: 'sites' | 'buildings' | 'floors' | 'rooms' | 'items' | 'unassigned'
  const view = { level: 'sites', siteId: null, buildingId: null, floorId: null, roomId: null };
  let showInactive = false;

  const ROOM_TYPE_SUGGESTIONS = ['Bedroom', 'Office', 'Classroom', 'Meeting Room', 'Storage', 'Bathroom', 'Kitchen', 'Other'];

  /* ---------------------------------------------------------
     DATA
  --------------------------------------------------------- */

  async function load() {
    const [s, b, f, r, i] = await Promise.all([
      db.from('projects').select('*').order('name'),
      db.from('buildings').select('*').order('name'),
      db.from('floors').select('*').order('name'),
      db.from('rooms').select('*').order('name'),
      db.from('catalog_items').select('*').order('name')
    ]);
    for (const result of [s, b, f, r, i]) if (result.error) throw result.error;
    sites = s.data || []; buildings = b.data || []; floors = f.data || []; rooms = r.data || []; items = i.data || [];
  }

  const activeOf = list => list.filter(row => row.is_active !== false);
  const visible = list => showInactive ? list : activeOf(list);

  const siteOf = id => sites.find(x => x.id === id);
  const buildingOf = id => buildings.find(x => x.id === id);
  const floorOf = id => floors.find(x => x.id === id);
  const roomOf = id => rooms.find(x => x.id === id);

  const buildingsOfSite = siteId => visible(buildings.filter(b => b.project_id === siteId));
  const floorsOfBuilding = buildingId => visible(floors.filter(f => f.building_id === buildingId));
  const roomsOfFloor = floorId => visible(rooms.filter(r => r.floor_id === floorId));
  const itemsOfRoom = roomId => visible(items.filter(i => i.room_id === roomId));
  const unassignedItems = () => activeOf(items).filter(i => !i.room_id);

  // How many descendants would be affected by deactivating this row — shown in the confirmation dialog.
  function descendantCounts(level, id) {
    if (level === 'site') {
      const b = activeOf(buildings.filter(x => x.project_id === id));
      const f = activeOf(floors.filter(x => b.some(bb => bb.id === x.building_id)));
      const r = activeOf(rooms.filter(x => f.some(ff => ff.id === x.floor_id)));
      const it = activeOf(items.filter(x => r.some(rr => rr.id === x.room_id)));
      return { Gedung: b.length, Lantai: f.length, Ruang: r.length, Item: it.length };
    }
    if (level === 'building') {
      const f = activeOf(floors.filter(x => x.building_id === id));
      const r = activeOf(rooms.filter(x => f.some(ff => ff.id === x.floor_id)));
      const it = activeOf(items.filter(x => r.some(rr => rr.id === x.room_id)));
      return { Lantai: f.length, Ruang: r.length, Item: it.length };
    }
    if (level === 'floor') {
      const r = activeOf(rooms.filter(x => x.floor_id === id));
      const it = activeOf(items.filter(x => r.some(rr => rr.id === x.room_id)));
      return { Ruang: r.length, Item: it.length };
    }
    if (level === 'room') {
      const it = activeOf(items.filter(x => x.room_id === id));
      return { Item: it.length };
    }
    return {};
  }

  async function cascadeDeactivate(level, id) {
    const now = new Date().toISOString();
    if (level === 'site') {
      const b = buildings.filter(x => x.project_id === id).map(x => x.id);
      const f = floors.filter(x => b.includes(x.building_id)).map(x => x.id);
      const r = rooms.filter(x => f.includes(x.floor_id)).map(x => x.id);
      if (r.length) await db.from('catalog_items').update({ is_active: false, updated_at: now }).in('room_id', r);
      if (r.length) await db.from('rooms').update({ is_active: false }).in('id', r);
      if (f.length) await db.from('floors').update({ is_active: false }).in('id', f);
      if (b.length) await db.from('buildings').update({ is_active: false }).in('id', b);
      await db.from('projects').update({ is_active: false }).eq('id', id);
    } else if (level === 'building') {
      const f = floors.filter(x => x.building_id === id).map(x => x.id);
      const r = rooms.filter(x => f.includes(x.floor_id)).map(x => x.id);
      if (r.length) await db.from('catalog_items').update({ is_active: false, updated_at: now }).in('room_id', r);
      if (r.length) await db.from('rooms').update({ is_active: false }).in('id', r);
      if (f.length) await db.from('floors').update({ is_active: false }).in('id', f);
      await db.from('buildings').update({ is_active: false }).eq('id', id);
    } else if (level === 'floor') {
      const r = rooms.filter(x => x.floor_id === id).map(x => x.id);
      if (r.length) await db.from('catalog_items').update({ is_active: false, updated_at: now }).in('room_id', r);
      if (r.length) await db.from('rooms').update({ is_active: false }).in('id', r);
      await db.from('floors').update({ is_active: false }).eq('id', id);
    } else if (level === 'room') {
      await db.from('catalog_items').update({ is_active: false, updated_at: now }).eq('room_id', id);
      await db.from('rooms').update({ is_active: false }).eq('id', id);
    } else if (level === 'item') {
      await db.from('catalog_items').update({ is_active: false, updated_at: now }).eq('id', id);
    }
  }

  async function restore(table, id) {
    const result = await db.from(table).update({ is_active: true }).eq('id', id);
    if (result.error) return notify(result.error.message);
    await load(); render(); notify('Diaktifkan kembali.');
  }

  async function deactivate(level, table, id, label) {
    const counts = descendantCounts(level, id);
    const parts = Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`);
    const warning = parts.length ? `Data ini berisi ${parts.join(', ')} yang juga akan ikut dinonaktifkan.` : 'Tidak ada data turunan aktif di bawahnya.';
    openConfirm(`Nonaktifkan "${esc(label)}"?`, warning, async () => {
      await cascadeDeactivate(level, id);
      await load(); render(); notify('Berhasil dinonaktifkan.');
    });
  }

  /* ---------------------------------------------------------
     MODAL (generic form + generic confirm)
  --------------------------------------------------------- */

  function closeModal() { $('#loc-modal-backdrop')?.remove(); }

  function openModal(title, bodyHtml, onSubmit) {
    closeModal();
    document.body.insertAdjacentHTML('beforeend', `
      <div id="loc-modal-backdrop" class="loc-modal-backdrop">
        <div class="loc-modal" role="dialog" aria-modal="true">
          <div class="loc-modal-header"><h3>${esc(title)}</h3><button type="button" class="loc-modal-close" aria-label="Tutup">&times;</button></div>
          <form id="loc-modal-form" class="admin-form">${bodyHtml}<div class="loc-modal-actions"><button type="button" class="secondary-button" id="loc-modal-cancel">Batal</button><button type="submit" class="primary-button">Simpan</button></div></form>
        </div>
      </div>`);
    $('#loc-modal-backdrop').addEventListener('click', e => { if (e.target.id === 'loc-modal-backdrop') closeModal(); });
    $('.loc-modal-close').onclick = closeModal;
    $('#loc-modal-cancel').onclick = closeModal;
    $('#loc-modal-form').onsubmit = async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      await onSubmit(data);
    };
  }

  function openConfirm(title, message, onConfirm) {
    closeModal();
    document.body.insertAdjacentHTML('beforeend', `
      <div id="loc-modal-backdrop" class="loc-modal-backdrop">
        <div class="loc-modal" role="dialog" aria-modal="true">
          <div class="loc-modal-header"><h3>${esc(title)}</h3><button type="button" class="loc-modal-close" aria-label="Tutup">&times;</button></div>
          <p class="loc-modal-message">${esc(message)}</p>
          <div class="loc-modal-actions"><button type="button" class="secondary-button" id="loc-modal-cancel">Batal</button><button type="button" class="primary-button danger-button" id="loc-modal-confirm">Nonaktifkan</button></div>
        </div>
      </div>`);
    $('#loc-modal-backdrop').addEventListener('click', e => { if (e.target.id === 'loc-modal-backdrop') closeModal(); });
    $('.loc-modal-close').onclick = closeModal;
    $('#loc-modal-cancel').onclick = closeModal;
    $('#loc-modal-confirm').onclick = async () => { closeModal(); await onConfirm(); };
  }

  async function save(table, values, id) {
    const result = id ? await db.from(table).update(values).eq('id', id) : await db.from(table).insert(values);
    if (result.error) { notify(result.error.message); return false; }
    await load(); render(); notify('Berhasil disimpan.'); closeModal(); return true;
  }

  /* ---------------------------------------------------------
     CREATE / EDIT FORMS
  --------------------------------------------------------- */

  function formSite(row) {
    openModal(row ? 'Edit Project' : 'Tambah Project', `
      <label>Nama Project<input name="name" required value="${esc(row?.name || '')}"></label>
      <label>Lokasi / Deskripsi<input name="location" value="${esc(row?.location || '')}"></label>
    `, data => save('projects', { name: data.name.trim(), location: data.location?.trim() || null }, row?.id));
  }

  function formBuilding(row, siteId) {
    openModal(row ? 'Edit Building' : 'Tambah Building', `
      <label>Project<select name="project_id" required>${activeOf(sites).map(s => `<option value="${s.id}" ${((row?.project_id || siteId) === s.id) ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <label>Nama Building<input name="name" required value="${esc(row?.name || '')}"></label>
    `, data => save('buildings', { project_id: data.project_id, name: data.name.trim() }, row?.id));
  }

  function formFloor(row, buildingId) {
    openModal(row ? 'Edit Floor' : 'Tambah Floor', `
      <label>Building<select name="building_id" required>${activeOf(buildings).map(b => `<option value="${b.id}" ${((row?.building_id || buildingId) === b.id) ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
      <label>Nama Floor<input name="name" required value="${esc(row?.name || '')}"></label>
    `, data => save('floors', { building_id: data.building_id, name: data.name.trim() }, row?.id));
  }

  function formRoom(row, floorId) {
    openModal(row ? 'Edit Room' : 'Tambah Room', `
      <label>Floor<select name="floor_id" required>${activeOf(floors).map(f => `<option value="${f.id}" ${((row?.floor_id || floorId) === f.id) ? 'selected' : ''}>${esc(buildingOf(f.building_id)?.name || '')} · ${esc(f.name)}</option>`).join('')}</select></label>
      <label>Nama Room<input name="name" required value="${esc(row?.name || '')}"></label>
      <label>Tipe Room<input name="room_type" list="loc-room-types" value="${esc(row?.room_type || '')}" placeholder="Bedroom, Office, Classroom, ..."></label>
      <datalist id="loc-room-types">${ROOM_TYPE_SUGGESTIONS.map(t => `<option value="${t}">`).join('')}</datalist>
      <label>Status<select name="status">${['Aktif', 'Maintenance', 'Renovasi'].map(s => `<option ${((row?.status || 'Aktif') === s) ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label>Deskripsi<textarea name="description" rows="2">${esc(row?.description || '')}</textarea></label>
    `, data => save('rooms', { floor_id: data.floor_id, name: data.name.trim(), room_type: data.room_type?.trim() || null, status: data.status, description: data.description?.trim() || null }, row?.id));
  }

  function formItem(row, roomId) {
    openModal(row ? 'Edit Item' : 'Tambah Item', `
      <label>Room<select name="room_id"><option value="">Belum ditentukan</option>${activeOf(rooms).map(r => `<option value="${r.id}" ${((row?.room_id || roomId) === r.id) ? 'selected' : ''}>${esc(floorOf(r.floor_id)?.name || '')} · ${esc(r.name)}</option>`).join('')}</select></label>
      <label>Nama Item<input name="name" required value="${esc(row?.name || '')}"></label>
      <label>Jumlah unit<input name="quantity" type="number" min="0" value="${row?.quantity ?? 1}"></label>
      <label>Deskripsi<textarea name="description" rows="2">${esc(row?.description || '')}</textarea></label>
    `, data => {
      const room = data.room_id ? roomOf(data.room_id) : null;
      const floor = room ? floorOf(room.floor_id) : null;
      const values = {
        name: data.name.trim(),
        quantity: Number(data.quantity || 0),
        description: data.description?.trim() || null,
        room_id: data.room_id || null,
        floor_id: floor?.id || null,
        building_id: floor?.building_id || null,
        project_id: floor ? buildingOf(floor.building_id)?.project_id : (row?.project_id || sites[0]?.id)
      };
      return save('catalog_items', row ? { ...values, updated_at: new Date().toISOString() } : values, row?.id);
    });
  }

  /* ---------------------------------------------------------
     BULK ASSIGNMENT (items without a Room yet)
  --------------------------------------------------------- */

  function renderUnassigned() {
    const list = unassignedItems();
    return `
      <div class="panel">
        <div class="panel-header"><div><span class="eyebrow">MIGRASI</span><h2>Item belum punya Room (${list.length})</h2><p>Pilih item, lalu tentukan lokasi tujuannya sekaligus.</p></div></div>
        ${list.length ? `
        <form id="loc-bulk-form" class="admin-form">
          <div class="loc-bulk-list">${list.map(i => `<label class="loc-checkbox"><input type="checkbox" name="item" value="${i.id}"> ${esc(i.name)}</label>`).join('')}</div>
          <label>Site<select id="loc-bulk-site" required><option value="">Pilih Project</option>${activeOf(sites).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
          <label>Building<select id="loc-bulk-building" required disabled><option value="">Pilih Project dahulu</option></select></label>
          <label>Floor<select id="loc-bulk-floor" required disabled><option value="">Pilih Building dahulu</option></select></label>
          <label>Room<select id="loc-bulk-room" required disabled><option value="">Pilih Floor dahulu</option></select></label>
          <button type="submit" class="primary-button">Assign lokasi ke item terpilih</button>
        </form>` : '<p>Semua item aktif sudah punya Room.</p>'}
      </div>`;
  }

  function wireUnassigned(root) {
    const form = root.querySelector('#loc-bulk-form');
    if (!form) return;
    const siteSel = root.querySelector('#loc-bulk-site');
    const buildingSel = root.querySelector('#loc-bulk-building');
    const floorSel = root.querySelector('#loc-bulk-floor');
    const roomSel = root.querySelector('#loc-bulk-room');
    // Destinations are always restricted to active rows, regardless of the admin's "show inactive" toggle.
    siteSel.onchange = () => {
      const opts = activeOf(buildings.filter(b => b.project_id === siteSel.value));
      buildingSel.disabled = !opts.length;
      buildingSel.innerHTML = `<option value="">Pilih Building</option>${opts.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}`;
      floorSel.disabled = true; floorSel.innerHTML = '<option value="">Pilih Building dahulu</option>';
      roomSel.disabled = true; roomSel.innerHTML = '<option value="">Pilih Floor dahulu</option>';
    };
    buildingSel.onchange = () => {
      const opts = activeOf(floors.filter(f => f.building_id === buildingSel.value));
      floorSel.disabled = !opts.length;
      floorSel.innerHTML = `<option value="">Pilih Floor</option>${opts.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('')}`;
      roomSel.disabled = true; roomSel.innerHTML = '<option value="">Pilih Floor dahulu</option>';
    };
    floorSel.onchange = () => {
      const opts = activeOf(rooms.filter(r => r.floor_id === floorSel.value));
      roomSel.disabled = !opts.length;
      roomSel.innerHTML = `<option value="">Pilih Room</option>${opts.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}`;
    };
    form.onsubmit = async e => {
      e.preventDefault();
      const ids = [...form.querySelectorAll('input[name="item"]:checked')].map(i => i.value);
      if (!ids.length) return notify('Pilih minimal 1 item.');
      if (!roomSel.value) return notify('Pilih Room tujuan.');
      const result = await db.from('catalog_items').update({ room_id: roomSel.value, updated_at: new Date().toISOString() }).in('id', ids);
      if (result.error) return notify(result.error.message);
      await load(); render(); notify(`${ids.length} item dipindahkan.`);
    };
  }

  /* ---------------------------------------------------------
     BREADCRUMB + LIST RENDERING
  --------------------------------------------------------- */

  function breadcrumb() {
    const crumbs = [{ label: 'Semua Project', onclick: () => go('sites') }];
    if (view.level === 'unassigned') {
      crumbs.push({ label: 'Item belum punya Room', onclick: () => {} });
      return crumbs;
    }
    if (view.siteId) {
      const s = siteOf(view.siteId);
      crumbs.push({ label: s?.name || 'Project', onclick: () => go('buildings', { siteId: view.siteId }) });
    }
    if (view.buildingId) {
      const b = buildingOf(view.buildingId);
      crumbs.push({ label: b?.name || 'Building', onclick: () => go('floors', { buildingId: view.buildingId }) });
    }
    if (view.floorId) {
      const f = floorOf(view.floorId);
      crumbs.push({ label: f?.name || 'Floor', onclick: () => go('rooms', { floorId: view.floorId }) });
    }
    if (view.roomId) {
      const r = roomOf(view.roomId);
      crumbs.push({ label: r?.name || 'Room', onclick: () => go('room-detail', { siteId: view.siteId, buildingId: view.buildingId, floorId: view.floorId, roomId: view.roomId }) });
    }
    return crumbs;
  }

  function backNavigation() {
    if (view.level === 'buildings') return { label: 'Kembali ke Semua Project', action: () => go('sites') };
    if (view.level === 'floors') return { label: 'Kembali ke Building', action: () => go('buildings', { siteId: view.siteId }) };
    if (view.level === 'rooms') return { label: 'Kembali ke Floor', action: () => go('floors', { buildingId: view.buildingId }) };
    if (view.level === 'room-detail') return { label: 'Kembali ke Daftar Room', action: () => go('rooms', { floorId: view.floorId }) };
    return null;
  }

  function go(level, patch = {}) {
    Object.assign(view, { siteId: null, buildingId: null, floorId: null, roomId: null }, patch, { level });
    render();
  }

  function listRow(row, { title, meta, open = true }) {
    const inactive = row.is_active === false;
    const adminButtons = isAdmin ? `
      <button class="text-button" data-edit="${row.id}">Edit</button>
      ${inactive
        ? `<button class="text-button" data-restore="${row.id}">Aktifkan</button>`
        : `<button class="text-button danger" data-deactivate="${row.id}">Nonaktifkan</button>`}
    ` : '';
    return `<div class="admin-row loc-row ${inactive ? 'loc-row-inactive' : ''}">
      <div class="loc-row-main" ${open ? `data-open="${row.id}"` : ''}><strong>${esc(title)}${inactive ? ' <span class="loc-badge">Nonaktif</span>' : ''}</strong><small>${esc(meta)}</small></div>
      <span>${adminButtons}</span>
    </div>`;
  }

  function renderSites() {
    const list = visible(sites);
    return `
      <div class="panel">
        <div class="panel-header"><div><span class="eyebrow">PROJECT</span><h2>Semua Project (${list.length})</h2></div>${isAdmin ? '<button id="loc-add" class="primary-button">+ Tambah Project</button>' : ''}</div>
        <div class="admin-list">${list.map(s => listRow(s, { title: s.name, meta: s.location || 'Lokasi belum diisi', level: 'site', table: 'projects' })).join('') || '<small>Belum ada Project.</small>'}</div>
      </div>`;
  }

  function renderBuildings() {
    const list = visible(buildings.filter(b => b.project_id === view.siteId));
    return `
      <div class="panel">
        <div class="panel-header"><div><span class="eyebrow">BUILDING</span><h2>${esc(siteOf(view.siteId)?.name || '')} (${list.length})</h2></div>${isAdmin ? '<button id="loc-add" class="primary-button">+ Tambah Building</button>' : ''}</div>
        <div class="admin-list">${list.map(b => listRow(b, { title: b.name, meta: `${floorsOfBuilding(b.id).length} lantai`, level: 'building', table: 'buildings' })).join('') || '<small>Belum ada Building.</small>'}</div>
      </div>`;
  }

  function renderFloors() {
    const list = visible(floors.filter(f => f.building_id === view.buildingId));
    return `
      <div class="panel">
        <div class="panel-header"><div><span class="eyebrow">FLOOR</span><h2>${esc(buildingOf(view.buildingId)?.name || '')} (${list.length})</h2></div>${isAdmin ? '<button id="loc-add" class="primary-button">+ Tambah Floor</button>' : ''}</div>
        <div class="admin-list">${list.map(f => listRow(f, { title: f.name, meta: `${roomsOfFloor(f.id).length} room`, level: 'floor', table: 'floors' })).join('') || '<small>Belum ada Floor.</small>'}</div>
      </div>`;
  }

  function renderRooms() {
    const list = visible(rooms.filter(r => r.floor_id === view.floorId));
    return `
      <div class="panel">
        <div class="panel-header"><div><span class="eyebrow">ROOM</span><h2>${esc(floorOf(view.floorId)?.name || '')} (${list.length})</h2></div>${isAdmin ? '<button id="loc-add" class="primary-button">+ Tambah Room</button>' : ''}</div>
        <div class="admin-list">${list.map(r => listRow(r, { title: r.name, meta: `${r.room_type ? r.room_type + ' · ' : ''}${r.status}`, level: 'room', table: 'rooms', open: false })).join('') || '<small>Belum ada Room.</small>'}</div>
        <div class="loc-toolbar"><span>Asset di dalam Room dikelola dari <b>List Item</b>.</span><a href="#list-items" class="text-button">Buka List Item</a></div>
      </div>`;
  }

  function checklistKey(roomId) {
    return `aikon-room-checklist-${roomId}`;
  }

  function renderRoomDetail() {
    const room = roomOf(view.roomId);
    if (!room) return '<div class="panel"><small>Room tidak ditemukan.</small></div>';
    const expected = active(items).filter(i => i.room_id === room.id);
    const checked = JSON.parse(localStorage.getItem(checklistKey(room.id)) || '{}');

    return `
      <div class="panel">
        <div class="panel-header">
          <div>
            <span class="eyebrow">ROOM ASSET CHECKLIST</span>
            <h2>${esc(room.name)}</h2>
            <p>Daftar asset yang seharusnya ada di room ini berdasarkan <b>List Item</b>.</p>
          </div>
          <span class="loc-badge">${expected.length} jenis asset</span>
        </div>

        <div class="room-checklist">
          ${expected.map(item => {
            const done = checked[item.id] === true;
            return `
              <label class="room-check-item ${done ? 'is-checked' : ''}">
                <input type="checkbox" data-room-check="${item.id}" ${done ? 'checked' : ''}>
                <span class="room-check-copy">
                  <strong>${esc(item.name)}</strong>
                  <small>${Number(item.quantity || 0)} unit seharusnya ada</small>
                </span>
                <span class="room-check-status">${done ? 'Sudah dicek' : 'Belum dicek'}</span>
              </label>`;
          }).join('') || `
            <div class="room-empty-state">
              <strong>Belum ada asset terdaftar.</strong>
              <span>Tambahkan meja, kursi, monitor, proyektor, dan asset lain melalui <b>List Item</b>.</span>
              <a href="#list-items" class="secondary-button">Buka List Item</a>
            </div>`}
        </div>
      </div>`;
  }

  function renderItems() {
    return '';
  }

  function render() {
    const root = $('#catalog-grid'); if (!root) return;
    const bc = breadcrumb();
    $('#loc-breadcrumb').innerHTML = bc.map((c, idx) => `<a href="#" data-crumb="${idx}">${esc(c.label)}</a>`).join(' <span class="loc-sep">/</span> ');
    $('#loc-breadcrumb').querySelectorAll('[data-crumb]').forEach(a => a.onclick = e => { e.preventDefault(); bc[Number(a.dataset.crumb)].onclick(); });

    const back = backNavigation();
    const toolbar = `<div class="loc-toolbar loc-navigation">
      ${back ? `<button type="button" class="secondary-button loc-back-button" id="loc-back">${esc(back.label)}</button>` : '<span class="loc-location-label">Struktur lokasi</span>'}
      <span class="loc-path-label"><b>Project</b><span>›</span><b>Building</b><span>›</span><b>Floor</b><span>›</span><b>Room</b></span>
      ${isAdmin ? `<label class="loc-checkbox"><input type="checkbox" id="loc-show-inactive" ${showInactive ? 'checked' : ''}> Tampilkan nonaktif</label>` : ''}
    </div>`;

    let body;
    if (view.level === 'unassigned') body = renderUnassigned();
    else if (view.level === 'sites') body = renderSites();
    else if (view.level === 'buildings') body = renderBuildings();
    else if (view.level === 'floors') body = renderFloors();
    else if (view.level === 'rooms') body = renderRooms();
    else if (view.level === 'room-detail') body = renderRoomDetail();
    else body = renderSites();

    root.innerHTML = toolbar + body;

    const showInactiveBox = $('#loc-show-inactive');
    if (showInactiveBox) showInactiveBox.onchange = () => { showInactive = showInactiveBox.checked; render(); };
    const backBtn = $('#loc-back');
    if (backBtn) backBtn.onclick = () => backNavigation()?.action();;

    if (view.level === 'unassigned') { return; }

    root.querySelectorAll('[data-room-check]').forEach(input => {
      input.onchange = () => {
        const room = roomOf(view.roomId);
        if (!room) return;
        const state = JSON.parse(localStorage.getItem(checklistKey(room.id)) || '{}');
        state[input.dataset.roomCheck] = input.checked;
        localStorage.setItem(checklistKey(room.id), JSON.stringify(state));
        render();
      };
    });

    root.querySelectorAll('[data-open]').forEach(el => el.onclick = () => {
      const id = el.dataset.open;
      if (view.level === 'sites') go('buildings', { siteId: id });
      else if (view.level === 'buildings') go('floors', { buildingId: id });
      else if (view.level === 'floors') go('rooms', { floorId: id });
      else if (view.level === 'rooms') {
        go('room-detail', { floorId: view.floorId, roomId: id, buildingId: view.buildingId, siteId: view.siteId });
      }
    });

    const addBtn = $('#loc-add');
    if (addBtn) addBtn.onclick = () => {
      if (view.level === 'sites') formSite();
      else if (view.level === 'buildings') formBuilding(null, view.siteId);
      else if (view.level === 'floors') formFloor(null, view.buildingId);
      else if (view.level === 'rooms') formRoom(null, view.floorId);
      else formItem(null, view.roomId);
    };

    root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
      const id = b.dataset.edit;
      if (view.level === 'sites') formSite(siteOf(id));
      else if (view.level === 'buildings') formBuilding(buildingOf(id), view.siteId);
      else if (view.level === 'floors') formFloor(floorOf(id), view.buildingId);
      else if (view.level === 'rooms') formRoom(roomOf(id), view.floorId);
      else formItem(items.find(i => i.id === id), view.roomId);
    });

    const levelKey = { sites: 'site', buildings: 'building', floors: 'floor', rooms: 'room', items: 'item' }[view.level];
    const tableKey = { sites: 'projects', buildings: 'buildings', floors: 'floors', rooms: 'rooms', items: 'catalog_items' }[view.level];
    const nameOf = id => ({
      site: () => siteOf(id)?.name, building: () => buildingOf(id)?.name, floor: () => floorOf(id)?.name,
      room: () => roomOf(id)?.name, item: () => items.find(i => i.id === id)?.name
    }[levelKey]());

    root.querySelectorAll('[data-deactivate]').forEach(b => b.onclick = () => deactivate(levelKey, tableKey, b.dataset.deactivate, nameOf(b.dataset.deactivate) || ''));
    root.querySelectorAll('[data-restore]').forEach(b => b.onclick = () => restore(tableKey, b.dataset.restore));
  }

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */

  async function openCatalogHierarchy() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    isAdmin = await adminCheck();
    if (!$('#catalog-grid')) return;
    if (!$('#loc-breadcrumb')) {
      $('#catalog-grid').insertAdjacentHTML('beforebegin', '<p id="loc-breadcrumb" class="loc-breadcrumb"></p>');
    }
    try {
      await load();
      go('sites');
    } catch (error) {
      notify(error.message);
    }
  }

  async function init() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;

    const catalogNav = document.querySelector('[data-route="catalog"]');
    if (!catalogNav) return;

    catalogNav.href = '#catalog';
    const label = catalogNav.querySelector('span:last-child');
    if (label) label.textContent = 'Katalog ruang';
    catalogNav.onclick = async event => {
      event.preventDefault();
      if (typeof window.route === 'function') window.route('catalog');
      await openCatalogHierarchy();
    };

    if (location.hash.slice(1) === 'catalog') {
      await openCatalogHierarchy();
    }
  }

  window.addEventListener('hashchange', () => {
    if (location.hash.slice(1) === 'catalog') openCatalogHierarchy();
  });

  document.addEventListener('DOMContentLoaded', () => setTimeout(() => init().catch(error => console.error('Catalog hierarchy:', error)), 1000));
})();