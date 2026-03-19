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

  /* ════ Inject CSS panel langsung ke <head> ════ */
  function injectCSS() {
    if (document.getElementById('musicPanelStyle')) return;
    const style = document.createElement('style');
    style.id = 'musicPanelStyle';
    style.textContent = `
      .music-panel {
        position: fixed;
        left: 50%;
        transform: translateX(-50%) translateY(-12px);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(61,26,94,0.92);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 99px;
        padding: 6px 10px;
        box-shadow: 0 8px 40px rgba(61,26,94,.45), 0 2px 8px rgba(0,0,0,.2);
        opacity: 0;
        pointer-events: none;
        transition: opacity .26s cubic-bezier(.4,0,.2,1),
                    transform .26s cubic-bezier(.4,0,.2,1);
      }
      .music-panel.visible {
        opacity: 1 !important;
        pointer-events: auto !important;
        transform: translateX(-50%) translateY(0) !important;
      }
      .music-panel.hiding {
        opacity: 0 !important;
        pointer-events: none !important;
        transform: translateX(-50%) translateY(-12px) !important;
        transition: opacity .20s cubic-bezier(.4,0,.2,1),
                    transform .20s cubic-bezier(.4,0,.2,1);
      }
      .mp-btn {
        display: flex; align-items: center; justify-content: center;
        width: 36px; height: 36px;
        border: none; border-radius: 50%;
        background: transparent;
        color: rgba(255,255,255,.85);
        cursor: pointer;
        transition: background .18s ease, transform .15s ease;
        flex-shrink: 0;
      }
      .mp-btn svg { width: 16px; height: 16px; pointer-events: none; }
      .mp-btn:hover { background: rgba(255,255,255,.15); color: #fff; }
      .mp-btn:active { transform: scale(0.9); }
      .mp-btn.mp-main {
        width: 42px; height: 42px;
        background: rgba(255,255,255,.12);
      }
      .mp-btn.mp-main svg { width: 18px; height: 18px; }
      .mp-btn.mp-main:hover { background: rgba(255,255,255,.25); }
      @media (max-width: 480px) {
        .music-panel { padding: 5px 8px; gap: 2px; }
        .mp-btn { width: 32px; height: 32px; }
        .mp-btn.mp-main { width: 38px; height: 38px; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    if (document.getElementById('musicPanel')) return;
    injectCSS();

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

    // Posisikan tepat di bawah navbar / topbar
    const nav = document.querySelector(NAV_SEL);
    if (nav) {
      const rect = nav.getBoundingClientRect();
      panel.style.top = (rect.bottom + 8) + 'px';
    }

    // Pastikan tidak sedang dalam state hiding, lalu trigger transisi
    panel.classList.remove('hiding');
    void panel.offsetWidth; // reflow
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

    // Elemen yang WAJIB diabaikan karena punya fungsi sendiri
    const HARD_IGNORED = IS_INPUT
      ? ['#btnHam','.tb-ham','.btn-upload','#btnUpload','#musicPanel','.mp-btn']
      : ['#hamburger','.hamburger','#musicPanel','.mp-btn'];

    /* ── Double-click di mana saja dalam navbar/topbar → panel ── */
    let clickCount = 0, clickTimer = null;
    document.addEventListener('click', function (e) {
      // Klik harus berada di dalam nav/topbar
      if (!nav.contains(e.target)) return;
      // Abaikan hanya elemen yang punya fungsi kritis
      if (HARD_IGNORED.some(sel => e.target.closest(sel))) return;

      clickCount++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        if (clickCount === 1 && !IS_INPUT && !hasStarted) {
          startPlayback();
        } else if (clickCount >= 2) {
          showPanel();
        }
        clickCount = 0;
      }, CLICK_WINDOW_MS);
    });


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
