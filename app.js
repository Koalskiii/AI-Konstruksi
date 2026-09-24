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