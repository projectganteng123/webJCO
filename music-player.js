/**
 * ============================================================
 *  JCOSASI — Music Player
 *
 *  index.html (landing page)
 *  - Musik TIDAK diputar saat halaman pertama dibuka
 *  - Klik PERTAMA pada navbar → mulai putar
 *  - Double-click navbar / hover lama (>700ms) / overscroll ke atas
 *    → tampilkan panel kontrol ⏮ ⏸/▶ ⏭
 *
 *  index_input.html (editor laporan)
 *  - Musik LANGSUNG diputar saat loading overlay (#lov) aktif
 *  - Double-click topbar / hover lama / overscroll → panel kontrol
 *
 *  Panel kontrol:
 *  - Mini-bar di bawah navbar/topbar
 *  - Tombol: ⏮ | ⏸/▶ | ⏭
 *  - Auto-hide setelah 4 detik tidak ada interaksi
 *  - Klik di luar → hilang
 *  - Tidak ada tombol speaker / mute
 * ============================================================
 */

(function () {
  'use strict';

  /* ════ Konfigurasi ════ */
  const MUSIC_FOLDER      = 'music/';
  const MUSIC_FILES       = ['music-1.mp3','music-2.mp3','music-3.mp3','music-4.mp3','music-5.mp3'];
  const PRELOAD_NEXT_WHEN = 30;
  const FADE_DURATION_MS  = 1500;
  const FADE_PAUSE_MS     = 400;
  const VOLUME            = 0.45;
  const STORAGE_KEY       = 'jcosasi_music_paused';
  const HOVER_TRIGGER_MS  = 700;
  const CLICK_WINDOW_MS   = 380;

  /* ════ Deteksi halaman ════ */
  const IS_INPUT = !!document.querySelector('.topbar');
  const NAV_SEL  = IS_INPUT ? '.topbar' : '#navbar';

  /* ════ State ════ */
  let playlist        = [];
  let currentIdx      = 0;
  let currentAudio    = null;
  let nextAudio       = null;
  let isPaused        = false;
  let hasStarted      = false;
  let preloadNextDone = false;
  let isTransitioning = false;

  /* ════ Helpers audio ════ */
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
    audio.volume = 0;
    const steps  = 40, step = targetVol / steps, iv = ms / steps;
    let   cur    = 0;
    const t = setInterval(() => {
      cur += step;
      if (cur >= targetVol) { audio.volume = targetVol; clearInterval(t); }
      else audio.volume = cur;
    }, iv);
    return t;
  }

  function fadeOut(audio, ms, cb) {
    const startV = audio.volume;
    const steps  = 40, step = startV / steps, iv = ms / steps;
    let   cur    = startV;
    const t = setInterval(() => {
      cur -= step;
      if (cur <= 0) { audio.volume = 0; clearInterval(t); if (cb) cb(); }
      else audio.volume = cur;
    }, iv);
    return t;
  }

  function preloadNext() {
    if (preloadNextDone) return;
    preloadNextDone = true;
    nextAudio = createAudio(MUSIC_FOLDER + MUSIC_FILES[playlist[(currentIdx + 1) % playlist.length]]);
    nextAudio.load();
  }

  function attachTimeUpdate(audio) {
    audio.addEventListener('timeupdate', function () {
      if (!audio.duration || isNaN(audio.duration)) return;
      if (audio.duration - audio.currentTime <= PRELOAD_NEXT_WHEN && !preloadNextDone)
        preloadNext();
    });
  }

  /* ════ Playback ════ */
  function startPlayback() {
    if (hasStarted) return;
    hasStarted = true;
    playlist   = buildPlaylist();
    currentIdx = 0;

    currentAudio = createAudio(MUSIC_FOLDER + MUSIC_FILES[playlist[0]]);
    currentAudio.addEventListener('canplay', function onCan() {
      currentAudio.removeEventListener('canplay', onCan);
      currentAudio.play()
        .then(() => { if (!isPaused) fadeIn(currentAudio, VOLUME, FADE_DURATION_MS); attachTimeUpdate(currentAudio); })
        .catch(() => setupAutoplayUnlock());
    }, { once: true });
    currentAudio.addEventListener('ended', () => playNext(), { once: true });
    currentAudio.load();
    updatePanel();
  }

  function setupAutoplayUnlock() {
    const unlock = () => {
      if (!currentAudio || isPaused) return;
      currentAudio.play()
        .then(() => { fadeIn(currentAudio, VOLUME, FADE_DURATION_MS); attachTimeUpdate(currentAudio); off(); })
        .catch(() => {});
    };
    const off = () => {
      document.removeEventListener('click',      unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click',      unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
  }

  function playNext() {
    if (isTransitioning) return;
    isTransitioning = true;
    currentIdx      = (currentIdx + 1) % playlist.length;
    preloadNextDone = false;

    const old    = currentAudio;
    currentAudio = nextAudio || createAudio(MUSIC_FOLDER + MUSIC_FILES[playlist[currentIdx]]);
    nextAudio    = null;
    currentAudio.volume = 0;

    currentAudio.play()
      .then(() => { if (!isPaused) fadeIn(currentAudio, VOLUME, FADE_DURATION_MS); attachTimeUpdate(currentAudio); isTransitioning = false; })
      .catch(() => { isTransitioning = false; });

    if (old) fadeOut(old, FADE_DURATION_MS, () => { old.pause(); old.src = ''; });
    currentAudio.addEventListener('ended', () => playNext(), { once: true });
    updatePanel();
  }

  function playPrev() {
    if (!currentAudio) return;
    // > 3 detik → restart; ≤ 3 detik → lagu sebelumnya
    if (currentAudio.currentTime > 3) {
      currentAudio.currentTime = 0;
      if (isPaused) { isPaused = false; }
      fadeIn(currentAudio, VOLUME, FADE_PAUSE_MS);
      updatePanel();
      return;
    }
    if (isTransitioning) return;
    isTransitioning = true;
    currentIdx      = (currentIdx - 1 + playlist.length) % playlist.length;
    preloadNextDone = false;

    const old    = currentAudio;
    currentAudio = createAudio(MUSIC_FOLDER + MUSIC_FILES[playlist[currentIdx]]);
    nextAudio    = null;
    currentAudio.volume = 0;

    currentAudio.play()
      .then(() => { if (!isPaused) fadeIn(currentAudio, VOLUME, FADE_DURATION_MS); attachTimeUpdate(currentAudio); isTransitioning = false; })
      .catch(() => { isTransitioning = false; });

    if (old) fadeOut(old, FADE_DURATION_MS, () => { old.pause(); old.src = ''; });
    currentAudio.addEventListener('ended', () => playNext(), { once: true });
    updatePanel();
  }

  function togglePause() {
    if (!currentAudio) { startPlayback(); return; }
    if (isPaused) {
      isPaused = false;
      currentAudio.play().then(() => fadeIn(currentAudio, VOLUME, FADE_PAUSE_MS)).catch(() => {});
    } else {
      isPaused = true;
      fadeOut(currentAudio, FADE_PAUSE_MS, () => currentAudio.pause());
    }
    localStorage.setItem(STORAGE_KEY, isPaused ? '1' : '0');
    updatePanel();
  }

  /* ════ Panel kontrol ════ */
  let panelHideTimer = null;

  function buildPanel() {
    if (document.getElementById('musicPanel')) return;

    const panel = document.createElement('div');
    panel.id        = 'musicPanel';
    panel.className = 'music-panel';
    panel.setAttribute('role', 'toolbar');
    panel.setAttribute('aria-label', 'Kontrol musik');
    panel.innerHTML = `
      <button class="mp-btn" id="mpPrev" title="Sebelumnya / Ulang">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="19 20 9 12 19 4 19 20"/>
          <line x1="5" y1="19" x2="5" y2="5"/>
        </svg>
      </button>
      <button class="mp-btn mp-main" id="mpPlayPause" title="Pause / Play">
        <svg id="mpIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></svg>
      </button>
      <button class="mp-btn" id="mpNext" title="Berikutnya">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 4 15 12 5 20 5 4"/>
          <line x1="19" y1="4" x2="19" y2="20"/>
        </svg>
      </button>`;

    document.body.appendChild(panel);

    const stopProp = e => e.stopPropagation();
    panel.addEventListener('click', stopProp);

    document.getElementById('mpPrev').addEventListener('click', () => {
      if (!hasStarted) startPlayback(); else playPrev();
      resetPanelHide();
    });
    document.getElementById('mpPlayPause').addEventListener('click', () => {
      if (!hasStarted) startPlayback(); else togglePause();
      resetPanelHide();
    });
    document.getElementById('mpNext').addEventListener('click', () => {
      if (!hasStarted) startPlayback(); else playNext();
      resetPanelHide();
    });

    // Klik di luar panel → hilang
    document.addEventListener('click', function handler(e) {
      const p = document.getElementById('musicPanel');
      if (p && !p.contains(e.target)) hidePanel();
    });

    updatePanel();
  }

  function showPanel() {
    buildPanel();
    const panel = document.getElementById('musicPanel');
    if (!panel) return;

    // Pastikan tidak sedang dalam state hiding
    panel.classList.remove('hiding');
    // Trigger reflow agar transisi dari hiding ke visible berjalan
    void panel.offsetWidth;
    panel.classList.add('visible');
    updatePanel();
    resetPanelHide();
  }

  function hidePanel() {
    clearTimeout(panelHideTimer);
    const panel = document.getElementById('musicPanel');
    if (!panel || !panel.classList.contains('visible')) return;

    // Animasi fade ke atas, lalu hapus visible setelah transisi selesai
    panel.classList.add('hiding');
    panel.classList.remove('visible');
    setTimeout(() => {
      if (panel) panel.classList.remove('hiding');
    }, 250);
  }

  function resetPanelHide() {
    clearTimeout(panelHideTimer);
    panelHideTimer = setTimeout(hidePanel, 4000);
  }

  function updatePanel() {
    const icon = document.getElementById('mpIcon');
    if (!icon) return;
    if (isPaused || !hasStarted) {
      icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    } else {
      icon.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>';
    }
  }

  /* ════ Trigger panel ════ */
  function setupPanelTriggers() {
    const nav = document.querySelector(NAV_SEL);
    if (!nav) return;

    const IGNORED = IS_INPUT
      ? ['.tb-logo','.tb-lt','.tb-ls','.tb-li','.tb-ham','#btnHam',
         '.btn-upload','#btnUpload','.tb-st','#statusDot','#statusTxt',
         '#musicPanel','.mp-btn']
      : ['.nav-logo','#navLogoWrap','.nav-links','.nav-links a',
         '.hamburger','#hamburger','#mobileMenu','#musicPanel','.mp-btn'];

    /* ── Double-click navbar → panel ── */
    let clickCount = 0, clickTimer = null;
    nav.addEventListener('click', function (e) {
      if (IGNORED.some(sel => e.target.closest(sel))) return;
      clickCount++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        if (clickCount === 1 && !IS_INPUT && !hasStarted) {
          // index.html: klik pertama → mulai putar saja
          startPlayback();
        } else if (clickCount >= 2) {
          showPanel();
        }
        clickCount = 0;
      }, CLICK_WINDOW_MS);
    });

    /* ── Hover lama pada navbar → panel ── */
    let hoverTimer = null;
    nav.addEventListener('mouseenter', () => {
      hoverTimer = setTimeout(() => showPanel(), HOVER_TRIGGER_MS);
    });
    nav.addEventListener('mouseleave', () => clearTimeout(hoverTimer));

    /* ── Overscroll: tarik ke bawah saat sudah di posisi atas → panel ── */
    let touchStartY = 0;
    window.addEventListener('touchstart', e => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      if (window.scrollY > 10) return;
      const dy = e.touches[0].clientY - touchStartY;
      if (dy > 60) {
        showPanel();
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });
  }

  /* ════ Autoplay saat loading overlay (index_input.html) ════ */
  function setupInputAutoplay() {
    if (!IS_INPUT) return;
    if (localStorage.getItem(STORAGE_KEY) === '1') isPaused = true;

    // Coba langsung
    startPlayback();

    // Fallback jika autoplay diblokir: coba saat interaksi pertama di overlay
    const lov = document.getElementById('lov');
    if (lov) {
      lov.addEventListener('click', () => {
        if (!hasStarted) startPlayback();
      }, { once: true });
    }
  }

  /* ════ Entry point ════ */
  function init() {
    if (IS_INPUT) {
      setupInputAutoplay();
    }
    setupPanelTriggers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
