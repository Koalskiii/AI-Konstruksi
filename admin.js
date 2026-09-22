(() => {
  const SUPABASE_URL = 'https://kiyneeejluyqzvgdfljt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_NGf9sH1tagHPRfPJRcUvtg_vFJIPF6W';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let project = null;
  let buildings = [];
  let floors = [];
  let items = [];

  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const message = text => {
    const toast = $('#toast');
    if (toast) { toast.textContent = text; toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 2800); }
  };

  async function loadData() {
    const projectResult = await client.from('projects').select('*').eq('name', 'Sekolah Kemala Taruna Bhayangkara').maybeSingle();
    if (projectResult.error) throw projectResult.error;
    project = projectResult.data;
    if (!project) throw new Error('Project belum ada. Jalankan SQL schema terlebih dahulu.');
    const [buildingResult, floorResult, itemResult] = await Promise.all([
      client.from('buildings').select('*').eq('project_id', project.id).order('name'),
      client.from('floors').select('*, buildings!inner(project_id)').eq('buildings.project_id', project.id).order('name'),
      client.from('catalog_items').select('*').eq('project_id', project.id).order('name')
    ]);
    if (buildingResult.error) throw buildingResult.error;
    if (floorResult.error) throw floorResult.error;
    if (itemResult.error) throw itemResult.error;
    buildings = buildingResult.data || [];
    floors = floorResult.data || [];
    items = itemResult.data || [];
  }

  function render() {
    const root = $('#admin-content');
    if (!root) return;
    root.innerHTML = `<div class="admin-grid"><section class="panel admin-card"><div class="panel-header"><div><span class="eyebrow">STRUKTUR PROYEK</span><h2>Gedung & lantai</h2></div></div><form id="building-form" class="admin-form"><input name="name" placeholder="Nama gedung baru" required><button class="primary-button">Tambah gedung</button></form><div class="admin-list">${buildings.map(building => `<div class="admin-row"><div><strong>${esc(building.name)}</strong><small>${floors.filter(f => f.building_id === building.id).length} lantai</small></div><button class="text-button" data-building="${building.id}">+ Lantai</button></div>`).join('') || '<small>Belum ada gedung.</small>'}</div></section><section class="panel admin-card"><div class="panel-header"><div><span class="eyebrow">KATALOG</span><h2>Item aset</h2></div></div><form id="item-form" class="admin-form"><input name="name" placeholder="Nama item" required><input name="quantity" type="number" min="0" value="1"><select name="building_id"><option value="">Pilih gedung</option>${buildings.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select><select name="floor_id"><option value="">Pilih lantai</option>${floors.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('')}</select><input name="description" placeholder="Deskripsi"><button class="primary-button">Tambah item</button></form><div class="admin-list">${items.map(item => `<div class="admin-row"><div><strong>${esc(item.name)}</strong><small>${item.quantity} unit · ${esc(item.description || 'Tanpa deskripsi')}</small></div><button class="text-button" data-edit-item="${item.id}">Edit</button></div>`).join('') || '<small>Belum ada item.</small>'}</div></section></div><section class="panel admin-card"><div class="panel-header"><div><span class="eyebrow">DATASET AI</span><h2>Foto training item</h2><p>Tambahkan foto berlabel untuk dataset.</p></div></div><form id="photo-form" class="admin-form"><select name="catalog_item_id" required><option value="">Pilih item</option>${items.map(i => `<option value="${i.id}">${esc(i.name)}</option>`).join('')}</select><input name="photo" type="file" accept="image/*" multiple required><button class="primary-button">Upload foto</button></form></section></section>`;
    $('#building-form')?.addEventListener('submit', addBuilding);
    $('#item-form')?.addEventListener('submit', addItem);
    $('#photo-form')?.addEventListener('submit', uploadPhotos);
    root.querySelectorAll('[data-building]').forEach(button => button.addEventListener('click', () => addFloor(button.dataset.building)));
    root.querySelectorAll('[data-edit-item]').forEach(button => button.addEventListener('click', () => editItem(button.dataset.editItem)));
  }

  async function addBuilding(event) { event.preventDefault(); const name = new FormData(event.currentTarget).get('name')?.trim(); const { error } = await client.from('buildings').insert({ project_id: project.id, name }); if (error) return message(error.message); await loadData(); render(); message('Gedung ditambahkan.'); }
  async function addFloor(buildingId) { const name = prompt('Nama lantai, contoh: Ground Floor atau Lantai 1'); if (!name?.trim()) return; const { error } = await client.from('floors').insert({ building_id: buildingId, name: name.trim() }); if (error) return message(error.message); await loadData(); render(); message('Lantai ditambahkan.'); }
  async function addItem(event) { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); const { error } = await client.from('catalog_items').insert({ project_id: project.id, name: data.name.trim(), quantity: Number(data.quantity || 0), description: data.description || null, building_id: data.building_id || null, floor_id: data.floor_id || null }); if (error) return message(error.message); await loadData(); render(); message('Item ditambahkan.'); }
  async function editItem(id) { const item = items.find(entry => entry.id === id); if (!item) return; const name = prompt('Nama item:', item.name); if (!name?.trim()) return; const quantity = prompt('Jumlah:', item.quantity); const description = prompt('Deskripsi:', item.description || ''); const { error } = await client.from('catalog_items').update({ name: name.trim(), quantity: Number(quantity || 0), description: description || null, updated_at: new Date().toISOString() }).eq('id', id); if (error) return message(error.message); await loadData(); render(); message('Item diperbarui.'); }
  async function uploadPhotos(event) { event.preventDefault(); const data = new FormData(event.currentTarget); const itemId = data.get('catalog_item_id'); const files = data.getAll('photo'); const user = (await client.auth.getUser()).data.user; for (const file of files) { const path = `${project.id}/${itemId}/${crypto.randomUUID()}-${file.name}`; const upload = await client.storage.from('aikon-training').upload(path, file, { upsert: false }); if (upload.error) return message(upload.error.message); const record = await client.from('training_images').insert({ project_id: project.id, catalog_item_id: itemId, storage_path: path, label: items.find(item => item.id === itemId)?.name || file.name, status: 'pending', created_by: user?.id }); if (record.error) return message(record.error.message); } event.currentTarget.reset(); message('Foto training berhasil diupload.'); }

  async function init() {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    const { data: profile, error } = await client.from('profiles').select('role').eq('id', user.id).single();
    if (error || profile?.role !== 'admin') return;
    window.aikonCurrentProfile = profile;
    const nav = document.querySelector('[data-route="catalog"]')?.parentElement;
    if (nav && !document.querySelector('[data-route="admin"]')) nav.insertAdjacentHTML('beforeend', '<a href="#admin" class="nav-link" data-route="admin"><span class="nav-icon">⚙</span><span>Admin catalog</span></a>');
    const content = document.querySelector('.content');
    if (!content || $('#admin')) return;
    content.insertAdjacentHTML('beforeend', '<section id="admin" class="view"><div class="page-header"><div><span class="eyebrow">ADMINISTRATOR</span><h1>Kelola project & katalog</h1><p>Sekolah Kemala Taruna Bhayangkara · Gunung Sindur, Bogor</p></div></div><div id="admin-content"></div></section>');
    document.querySelector('[data-route="admin"]')?.addEventListener('click', event => { event.preventDefault(); document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'admin')); document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.route === 'admin')); history.pushState(null, '', '#admin'); loadData().then(render).catch(error => message(error.message)); });
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(() => init().catch(error => console.error('Admin UI:', error)), 1000));
})();
