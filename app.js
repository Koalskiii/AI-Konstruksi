const initialHistory = [
  {item:'Monitor LED', room:'Ruang Meeting 12A', time:'09:42', status:'matched', sync:true, icon:'▰'},
  {item:'Kursi kantor', room:'Ruang Meeting 12A', time:'09:35', status:'matched', sync:true, icon:'♙'},
  {item:'Printer multifungsi', room:'Ruang Server 12B', time:'09:21', status:'review', sync:true, icon:'▤'},
  {item:'AC split', room:'Ruang Meeting 12A', time:'09:12', status:'matched', sync:true, icon:'≋'},
  {item:'Meja rapat', room:'Ruang Meeting 12A', time:'08:57', status:'matched', sync:true, icon:'▱'}
];
const catalog = [
  ['Monitor LED','3 unit terdaftar','▰'],['Kursi kantor','12 unit terdaftar','♙'],['Meja rapat','1 unit terdaftar','▱'],['AC split','2 unit terdaftar','≋'],['Proyektor','1 unit terdaftar','◫'],['Whiteboard','1 unit terdaftar','▯'],['Lemari arsip','2 unit terdaftar','▥'],['APAR','1 unit terdaftar','◉']
];
let history = JSON.parse(localStorage.getItem('aikon-history') || 'null') || initialHistory;
let stream, detected = false;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function saveHistory(){ localStorage.setItem('aikon-history', JSON.stringify(history)); }
function toast(message){ const el=$('#toast'); el.textContent=message; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'), 2800); }
function route(name){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===name));
  $$('.nav-link').forEach(a=>a.classList.toggle('active',a.dataset.route===name));
  $('#breadcrumb').textContent = ({dashboard:'Beranda',scan:'Verifikasi aset',history:'Riwayat scan',training:'Data training',catalog:'Katalog ruang'})[name];
  $('.sidebar').classList.remove('open');
  if(name !== 'scan') stopCamera();
  window.scrollTo({top:0,behavior:'smooth'});
}
function activity(){
  $('#activity-list').innerHTML = history.slice(0,4).map(row => `<div class="activity-row"><div class="activity-icon">${row.icon}</div><div class="activity-copy"><strong>${row.item}</strong><small>${row.room} · Hari ini, ${row.time}</small></div><span class="status ${row.status==='matched'?'ok':'warn'}">${row.status==='matched'?'SESUAI':'DITINJAU'}</span></div>`).join('');
}
function renderHistory(){
  const q=$('#history-search').value.toLowerCase(), filter=$('#status-filter').value;
  const rows=history.filter(r=>(filter==='all'||r.status===filter)&&`${r.item} ${r.room}`.toLowerCase().includes(q));
  $('#history-body').innerHTML=rows.map(r=>`<tr><td><div class="table-item"><span class="mini-item">${r.icon}</span><strong>${r.item}</strong></div></td><td>${r.room}</td><td>Hari ini, ${r.time}</td><td><span class="status ${r.status==='matched'?'ok':'warn'}">${r.status==='matched'?'SESUAI KATALOG':'PERLU DITINJAU'}</span></td><td><span class="sync">${r.sync?'● Tersinkron':'◌ Menunggu sync'}</span></td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:32px">Tidak ada hasil yang cocok.</td></tr>';
}
function renderCatalog(){ $('#catalog-grid').innerHTML=catalog.map(([name,detail,icon])=>`<article class="panel catalog-card"><div class="item-thumb monitor-thumb">${icon}</div><h3>${name}</h3><p>${detail}</p><small>TERDAFTAR DI RUANG</small></article>`).join(''); }
function updateStats(){
  const saved = history.length - initialHistory.length;
  if(saved>0){ $('#scan-total').textContent=24+saved; $('#matched-total').textContent=21+history.filter(x=>!initialHistory.includes(x)&&x.status==='matched').length; }
}
async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){ toast('Browser ini belum mendukung akses kamera.'); return; }
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    const video=$('#camera-video'); video.srcObject=stream; $('#camera-feed').classList.add('live'); $('#camera-placeholder').classList.add('hidden');
    $('#camera-button').textContent='Matikan kamera'; $('#detect-button').disabled=false; $('#detect-button').classList.remove('disabled'); $('#camera-status').textContent='Kamera aktif · siap mendeteksi';
  }catch(e){ toast('Izin kamera diperlukan untuk mulai scan.'); }
}
function stopCamera(){
  if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null;
  $('#camera-feed').classList.remove('live'); $('#camera-placeholder').classList.remove('hidden'); $('#camera-button').textContent='Aktifkan kamera';
  $('#detect-button').disabled=true; $('#detect-button').classList.add('disabled');
}
function runDetection(){
  if(!stream) return;
  detected=true; $('#detection-box').classList.remove('hidden'); $('#scanline').classList.remove('hidden'); $('#result-empty').classList.add('hidden'); $('#result-found').classList.remove('hidden');
  const now = new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); $('#scan-time').textContent=now; $('#camera-status').textContent='Objek terdeteksi · 94% keyakinan';
}
function saveResult(){
  if(!detected){toast('Aktifkan kamera dan deteksi barang terlebih dahulu.');return;}
  const online=navigator.onLine, time=$('#scan-time').textContent;
  history.unshift({item:'Monitor LED',room:$('#room-select').value,time,status:'matched',sync:online,icon:'▰'}); saveHistory(); activity(); renderHistory(); updateStats();
  $('#sync-state').textContent=online?'Tersinkron':'Tersimpan lokal'; toast(online?'Hasil scan disimpan dan tersinkron.':'Hasil scan aman disimpan di perangkat.');
}
function setConnection(){
  const online=navigator.onLine; $('#connection-dot').style.background=online?'#54ad70':'#d69441'; $('#connection-text').textContent=online?'Online · tersinkron':'Offline · data disimpan lokal';
  if(!online) $('#camera-status').textContent='Offline · deteksi AI membutuhkan koneksi';
}

$$('[data-route]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();route(link.dataset.route)}));
$('.mobile-menu').addEventListener('click',()=>$('.sidebar').classList.toggle('open'));
$('#show-catalog').addEventListener('click',()=>route('catalog'));
$('#catalog-location').addEventListener('click',()=>route('scan'));
$('#camera-button').addEventListener('click',()=>stream?stopCamera():startCamera());
$('#detect-button').addEventListener('click',runDetection);
$('#save-result').addEventListener('click',saveResult);
$('#history-search').addEventListener('input',renderHistory); $('#status-filter').addEventListener('change',renderHistory);
$$('.choice').forEach(btn=>btn.addEventListener('click',()=>{ $$('.choice').forEach(x=>x.classList.toggle('active',x===btn)); $('#training-category-wrap').classList.toggle('hidden',btn.dataset.training==='new'); $('#new-category-wrap').classList.toggle('hidden',btn.dataset.training!=='new'); }));
$('#drop-zone').addEventListener('click',()=>$('#photo-input').click());
$('#photo-input').addEventListener('change',e=>$('#photo-count').textContent=e.target.files.length?`${e.target.files.length} foto siap diunggah`:'Belum ada foto dipilih');
['dragenter','dragover'].forEach(type=>$('#drop-zone').addEventListener(type,e=>{e.preventDefault();$('#drop-zone').classList.add('drag')}));
['dragleave','drop'].forEach(type=>$('#drop-zone').addEventListener(type,e=>{e.preventDefault();$('#drop-zone').classList.remove('drag')}));
$('#drop-zone').addEventListener('drop',e=>{const n=e.dataTransfer.files.length;$('#photo-count').textContent=n?`${n} foto siap diunggah`:'Belum ada foto dipilih'});
$('#submit-training').addEventListener('click',()=>{ const count=$('#photo-count').textContent; if(count==='Belum ada foto dipilih') toast('Tambahkan minimal 5 foto sebelum dikirim.'); else toast('Data training dikirim untuk review admin.'); });
$('#export-button').addEventListener('click',()=>{ const csv=['Barang,Lokasi,Waktu,Status',...history.map(x=>`"${x.item}","${x.room}","${x.time}","${x.status}"`)].join('\n'); const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='aikon-riwayat-scan.csv';a.click();URL.revokeObjectURL(a.href);});
window.addEventListener('online',()=>{setConnection();toast('Koneksi kembali. Data lokal akan tersinkron.');}); window.addEventListener('offline',()=>{setConnection();toast('Mode offline aktif. Hasil scan tetap tersimpan lokal.');});
window.addEventListener('hashchange',()=>route(location.hash.slice(1)||'dashboard'));
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
activity();renderHistory();renderCatalog();updateStats();setConnection();route(location.hash.slice(1)||'dashboard');
