/* =========================================================
   AIKON — AI KONSTRUKSI
   Authentication + Application Logic
========================================================= */


/* =========================================================
   SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
  'https://efcyyiunxigzixfdwtzq.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_OGJgtLKCNAupcWLGqRM52w_rP2hyq7h';

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
  JSON.parse(
    localStorage.getItem('aikon-history') || 'null'
  ) || initialHistory;

let stream = null;

let detected = false;

let currentProfile = null;

const ALLOWED_ROLES = [
  'Field User',
  'Supervisor',
  'QA/QC',
  'Project Manager',
  'Admin'
];


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
   AUTH / ROLE HELPERS
========================================================= */

function ensureSignupRoleField() {

  if ($('#signup-role')) return;

  const password =
    $('#signup-password');

  if (!password) return;

  const wrapper =
    document.createElement('div');

  wrapper.className = 'field';

  wrapper.innerHTML = `

    <label for="signup-role">
      Role yang diminta
    </label>

    <select id="signup-role">

      <option value="">
        Pilih role
      </option>

      ${ALLOWED_ROLES
        .filter(role => role !== 'Admin')
        .map(role =>
          `<option value="${role}">
            ${role}
          </option>`
        )
        .join('')}

    </select>

    <small>
      Role akan diperiksa oleh Admin sebelum akun dapat digunakan.
    </small>

  `;

  const passwordField =
    password.closest('.field');

  if (passwordField) {

    passwordField.after(wrapper);

  } else {

    password.after(wrapper);

  }

}


function isAdminProfile(profile) {

  return (
    profile?.role === 'Admin' &&
    profile?.approval_status === 'approved'
  );

}


function addAdminNavigation() {

  if (!isAdminProfile(currentProfile)) return;

  if ($('[data-route="admin"]')) return;

  const nav =
    $('.sidebar');

  if (!nav) return;

  const navContainer =
    nav.querySelector('.nav-links') ||
    nav.querySelector('nav') ||
    nav;

  const link =
    document.createElement('a');

  link.href = '#admin';

  link.className = 'nav-link';

  link.dataset.route = 'admin';

  link.innerHTML = `
    <span>▣</span>
    <span>Manajemen User</span>
  `;

  navContainer.appendChild(link);

  link.addEventListener(
    'click',
    event => {

      event.preventDefault();

      route('admin');

    }
  );

}


function ensureAdminView() {

  if ($('#admin')) return;

  const content =
    $('.content');

  if (!content) return;

  const section =
    document.createElement('section');

  section.className = 'view';

  section.id = 'admin';

  section.innerHTML = `

    <div class="page-heading">

      <div>

        <p class="eyebrow">
          ADMINISTRATOR
        </p>

        <h1>
          Manajemen pengguna
        </h1>

        <p>
          Periksa permintaan registrasi dan kelola role pengguna.
        </p>

      </div>

      <button
        class="secondary-button"
        id="refresh-admin"
      >
        Refresh
      </button>

    </div>


    <div class="panel">

      <div class="panel-heading">

        <div>

          <h2>
            Permintaan registrasi
          </h2>

          <p id="admin-request-count">
            Memuat...
          </p>

        </div>

      </div>

      <div id="admin-requests"></div>

    </div>


    <div
      class="panel"
      style="margin-top:20px"
    >

      <div class="panel-heading">

        <div>

          <h2>
            Pengguna
          </h2>

          <p>
            Role dapat diubah setelah akun disetujui.
          </p>

        </div>

      </div>

      <div id="admin-users"></div>

    </div>

  `;

  content.appendChild(section);

  $('#refresh-admin')
    ?.addEventListener(
      'click',
      loadAdminPanel
    );

}


/* =========================================================
   ADMIN PANEL
========================================================= */

async function loadAdminPanel() {

  if (!isAdminProfile(currentProfile)) {

    toast('Akses Admin diperlukan.');

    return;

  }

  ensureAdminView();

  const requestsEl =
    $('#admin-requests');

  const usersEl =
    $('#admin-users');

  if (!requestsEl || !usersEl) return;

  requestsEl.innerHTML =
    '<p>Memuat permintaan...</p>';

  usersEl.innerHTML =
    '<p>Memuat pengguna...</p>';


  /* -------------------------------------------------------
     REGISTRATION REQUESTS
  ------------------------------------------------------- */

  const {
    data: requests,
    error: requestError
  } = await supabaseClient

    .from('registration_requests')

    .select(
      'id, user_id, requested_role, status, reviewed_by, reviewed_at, created_at'
    )

    .eq(
      'status',
      'pending'
    )

    .order(
      'created_at',
      {
        ascending: false
      }
    );


  if (requestError) {

    console.error(requestError);

    requestsEl.innerHTML = `
      <p>
        Gagal memuat permintaan registrasi.
      </p>
    `;

  } else {

    $('#admin-request-count')
      .textContent =
      `${requests?.length || 0} permintaan menunggu persetujuan.`;


    if (!requests?.length) {

      requestsEl.innerHTML = `
        <p>
          Belum ada permintaan registrasi.
        </p>
      `;

    } else {

      const userIds =
        requests.map(
          request => request.user_id
        );


      const {
        data: requestProfiles
      } = await supabaseClient

        .from('profiles')

        .select(
          'id, username, full_name, email, requested_role'
        )

        .in(
          'id',
          userIds
        );


      const profileMap =
        Object.fromEntries(
          (requestProfiles || [])
            .map(profile =>
              [profile.id, profile]
            )
        );


      requestsEl.innerHTML =
        requests.map(request => {

          const profile =
            profileMap[request.user_id] || {};

          return `

            <div
              class="activity-row"
              style="padding:16px 0"
            >

              <div
                class="activity-copy"
                style="flex:1"
              >

                <strong>
                  ${profile.full_name || '-'}
                </strong>

                <small>

                  @${profile.username || '-'}
                  ·
                  ${profile.email || '-'}

                  · Meminta role:

                  <strong>
                    ${request.requested_role || '-'}
                  </strong>

                </small>

              </div>


              <div
                style="
                  display:flex;
                  gap:8px;
                "
              >

                <button
                  class="primary-button admin-approve"
                  data-id="${request.id}"
                >
                  Approve
                </button>

                <button
                  class="secondary-button admin-decline"
                  data-id="${request.id}"
                >
                  Decline
                </button>

              </div>

            </div>

          `;

        }).join('');


      $$('.admin-approve')
        .forEach(button => {

          button.addEventListener(
            'click',
            () =>
              approveRegistration(
                button.dataset.id
              )
          );

        });


      $$('.admin-decline')
        .forEach(button => {

          button.addEventListener(
            'click',
            () =>
              declineRegistration(
                button.dataset.id
              )
          );

        });

    }

  }


  /* -------------------------------------------------------
     USERS
  ------------------------------------------------------- */

  const {
    data: users,
    error: usersError
  } = await supabaseClient

    .from('profiles')

    .select(
      `
      id,
      username,
      full_name,
      email,
      requested_role,
      role,
      approval_status,
      created_at
      `
    )

    .order(
      'created_at',
      {
        ascending: false
      }
    );


  if (usersError) {

    console.error(usersError);

    usersEl.innerHTML = `
      <p>
        Gagal memuat pengguna.
      </p>
    `;

    return;

  }


  usersEl.innerHTML =
    users?.length

      ? users.map(user => `

          <div
            class="activity-row"
            style="padding:16px 0"
          >

            <div
              class="activity-copy"
              style="flex:1"
            >

              <strong>
                ${user.full_name || '-'}
              </strong>

              <small>

                @${user.username || '-'}
                ·
                ${user.email || '-'}

                · Status:
                ${user.approval_status || '-'}

                · Role:
                ${user.role || '-'}

              </small>

            </div>


            <select
              class="admin-role-select"
              data-id="${user.id}"
            >

              ${ALLOWED_ROLES
                .map(role => `

                  <option
                    value="${role}"
                    ${
                      user.role === role
                        ? 'selected'
                        : ''
                    }
                  >
                    ${role}
                  </option>

                `)
                .join('')}

            </select>

          </div>

        `).join('')

      : `
        <p>
          Belum ada pengguna.
        </p>
      `;


  $$('.admin-role-select')
    .forEach(select => {

      select.addEventListener(
        'change',
        () =>
          changeUserRole(
            select.dataset.id,
            select.value
          )
      );

    });

}


/* =========================================================
   APPROVE REGISTRATION
========================================================= */

async function approveRegistration(
  requestId
) {

  if (!isAdminProfile(currentProfile)) {

    toast('Akses Admin diperlukan.');

    return;

  }


  const {
    data: request,
    error: requestError
  } = await supabaseClient

    .from('registration_requests')

    .select(
      'id, user_id, requested_role, status'
    )

    .eq(
      'id',
      requestId
    )

    .single();


  if (requestError || !request) {

    console.error(requestError);

    toast(
      'Permintaan tidak ditemukan.'
    );

    return;

  }


  const {
    data: {
      user: adminUser
    }
  } =
    await supabaseClient.auth.getUser();


  const {
    error: profileError
  } =
    await supabaseClient

      .from('profiles')

      .update({

        role:
          request.requested_role,

        approval_status:
          'approved',

        approved_by:
          adminUser?.id || null,

        approved_at:
          new Date().toISOString()

      })

      .eq(
        'id',
        request.user_id
      );


  if (profileError) {

    console.error(profileError);

    toast(
      'Gagal menyetujui akun.'
    );

    return;

  }


  const {
    error: requestUpdateError
  } =
    await supabaseClient

      .from('registration_requests')

      .update({

        status:
          'approved',

        reviewed_by:
          adminUser?.id || null,

        reviewed_at:
          new Date().toISOString()

      })

      .eq(
        'id',
        requestId
      );


  if (requestUpdateError) {

    console.error(
      requestUpdateError
    );

    toast(
      'Profil disetujui, tetapi request gagal diperbarui.'
    );

    return;

  }


  toast(
    'Registrasi berhasil disetujui.'
  );

  await loadAdminPanel();

}


/* =========================================================
   DECLINE REGISTRATION
========================================================= */

async function declineRegistration(
  requestId
) {

  if (!isAdminProfile(currentProfile)) {

    toast('Akses Admin diperlukan.');

    return;

  }


  const {
    data: {
      user: adminUser
    }
  } =
    await supabaseClient.auth.getUser();


  const {
    data: request
  } =
    await supabaseClient

      .from('registration_requests')

      .select(
        'user_id'
      )

      .eq(
        'id',
        requestId
      )

      .single();


  if (!request) {

    toast(
      'Permintaan tidak ditemukan.'
    );

    return;

  }


  const {
    error: profileError
  } =
    await supabaseClient

      .from('profiles')

      .update({

        approval_status:
          'declined'

      })

      .eq(
        'id',
        request.user_id
      );


  if (profileError) {

    console.error(profileError);

    toast(
      'Gagal menolak akun.'
    );

    return;

  }


  const {
    error
  } =
    await supabaseClient

      .from('registration_requests')

      .update({

        status:
          'declined',

        reviewed_by:
          adminUser?.id || null,

        reviewed_at:
          new Date().toISOString()

      })

      .eq(
        'id',
        requestId
      );


  if (error) {

    console.error(error);

    toast(
      'Status request gagal diperbarui.'
    );

    return;

  }


  toast(
    'Registrasi ditolak.'
  );

  await loadAdminPanel();

}


/* =========================================================
   CHANGE USER ROLE
========================================================= */

async function changeUserRole(
  userId,
  newRole
) {

  if (!isAdminProfile(currentProfile)) {

    toast(
      'Akses Admin diperlukan.'
    );

    return;

  }


  if (!ALLOWED_ROLES.includes(newRole)) {

    toast(
      'Role tidak valid.'
    );

    return;

  }


  const {
    error
  } =
    await supabaseClient

      .from('profiles')

      .update({

        role:
          newRole

      })

      .eq(
        'id',
        userId
      );


  if (error) {

    console.error(error);

    toast(
      'Gagal mengubah role.'
    );

    return;

  }


  toast(
    `Role diubah menjadi ${newRole}.`
  );

  await loadAdminPanel();

}

/* =========================================================
   AUTH UI
========================================================= */

function showLogin() {

  $('#login-view')
    ?.classList.remove('hidden');

  $('#signup-view')
    ?.classList.add('hidden');

  $('#app-shell')
    ?.classList.add('auth-mode');

  $$('.view')
    .forEach(view => {

      view.classList.remove(
        'active'
      );

    });

}


function showSignup() {

  $('#login-view')
    ?.classList.add('hidden');

  $('#signup-view')
    ?.classList.remove('hidden');

  $('#app-shell')
    ?.classList.add('auth-mode');

  ensureSignupRoleField();

}


function showApp() {

  $('#login-view')
    ?.classList.add('hidden');

  $('#signup-view')
    ?.classList.add('hidden');

  $('#app-shell')
    ?.classList.remove('auth-mode');

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
      .trim();

  const password =
    $('#signup-password')
      ?.value;

  const requestedRole =
    $('#signup-role')
      ?.value;


  if (
    !fullName ||
    !username ||
    !email ||
    !password ||
    !requestedRole
  ) {

    toast(
      'Lengkapi semua data dan pilih role.'
    );

    return;

  }


  if (
    requestedRole === 'Admin'
  ) {

    toast(
      'Role Admin hanya dapat diberikan oleh Admin.'
    );

    return;

  }


  if (username.length < 3) {

    toast(
      'Username minimal 3 karakter.'
    );

    return;

  }


  if (
    !/^[a-z0-9._-]+$/.test(
      username
    )
  ) {

    toast(
      'Username hanya boleh menggunakan huruf, angka, titik, underscore, atau strip.'
    );

    return;

  }


  if (password.length < 6) {

    toast(
      'Password minimal 6 karakter.'
    );

    return;

  }


  /*
    IMPORTANT:

    Do NOT insert into profiles manually.

    The Supabase database trigger created earlier
    automatically creates:

    profiles
    +
    registration_requests

    from the metadata below.
  */

  const {
    data,
    error
  } =
    await supabaseClient.auth.signUp({

      email,

      password,

      options: {

        data: {

          full_name:
            fullName,

          username:
            username,

          requested_role:
            requestedRole

        }

      }

    });


  if (error) {

    console.error(error);

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


  /*
    If email confirmation is enabled,
    session will be null.

    If session exists, immediately sign out
    because approval is still required.
  */

  if (data.session) {

    await supabaseClient.auth.signOut();

  }


  $('#signup-name')
    .value = '';

  $('#signup-username')
    .value = '';

  $('#signup-email')
    .value = '';

  $('#signup-password')
    .value = '';

  if ($('#signup-role')) {

    $('#signup-role')
      .value = '';

  }


  toast(
    'Registrasi berhasil. Tunggu approval Admin.'
  );

  showLogin();

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


  if (!email || !password) {

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

    console.error(error);

    toast(
      error.message
    );

    return;

  }


  $('#login-email')
    .value = '';

  $('#login-password')
    .value = '';


  await loadUser();

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


  if (!user) {

    currentProfile = null;

    showLogin();

    return;

  }


  const {
    data: profile,
    error
  } =
    await supabaseClient

      .from('profiles')

      .select(
        `
        id,
        username,
        full_name,
        email,
        requested_role,
        role,
        approval_status
        `
      )

      .eq(
        'id',
        user.id
      )

      .single();


  if (error || !profile) {

    console.error(error);

    toast(
      'Profil user tidak ditemukan.'
    );

    await supabaseClient.auth
      .signOut();

    showLogin();

    return;

  }


  currentProfile =
    profile;


  /*
    APPROVAL GATE
  */

  if (
    profile.approval_status !==
    'approved'
  ) {

    await supabaseClient.auth
      .signOut();


    if (
      profile.approval_status ===
      'pending'
    ) {

      toast(
        'Akun masih menunggu approval Admin.'
      );

    } else if (
      profile.approval_status ===
      'declined'
    ) {

      toast(
        'Registrasi Anda ditolak Admin.'
      );

    } else {

      toast(
        'Akun belum disetujui.'
      );

    }


    showLogin();

    return;

  }


  /*
    DISPLAY USER
  */

  if ($('#user-name')) {

    $('#user-name')
      .textContent =
      profile.full_name;

  }


  if ($('#user-role')) {

    $('#user-role')
      .textContent =
      profile.role;

  }


  const initials =
    profile.full_name

      .split(' ')

      .filter(Boolean)

      .slice(0, 2)

      .map(
        word => word[0]
      )

      .join('')

      .toUpperCase();


  if ($('#user-avatar')) {

    $('#user-avatar')
      .textContent =
      initials || 'US';

  }


  if ($('#dashboard-greeting')) {

    $('#dashboard-greeting')
      .textContent =
      `Selamat pagi, ${profile.full_name.split(' ')[0]}.`;

  }


  ensureSignupRoleField();

  ensureAdminView();

  addAdminNavigation();

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

    console.error(error);

    toast(
      error.message
    );

    return;

  }


  currentProfile =
    null;


  $('#user-menu')
    ?.classList.add('hidden');


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

    'catalog',

    'admin'

  ];


  if (
    !validRoutes.includes(name)
  ) {

    name =
      'dashboard';

  }


  if (
    name === 'admin'
  ) {

    if (
      !isAdminProfile(
        currentProfile
      )
    ) {

      toast(
        'Akses Admin diperlukan.'
      );

      name =
        'dashboard';

    } else {

      ensureAdminView();

      loadAdminPanel();

    }

  }


  $$('.view')
    .forEach(view => {

      view.classList.toggle(

        'active',

        view.id === name

      );

    });


  $$('.nav-link')
    .forEach(link => {

      link.classList.toggle(

        'active',

        link.dataset.route === name

      );

    });


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
      'Katalog ruang',

    admin:
      'Manajemen pengguna'

  };


  if ($('#breadcrumb')) {

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

}


/* =========================================================
   DASHBOARD ACTIVITY
========================================================= */

function activity() {

  const el =
    $('#activity-list');

  if (!el) return;


  el.innerHTML =

    history

      .slice(0, 4)

      .map(row => `

        <div
          class="activity-row"
        >

          <div
            class="activity-icon"
          >
            ${row.icon}
          </div>

          <div
            class="activity-copy"
          >

            <strong>
              ${row.item}
            </strong>

            <small>
              ${row.room}
              · Hari ini,
              ${row.time}
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

  const search =
    $('#history-search');

  const statusFilter =
    $('#status-filter');

  const body =
    $('#history-body');

  if (!search || !statusFilter || !body) {
    return;
  }


  const q =
    search.value
      .toLowerCase();


  const filter =
    statusFilter.value;


  const rows =
    history.filter(row =>

      (
        filter === 'all' ||
        row.status === filter
      )

      &&

      `${row.item} ${row.room}`
        .toLowerCase()
        .includes(q)

    );


  body.innerHTML =

    rows

      .map(row => `

        <tr>

          <td>

            <div
              class="table-item"
            >

              <span
                class="mini-item"
              >
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
            Hari ini,
            ${row.time}
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

            <span
              class="sync"
            >

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
            style="
              text-align:center;
              padding:32px
            "
          >

            Tidak ada hasil
            yang cocok.

          </td>

        </tr>

      `;

}


/* =========================================================
   CATALOG
========================================================= */

function renderCatalog() {

  const grid =
    $('#catalog-grid');

  if (!grid) return;


  grid.innerHTML =

    catalog

      .map(
        ([name, detail, icon]) => `

          <article
            class="panel catalog-card"
          >

            <div
              class="item-thumb monitor-thumb"
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
    history.length -
    initialHistory.length;


  if (saved > 0) {

    if ($('#scan-total')) {

      $('#scan-total')
        .textContent =
        24 + saved;

    }


    if ($('#matched-total')) {

      $('#matched-total')
        .textContent =
        21 +

        history.filter(
          x =>
            !initialHistory.includes(x) &&
            x.status === 'matched'
        ).length;

    }

  }

}

/* =========================================================
   AUTH UI
========================================================= */

function showLogin() {

  $('#login-view')
    ?.classList.remove('hidden');

  $('#signup-view')
    ?.classList.add('hidden');

  $('#app-shell')
    ?.classList.add('auth-mode');

  $$('.view')
    .forEach(view => {

      view.classList.remove(
        'active'
      );

    });

}


function showSignup() {

  $('#login-view')
    ?.classList.add('hidden');

  $('#signup-view')
    ?.classList.remove('hidden');

  $('#app-shell')
    ?.classList.add('auth-mode');

  ensureSignupRoleField();

}


function showApp() {

  $('#login-view')
    ?.classList.add('hidden');

  $('#signup-view')
    ?.classList.add('hidden');

  $('#app-shell')
    ?.classList.remove('auth-mode');

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
      .trim();

  const password =
    $('#signup-password')
      ?.value;

  const requestedRole =
    $('#signup-role')
      ?.value;


  if (
    !fullName ||
    !username ||
    !email ||
    !password ||
    !requestedRole
  ) {

    toast(
      'Lengkapi semua data dan pilih role.'
    );

    return;

  }


  if (
    requestedRole === 'Admin'
  ) {

    toast(
      'Role Admin hanya dapat diberikan oleh Admin.'
    );

    return;

  }


  if (username.length < 3) {

    toast(
      'Username minimal 3 karakter.'
    );

    return;

  }


  if (
    !/^[a-z0-9._-]+$/.test(
      username
    )
  ) {

    toast(
      'Username hanya boleh menggunakan huruf, angka, titik, underscore, atau strip.'
    );

    return;

  }


  if (password.length < 6) {

    toast(
      'Password minimal 6 karakter.'
    );

    return;

  }


  /*
    IMPORTANT:

    Do NOT insert into profiles manually.

    The Supabase database trigger created earlier
    automatically creates:

    profiles
    +
    registration_requests

    from the metadata below.
  */

  const {
    data,
    error
  } =
    await supabaseClient.auth.signUp({

      email,

      password,

      options: {

        data: {

          full_name:
            fullName,

          username:
            username,

          requested_role:
            requestedRole

        }

      }

    });


  if (error) {

    console.error(error);

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


  /*
    If email confirmation is enabled,
    session will be null.

    If session exists, immediately sign out
    because approval is still required.
  */

  if (data.session) {

    await supabaseClient.auth.signOut();

  }


  $('#signup-name')
    .value = '';

  $('#signup-username')
    .value = '';

  $('#signup-email')
    .value = '';

  $('#signup-password')
    .value = '';

  if ($('#signup-role')) {

    $('#signup-role')
      .value = '';

  }


  toast(
    'Registrasi berhasil. Tunggu approval Admin.'
  );

  showLogin();

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


  if (!email || !password) {

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

    console.error(error);

    toast(
      error.message
    );

    return;

  }


  $('#login-email')
    .value = '';

  $('#login-password')
    .value = '';


  await loadUser();

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


  if (!user) {

    currentProfile = null;

    showLogin();

    return;

  }


  const {
    data: profile,
    error
  } =
    await supabaseClient

      .from('profiles')

      .select(
        `
        id,
        username,
        full_name,
        email,
        requested_role,
        role,
        approval_status
        `
      )

      .eq(
        'id',
        user.id
      )

      .single();


  if (error || !profile) {

    console.error(error);

    toast(
      'Profil user tidak ditemukan.'
    );

    await supabaseClient.auth
      .signOut();

    showLogin();

    return;

  }


  currentProfile =
    profile;


  /*
    APPROVAL GATE
  */

  if (
    profile.approval_status !==
    'approved'
  ) {

    await supabaseClient.auth
      .signOut();


    if (
      profile.approval_status ===
      'pending'
    ) {

      toast(
        'Akun masih menunggu approval Admin.'
      );

    } else if (
      profile.approval_status ===
      'declined'
    ) {

      toast(
        'Registrasi Anda ditolak Admin.'
      );

    } else {

      toast(
        'Akun belum disetujui.'
      );

    }


    showLogin();

    return;

  }


  /*
    DISPLAY USER
  */

  if ($('#user-name')) {

    $('#user-name')
      .textContent =
      profile.full_name;

  }


  if ($('#user-role')) {

    $('#user-role')
      .textContent =
      profile.role;

  }


  const initials =
    profile.full_name

      .split(' ')

      .filter(Boolean)

      .slice(0, 2)

      .map(
        word => word[0]
      )

      .join('')

      .toUpperCase();


  if ($('#user-avatar')) {

    $('#user-avatar')
      .textContent =
      initials || 'US';

  }


  if ($('#dashboard-greeting')) {

    $('#dashboard-greeting')
      .textContent =
      `Selamat pagi, ${profile.full_name.split(' ')[0]}.`;

  }


  ensureSignupRoleField();

  ensureAdminView();

  addAdminNavigation();

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

    console.error(error);

    toast(
      error.message
    );

    return;

  }


  currentProfile =
    null;


  $('#user-menu')
    ?.classList.add('hidden');


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

    'catalog',

    'admin'

  ];


  if (
    !validRoutes.includes(name)
  ) {

    name =
      'dashboard';

  }


  if (
    name === 'admin'
  ) {

    if (
      !isAdminProfile(
        currentProfile
      )
    ) {

      toast(
        'Akses Admin diperlukan.'
      );

      name =
        'dashboard';

    } else {

      ensureAdminView();

      loadAdminPanel();

    }

  }


  $$('.view')
    .forEach(view => {

      view.classList.toggle(

        'active',

        view.id === name

      );

    });


  $$('.nav-link')
    .forEach(link => {

      link.classList.toggle(

        'active',

        link.dataset.route === name

      );

    });


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
      'Katalog ruang',

    admin:
      'Manajemen pengguna'

  };


  if ($('#breadcrumb')) {

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

}


/* =========================================================
   DASHBOARD ACTIVITY
========================================================= */

function activity() {

  const el =
    $('#activity-list');

  if (!el) return;


  el.innerHTML =

    history

      .slice(0, 4)

      .map(row => `

        <div
          class="activity-row"
        >

          <div
            class="activity-icon"
          >
            ${row.icon}
          </div>

          <div
            class="activity-copy"
          >

            <strong>
              ${row.item}
            </strong>

            <small>
              ${row.room}
              · Hari ini,
              ${row.time}
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

  const search =
    $('#history-search');

  const statusFilter =
    $('#status-filter');

  const body =
    $('#history-body');

  if (!search || !statusFilter || !body) {
    return;
  }


  const q =
    search.value
      .toLowerCase();


  const filter =
    statusFilter.value;


  const rows =
    history.filter(row =>

      (
        filter === 'all' ||
        row.status === filter
      )

      &&

      `${row.item} ${row.room}`
        .toLowerCase()
        .includes(q)

    );


  body.innerHTML =

    rows

      .map(row => `

        <tr>

          <td>

            <div
              class="table-item"
            >

              <span
                class="mini-item"
              >
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
            Hari ini,
            ${row.time}
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

            <span
              class="sync"
            >

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
            style="
              text-align:center;
              padding:32px
            "
          >

            Tidak ada hasil
            yang cocok.

          </td>

        </tr>

      `;

}


/* =========================================================
   CATALOG
========================================================= */

function renderCatalog() {

  const grid =
    $('#catalog-grid');

  if (!grid) return;


  grid.innerHTML =

    catalog

      .map(
        ([name, detail, icon]) => `

          <article
            class="panel catalog-card"
          >

            <div
              class="item-thumb monitor-thumb"
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
    history.length -
    initialHistory.length;


  if (saved > 0) {

    if ($('#scan-total')) {

      $('#scan-total')
        .textContent =
        24 + saved;

    }


    if ($('#matched-total')) {

      $('#matched-total')
        .textContent =
        21 +

        history.filter(
          x =>
            !initialHistory.includes(x) &&
            x.status === 'matched'
        ).length;

    }

  }

}

/* =========================================================
   EVENT LISTENERS
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {


    /* -----------------------------------------------------
       AUTH ROLE FIELD
    ----------------------------------------------------- */

    ensureSignupRoleField();


    /* -----------------------------------------------------
       NAVIGATION
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       MOBILE MENU
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       CATALOG
    ----------------------------------------------------- */

    $('#show-catalog')
      ?.addEventListener(
        'click',
        () =>
          route('catalog')
      );


    $('#catalog-location')
      ?.addEventListener(
        'click',
        () =>
          route('scan')
      );


    /* -----------------------------------------------------
       CAMERA
    ----------------------------------------------------- */

    $('#camera-button')
      ?.addEventListener(
        'click',
        () => {

          stream
            ? stopCamera()
            : startCamera();

        }
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


    /* -----------------------------------------------------
       HISTORY
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       TRAINING
    ----------------------------------------------------- */

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
              ?.classList.toggle(
                'hidden',
                button.dataset.training === 'new'
              );


            $('#new-category-wrap')
              ?.classList.toggle(
                'hidden',
                button.dataset.training !== 'new'
              );

          }
        );

      });


    /* -----------------------------------------------------
       UPLOAD
    ----------------------------------------------------- */

    $('#drop-zone')
      ?.addEventListener(
        'click',
        () =>
          $('#photo-input')
            ?.click()
      );


    $('#photo-input')
      ?.addEventListener(
        'change',
        event => {

          const count =
            event.target.files.length;


          if ($('#photo-count')) {

            $('#photo-count')
              .textContent =

              count

                ? `${count} foto siap diunggah`

                : 'Belum ada foto dipilih';

          }

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
                ?.classList.add(
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
                ?.classList.remove(
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
            event.dataTransfer
              .files.length;


          if ($('#photo-count')) {

            $('#photo-count')
              .textContent =

              count

                ? `${count} foto siap diunggah`

                : 'Belum ada foto dipilih';

          }

        }
      );


    $('#submit-training')
      ?.addEventListener(
        'click',
        () => {

          const count =
            $('#photo-count')
              ?.textContent;


          if (
            !count ||
            count ===
            'Belum ada foto dipilih'
          ) {

            toast(
              'Tambahkan minimal 5 foto sebelum dikirim.'
            );

          } else {

            toast(
              'Data training dikirim untuk review admin.'
            );

          }

        }
      );


    /* -----------------------------------------------------
       EXPORT
    ----------------------------------------------------- */

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
                  type:
                    'text/csv'
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


          a.click();


          URL.revokeObjectURL(
            url
          );

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


    /* -----------------------------------------------------
       ENTER KEY — LOGIN
    ----------------------------------------------------- */

    $('#login-password')
      ?.addEventListener(
        'keydown',
        event => {

          if (
            event.key ===
            'Enter'
          ) {

            login();

          }

        }
      );


    /* -----------------------------------------------------
       ENTER KEY — SIGNUP
    ----------------------------------------------------- */

    $('#signup-password')
      ?.addEventListener(
        'keydown',
        event => {

          if (
            event.key ===
            'Enter'
          ) {

            signUp();

          }

        }
      );


    /* -----------------------------------------------------
       CONNECTION
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       ROUTING
    ----------------------------------------------------- */

    window.addEventListener(
      'hashchange',
      () =>
        route(
          location.hash.slice(1)
          || 'dashboard'
        )
    );


    /* -----------------------------------------------------
       AUTH STATE
    ----------------------------------------------------- */

    supabaseClient.auth
      .onAuthStateChange(
        async (
          event,
          session
        ) => {

          if (
            event ===
            'SIGNED_OUT'
          ) {

            stopAdminPolling();

            currentProfile =
              null;

            showLogin();

            return;

          }


          if (
            event ===
              'SIGNED_IN' &&
            session
          ) {

            await loadUser();

            startAdminPolling();

          }

        }
      );


    /* -----------------------------------------------------
       SERVICE WORKER
    ----------------------------------------------------- */

    if (
      'serviceWorker' in
      navigator
    ) {

      window.addEventListener(
        'load',
        () => {

          navigator.serviceWorker
            .register(
              './sw.js'
            )
            .catch(
              error =>
                console.error(
                  'Service worker error:',
                  error
                )
            );

        }
      );

    }


    /* -----------------------------------------------------
       INITIAL RENDER
    ----------------------------------------------------- */

    activity();

    renderHistory();

    renderCatalog();

    updateStats();

    setConnection();


    /* -----------------------------------------------------
       CHECK AUTHENTICATION
    ----------------------------------------------------- */

    loadUser();

  }
);
