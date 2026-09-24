/* =========================================================
   AIKON — LIST ITEM / ASSET MASTER
   Project -> Building -> Floor -> Room -> Asset
   Katalog Ruang only manages the physical hierarchy.
   This page manages catalog_items used by Room verification.
========================================================= */

(() => {
  const URL = 'https://kiyneeejluyqzvgdfljt.supabase.co';
  const KEY = 'sb_publishable_NGf9sH1tagHPRfPJRcUvtg_vFJIPF6W';
  const db = window.aikonSupabaseClient || window.supabase.createClient(URL, KEY);

  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
  const notify = text => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2800);
  };

  let canManageChecklist = false;
  let checklistStates = {};
  let isAdmin = false;
  let projects = [], buildings = [], floors = [], rooms = [], items = [];
  let filter = { projectId: '', buildingId: '', floorId: '', roomId: '', search: '' };
  let showInactive = false;

  const active = list => list.filter(x => x.is_active !== false);
  const projectOf = id => projects.find(x => x.id === id);
  const buildingOf = id => buildings.find(x => x.id === id);
  const floorOf = id => floors.find(x => x.id === id);
  const roomOf = id => rooms.find(x => x.id === id);

  async function adminCheck() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return false;
    const result = await db.from('profiles').select('role').eq('id', user.id).single();
    const role = String(result.data?.role || '').toLowerCase();
    isAdmin = role === 'admin';
    canManageChecklist = isAdmin || role === 'supervisor';
    return isAdmin;
  }

  async function load() {
    const [p, b, f, r, i] = await Promise.all([
      db.from('projects').select('*').order('name'),
      db.from('buildings').select('*').order('name'),
      db.from('floors').select('*').order('name'),
      db.from('rooms').select('*').order('name'),
      db.from('catalog_items').select('*').order('name')
    ]);
    for (const result of [p, b, f, r, i]) if (result.error) throw result.error;
    projects = p.data || [];
    buildings = b.data || [];
    floors = f.data || [];
    rooms = r.data || [];
    items = i.data || [];
  }

  async function loadChecklistStates() {
    checklistStates = {};
    if (!items.length) return;
    const result = await db.from('room_asset_checklists').select('catalog_item_id,is_checked').in('catalog_item_id', items.map(i => i.id));
    if (!result.error) (result.data || []).forEach(x => { checklistStates[x.catalog_item_id] = x.is_checked === true; });
  }

  function visibleItems() {
    const q = filter.search.trim().toLowerCase();
    return (showInactive ? items : active(items)).filter(item => {
      if (q && !String(item.name || '').toLowerCase().includes(q) && !String(item.item_code || '').toLowerCase().includes(q)) return false;
      if (filter.buildingId && item.building_id !== filter.buildingId) return false;
      if (filter.floorId && item.floor_id !== filter.floorId) return false;
      if (filter.roomId && item.room_id !== filter.roomId) return false;
      return true;
    });
  }

  function closeModal() { $('#item-modal-backdrop')?.remove(); }

  function openModal(title, bodyHtml, onSubmit) {
    closeModal();
    document.body.insertAdjacentHTML('beforeend', `
      <div id="item-modal-backdrop" class="loc-modal-backdrop">
        <div class="loc-modal" role="dialog" aria-modal="true">
          <div class="loc-modal-header"><h3>${esc(title)}</h3><button type="button" class="loc-modal-close" aria-label="Tutup">&times;</button></div>
          <form id="item-modal-form" class="admin-form">${bodyHtml}
            <div class="loc-modal-actions">
              <button type="button" class="secondary-button" id="item-modal-cancel">Batal</button>
              <button type="submit" class="primary-button">Simpan</button>
            </div>
          </form>
        </div>
      </div>`);
    $('#item-modal-backdrop').addEventListener('click', e => { if (e.target.id === 'item-modal-backdrop') closeModal(); });
    $('.loc-modal-close').onclick = closeModal;
    $('#item-modal-cancel').onclick = closeModal;
    $('#item-modal-form').onsubmit = async e => {
      e.preventDefault();
      await onSubmit(Object.fromEntries(new FormData(e.currentTarget).entries()));
    };
  }

  function openItemForm(row = null, defaults = {}) {
    if (!isAdmin) return;
    const selectedProject = row?.project_id || defaults.projectId || filter.projectId || '';
    const selectedBuilding = row?.building_id || defaults.buildingId || filter.buildingId || '';
    const selectedFloor = row?.floor_id || defaults.floorId || filter.floorId || '';
    const selectedRoom = row?.room_id || defaults.roomId || filter.roomId || '';

    openModal(row ? 'Edit Asset' : 'Tambah Asset', `
      <label>Project<select name="project_id" id="item-project" required>
        <option value="">Pilih Project</option>
        ${active(projects).map(p => `<option value="${p.id}" ${selectedProject === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
      </select></label>
      <label>Building<select name="building_id" id="item-building" required>
        <option value="">Pilih Building</option>
        ${active(buildings.filter(b => b.project_id === selectedProject)).map(b => `<option value="${b.id}" ${selectedBuilding === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}
      </select></label>
      <label>Floor<select name="floor_id" id="item-floor" required>
        <option value="">Pilih Floor</option>
        ${active(floors.filter(f => f.building_id === selectedBuilding)).map(f => `<option value="${f.id}" ${selectedFloor === f.id ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}
      </select></label>
      <label>Kode Barang<input name="item_code" required value="${esc(row?.item_code || '')}" placeholder="Contoh: AST-001"></label>
      <label>Nama Barang<input name="name" required value="${esc(row?.name || '')}" placeholder="Contoh: Meja kerja, Kursi kantor, Monitor LED"></label>
        ${active(rooms.filter(r => r.floor_id === selectedFloor)).map(r => `<option value="${r.id}" ${selectedRoom === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}
      </select></label>
      <label>Nama Asset<input name="name" required value="${esc(row?.name || '')}" placeholder="Contoh: Meja kerja, Kursi kantor, Monitor LED"></label>
      <label>Jumlah unit<input name="quantity" type="number" min="0" step="1" value="${row?.quantity ?? 1}" required></label>
      <label>Deskripsi<textarea name="description" rows="2" placeholder="Spesifikasi / catatan opsional">${esc(row?.description || '')}</textarea></label>
    `);

    const projectSel = $('#item-project'), buildingSel = $('#item-building'), floorSel = $('#item-floor'), roomSel = $('#item-room');

    projectSel.onchange = () => {
      const list = active(buildings.filter(b => b.project_id === projectSel.value));
      buildingSel.innerHTML = '<option value="">Pilih Building</option>' + list.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
      floorSel.innerHTML = '<option value="">Pilih Floor</option>';
      roomSel.innerHTML = '<option value="">Pilih Room</option>';
    };
    buildingSel.onchange = () => {
      const list = active(floors.filter(f => f.building_id === buildingSel.value));
      floorSel.innerHTML = '<option value="">Pilih Floor</option>' + list.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('');
      roomSel.innerHTML = '<option value="">Pilih Room</option>';
    };
    floorSel.onchange = () => {
      const list = active(rooms.filter(r => r.floor_id === floorSel.value));
      roomSel.innerHTML = '<option value="">Pilih Room</option>' + list.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
    };

    $('#item-modal-form').onsubmit = async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      const room = roomOf(data.room_id);
      const floor = room ? floorOf(room.floor_id) : null;
      const building = floor ? buildingOf(floor.building_id) : null;
      const values = {
        item_code: data.item_code.trim().toUpperCase(),
        building_id: building?.id || data.building_id,
        floor_id: floor?.id || data.floor_id,
        room_id: room?.id || data.room_id,
        name: data.name.trim(),
        quantity: Math.max(0, Number(data.quantity || 0)),
        description: data.description?.trim() || null,
        updated_at: new Date().toISOString()
      };
      const result = row
        ? await db.from('catalog_items').update(values).eq('id', row.id)
        : await db.from('catalog_items').insert(values);
      if (result.error) return notify(result.error.message);
      closeModal();
      await load();
      await loadChecklistStates();
      render();
      notify(row ? 'Asset diperbarui.' : 'Asset ditambahkan.');
    };
  }

  async function setActive(id, value) {
    if (!isAdmin) return;
    const result = await db.from('catalog_items').update({
      is_active: value,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (result.error) return notify(result.error.message);
    await load();
    render();
    notify(value ? 'Asset diaktifkan kembali.' : 'Asset dinonaktifkan.');
  }

  async function adjustQuantity(id, delta) {
    if (!isAdmin) return;
    const row = items.find(i => i.id === id);
    if (!row) return;
    const next = Math.max(0, Number(row.quantity || 0) + delta);
    const result = await db.from('catalog_items').update({
      quantity: next,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (result.error) return notify(result.error.message);
    row.quantity = next;
    render();
  }

  function render() {
    const root = $('#list-items-grid');
    if (!root) return;
    const buildingOptions = active(buildings.filter(b => !filter.projectId || b.project_id === filter.projectId));
    const floorOptions = active(floors.filter(f => !filter.buildingId || f.building_id === filter.buildingId));
    const roomOptions = active(rooms.filter(r => !filter.floorId || r.floor_id === filter.floorId));
    const list = visibleItems();
    root.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <div><span class="eyebrow">MASTER ASSET</span><h2>List Item (${list.length})</h2><p>Admin mengelola nama dan kode barang. Supervisor dapat melakukan checklist pemeriksaan.</p></div>
          ${isAdmin ? '<button id="item-add" class="primary-button">+ Tambah Asset</button>' : ''}
        </div>
        <div class="loc-toolbar" style="flex-wrap:wrap">
          <select id="item-filter-project"><option value="">Semua Project</option>${active(projects).map(p => `<option value="${p.id}" ${filter.projectId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
          <select id="item-filter-building"><option value="">Semua Building</option>${buildingOptions.map(b => `<option value="${b.id}" ${filter.buildingId === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select>
          <select id="item-filter-floor"><option value="">Semua Floor</option>${floorOptions.map(f => `<option value="${f.id}" ${filter.floorId === f.id ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select>
          <select id="item-filter-room"><option value="">Semua Room</option>${roomOptions.map(r => `<option value="${r.id}" ${filter.roomId === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>
          <input id="item-search" type="search" placeholder="Cari kode atau nama barang..." value="${esc(filter.search)}">
          ${isAdmin ? `<label class="loc-checkbox"><input type="checkbox" id="item-show-inactive" ${showInactive ? 'checked' : ''}> Tampilkan nonaktif</label>` : ''}
        </div>
        <div class="list-item-table-wrap">
          <table class="list-item-table">
            <thead><tr><th>Checklist</th><th>Kode Barang</th><th>Nama Barang</th><th>Lokasi</th><th>Jumlah</th><th>Status</th>${isAdmin ? '<th>Aksi</th>' : ''}</tr></thead>
            <tbody>
              ${list.map(row => {
                const room = roomOf(row.room_id);
                const floor = room ? floorOf(room.floor_id) : null;
                const building = floor ? buildingOf(floor.building_id) : null;
                const project = building ? projectOf(building.project_id) : projectOf(row.project_id);
                const inactive = row.is_active === false;
                return `
                  <tr class="${inactive ? 'loc-row-inactive' : ''}">
                    <td><input type="checkbox" class="list-item-check" data-check-id="${row.id}" ${canManageChecklist ? (checklistStates[row.id] ? 'checked' : '') : 'disabled'}></td>
                    <td><strong>${esc(row.item_code || '—')}</strong></td>
                    <td><strong>${esc(row.name)}${inactive ? ' <span class="loc-badge">Nonaktif</span>' : ''}</strong></td>
                    <td><small>${esc(project?.name || '—')} · ${esc(building?.name || '—')} · ${esc(floor?.name || '—')} · ${esc(room?.name || '—')}</small></td>
                    <td><div class="loc-qty-control">${isAdmin ? '<button type="button" class="text-button" data-qty="-1" data-id="' + row.id + '">−</button>' : ''}<strong>${Number(row.quantity || 0)}</strong>${isAdmin ? '<button type="button" class="text-button" data-qty="1" data-id="' + row.id + '">+</button>' : ''}</div></td>
                    <td>${inactive ? 'Nonaktif' : 'Aktif'}</td>
                    ${isAdmin ? '<td><button type="button" class="text-button" data-edit-item="' + row.id + '">Edit</button> ' + (inactive ? '<button type="button" class="text-button" data-restore-item="' + row.id + '">Aktifkan</button>' : '<button type="button" class="text-button danger" data-deactivate-item="' + row.id + '">Nonaktifkan</button>') + '</td>' : ''}
                  </tr>`;
              }).join('') || '<tr><td colspan="7"><small>Belum ada asset pada filter ini.</small></td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
    $('#item-filter-project').onchange = e => { filter.projectId = e.target.value; filter.buildingId = ''; filter.floorId = ''; filter.roomId = ''; render(); };
    $('#item-filter-building').onchange = e => { filter.buildingId = e.target.value; filter.floorId = ''; filter.roomId = ''; render(); };
    $('#item-filter-floor').onchange = e => { filter.floorId = e.target.value; filter.roomId = ''; render(); };
    $('#item-filter-room').onchange = e => { filter.roomId = e.target.value; render(); };
    $('#item-search').oninput = e => { filter.search = e.target.value; render(); };
    $('#item-show-inactive')?.addEventListener('change', e => { showInactive = e.target.checked; render(); });
    $('#item-add')?.addEventListener('click', () => openItemForm(null));
    root.querySelectorAll('[data-edit-item]').forEach(btn => btn.onclick = () => openItemForm(items.find(i => i.id === btn.dataset.editItem)));
    root.querySelectorAll('[data-restore-item]').forEach(btn => btn.onclick = () => setActive(btn.dataset.restoreItem, true));
    root.querySelectorAll('[data-deactivate-item]').forEach(btn => btn.onclick = () => setActive(btn.dataset.deactivateItem, false));
    root.querySelectorAll('[data-qty]').forEach(btn => btn.onclick = () => adjustQuantity(btn.dataset.id, Number(btn.dataset.qty)));
    root.querySelectorAll('.list-item-check').forEach(box => box.onchange = async () => {
      if (!canManageChecklist) return;
      const item = items.find(x => x.id === box.dataset.checkId);
      if (!item?.room_id) return;
      const user = (await db.auth.getUser()).data.user;
      const result = await db.from('room_asset_checklists').upsert({ room_id: item.room_id, catalog_item_id: item.id, is_checked: box.checked, checked_by: user?.id || null, checked_at: box.checked ? new Date().toISOString() : null, updated_at: new Date().toISOString() }, { onConflict: 'room_id,catalog_item_id' });
      if (result.error) { box.checked = !box.checked; notify(result.error.message); } else checklistStates[item.id] = box.checked;
    });
  }

  async function openPage() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    isAdmin = await adminCheck();
    try {
      await load();
      await loadChecklistStates();
      render();
    } catch (error) {
      notify(error.message);
    }
  }

  async function init() {
    const nav = document.querySelector('[data-route="list-items"]');
    if (!nav) return;
    nav.onclick = async event => {
      event.preventDefault();
      if (typeof window.route === 'function') window.route('list-items');
      await openPage();
    };
    if (location.hash.slice(1) === 'list-items') await openPage();
  }

  window.addEventListener('hashchange', () => {
    if (location.hash.slice(1) === 'list-items') openPage();
  });

  document.addEventListener('DOMContentLoaded', () => setTimeout(() => init().catch(error => console.error('List Item:', error)), 1000));
})();
