/* =========================================================
   AIKON — AI KONSTRUKSI
   Authentication + Application Logic
========================================================= */


/* =========================================================
   SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
  'https://kiyneeejluyqzvgdfljt.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_NGf9sH1tagHPRfPJRcUvtg_vFJIPF6W';


const supabaseClient =
  window.supabase.createClient(
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

  [
    'Monitor LED',
    '3 unit terdaftar',
    '▰'
  ],

  [
    'Kursi kantor',
    '12 unit terdaftar',
    '♙'
  ],

  [
    'Meja rapat',
    '1 unit terdaftar',
    '▱'
  ],

  [
    'AC split',
    '2 unit terdaftar',
    '≋'
  ],

  [
    'Proyektor',
    '1 unit terdaftar',
    '◫'
  ],

  [
    'Whiteboard',
    '1 unit terdaftar',
    '▯'
  ],

  [
    'Lemari arsip',
    '2 unit terdaftar',
    '▥'
  ],

  [
    'APAR',
    '1 unit terdaftar',
    '◉'
  ]

];


/* =========================================================
   APPLICATION STATE
========================================================= */

let history =
  JSON.parse(
    localStorage.getItem(
      'aikon-history'
    ) || 'null'
  )
  || initialHistory;


let stream = null;


let detected = false;


let currentProfile = null;


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = selector =>
  document.querySelector(
    selector
  );


const $$ = selector =>
  [
    ...document.querySelectorAll(
      selector
    )
  ];


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

  const el =
    $('#toast');


  if (!el) {
    return;
  }


  el.textContent =
    message;


  el.classList.remove(
    'hidden'
  );


  setTimeout(
    () => {

      el.classList.add(
        'hidden'
      );

    },
    2800
  );

}


/* =========================================================
   AUTH UI
========================================================= */

function showLogin() {

  $('#login-view')
    ?.classList.remove(
      'hidden'
    );


  $('#signup-view')
    ?.classList.add(
      'hidden'
    );


  $('#app-shell')
    ?.classList.add(
      'hidden'
    );


  $$('.view')
    .forEach(
      view => {

        view.classList.remove(
          'active'
        );

      }
    );


  stopCamera();

}


function showSignup() {

  $('#login-view')
    ?.classList.add(
      'hidden'
    );


  $('#signup-view')
    ?.classList.remove(
      'hidden'
    );


  $('#app-shell')
    ?.classList.add(
      'hidden'
    );


  stopCamera();

}


function showApp() {

  $('#login-view')
    ?.classList.add(
      'hidden'
    );


  $('#signup-view')
    ?.classList.add(
      'hidden'
    );


  $('#app-shell')
    ?.classList.remove(
      'hidden'
    );


  route(
    location.hash.slice(1)
    || 'dashboard'
  );

}


/* =========================================================
   SIGN UP
========================================================= */

async function signUp() {

  const fullName =
    $('#signup-name')
      ?.value
      .trim();


  const username =
    $('#signup-username')
      ?.value
      .trim()
      .toLowerCase();


  const email =
    $('#signup-email')
      ?.value
      .trim()
      .toLowerCase();


  const password =
    $('#signup-password')
      ?.value;


  const requestedRole =
    $('#signup-role')
      ?.value;


  /* =====================================================
     VALIDATION
  ====================================================== */

  if (
    !fullName
    || !username
    || !email
    || !password
    || !requestedRole
  ) {

    toast(
      'Lengkapi semua data dan pilih role.'
    );

    return;

  }


  if (
    username.length < 3
  ) {

    toast(
      'Username minimal 3 karakter.'
    );

    return;

  }


  if (
    !/^[a-z0-9._-]+$/
      .test(username)
  ) {

    toast(
      'Username hanya boleh menggunakan huruf, angka, titik, underscore, atau strip.'
    );

    return;

  }


  if (
    password.length < 6
  ) {

    toast(
      'Password minimal 6 karakter.'
    );

    return;

  }


  /* =====================================================
     CHECK USERNAME
  ====================================================== */

  const {
    data: existingUsername,
    error: usernameError
  } =
    await supabaseClient

      .from('profiles')

      .select('id')

      .eq(
        'username',
        username
      )

      .maybeSingle();


  if (usernameError) {

    console.error(
      usernameError
    );

    toast(
      'Gagal memeriksa username.'
    );

    return;

  }


  if (existingUsername) {

    toast(
      'Username sudah digunakan.'
    );

    return;

  }


  /* =====================================================
     CREATE AUTH ACCOUNT
  ====================================================== */

  const {
    data,
    error
  } =
    await supabaseClient.auth
      .signUp({

        email,

        password,

        options: {

          data: {

            username,

            full_name:
              fullName,

            requested_role:
              requestedRole

          }

        }

      });


  if (error) {

    console.error(
      error
    );

    toast(
      error.message
    );

    return;

  }


  if (!data.user) {

    toast(
      'Registrasi gagal.'
    );

    return;

  }


  /* =====================================================
     CREATE PROFILE

     We keep this compatible with the
     current profiles structure.
  ====================================================== */

  const {
    error: profileError
  } =
    await supabaseClient

      .from('profiles')

      .insert({

        id:
          data.user.id,

        username,

        full_name:
          fullName,

        role:
          requestedRole

      });


  if (profileError) {

    console.error(
      profileError
    );

    toast(
      'Akun berhasil dibuat, tetapi profil gagal disimpan.'
    );

    return;

  }


  /* =====================================================
     EMAIL CONFIRMATION
  ====================================================== */

  if (!data.session) {

    toast(
      'Akun berhasil dibuat. Cek email untuk verifikasi.'
    );


    $('#signup-name').value =
      '';

    $('#signup-username').value =
      '';

    $('#signup-email').value =
      '';

    $('#signup-password').value =
      '';

    $('#signup-role').value =
      '';


    showLogin();

    return;

  }


  /* =====================================================
     SUCCESS
  ====================================================== */

  toast(
    'Akun berhasil dibuat.'
  );


  $('#signup-name').value =
    '';

  $('#signup-username').value =
    '';

  $('#signup-email').value =
    '';

  $('#signup-password').value =
    '';

  $('#signup-role').value =
    '';


  await loadUser();

}


/* =========================================================
   LOGIN
========================================================= */

async function login() {

  const email =
    $('#login-email')
      ?.value
      .trim();


  const password =
    $('#login-password')
      ?.value;


  if (
    !email
    || !password
  ) {

    toast(
      'Masukkan email dan password.'
    );

    return;

  }


  const {
    error
  } =
    await supabaseClient.auth
      .signInWithPassword({

        email,

        password

      });


  if (error) {

    console.error(
      error
    );

    toast(
      error.message
    );

    return;

  }


  $('#login-email').value =
    '';

  $('#login-password').value =
    '';


  await loadUser();


  toast(
    'Login berhasil.'
  );

}


/* =========================================================
   LOAD CURRENT USER
========================================================= */

async function loadUser() {

  const {
    data: {
      user
    }
  } =
    await supabaseClient.auth
      .getUser();


  /* =====================================================
     NO USER
  ====================================================== */

  if (!user) {

    currentProfile =
      null;

    showLogin();

    return;

  }


  /* =====================================================
     GET PROFILE
  ====================================================== */

  const {
    data: profile,
    error
  } =
    await supabaseClient

      .from('profiles')

      .select(
        'username, full_name, role'
      )

      .eq(
        'id',
        user.id
      )

      .single();


  if (error) {

    console.error(
      error
    );


    currentProfile =
      null;


    toast(
      'Profil user tidak ditemukan.'
    );


    return;

  }


  currentProfile =
    profile;


  /* =====================================================
     USER NAME
  ====================================================== */

  if (
    $('#user-name')
  ) {

    $('#user-name')
      .textContent =
      profile.full_name
      || 'User';

  }


  /* =====================================================
     USER ROLE
  ====================================================== */

  if (
    $('#user-role')
  ) {

    $('#user-role')
      .textContent =
      profile.role
      || 'Field User';

  }


  /* =====================================================
     INITIALS
  ====================================================== */

  const initials =

    (
      profile.full_name
      || 'User'
    )

      .split(' ')

      .filter(Boolean)

      .slice(0, 2)

      .map(
        word =>
          word[0]
      )

      .join('')

      .toUpperCase();


  if (
    $('#user-avatar')
  ) {

    $('#user-avatar')
      .textContent =
      initials
      || 'US';

  }


  /* =====================================================
     DASHBOARD GREETING
  ====================================================== */

  const firstName =

    (
      profile.full_name
      || 'User'
    )

      .split(' ')

      .filter(Boolean)[0]
    || 'User';


  if (
    $('#dashboard-greeting')
  ) {

    $('#dashboard-greeting')
      .textContent =
      `Selamat pagi, ${firstName}.`;

  }


  /* =====================================================
     SHOW APPLICATION
  ====================================================== */

  showApp();

}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

  const {
    error
  } =
    await supabaseClient.auth
      .signOut();


  if (error) {

    console.error(
      error
    );


    toast(
      error.message
    );

    return;

  }


  currentProfile =
    null;


  $('#user-menu')
    ?.classList.add(
      'hidden'
    );


  $('#user-menu-button')
    ?.setAttribute(
      'aria-expanded',
      'false'
    );


  showLogin();


  toast(
    'Anda telah logout.'
  );

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


  if (
    !validRoutes
      .includes(name)
  ) {

    name =
      'dashboard';

  }


  $$('.view')
    .forEach(
      view => {

        view.classList.toggle(

          'active',

          view.id === name

        );

      }
    );


  $$('.nav-link')
    .forEach(
      link => {

        link.classList.toggle(

          'active',

          link.dataset.route
          === name

        );

      }
    );


  const breadcrumbs = {

    dashboard:
      'Beranda',

    scan:
      'Verifikasi aset',

    history:
      'Riwayat scan',

    training:
      'Data training',

    catalog:
      'Katalog ruang'

  };


  if (
    $('#breadcrumb')
  ) {

    $('#breadcrumb')
      .textContent =
      breadcrumbs[name];

  }


  $('.sidebar')
    ?.classList.remove(
      'open'
    );


  if (
    name !== 'scan'
  ) {

    stopCamera();

  }


  window.scrollTo({

    top: 0,

    behavior: 'smooth'

  });


  if (
    location.hash
      .slice(1)
    !== name
  ) {

    window.history.pushState(
      null,
      '',
      `#${name}`
    );

  }

}


/* =========================================================
   DASHBOARD ACTIVITY
========================================================= */

function activity() {

  const target =
    $('#activity-list');


  if (!target) {
    return;
  }


  target.innerHTML =

    history

      .slice(0, 4)

      .map(
        row => `

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

        `
      )

      .join('');

}


/* =========================================================
   HISTORY
========================================================= */

function renderHistory() {

  const search =
    $('#history-search');


  const statusFilter =
    $('#status-filter');


  const target =
    $('#history-body');


  if (
    !search
    || !statusFilter
    || !target
  ) {

    return;

  }


  const q =
    search.value
      .toLowerCase();


  const filter =
    statusFilter.value;


  const rows =

    history.filter(
      row =>

        (
          filter === 'all'
          ||
          row.status === filter
        )

        &&

        `${row.item} ${row.room}`
          .toLowerCase()
          .includes(q)

    );


  target.innerHTML =

    rows

      .map(
        row => `

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

        `
      )

      .join('')

      ||

      `

        <tr>

          <td
            colspan="5"
            style="
              text-align:center;
              padding:32px;
            "
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

  const target =
    $('#catalog-grid');


  if (!target) {
    return;
  }


  target.innerHTML =

    catalog

      .map(

        ([name, detail, icon]) => `

          <article
            class="panel catalog-card"
          >

            <div
              class="item-thumb"
            >
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
    Math.max(
      0,
      history.length
      - initialHistory.length
    );


  const scanTotal =
    24 + saved;


  const matchedAdditional =

    history.filter(

      row =>
        row.status === 'matched'
        &&
        !initialHistory.includes(row)

    ).length;


  const matchedTotal =
    21 + matchedAdditional;


  if (
    $('#scan-total')
  ) {

    $('#scan-total')
      .textContent =
      scanTotal;

  }


  if (
    $('#matched-total')
  ) {

    $('#matched-total')
      .textContent =
      matchedTotal;

  }

}


/* =========================================================
   CAMERA
========================================================= */

async function startCamera() {

  if (
    !navigator
      .mediaDevices
      ?.getUserMedia
  ) {

    toast(
      'Browser ini belum mendukung akses kamera.'
    );

    return;

  }


  try {

    stream =

      await navigator
        .mediaDevices
        .getUserMedia({

          video: {

            facingMode: {

              ideal:
                'environment'

            }

          },

          audio: false

        });


    const video =
      $('#camera-video');


    if (!video) {

      return;

    }


    video.srcObject =
      stream;


    $('#camera-feed')
      ?.classList.add(
        'live'
      );


    $('#camera-placeholder')
      ?.classList.add(
        'hidden'
      );


    $('#camera-button')
      .textContent =
      'Matikan kamera';


    $('#detect-button')
      .disabled =
      false;


    $('#detect-button')
      .classList.remove(
        'disabled'
      );


    $('#camera-status')
      .textContent =
      'Kamera aktif · siap mendeteksi';


    detected =
      false;


    $('#result-empty')
      ?.classList.remove(
        'hidden'
      );


    $('#result-found')
      ?.classList.add(
        'hidden'
      );


    $('#detection-box')
      ?.classList.add(
        'hidden'
      );


    $('#scanline')
      ?.classList.add(
        'hidden'
      );

  }


  catch (error) {

    console.error(
      error
    );


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
      .forEach(
        track =>
          track.stop()
      );

  }


  stream =
    null;


  $('#camera-feed')
    ?.classList.remove(
      'live'
    );


  $('#camera-placeholder')
    ?.classList.remove(
      'hidden'
    );


  if (
    $('#camera-button')
  ) {

    $('#camera-button')
      .textContent =
      'Aktifkan kamera';

  }


  if (
    $('#detect-button')
  ) {

    $('#detect-button')
      .disabled =
      true;


    $('#detect-button')
      .classList.add(
        'disabled'
      );

  }


  $('#detection-box')
    ?.classList.add(
      'hidden'
    );


  $('#scanline')
    ?.classList.add(
      'hidden'
    );


  detected =
    false;

}


/* =========================================================
   MOCK AI DETECTION
========================================================= */

function runDetection() {

  if (!stream) {

    toast(
      'Aktifkan kamera terlebih dahulu.'
    );

    return;

  }


  detected =
    true;


  $('#detection-box')
    ?.classList.remove(
      'hidden'
    );


  $('#scanline')
    ?.classList.remove(
      'hidden'
    );


  $('#result-empty')
    ?.classList.add(
      'hidden'
    );


  $('#result-found')
    ?.classList.remove(
      'hidden'
    );


  const now =

    new Date()
      .toLocaleTimeString(
        'id-ID',
        {

          hour:
            '2-digit',

          minute:
            '2-digit'

        }
      );


  $('#scan-time')
    .textContent =
    now;


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
    $('#scan-time')
      ?.textContent
    || '--';


  const room =
    $('#room-select')
      ?.value
    || 'Lokasi belum dipilih';


  history.unshift({

    item:
      'Monitor LED',

    room,

    time,

    status:
      'matched',

    sync:
      online,

    icon:
      '▰'

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


  detected =
    false;

}


/* =========================================================
   CONNECTION
========================================================= */

function setConnection() {

  const online =
    navigator.onLine;


  const dot =
    $('#connection-dot');


  const text =
    $('#connection-text');


  if (dot) {

    dot.style.background =
      online
        ? '#54ad70'
        : '#d69441';

  }


  if (text) {

    text.textContent =

      online

        ? 'Online · tersinkron'

        : 'Offline · data disimpan lokal';

  }


  if (!online) {

    const cameraStatus =
      $('#camera-status');

    if (cameraStatus) {

      cameraStatus.textContent =
        'Offline · deteksi AI membutuhkan koneksi';

    }

  }

}


/* =========================================================
   USER MENU
========================================================= */

function toggleUserMenu() {

  const menu =
    $('#user-menu');


  if (!menu) {
    return;
  }


  const isHidden =
    menu.classList
      .contains(
        'hidden'
      );


  menu.classList.toggle(
    'hidden'
  );


  $('#user-menu-button')
    ?.setAttribute(

      'aria-expanded',

      String(
        isHidden
      )

    );

}


/* =========================================================
   PROFILE
========================================================= */

async function openProfile() {

  $('#user-menu')
    ?.classList.add(
      'hidden'
    );


  $('#user-menu-button')
    ?.setAttribute(
      'aria-expanded',
      'false'
    );


  const { data: { user } } = await supabaseClient.auth.getUser();

  document.getElementById('profile-modal-backdrop')?.remove();

  document.body.insertAdjacentHTML('beforeend', `
    <div id="profile-modal-backdrop" class="loc-modal-backdrop">
      <div class="loc-modal" role="dialog" aria-modal="true">
        <div class="loc-modal-header"><h3>Profil</h3><button type="button" class="loc-modal-close" aria-label="Tutup">&times;</button></div>
        <form class="admin-form" style="padding:18px 23px 23px">
          <label>Nama lengkap<input value="${(currentProfile?.full_name || '-').replace(/"/g, '&quot;')}" disabled></label>
          <label>Username<input value="${(currentProfile?.username || '-').replace(/"/g, '&quot;')}" disabled></label>
          <label>Email<input value="${(user?.email || '-').replace(/"/g, '&quot;')}" disabled></label>
          <label>Role<input value="${(currentProfile?.role || 'Field User').replace(/"/g, '&quot;')}" disabled></label>
        </form>
      </div>
    </div>`);

  const close = () => document.getElementById('profile-modal-backdrop')?.remove();
  document.getElementById('profile-modal-backdrop').addEventListener('click', e => { if (e.target.id === 'profile-modal-backdrop') close(); });
  document.querySelector('#profile-modal-backdrop .loc-modal-close').onclick = close;

}


/* =========================================================
   EXPORT CSV
========================================================= */

function exportHistory() {

  const rows = [

    [
      'Barang',
      'Lokasi',
      'Waktu',
      'Status'
    ],

    ...history.map(

      row => [

        row.item,
        row.room,
        row.time,
        row.status

      ]

    )

  ];


  const csv =

    rows

      .map(

        row =>

          row
            .map(

              value =>

                `"${String(value)
                  .replace(/"/g, '""')}"`

            )

            .join(',')

      )

      .join('\n');


  const url =

    URL.createObjectURL(

      new Blob(

        [csv],

        {
          type:
            'text/csv;charset=utf-8;'
        }

      )

    );


  const a =
    document.createElement(
      'a'
    );


  a.href =
    url;


  a.download =
    'aikon-riwayat-scan.csv';


  document.body
    .appendChild(a);


  a.click();


  a.remove();


  URL.revokeObjectURL(
    url
  );

}


/* =========================================================
   TRAINING CHOICES
========================================================= */

function setupTrainingChoices() {

  $$('.choice')
    .forEach(

      button => {

        button.addEventListener(

          'click',

          () => {

            $$('.choice')
              .forEach(

                item => {

                  item.classList.toggle(

                    'active',

                    item === button

                  );

                }

              );


            const isNew =

              button.dataset.training
              === 'new';


            $('#training-category-wrap')
              ?.classList.toggle(
                'hidden',
                isNew
              );


            $('#new-category-wrap')
              ?.classList.toggle(
                'hidden',
                !isNew
              );

          }

        );

      }

    );

}


/* =========================================================
   TRAINING UPLOAD
========================================================= */

function setupTrainingUpload() {

  const dropZone =
    $('#drop-zone');


  const input =
    $('#photo-input');


  if (!dropZone || !input) {
    return;
  }


  dropZone.addEventListener(

    'click',

    () => {

      input.click();

    }

  );


  input.addEventListener(

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


  [
    'dragenter',
    'dragover'
  ]

    .forEach(

      type => {

        dropZone.addEventListener(

          type,

          event => {

            event.preventDefault();


            dropZone.classList.add(
              'drag'
            );

          }

        );

      }

    );


  [
    'dragleave',
    'drop'
  ]

    .forEach(

      type => {

        dropZone.addEventListener(

          type,

          event => {

            event.preventDefault();


            dropZone.classList.remove(
              'drag'
            );

          }

        );

      }

    );


  dropZone.addEventListener(

    'drop',

    event => {

      const files = event.dataTransfer.files;
      const count = files.length;

      try {
        const transfer = new DataTransfer();
        for (const file of files) transfer.items.add(file);
        input.files = transfer.files;
      } catch (error) {
        console.warn('AIKON drop-file assignment failed:', error);
      }

      $('#photo-count')
        .textContent =

        count

          ? `${count} foto siap diunggah`

          : 'Belum ada foto dipilih';

    }

  );

}


/* =========================================================
   TRAINING SUBMIT
========================================================= */

let trainingProjectId = null;

async function loadTrainingCategories() {

  const select = $('#training-category');
  if (!select) return;

  const [projectsResult, itemsResult] = await Promise.all([
    supabaseClient.from('projects').select('id, name').order('name'),
    supabaseClient.from('catalog_items').select('id, name, is_active').order('name')
  ]);

  if (!projectsResult.error && projectsResult.data?.length) {
    const active = projectsResult.data.find(p => p.name === 'Sekolah Kemala Taruna Bhayangkara') || projectsResult.data[0];
    trainingProjectId = active?.id || null;
  }

  if (itemsResult.error) return;

  const items = itemsResult.data.filter(row => row.is_active !== false);

  select.innerHTML =
    '<option value="">Pilih kategori aset</option>' +
    items.map(row => `<option value="${row.id}">${row.name}</option>`).join('');

}

async function submitTraining() {

  const input = $('#photo-input');
  const files = input?.files ? Array.from(input.files) : [];

  if (files.length < 5) {

    toast(
      'Tambahkan minimal 5 foto sebelum dikirim.'
    );

    return;

  }

  const isNew =
    $('.choice.active')?.dataset.training
    === 'new';

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    toast('Sesi login tidak ditemukan, silakan login ulang.');
    return;
  }

  if (!trainingProjectId) {
    toast('Data project belum termuat, coba lagi sebentar lagi.');
    return;
  }

  let itemId = null;
  let label = '';

  if (isNew) {

    const name = $('#new-category')?.value?.trim();

    if (!name) {
      toast('Isi nama kategori baru terlebih dahulu.');
      return;
    }

    // Self-service enrollment: created without a Room yet — an admin
    // assigns its location later from Lokasi > "Item belum punya Room".
    const insertResult = await supabaseClient
      .from('catalog_items')
      .insert({ name, quantity: 1, project_id: trainingProjectId })
      .select('id')
      .single();

    if (insertResult.error) {
      toast(insertResult.error.message);
      return;
    }

    itemId = insertResult.data.id;
    label = name;

  } else {

    const select = $('#training-category');
    itemId = select?.value || '';
    label = select?.options[select.selectedIndex]?.textContent || '';

    if (!itemId) {
      toast('Pilih kategori aset terlebih dahulu.');
      return;
    }

  }

  toast('Mengunggah foto training...');

  for (const file of files) {

    const path = `${trainingProjectId}/${itemId}/${crypto.randomUUID()}-${file.name}`;

    const uploadResult = await supabaseClient.storage.from('aikon-training').upload(path, file);

    if (uploadResult.error) {
      toast(uploadResult.error.message);
      return;
    }

    const insertResult = await supabaseClient.from('training_images').insert({
      project_id: trainingProjectId,
      catalog_item_id: itemId,
      storage_path: path,
      label,
      status: 'pending',
      created_by: user.id
    });

    if (insertResult.error) {
      toast(insertResult.error.message);
      return;
    }

  }

  input.value = '';

  $('#photo-count').textContent = 'Belum ada foto dipilih';

  if (isNew) {
    $('#new-category').value = '';
    await loadTrainingCategories();
  }

  toast(
    'Data training dikirim untuk review admin.'
  );

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

document.addEventListener(

  'DOMContentLoaded',

  () => {


    /* ===================================================
       NAVIGATION
    ==================================================== */

    $$('[data-route]')
      .forEach(

        link => {

          link.addEventListener(

            'click',

            event => {

              event.preventDefault();


              route(
                link.dataset.route
              );

            }

          );

        }

      );


    /* ===================================================
       MOBILE MENU
    ==================================================== */

    $('.mobile-menu')
      ?.addEventListener(

        'click',

        () => {

          $('.sidebar')
            ?.classList.toggle(
              'open'
            );

        }

      );


    /* ===================================================
       CATALOG
    ==================================================== */

    $('#show-catalog')
      ?.addEventListener(

        'click',

        () =>
          route(
            'catalog'
          )

      );


    $('#catalog-location')
      ?.addEventListener(

        'click',

        () =>
          route(
            'scan'
          )

      );


    /* ===================================================
       CAMERA
    ==================================================== */

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


    /* ===================================================
       HISTORY
    ==================================================== */

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


    $('#export-button')
      ?.addEventListener(

        'click',

        exportHistory

      );


    /* ===================================================
       TRAINING
    ==================================================== */

    setupTrainingChoices();


    setupTrainingUpload();


    loadTrainingCategories()
      .catch(error => console.error('Training categories:', error));


    $('#submit-training')
      ?.addEventListener(

        'click',

        submitTraining

      );


    /* ===================================================
       AUTH BUTTONS
    ==================================================== */

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


    /* ===================================================
       ENTER KEY — LOGIN
    ==================================================== */

    $('#login-password')
      ?.addEventListener(

        'keydown',

        event => {

          if (
            event.key
            === 'Enter'
          ) {

            login();

          }

        }

      );


    /* ===================================================
       ENTER KEY — SIGNUP
    ==================================================== */

    $('#signup-password')
      ?.addEventListener(

        'keydown',

        event => {

          if (
            event.key
            === 'Enter'
          ) {

            signUp();

          }

        }

      );


    /* ===================================================
       CONNECTION
    ==================================================== */

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


    /* ===================================================
       ROUTING
    ==================================================== */

    window.addEventListener(

      'hashchange',

      () => {

        route(

          location.hash.slice(1)
          || 'dashboard'

        );

      }

    );


    /* ===================================================
       SERVICE WORKER
    ==================================================== */

    if (
      'serviceWorker' in navigator
    ) {

      window.addEventListener(

        'load',

        () => {

          navigator
            .serviceWorker
            .register(
              './sw.js'
            )

            .catch(

              error => {

                console.error(
                  'Service Worker error:',
                  error
                );

              }

            );

        }

      );

    }


    /* ===================================================
       INITIAL RENDER
    ==================================================== */

    activity();

    renderHistory();

    renderCatalog();

    updateStats();

    setConnection();


    /* ===================================================
       CHECK AUTHENTICATION
    ==================================================== */

    loadUser();

  }

);