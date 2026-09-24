/* =========================================================
   AIKON — ADMIN: TRAINING DATASET
   Project/Building/Floor/Room/Item CRUD moved to locations.js
   (real forms + soft delete + Room level). This file now only
   covers what that page doesn't: managing AI training photos.
========================================================= */

(() => {
  const URL = 'https://kiyneeejluyqzvgdfljt.supabase.co';
  const KEY = 'sb_publishable_NGf9sH1tagHPRfPJRcUvtg_vFJIPF6W';
  const db = window.aikonSupabaseClient || window.supabase.createClient(URL, KEY);
  let project = null, projects = [], items = [], training = [], registrationRequests = [];
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const notify = text => { const el = $('#toast'); if (!el) return; el.textContent = text; el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 2800); };
  const adminCheck = async () => {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return false;
    const result = await db.from('profiles').select('role').eq('id', user.id).single();
    return !result.error && String(result.data?.role || '').toLowerCase() === 'admin';
  };

  async function load() {
    const [p, i, t, rr] = await Promise.all([
      db.from('projects').select('*').order('name'),
      db.from('catalog_items').select('*').eq('is_active', true).order('name'),
      db.from('training_images').select('*').order('created_at', { ascending: false }).limit(100),
      db.from('registration_requests').select('id,user_id,requested_role,status,reviewed_by,reviewed_at,created_at').eq('status', 'pending').order('created_at', { ascending: false })
    ]);
    for (const result of [p, i, t, rr]) if (result.error) throw result.error;
    projects = p.data || []; project = projects.find(row => row.name === 'Sekolah Kemala Taruna Bhayangkara') || projects[0];
    items = i.data || []; training = t.data || []; registrationRequests = rr.data || [];
    if (registrationRequests.length) {
      const ids = registrationRequests.map(row => row.user_id);
      const profiles = await db.from('profiles').select('id,username,full_name,email,requested_role,approval_status').in('id', ids);
      if (profiles.error) throw profiles.error;
      const byId = new Map((profiles.data || []).map(row => [row.id, row]));
      registrationRequests = registrationRequests.map(row => ({ ...row, profile: byId.get(row.user_id) || null }));
    }
  }

  function render() {
    const root = $('#admin-content'); if (!root) return;
    const requestPanel = registrationRequests.length ? `
      <section class="panel admin-card" style="margin-bottom:18px">
        <div class="panel-header"><div><span class="eyebrow">AKSES PENGGUNA</span><h2>Registrasi menunggu persetujuan</h2><p>User tidak dapat masuk sampai Admin menyetujui role.</p></div><span class="loc-badge">${registrationRequests.length} pending</span></div>
        <div class="admin-list">${registrationRequests.map(row => {
          const p = row.profile || {};
          return `<div class="admin-row">
            <div><strong>${esc(p.full_name || p.username || 'User')}</strong><small>${esc(p.email || '')} · Role: <b>${esc(row.requested_role)}</b> · ${new Date(row.created_at).toLocaleString('id-ID')}</small></div>
            <div style="display:flex;gap:6px"><button class="text-button" data-approve-user="${row.id}">Accept</button><button class="text-button danger" data-reject-user="${row.id}">Reject</button></div>
          </div>`;
        }).join('')}</div>
      </section>` : '';
    root.innerHTML = requestPanel + `<section class="panel admin-card">
      <div class="panel-header"><div><span class="eyebrow">DATASET TRAINING AI</span><h2>Foto referensi</h2><p>File tersimpan di Storage <b>aikon-training</b>; metadata di <b>training_images</b>. Item baru yang di-submit lewat halaman Data Training (kategori baru) akan otomatis muncul juga di <b>Lokasi &gt; Item belum punya Room</b> untuk diberi lokasi.</p></div></div>
      <form id="photo-form" class="admin-form">
        <select name="catalog_item_id" required><option value="">Pilih item</option>${items.map(row => `<option value="${row.id}">${esc(row.name)}</option>`).join('')}</select>
        <input name="photo" type="file" accept="image/*" multiple required>
        <button class="primary-button">Simpan foto training</button>
      </form>
      <div class="admin-list">${training.map(row => `<div class="admin-row"><div><strong>${esc(row.label || 'Tanpa label')}</strong><small>${esc(row.status)} · ${esc(row.storage_path)}</small></div><div style="display:flex;gap:6px"><button class="text-button" data-approve-training="${row.id}" ${row.status === 'approved' ? 'disabled' : ''}>Approve</button><button class="text-button danger" data-reject-training="${row.id}" ${row.status === 'rejected' ? 'disabled' : ''}>Reject</button><button class="text-button danger" data-delete-training="${row.id}">Hapus</button></div></div>`).join('') || '<small>Belum ada foto training.</small>'}</div>
    </section>`;
    root.querySelectorAll('[data-approve-user]').forEach(b => b.onclick = () => reviewRegistration(b.dataset.approveUser, 'approved'));
    root.querySelectorAll('[data-reject-user]').forEach(b => b.onclick = () => reviewRegistration(b.dataset.rejectUser, 'rejected'));
    $('#photo-form').onsubmit = upload;
    root.querySelectorAll('[data-approve-training]').forEach(b => b.onclick = () => setTrainingStatus(b.dataset.approveTraining, 'approved'));
    root.querySelectorAll('[data-reject-training]').forEach(b => b.onclick = () => setTrainingStatus(b.dataset.rejectTraining, 'rejected'));
    root.querySelectorAll('[data-delete-training]').forEach(b => b.onclick = () => deleteTraining(b.dataset.deleteTraining));
  }


  async function reviewRegistration(requestId, status) {
    const request = registrationRequests.find(row => row.id === requestId);
    if (!request) return;
    const userId = request.user_id;
    const adminUser = (await db.auth.getUser()).data.user;
    if (!adminUser) return notify('Sesi admin tidak ditemukan.');
    const now = new Date().toISOString();

    const profileUpdate = status === 'approved'
      ? { role: request.requested_role, approval_status: 'approved', approved_by: adminUser.id, approved_at: now }
      : { role: null, approval_status: 'rejected', approved_by: adminUser.id, approved_at: now };

    // profiles uses approved_by/approved_at as the approval audit fields.
    const profileResult = await db.from('profiles').update(profileUpdate).eq('id', userId);
    if (profileResult.error) return notify(profileResult.error.message);

    const requestResult = await db.from('registration_requests').update({
      status,
      reviewed_by: adminUser.id,
      reviewed_at: now
    }).eq('id', requestId);
    if (requestResult.error) return notify(requestResult.error.message);

    await load();
    render();
    notify(status === 'approved' ? 'User disetujui.' : 'Registrasi user ditolak.');
  }

  async function upload(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget), itemId = form.get('catalog_item_id'), user = (await db.auth.getUser()).data.user;
    for (const file of form.getAll('photo')) {
      const path = `${project.id}/${itemId}/${crypto.randomUUID()}-${file.name}`;
      const up = await db.storage.from('aikon-training').upload(path, file);
      if (up.error) return notify(up.error.message);
      const result = await db.from('training_images').insert({ project_id: project.id, catalog_item_id: itemId, storage_path: path, label: items.find(i => i.id === itemId)?.name || file.name, status: 'pending', created_by: user?.id });
      if (result.error) return notify(result.error.message);
    }
    await load(); render(); notify('Foto training tersimpan.');
  }

  async function setTrainingStatus(id, status) {
    const result = await db.from('training_images').update({ status }).eq('id', id);
    if (result.error) return notify(result.error.message);
    await load();
    render();
    notify(status === 'approved' ? 'Foto training di-approve.' : 'Foto training di-reject.');
  }

  async function deleteTraining(id) {
    const row = training.find(t => t.id === id);
    if (!confirm('Hapus foto training ini? File di Storage juga akan dihapus.')) return;
    if (row?.storage_path) { const remove = await db.storage.from('aikon-training').remove([row.storage_path]); if (remove.error) notify(remove.error.message); }
    const result = await db.from('training_images').delete().eq('id', id);
    if (result.error) return notify(result.error.message);
    await load(); render(); notify('Foto training dihapus.');
  }

  async function init() {
    if (!(await adminCheck())) return;
    const nav = document.querySelector('[data-route="catalog"]')?.parentElement;
    if (nav && !document.querySelector('[data-route="admin"]')) nav.insertAdjacentHTML('beforeend', '<a href="#admin" class="nav-link" data-route="admin"><span class="nav-icon">⚙</span><span>Admin</span></a>');
    const content = $('.content'); if (!content || $('#admin')) return;
    content.insertAdjacentHTML('beforeend', '<section id="admin" class="view"><div class="page-header"><div><span class="eyebrow">ADMINISTRATOR</span><h1>Panel Admin</h1><p>Persetujuan registrasi user, dataset training, dan kontrol administrasi AIKON.</p></div></div><div id="admin-content"></div></section>');
    document.querySelector('[data-route="admin"]').onclick = event => {
      event.preventDefault();
      document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'admin'));
      document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.route === 'admin'));
      load().then(render).catch(error => notify(error.message));
    };
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(() => init().catch(error => console.error('Admin UI:', error)), 1000));
})();