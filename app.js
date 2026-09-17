/* =========================================================
   AIKON — AI KONSTRUKSI
   Authentication + Application Logic
========================================================= */


/* =========================================================
   SUPABASE CONFIG
========================================================= */

const SUPABASE_URL = 'PASTE_SUPABASE_PROJECT_URL_HERE';
const SUPABASE_KEY = 'PASTE_SUPABASE_PUBLISHABLE_KEY_HERE';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* =========================================================
   INITIAL DATA
========================================================= */

const initialHistory = [

  {
    item: 'Monitor LED',
    room: 'Ruang Meeting 12A',
    time: '09:42',
    status: 'matched',
    sync: true,
    icon: '▰'
  },

  {
    item: 'Kursi kantor',
    room: 'Ruang Meeting 12A',
    time: '09:35',
    status: 'matched',
    sync: true,
    icon: '♙'
  },

  {
    item: 'Printer multifungsi',
    room: 'Ruang Server 12B',
    time: '09:21',
    status: 'review',
    sync: true,
    icon: '▤'
  },

  {
    item: 'AC split',
    room: 'Ruang Meeting 12A',
    time: '09:12',
    status: 'matched',
    sync: true,
    icon: '≋'
  },

  {
    item: 'Meja rapat',
    room: 'Ruang Meeting 12A',
    time: '08:57',
    status: 'matched',
    sync: true,
    icon: '▱'
  }

];


const catalog = [

  ['Monitor LED', '3 unit terdaftar', '▰'],
  ['Kursi kantor', '12 unit terdaftar', '♙'],
  ['Meja rapat', '1 unit terdaftar', '▱'],
  ['AC split', '2 unit terdaftar', '≋'],
  ['Proyektor', '1 unit terdaftar', '◫'],
  ['Whiteboard', '1 unit terdaftar', '▯'],
  ['Lemari arsip', '2 unit terdaftar', '▥'],
  ['APAR', '1 unit terdaftar', '◉']

];


/* =========================================================
   APPLICATION STATE
========================================================= */

let history =
  JSON.parse(localStorage.getItem('aikon-history') || 'null')
  || initialHistory;

let stream = null;

let detected = false;


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = selector =>
  document.querySelector(selector);

const $$ = selector =>
  [...document.querySelectorAll(selector)];


/* =========================================================
   LOCAL STORAGE
========================================================= */

function saveHistory() {

  localStorage.setItem(
    'aikon-history',
    JSON.stringify(history)
  );

}


/* =========================================================
   TOAST
========================================================= */

function toast(message) {

  const el = $('#toast');

  if (!el) return;

  el.textContent = message;

  el.classList.remove('hidden');

  setTimeout(() => {
    el.classList.add('hidden');
  }, 2800);

}


/* =========================================================
   AUTH UI
========================================================= */

function showLogin() {

  $('#login-view')?.classList.remove('hidden');

  $('#signup-view')?.classList.add('hidden');

  $('#app-shell')?.classList.add('auth-mode');

  $$('.view').forEach(view => {
    view.classList.remove('active');
  });

}


function showSignup() {

  $('#login-view')?.classList.add('hidden');

  $('#signup-view')?.classList.remove('hidden');

  $('#app-shell')?.classList.add('auth-mode');

}


function showApp() {

  $('#login-view')?.classList.add('hidden');

  $('#signup-view')?.classList.add('hidden');

  $('#app-shell')?.classList.remove('auth-mode');

  route(
    location.hash.slice(1) || 'dashboard'
  );

}


/* =========================================================
   SIGN UP
========================================================= */

async function signUp() {

  const fullName =
    $('#signup-name')?.value.trim();

  const username =
    $('#signup-username')?.value.trim().toLowerCase();

  const email =
    $('#signup-email')?.value.trim();

  const password =
    $('#signup-password')?.value;


  /* Validation */

  if (
    !fullName ||
    !username ||
    !email ||
    !password
  ) {

    toast('Lengkapi semua data.');

    return;

  }


  if (username.length < 3) {

    toast('Username minimal 3 karakter.');

    return;

  }


  if (!/^[a-z0-9._-]+$/.test(username)) {

    toast(
      'Username hanya boleh menggunakan huruf, angka, titik, underscore, atau strip.'
    );

    return;

  }


  if (password.length < 6) {

    toast('Password minimal 6 karakter.');

    return;

  }


  /* Check username */

  const {
    data: existingUsername,
    error: usernameError
  } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();


  if (usernameError) {

    console.error(usernameError);

    toast('Gagal memeriksa username.');

    return;

  }


  if (existingUsername) {

    toast('Username sudah digunakan.');

    return;

  }


  /* Create Auth Account */

  const {
    data,
    error
  } = await supabaseClient.auth.signUp({

    email,
    password

  });


  if (error) {

    console.error(error);

    toast(error.message);

    return;

  }


  if (!data.user) {

    toast('Registrasi gagal.');

    return;

  }


  /* Create Profile */

  const {
    error: profileError
  } = await supabaseClient
    .from('profiles')
    .insert({

      id: data.user.id,

      username,

      full_name: fullName,

      role: 'Field User'

    });


  if (profileError) {

    console.error(profileError);

    toast(
      'Akun berhasil dibuat, tetapi profil gagal disimpan.'
    );

    return;

  }


  /*
    Supabase may require email confirmation.
    If confirmation is enabled, there may be no active session yet.
  */

  if (!data.session) {

    toast(
      'Akun berhasil dibuat. Cek email untuk verifikasi.'
    );

    $('#signup-name').value = '';
    $('#signup-username').value = '';
    $('#signup-email').value = '';
    $('#signup-password').value = '';

    showLogin();

    return;

  }


  toast('Akun berhasil dibuat.');

  await loadUser();

}


/* =========================================================
   LOGIN
========================================================= */

async function login() {

  const email =
    $('#login-email')?.value.trim();

  const password =
    $('#login-password')?.value;


  if (!email || !password) {

    toast('Masukkan email dan password.');

    return;

  }


  const {
    error
  } = await supabaseClient.auth.signInWithPassword({

    email,

    password

  });


  if (error) {

    console.error(error);

    toast(error.message);

    return;

  }


  $('#login-email').value = '';
  $('#login-password').value = '';

  await loadUser();

  toast('Login berhasil.');

}


/* =========================================================
   LOAD CURRENT USER
========================================================= */

async function loadUser() {

  const {
    data: {
      user
    }
  } = await supabaseClient.auth.getUser();


  /* No user */

  if (!user) {

    showLogin();

    return;

  }


  /* Get profile */

  const {
    data: profile,
    error
  } = await supabaseClient
    .from('profiles')
    .select(
      'username, full_name, role'
    )
    .eq('id', user.id)
    .single();


  if (error) {

    console.error(error);

    toast(
      'Profil user tidak ditemukan.'
    );

    return;

  }


  /* User name */

  $('#user-name').textContent =
    profile.full_name;


  /* User role */

  $('#user-role').textContent =
    profile.role;


  /* Initials */

  const initials = profile.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();


  $('#user-avatar').textContent =
    initials || 'US';


  /* Dashboard greeting */

  $('#dashboard-greeting').textContent =
    `Selamat pagi, ${profile.full_name.split(' ')[0]}.`;


  showApp();

}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

  const {
    error
  } = await supabaseClient.auth.signOut();


  if (error) {

    console.error(error);

    toast(error.message);

    return;

  }


  $('#user-menu')?.classList.add('hidden');

  $('#user-menu-button')?.setAttribute(
    'aria-expanded',
    'false'
  );


  showLogin();

  toast('Anda telah logout.');

}


/* =========================================================
   ROUTING
========================================================= */

function route(name) {

  const validRoutes = [
    'dashboard',
    'scan',
    'history',
    'training',
    'catalog'
  ];


  if (!validRoutes.includes(name)) {

    name = 'dashboard';

  }


  $$('.view').forEach(view => {

    view.classList.toggle(
      'active',
      view.id === name
    );

  });


  $$('.nav-link').forEach(link => {

    link.classList.toggle(
      'active',
      link.dataset.route === name
    );

  });


  const breadcrumbs = {

    dashboard: 'Beranda',

    scan: 'Verifikasi aset',

    history: 'Riwayat scan',

    training: 'Data training',

    catalog: 'Katalog ruang'

  };


  $('#breadcrumb').textContent =
    breadcrumbs[name];


  $('.sidebar')?.classList.remove('open');


  if (name !== 'scan') {

    stopCamera();

  }


  window.scrollTo({

    top: 0,

    behavior: 'smooth'

  });

}


/* =========================================================
   DASHBOARD ACTIVITY
========================================================= */

function activity() {

  $('#activity-list').innerHTML =
    history
      .slice(0, 4)
      .map(row => `

        <div class="activity-row">

          <div class="activity-icon">
            ${row.icon}
          </div>

          <div class="activity-copy">

            <strong>
              ${row.item}
            </strong>

            <small>
              ${row.room} · Hari ini, ${row.time}
            </small>

          </div>

          <span
            class="status ${
              row.status === 'matched'
                ? 'ok'
                : 'warn'
            }"
          >
            ${
              row.status === 'matched'
                ? 'SESUAI'
                : 'DITINJAU'
            }
          </span>

        </div>

      `)
      .join('');

}


/* =========================================================
   HISTORY
========================================================= */

function renderHistory() {

  const q =
    $('#history-search')
      .value
      .toLowerCase();

  const filter =
    $('#status-filter').value;


  const rows =
    history.filter(row =>

      (
        filter === 'all'
        || row.status === filter
      )

      &&

      `${row.item} ${row.room}`
        .toLowerCase()
        .includes(q)

    );


  $('#history-body').innerHTML =

    rows
      .map(row => `

        <tr>

          <td>

            <div class="table-item">

              <span class="mini-item">
                ${row.icon}
              </span>

              <strong>
                ${row.item}
              </strong>

            </div>

          </td>

          <td>
            ${row.room}
          </td>

          <td>
            Hari ini, ${row.time}
          </td>

          <td>

            <span
              class="status ${
                row.status === 'matched'
                  ? 'ok'
                  : 'warn'
              }"
            >
              ${
                row.status === 'matched'
                  ? 'SESUAI KATALOG'
                  : 'PERLU DITINJAU'
              }
            </span>

          </td>

          <td>

            <span class="sync">
              ${
                row.sync
                  ? '● Tersinkron'
                  : '◌ Menunggu sync'
              }
            </span>

          </td>

        </tr>

      `)
      .join('')

      ||

      `
        <tr>
          <td
            colspan="5"
            style="text-align:center;padding:32px"
          >
            Tidak ada hasil yang cocok.
          </td>
        </tr>
      `;

}


/* =========================================================
   CATALOG
========================================================= */

function renderCatalog() {

  $('#catalog-grid').innerHTML =

    catalog
      .map(
        ([name, detail, icon]) => `

          <article class="panel catalog-card">

            <div class="item-thumb monitor-thumb">
              ${icon}
            </div>

            <h3>
              ${name}
            </h3>

            <p>
              ${detail}
            </p>

            <small>
              TERDAFTAR DI RUANG
            </small>

          </article>

        `
      )
      .join('');

}


/* =========================================================
   DASHBOARD STATS
========================================================= */

function updateStats() {

  const saved =
    history.length - initialHistory.length;


  if (saved > 0) {

    $('#scan-total').textContent =
      24 + saved;


    $('#matched-total').textContent =
      21 +
      history.filter(
        x =>
          !initialHistory.includes(x)
          && x.status === 'matched'
      ).length;

  }

}


/* =========================================================
   CAMERA
========================================================= */

async function startCamera() {

  if (
    !navigator.mediaDevices?.getUserMedia
  ) {

    toast(
      'Browser ini belum mendukung akses kamera.'
    );

    return;

  }


  try {

    stream =
      await navigator.mediaDevices.getUserMedia({

        video: {
          facingMode: {
            ideal: 'environment'
          }
        },

        audio: false

      });


    const video =
      $('#camera-video');


    video.srcObject =
      stream;


    $('#camera-feed')
      .classList.add('live');


    $('#camera-placeholder')
      .classList.add('hidden');


    $('#camera-button')
      .textContent =
      'Matikan kamera';


    $('#detect-button')
      .disabled = false;


    $('#detect-button')
      .classList.remove(
        'disabled'
      );


    $('#camera-status')
      .textContent =
      'Kamera aktif · siap mendeteksi';

  }


  catch (error) {

    console.error(error);

    toast(
      'Izin kamera diperlukan untuk mulai scan.'
    );

  }

}


/* =========================================================
   STOP CAMERA
========================================================= */

function stopCamera() {

  if (stream) {

    stream
      .getTracks()
      .forEach(track => track.stop());

  }


  stream = null;


  $('#camera-feed')
    ?.classList.remove('live');


  $('#camera-placeholder')
    ?.classList.remove('hidden');


  if ($('#camera-button')) {

    $('#camera-button')
      .textContent =
      'Aktifkan kamera';

  }


  if ($('#detect-button')) {

    $('#detect-button')
      .disabled = true;

    $('#detect-button')
      .classList.add('disabled');

  }

}


/* =========================================================
   MOCK AI DETECTION
========================================================= */

function runDetection() {

  if (!stream) return;


  detected = true;


  $('#detection-box')
    .classList.remove('hidden');


  $('#scanline')
    .classList.remove('hidden');


  $('#result-empty')
    .classList.add('hidden');


  $('#result-found')
    .classList.remove('hidden');


  const now =
    new Date().toLocaleTimeString(
      'id-ID',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );


  $('#scan-time')
    .textContent = now;


  $('#camera-status')
    .textContent =
    'Objek terdeteksi · 94% keyakinan';

}


/* =========================================================
   SAVE SCAN RESULT
========================================================= */

function saveResult() {

  if (!detected) {

    toast(
      'Aktifkan kamera dan deteksi barang terlebih dahulu.'
    );

    return;

  }


  const online =
    navigator.onLine;


  const time =
    $('#scan-time').textContent;


  history.unshift({

    item: 'Monitor LED',

    room: $('#room-select').value,

    time,

    status: 'matched',

    sync: online,

    icon: '▰'

  });


  saveHistory();

  activity();

  renderHistory();

  updateStats();


  $('#sync-state')
    .textContent =
    online
      ? 'Tersinkron'
      : 'Tersimpan lokal';


  toast(

    online

      ? 'Hasil scan disimpan dan tersinkron.'

      : 'Hasil scan aman disimpan di perangkat.'

  );

}


/* =========================================================
   CONNECTION
========================================================= */

function setConnection() {

  const online =
    navigator.onLine;


  $('#connection-dot')
    .style.background =
    online
      ? '#54ad70'
      : '#d69441';


  $('#connection-text')
    .textContent =
    online

      ? 'Online · tersinkron'

      : 'Offline · data disimpan lokal';


  if (!online) {

    $('#camera-status')
      .textContent =
      'Offline · deteksi AI membutuhkan koneksi';

  }

}


/* =========================================================
   USER MENU
========================================================= */

function toggleUserMenu() {

  const menu =
    $('#user-menu');


  if (!menu) return;


  const isHidden =
    menu.classList.contains(
      'hidden'
    );


  menu.classList.toggle(
    'hidden'
  );


  $('#user-menu-button')
    .setAttribute(
      'aria-expanded',
      String(isHidden)
    );

}


/* =========================================================
   PROFILE BUTTON
========================================================= */

function openProfile() {

  $('#user-menu')
    ?.classList.add('hidden');


  $('#user-menu-button')
    ?.setAttribute(
      'aria-expanded',
      'false'
    );


  toast(
    'Halaman profil akan tersedia pada tahap berikutnya.'
  );

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {


    /* Navigation */

    $$('[data-route]')
      .forEach(link => {

        link.addEventListener(
          'click',
          event => {

            event.preventDefault();

            route(
              link.dataset.route
            );

          }
        );

      });


    /* Mobile menu */

    $('.mobile-menu')
      ?.addEventListener(
        'click',
        () => {

          $('.sidebar')
            .classList.toggle(
              'open'
            );

        }
      );


    /* Catalog */

    $('#show-catalog')
      ?.addEventListener(
        'click',
        () => route('catalog')
      );


    $('#catalog-location')
      ?.addEventListener(
        'click',
        () => route('scan')
      );


    /* Camera */

    $('#camera-button')
      ?.addEventListener(
        'click',
        () =>
          stream
            ? stopCamera()
            : startCamera()
      );


    $('#detect-button')
      ?.addEventListener(
        'click',
        runDetection
      );


    $('#save-result')
      ?.addEventListener(
        'click',
        saveResult
      );


    /* History */

    $('#history-search')
      ?.addEventListener(
        'input',
        renderHistory
      );


    $('#status-filter')
      ?.addEventListener(
        'change',
        renderHistory
      );


    /* Training */

    $$('.choice')
      .forEach(button => {

        button.addEventListener(
          'click',
          () => {

            $$('.choice')
              .forEach(
                item =>
                  item.classList.toggle(
                    'active',
                    item === button
                  )
              );


            $('#training-category-wrap')
              .classList.toggle(
                'hidden',
                button.dataset.training === 'new'
              );


            $('#new-category-wrap')
              .classList.toggle(
                'hidden',
                button.dataset.training !== 'new'
              );

          }
        );

      });


    /* Upload */

    $('#drop-zone')
      ?.addEventListener(
        'click',
        () =>
          $('#photo-input').click()
      );


    $('#photo-input')
      ?.addEventListener(
        'change',
        event => {

          const count =
            event.target.files.length;


          $('#photo-count')
            .textContent =
            count

              ? `${count} foto siap diunggah`

              : 'Belum ada foto dipilih';

        }
      );


    ['dragenter', 'dragover']
      .forEach(type => {

        $('#drop-zone')
          ?.addEventListener(
            type,
            event => {

              event.preventDefault();

              $('#drop-zone')
                .classList.add(
                  'drag'
                );

            }
          );

      });


    ['dragleave', 'drop']
      .forEach(type => {

        $('#drop-zone')
          ?.addEventListener(
            type,
            event => {

              event.preventDefault();

              $('#drop-zone')
                .classList.remove(
                  'drag'
                );

            }
          );

      });


    $('#drop-zone')
      ?.addEventListener(
        'drop',
        event => {

          const count =
            event.dataTransfer.files.length;


          $('#photo-count')
            .textContent =
            count

              ? `${count} foto siap diunggah`

              : 'Belum ada foto dipilih';

        }
      );


    $('#submit-training')
      ?.addEventListener(
        'click',
        () => {

          const count =
            $('#photo-count')
              .textContent;


          if (
            count ===
            'Belum ada foto dipilih'
          ) {

            toast(
              'Tambahkan minimal 5 foto sebelum dikirim.'
            );

          }

          else {

            toast(
              'Data training dikirim untuk review admin.'
            );

          }

        }
      );


    /* Export */

    $('#export-button')
      ?.addEventListener(
        'click',
        () => {

          const csv = [

            'Barang,Lokasi,Waktu,Status',

            ...history.map(
              row =>
                `"${row.item}","${row.room}","${row.time}","${row.status}"`
            )

          ].join('\n');


          const url =
            URL.createObjectURL(
              new Blob(
                [csv],
                {
                  type: 'text/csv'
                }
              )
            );


          const a =
            document.createElement('a');


          a.href = url;

          a.download =
            'aikon-riwayat-scan.csv';


          a.click();


          URL.revokeObjectURL(url);

        }
      );


    /* =====================================================
       AUTH BUTTONS
    ====================================================== */

    $('#login-button')
      ?.addEventListener(
        'click',
        login
      );


    $('#signup-button')
      ?.addEventListener(
        'click',
        signUp
      );


    $('#show-signup')
      ?.addEventListener(
        'click',
        showSignup
      );


    $('#show-login')
      ?.addEventListener(
        'click',
        showLogin
      );


    $('#logout-button')
      ?.addEventListener(
        'click',
        logout
      );


    $('#profile-button')
      ?.addEventListener(
        'click',
        openProfile
      );


    $('#user-menu-button')
      ?.addEventListener(
        'click',
        toggleUserMenu
      );


    /* Enter key login */

    $('#login-password')
      ?.addEventListener(
        'keydown',
        event => {

          if (event.key === 'Enter') {

            login();

          }

        }
      );


    /* Enter key signup */

    $('#signup-password')
      ?.addEventListener(
        'keydown',
        event => {

          if (event.key === 'Enter') {

            signUp();

          }

        }
      );


    /* Connection */

    window.addEventListener(
      'online',
      () => {

        setConnection();

        toast(
          'Koneksi kembali.'
        );

      }
    );


    window.addEventListener(
      'offline',
      () => {

        setConnection();

        toast(
          'Mode offline aktif.'
        );

      }
    );


    /* Routing */

    window.addEventListener(
      'hashchange',
      () =>
        route(
          location.hash.slice(1)
          || 'dashboard'
        )
    );


    /* Service worker */

    if (
      'serviceWorker' in navigator
    ) {

      window.addEventListener(
        'load',
        () =>
          navigator.serviceWorker.register(
            './sw.js'
          )
      );

    }


    /* Initial render */

    activity();

    renderHistory();

    renderCatalog();

    updateStats();

    setConnection();


    /* Check authentication */

    loadUser();

  }
);
