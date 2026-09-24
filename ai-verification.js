/* =========================================================
   AIKON — ROOM-AWARE AI VERIFICATION
   Project -> Building -> Floor -> Room -> Item
   Uses approved training photos as visual references via
   DINOv2 image embeddings. No developer/model retraining is
   required when an admin adds a new catalog item + photos.
========================================================= */

(() => {
  const MODEL_ID = 'onnx-community/dinov2-small';
  const MODEL_DTYPE = 'q4';
  const EMBEDDING_CACHE_PREFIX = 'aikon-dino-ref-v1:';
  const MATCH_THRESHOLD = 0.48;
  const VAPID_PUBLIC_KEY = 'BBMYOY3sZ2iPAZQJR6CPFi14KLE-9pBwgOJdlpszhHEmcljgGnQpmVse2XaWEOjGZh-o93Smi4GNJo7OQ5VH6Tw';

  let extractorPromise = null;
  let roomItems = [];
  let selectedRoom = null;
  let detected = [];
  let scanSessionId = null;

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notify = (message) => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3000);
  };

  function injectStyles() {
    if ($('#ai-room-verification-styles')) return;
    const style = document.createElement('style');
    style.id = 'ai-room-verification-styles';
    style.textContent = `
      .ai-room-context{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
      .ai-room-context label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#49635f}
      .ai-room-context select{min-height:42px;padding:8px 10px;border:1px solid #d9e2df;border-radius:9px;background:#fff;font:inherit}
      .ai-room-context select:disabled{background:#f2f5f4;color:#8b9996}
      .ai-room-inventory{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 14px}
      .ai-room-chip{padding:7px 10px;border-radius:999px;background:#eef4f2;font-size:12px}
      .ai-room-chip strong{margin-left:4px}
      .ai-ai-status{font-size:12px;color:#5c706c;margin:7px 0}
      .ai-results{display:flex;flex-direction:column;gap:8px}
      .ai-result-row{display:flex;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid #e2e9e7;border-radius:10px;background:#fff}
      .ai-result-row.ok{border-color:#cde7d3}
      .ai-result-row.warn{border-color:#f1d7aa}
      .ai-result-row.bad{border-color:#efc5c5}
      .ai-result-copy{display:flex;flex-direction:column;gap:3px}
      .ai-result-copy small{color:#70807d}
      .ai-pill{align-self:center;font-size:11px;font-weight:700;padding:5px 8px;border-radius:999px}
      .ai-pill.ok{background:#e5f4e8;color:#28753c}
      .ai-pill.warn{background:#fff0d8;color:#9a5c0a}
      .ai-pill.bad{background:#fde8e8;color:#a02c2c}
      .ai-missing{margin-top:12px;padding:12px;border-radius:10px;background:#fff5e8;border:1px solid #f1d5a8}
      .ai-scan-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      @media(max-width:800px){.ai-room-context{grid-template-columns:1fr 1fr}}
      @media(max-width:520px){.ai-room-context{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function injectUI() {
    const scan = $('#scan');
    if (!scan || $('#ai-room-context')) return;

    const header = scan.querySelector('.page-header');
    const context = document.createElement('section');
    context.id = 'ai-room-context';
    context.className = 'panel';
    context.innerHTML = `
      <div class="panel-header">
        <div>
          <span class="eyebrow">LOKASI PEMERIKSAAN</span>
          <h2>Pilih lokasi sebelum scan</h2>
          <p>AI hanya membandingkan kamera dengan item yang seharusnya ada di Room ini.</p>
        </div>
      </div>
      <div class="ai-room-context">
        <label>Project<select id="ai-project"><option value="">Pilih project</option></select></label>
        <label>Gedung<select id="ai-building" disabled><option value="">Pilih gedung</option></select></label>
        <label>Lantai<select id="ai-floor" disabled><option value="">Pilih lantai</option></select></label>
        <label>Ruang<select id="ai-room" disabled><option value="">Pilih ruang</option></select></label>
      </div>
      <div id="ai-room-status" class="ai-ai-status">Pilih Room untuk memuat inventory.</div>
      <div id="ai-room-inventory" class="ai-room-inventory"></div>
    `;
    header?.insertAdjacentElement('afterend', context);

    const resultPanel = scan.querySelector('.result-panel');
    const found = $('#result-found');
    const custom = document.createElement('div');
    custom.id = 'ai-verification-result';
    custom.className = 'ai-results';
    custom.style.margin = '0 20px 20px';
    custom.innerHTML = `
      <div class="ai-ai-status">Belum ada hasil AI.</div>
      <div class="ai-scan-actions">
        <button id="ai-finish-scan" class="secondary-button" type="button" disabled>Selesai verifikasi Room</button>
      </div>
    `;
    resultPanel?.appendChild(custom);

    if (found) found.classList.add('hidden');

    const oldDetect = $('#detect-button');
    if (oldDetect) {
      const clone = oldDetect.cloneNode(true);
      clone.id = 'detect-button';
      clone.textContent = 'Deteksi barang';
      clone.disabled = true;
      oldDetect.replaceWith(clone);
    }

    $('#detect-button')?.addEventListener('click', detectCurrentObject);
    $('#ai-finish-scan')?.addEventListener('click', finishVerification);

    $('#ai-project')?.addEventListener('change', async e => {
      resetSelect('#ai-building','Pilih gedung');
      resetSelect('#ai-floor','Pilih lantai');
      resetSelect('#ai-room','Pilih ruang');
      roomItems = [];
      selectedRoom = null;
      await loadBuildings(e.target.value);
    });
    $('#ai-building')?.addEventListener('change', async e => {
      resetSelect('#ai-floor','Pilih lantai');
      resetSelect('#ai-room','Pilih ruang');
      await loadFloors(e.target.value);
    });
    $('#ai-floor')?.addEventListener('change', async e => {
      resetSelect('#ai-room','Pilih ruang');
      await loadRooms(e.target.value);
    });
    $('#ai-room')?.addEventListener('change', async e => {
      await loadRoomInventory(e.target.value);
    });
  }

  function resetSelect(selector, placeholder) {
    const el = $(selector);
    if (!el) return;
    el.innerHTML = '<option value="">' + placeholder + '</option>';
    el.disabled = true;
  }

  function fillSelect(selector, rows, placeholder) {
    const el = $(selector);
    if (!el) return;
    el.innerHTML = '<option value="">' + placeholder + '</option>' +
      rows.map(row => `<option value="${esc(row.id)}">${esc(row.name)}</option>`).join('');
    el.disabled = rows.length === 0;
  }

  async function loadProjects() {
    const { data, error } = await supabaseClient.from('projects').select('id,name').eq('is_active', true).order('name');
    if (error) return notify(error.message);
    fillSelect('#ai-project', data || [], 'Pilih project');
  }

  async function loadBuildings(projectId) {
    if (!projectId) return;
    const { data, error } = await supabaseClient.from('buildings').select('id,name').eq('project_id', projectId).eq('is_active', true).order('name');
    if (error) return notify(error.message);
    fillSelect('#ai-building', data || [], 'Pilih gedung');
  }

  async function loadFloors(buildingId) {
    if (!buildingId) return;
    const { data, error } = await supabaseClient.from('floors').select('id,name').eq('building_id', buildingId).eq('is_active', true).order('name');
    if (error) return notify(error.message);
    fillSelect('#ai-floor', data || [], 'Pilih lantai');
  }

  async function loadRooms(floorId) {
    if (!floorId) return;
    const { data, error } = await supabaseClient.from('rooms').select('id,name,room_type').eq('floor_id', floorId).eq('is_active', true).order('name');
    if (error) return notify(error.message);
    fillSelect('#ai-room', data || [], 'Pilih ruang');
  }

  async function loadRoomInventory(roomId) {
    roomItems = [];
    selectedRoom = null;
    detected = [];
    renderDetected();
    $('#ai-finish-scan').disabled = true;
    if (!roomId) {
      $('#ai-room-status').textContent = 'Pilih Room untuk memuat inventory.';
      $('#ai-room-inventory').innerHTML = '';
      return;
    }

    const [{ data: room, error: roomError }, { data: items, error: itemError }] = await Promise.all([
      supabaseClient.from('rooms').select('id,name,room_type,floor_id').eq('id', roomId).single(),
      supabaseClient.from('catalog_items').select('id,name,quantity,description,is_active').eq('room_id', roomId).eq('is_active', true).order('name')
    ]);
    if (roomError || itemError) return notify((roomError || itemError).message);

    selectedRoom = room;
    roomItems = items || [];
    $('#ai-room-status').textContent = roomItems.length
      ? `${roomItems.length} jenis item terdaftar. Scan satu barang per deteksi.`
      : 'Room belum memiliki item aktif.';
    $('#ai-room-inventory').innerHTML = roomItems.map(item =>
      `<span class="ai-room-chip">${esc(item.name)} <strong>×${Number(item.quantity || 1)}</strong></span>`
    ).join('');
    $('#ai-finish-scan').disabled = roomItems.length === 0;
    updateCameraButtonState();
  }

  function updateCameraButtonState() {
    const button = $('#detect-button');
    if (button) button.disabled = !(selectedRoom && roomItems.length && $('#camera-video')?.srcObject);
  }

  async function getExtractor() {
    if (!extractorPromise) {
      extractorPromise = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1')
        .then(({ pipeline }) => pipeline('image-feature-extraction', MODEL_ID, {
          dtype: MODEL_DTYPE,
          progress_callback: info => {
            if (info?.status === 'progress' && typeof info.progress === 'number') {
              $('#camera-status').textContent = `Memuat AI ${Math.round(info.progress)}%…`;
            }
          }
        }));
    }
    return extractorPromise;
  }

  function canvasFromVideo() {
    const video = $('#camera-video');
    if (!video || !video.videoWidth) throw new Error('Kamera belum siap.');
    const canvas = document.createElement('canvas');
    const max = 720;
    const scale = Math.min(1, max / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function vectorFromTensor(tensor) {
    const dims = tensor?.dims || [];
    const data = tensor?.data;
    if (!data) throw new Error('AI tidak menghasilkan embedding.');
    if (dims.length === 2) return Array.from(data);
    if (dims.length !== 3) return Array.from(data);
    const tokens = dims[1], width = dims[2];
    const out = new Float32Array(width);
    for (let t = 0; t < tokens; t++) for (let j = 0; j < width; j++) out[j] += data[t * width + j];
    for (let j = 0; j < width; j++) out[j] /= tokens;
    let norm = 0;
    for (const v of out) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    return Array.from(out, v => v / norm);
  }

  function cosine(a,b) {
    let dot=0, na=0, nb=0;
    const n=Math.min(a.length,b.length);
    for(let i=0;i<n;i++){dot+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}
    return dot / ((Math.sqrt(na)*Math.sqrt(nb)) || 1);
  }

  async function referenceEmbedding(itemId, trainingRows) {
    const key = EMBEDDING_CACHE_PREFIX + itemId + ':' + trainingRows.map(x => x.id).sort().join(',');
    try {
      const cached = JSON.parse(localStorage.getItem(key) || 'null');
      if (Array.isArray(cached) && cached.length) return cached;
    } catch {}

    const extractor = await getExtractor();
    const paths = trainingRows.slice(0, 5).map(x => x.storage_path);
    const { data: signed, error } = await supabaseClient.storage.from('aikon-training').createSignedUrls(paths, 600);
    if (error) throw error;

    const vectors = [];
    for (const row of signed || []) {
      const url = row.signedUrl || row.signedURL;
      if (!url) continue;
      const tensor = await extractor(url, { pooling: 'mean', normalize: true });
      vectors.push(vectorFromTensor(tensor));
    }
    if (!vectors.length) return null;

    const width = vectors[0].length;
    const mean = new Float32Array(width);
    for (const v of vectors) for (let i=0;i<width;i++) mean[i] += v[i];
    for (let i=0;i<width;i++) mean[i] /= vectors.length;
    let norm=0; for(const v of mean) norm += v*v; norm=Math.sqrt(norm)||1;
    const result=Array.from(mean, v=>v/norm);
    try { localStorage.setItem(key, JSON.stringify(result)); } catch {}
    return result;
  }

  async function detectCurrentObject() {
    if (!selectedRoom || !roomItems.length) return notify('Pilih Room yang memiliki item terlebih dahulu.');
    if (!$('#camera-video')?.srcObject) return notify('Aktifkan kamera terlebih dahulu.');

    const button = $('#detect-button');
    button.disabled = true;
    $('#camera-status').textContent = 'AI sedang membandingkan foto dengan data training Room…';

    try {
      const extractor = await getExtractor();
      const canvas = canvasFromVideo();
      const tensor = await extractor(canvas, { pooling: 'mean', normalize: true });
      const queryVector = vectorFromTensor(tensor);

      const { data: trainingRows, error } = await supabaseClient
        .from('training_images')
        .select('id,catalog_item_id,storage_path,status,created_at')
        .in('catalog_item_id', roomItems.map(x => x.id))
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const byItem = new Map();
      for (const row of trainingRows || []) {
        if (!byItem.has(row.catalog_item_id)) byItem.set(row.catalog_item_id, []);
        byItem.get(row.catalog_item_id).push(row);
      }

      const scores = [];
      for (const item of roomItems) {
        const refs = byItem.get(item.id) || [];
        if (!refs.length) continue;
        const ref = await referenceEmbedding(item.id, refs);
        if (ref) scores.push({ item, score: cosine(queryVector, ref) });
      }

      scores.sort((a,b) => b.score-a.score);
      const best = scores[0];
      if (!best || best.score < MATCH_THRESHOLD) {
        detected.push({ catalog_item_id:null, detected_label:'Tidak cocok dengan item Room', confidence:best?.score || 0, matched:false });
        renderDetected();
        $('#camera-status').textContent = 'Tidak ditemukan kecocokan yang cukup kuat.';
        return;
      }

      detected.push({
        catalog_item_id: best.item.id,
        detected_label: best.item.name,
        confidence: best.score,
        matched: true,
        expected_quantity: Number(best.item.quantity || 1)
      });
      renderDetected();
      $('#camera-status').textContent = `Terdeteksi: ${best.item.name} · kemiripan ${Math.round(best.score*100)}%`;
      $('#detection-box')?.classList.remove('hidden');
      $('#scanline')?.classList.remove('hidden');
      $('#result-empty')?.classList.add('hidden');
    } catch (error) {
      console.error('AI verification:', error);
      notify(error.message || 'AI gagal memproses gambar.');
      $('#camera-status').textContent = 'AI gagal memproses. Coba lagi.';
    } finally {
      updateCameraButtonState();
    }
  }

  function renderDetected() {
    const root = $('#ai-verification-result');
    if (!root) return;
    if (!detected.length) {
      root.innerHTML = `
        <div class="ai-ai-status">Belum ada hasil AI.</div>
        <div class="ai-scan-actions"><button id="ai-finish-scan" class="secondary-button" type="button" disabled>Selesai verifikasi Room</button></div>`;
      $('#ai-finish-scan').onclick = finishVerification;
      return;
    }

    const counts = new Map();
    for (const row of detected) if (row.matched) counts.set(row.catalog_item_id, (counts.get(row.catalog_item_id)||0)+1);
    const rows = roomItems.map(item => {
      const found = counts.get(item.id)||0;
      const expected = Number(item.quantity||1);
      const status = found >= expected ? 'ok' : found > 0 ? 'warn' : 'bad';
      return {item,found,expected,status};
    });

    const unknown = detected.filter(x=>!x.matched).length;
    root.innerHTML = rows.map(r => `
      <div class="ai-result-row ${r.status}">
        <div class="ai-result-copy"><strong>${esc(r.item.name)}</strong><small>Expected ${r.expected} · Terdeteksi ${r.found}</small></div>
        <span class="ai-pill ${r.status}">${r.status==='ok'?'SESUAI':r.status==='warn'?'KURANG':'BELUM TERDETEKSI'}</span>
      </div>`).join('') +
      (unknown ? `<div class="ai-result-row bad"><div class="ai-result-copy"><strong>${unknown} hasil tidak cocok</strong><small>Barang tersebut tidak termasuk catalog Room ini.</small></div><span class="ai-pill bad">TIDAK TERDAFTAR</span></div>` : '') +
      `<div class="ai-scan-actions"><button id="ai-finish-scan" class="secondary-button" type="button">Selesai verifikasi Room</button></div>`;
    $('#ai-finish-scan').onclick = finishVerification;
  }

  async function finishVerification() {
    if (!selectedRoom || !detected.length) return notify('Lakukan minimal satu deteksi terlebih dahulu.');

    const { data:{user} } = await supabaseClient.auth.getUser();
    if (!user) return notify('Sesi login tidak ditemukan.');

    const projectId = $('#ai-project')?.value || null;
    const buildingId = $('#ai-building')?.value || null;
    const floorId = $('#ai-floor')?.value || null;

    const counts = new Map();
    for (const row of detected) if (row.matched) counts.set(row.catalog_item_id, (counts.get(row.catalog_item_id)||0)+1);
    const missing = roomItems.filter(item => (counts.get(item.id)||0) < Number(item.quantity||1));
    const unexpected = detected.filter(row => !row.matched);

    const summary = {
      room_id:selectedRoom.id,
      expected:roomItems.map(item=>({id:item.id,name:item.name,quantity:Number(item.quantity||1)})),
      detected:roomItems.map(item=>({id:item.id,name:item.name,quantity:counts.get(item.id)||0})),
      missing:missing.map(item=>({id:item.id,name:item.name,missing:Number(item.quantity||1)-(counts.get(item.id)||0)})),
      unexpected:unexpected.map(row=>row.detected_label)
    };

    const sessionResult = await supabaseClient.from('scan_sessions').insert({
      user_id:user.id, project_id:projectId, building_id:buildingId, floor_id:floorId,
      room_id:selectedRoom.id, status:missing.length ? 'needs_review' : 'completed', summary
    }).select('id').single();
    if (sessionResult.error) return notify(sessionResult.error.message);
    scanSessionId=sessionResult.data.id;

    const detectionRows=detected.map(row=>({
      session_id:scanSessionId,
      catalog_item_id:row.catalog_item_id,
      detected_label:row.detected_label,
      confidence:row.confidence,
      matched:row.matched,
      expected_quantity:row.expected_quantity || null
    }));
    const insertDetections=await supabaseClient.from('scan_detections').insert(detectionRows);
    if(insertDetections.error) return notify(insertDetections.error.message);

    if (missing.length) {
      await notifySurveyors(projectId, buildingId, floorId, selectedRoom.id, selectedRoom.name, missing, user.id);
      notify(`Ada ${missing.length} jenis barang yang belum terdeteksi. Surveyor diberi pemberitahuan.`);
    } else {
      notify('Verifikasi Room selesai. Semua item terdaftar terdeteksi sesuai quantity.');
    }

    detected=[];
    renderDetected();
  }

  async function notifySurveyors(projectId, buildingId, floorId, roomId, roomName, missing, reporterId) {
    const { data: surveyors, error } = await supabaseClient.from('profiles').select('id,full_name,role').eq('role','surveyor');
    if (error || !surveyors?.length) return;

    const body = `${missing.map(x=>x.name + ' kurang ' + (Number(x.quantity||1))).join(', ')} di ${roomName}.`;
    const rows = surveyors.map(s => ({
      user_id:s.id,
      type:'asset_missing',
      title:'Barang kurang terdeteksi',
      body,
      data:{project_id:projectId,building_id:buildingId,floor_id:floorId,room_id:roomId,missing:missing.map(x=>({id:x.id,name:x.name,missing:Number(x.quantity||1)})),reported_by:reporterId}
    }));
    const result=await supabaseClient.from('notifications').insert(rows).select('id,user_id');
    if(result.error) console.error('Notification insert:',result.error);

    try {
      const push = await supabaseClient.functions.invoke('send-missing-asset-push', {
        body: {
          user_ids: surveyors.map(s => s.id),
          notification: {
            title: 'AIKON — Barang kurang',
            body,
            url: '/AI-Konstruksi/#history',
            tag: 'aikon-asset-missing'
          }
        }
      });
      if (push.error) console.warn('AIKON push function:', push.error);
    } catch (error) {
      console.warn('AIKON push invoke:', error);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('AIKON — Barang kurang', { body }); } catch {}
    }
  }

  function base64UrlToBytes(value) {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }

  async function registerSurveyorPush() {
    if (!VAPID_PUBLIC_KEY || !('PushManager' in window) || !('serviceWorker' in navigator)) return;
    if (currentProfile?.role !== 'surveyor') return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY)
        });
      }
      const json = subscription.toJSON();
      const keys = json.keys || {};
      if (!json.endpoint || !keys.p256dh || !keys.auth) return;
      const user = (await supabaseClient.auth.getUser()).data.user;
      if (!user) return;
      await supabaseClient.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,endpoint' });
    } catch (error) {
      console.warn('AIKON push subscription:', error);
    }
  }

  async function requestSurveyorNotifications() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch {}
    }
  }

  function init() {
    injectStyles();
    injectUI();
    loadProjects().catch(error => console.error('AIKON AI locations:', error));
    requestSurveyorNotifications();
    setTimeout(() => registerSurveyorPush(), 1500);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    $('#camera-video')?.addEventListener('loadedmetadata', updateCameraButtonState);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) updateCameraButtonState();
    });
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
})();