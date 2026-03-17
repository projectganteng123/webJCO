/**
 * ============================================================
 *  JCOSASI — Music Player (Editor Laporan)
 *
 *  Perilaku:
 *  - Musik mulai diputar otomatis saat halaman dibuka
 *  - Klik 2x cepat → pause / lanjut musik
 *  - Klik 3x cepat → lagu acak berikutnya
 *
 *  Zone yang merespons klik:
 *  - Topbar (.topbar)  — kecuali: logo, teks, hamburger, btn-upload
 *  - Loading overlay (#lov) — kecuali: token card (#lovTokenCard)
 *
 *  Tombol musik (sudut kanan bawah) tetap berfungsi untuk
 *  pause/play dengan satu klik.
 * ============================================================
 */

(function () {
  'use strict';

  /* ════ Konfigurasi ════ */
  const MUSIC_FOLDER      = 'music/';
  const MUSIC_FILES       = ['music-1.mp3','music-2.mp3','music-3.mp3','music-4.mp3','music-5.mp3'];
  const PRELOAD_NEXT_WHEN = 30;       // mulai preload lagu berikut saat sisa N detik
  const FADE_DURATION_MS  = 1500;     // durasi crossfade ms
  const FADE_PAUSE_MS     = 400;      // durasi fade saat pause/resume
  const VOLUME            = 0.45;
  const STORAGE_KEY       = 'jcosasi_music_paused';
  const CLICK_WINDOW_MS   = 380;      // jendela waktu multi-klik

  /* ════ State ════ */
  let playlist        = [];
  let currentIdx      = 0;
  let currentAudio    = null;
  let nextAudio       = null;
  let isPaused        = false;   // pause oleh user (bukan autoplay-block)
  let preloadNextDone = false;
  let isTransitioning = false;

  /* ════ Helpers ════ */
  function buildPlaylist() {
    const arr = MUSIC_FILES.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function createAudio(src) {
    const a  = new Audio();
    a.volume = 0;
    a.preload = 'auto';
    a.src    = src;
    return a;
  }

  function fadeIn(audio, targetVol, ms) {
    audio.volume  = 0;
    const steps   = 40;
    const step    = targetVol / steps;
    const iv      = ms / steps;
    let   cur     = 0;
    const t = setInterval(() => {
      cur += step;
      if (cur >= targetVol) { audio.volume = targetVol; clearInterval(t); }
      else audio.volume = cur;
    }, iv);
    return t;
  }

  function fadeOut(audio, ms, cb) {
    const startV  = audio.volume;
    const steps   = 40;
    const step    = startV / steps;
    const iv      = ms / steps;
    let   cur     = startV;
    const t = setInterval(() => {
      cur -= step;
      if (cur <= 0) {
        audio.volume = 0;
        clearInterval(t);
        if (cb) cb();
      } else {
        audio.volume = cur;
      }
    }, iv);
    return t;
  }

  /* ════ Preload & playback ════ */
  function preloadNext() {
    if (preloadNextDone) return;
    preloadNextDone = true;
    const nextFileIdx = playlist[(currentIdx + 1) % playlist.length];
    const src = MUSIC_FOLDER + MUSIC_FILES[nextFileIdx];
    nextAudio = createAudio(src);
    nextAudio.load();
  }

  function attachTimeUpdate(audio) {
    audio.addEventListener('timeupdate', function () {
      if (!audio.duration || isNaN(audio.duration)) return;
      if (audio.duration - audio.currentTime <= PRELOAD_NEXT_WHEN && !preloadNextDone)
        preloadNext();
    });
  }

  /* ── Pindah ke lagu berikutnya (crossfade) ── */
  function playNext() {
    if (isTransitioning) return;
    isTransitioning  = true;
    currentIdx       = (currentIdx + 1) % playlist.length;
    preloadNextDone  = false;

    const oldAudio = currentAudio;

    if (nextAudio) {
      currentAudio = nextAudio;
      nextAudio    = null;
    } else {
      currentAudio = createAudio(MUSIC_FOLDER + MUSIC_FILES[playlist[currentIdx]]);
    }

    currentAudio.volume = 0;
    currentAudio.play().then(() => {
      if (!isPaused) fadeIn(currentAudio, VOLUME, FADE_DURATION_MS);
      attachTimeUpdate(currentAudio);
      isTransitioning = false;
    }).catch(err => {
      console.warn('[Music] playNext error:', err);
      isTransitioning = false;
    });

    if (oldAudio) {
      fadeOut(oldAudio, FADE_DURATION_MS, () => {
        oldAudio.pause();
        oldAudio.src = '';
      });
    }

    currentAudio.addEventListener('ended', () => playNext(), { once: true });
    updateUI();
  }

  /* ── Toggle pause / resume ── */
  function togglePause() {
    if (!currentAudio) return;
    if (isPaused) {
      // Resume
      isPaused = false;
      currentAudio.play().then(() => {
        fadeIn(currentAudio, VOLUME, FADE_PAUSE_MS);
      }).catch(() => {});
    } else {
      // Pause dengan fade out
      isPaused = true;
      fadeOut(currentAudio, FADE_PAUSE_MS, () => {
        currentAudio.pause();
      });
    }
    localStorage.setItem(STORAGE_KEY, isPaused ? '1' : '0');
    updateUI();
  }

  /* ── Mulai putar lagu pertama ── */
  function startPlayback() {
    playlist        = buildPlaylist();
    currentIdx      = 0;
    preloadNextDone = false;

    const src    = MUSIC_FOLDER + MUSIC_FILES[playlist[0]];
    currentAudio = createAudio(src);

    currentAudio.addEventListener('canplay', function onCan() {
      currentAudio.removeEventListener('canplay', onCan);
      currentAudio.play().then(() => {
        if (!isPaused) fadeIn(currentAudio, VOLUME, FADE_DURATION_MS);
        attachTimeUpdate(currentAudio);
      }).catch(() => {
        // Autoplay blocked — tunggu interaksi pertama
        setupAutoplayUnlock();
      });
    }, { once: true });

    currentAudio.addEventListener('ended', () => playNext(), { once: true });
    currentAudio.load();
    updateUI();
  }

  function setupAutoplayUnlock() {
    const unlock = () => {
      if (!currentAudio || isPaused) return;
      currentAudio.play().then(() => {
        fadeIn(currentAudio, VOLUME, FADE_DURATION_MS);
        attachTimeUpdate(currentAudio);
        off();
      }).catch(() => {});
    };
    const off = () => {
      document.removeEventListener('click',      unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown',    unlock);
    };
    document.addEventListener('click',      unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('keydown',    unlock, { once: true });
  }

  /* ════ UI tombol musik ════ */
  function buildUI() {
    // Baca preferensi pause dari sesi sebelumnya
    if (localStorage.getItem(STORAGE_KEY) === '1') isPaused = true;

    const btn = document.createElement('button');
    btn.id        = 'musicToggle';
    btn.className = 'music-toggle';
    btn.setAttribute('aria-label', 'Toggle musik');
    btn.setAttribute('title', 'Klik: pause/play  |  2× klik: pause/play  |  3× klik: lagu berikutnya');
    btn.addEventListener('click', togglePause);
    document.body.appendChild(btn);
    updateUI();
  }

  function updateUI() {
    const btn = document.getElementById('musicToggle');
    if (!btn) return;
    btn.innerHTML = isPaused ? iconPaused() : iconPlaying();
    btn.classList.toggle('is-playing', !isPaused);
  }

  function iconPlaying() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>`;
  }
  function iconPaused() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="23" y1="9" x2="17" y2="15"/>
      <line x1="17" y1="9" x2="23" y2="15"/>
    </svg>`;
  }

  /* ════ Hint toast ════ */
  function showHint(msg) {
    const old = document.getElementById('musicHint');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'musicHint';
    el.textContent = msg;
    el.style.cssText = [
      'position:fixed','top:68px','left:50%',
      'transform:translateX(-50%) translateY(-8px)',
      'background:rgba(61,26,94,0.88)','color:#FAFAF8',
      'font-family:var(--fb,sans-serif)','font-size:.82rem','font-weight:500',
      'padding:7px 20px','border-radius:99px','pointer-events:none',
      'z-index:99999','opacity:0',
      'transition:opacity .22s ease,transform .22s ease',
      'white-space:nowrap','box-shadow:0 4px 20px rgba(61,26,94,.28)',
      'backdrop-filter:blur(8px)',
    ].join(';');
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.opacity   = '1';
      el.style.transform = 'translateX(-50%) translateY(0)';
    }));
    setTimeout(() => {
      el.style.opacity   = '0';
      el.style.transform = 'translateX(-50%) translateY(-8px)';
      setTimeout(() => el.remove(), 280);
    }, 1800);
  }

  /* ════ Multi-klik handler (shared) ════
     2× → pause/play
     3× → skip ke lagu berikutnya
  ════ */
  function makeMultiClickHandler(ignoredSelectors) {
    let count = 0;
    let timer = null;
    return function (e) {
      // Abaikan jika klik mengenai elemen yang di-ignore
      if (ignoredSelectors.some(sel => e.target.closest(sel))) return;
      count++;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (count === 2) {
          togglePause();
          showHint(isPaused ? '⏸ Musik dijeda' : '▶ Musik dilanjutkan');
        } else if (count >= 3) {
          playNext();
          showHint('⏭ Lagu berikutnya');
        }
        count = 0;
      }, CLICK_WINDOW_MS);
    };
  }

  /* ════ Pasang listener ke zona klik ════ */
  function setupClickZones() {
    // ── Zona 1: Topbar ──
    // Abaikan: logo wrap, teks logo, status dot, btn upload, hamburger
    const topbar = document.querySelector('.topbar');
    if (topbar) {
      topbar.addEventListener('click', makeMultiClickHandler([
        '.tb-logo', '.tb-lt', '.tb-ls', '.tb-li',   // logo & teks
        '.tb-ham', '#btnHam',                         // hamburger
        '.btn-upload', '#btnUpload',                  // tombol upload
        '.tb-st', '#statusDot', '#statusTxt',         // status dot
        '#musicToggle',                               // tombol musik itu sendiri
      ]));
      topbar.style.cursor = 'default'; // hint visual bahwa area ini interaktif
    }

    // ── Zona 2: Loading overlay — kecuali token card ──
    const lov = document.getElementById('lov');
    if (lov) {
      lov.addEventListener('click', makeMultiClickHandler([
        '#lovTokenCard',      // seluruh token card (input, button, dll)
        '#musicToggle',
      ]));
    }
  }

  /* ════ Entry point ════ */
  function init() {
    buildUI();
    startPlayback();
    setupClickZones();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
