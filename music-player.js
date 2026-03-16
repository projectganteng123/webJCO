/**
 * ============================================================
 *  JCOSASI — Music Player
 *  - Memutar 1 dari 5 lagu secara acak saat halaman dibuka
 *  - Preload 15 detik pertama agar langsung bisa diputar
 *  - Lagu berikutnya di-load saat lagu saat ini hampir selesai
 *  - Tombol mute/unmute yang tidak mengganggu tampilan
 * ============================================================
 *
 *  CARA PAKAI:
 *  1. Letakkan file musik di folder /music/ dengan nama:
 *     music-1.mp3, music-2.mp3, ..., music-5.mp3
 *  2. Tambahkan script ini di index.html sebelum </body>:
 *     <script src="music-player.js"></script>
 *  3. Tambahkan CSS dari music-player.css ke style.css Anda
 * ============================================================
 */

(function () {
  'use strict';

  /* ── Konfigurasi ── */
  const MUSIC_FOLDER = 'music/';          // folder musik relatif dari index.html
  const MUSIC_FILES  = [                  // nama file musik
    'music-1.mp3',
    'music-2.mp3',
    'music-3.mp3',
    'music-4.mp3',
    'music-5.mp3',
  ];
  const PRELOAD_SECONDS    = 15;          // detik awal yang di-preload sebelum play
  const PRELOAD_NEXT_WHEN  = 30;          // mulai preload lagu berikutnya saat sisa X detik
  const FADE_DURATION_MS   = 1500;        // durasi fade in/out dalam ms
  const VOLUME             = 0.45;        // volume default (0–1)
  const STORAGE_KEY        = 'jcosasi_music_muted'; // localStorage key untuk preferensi mute

  /* ── State ── */
  let playlist     = [];   // urutan acak indeks lagu
  let currentIdx   = 0;    // posisi saat ini di playlist
  let currentAudio = null; // Audio object yang sedang diputar
  let nextAudio    = null; // Audio object yang sudah dipreload (lagu berikutnya)
  let isMuted      = false;
  let preloadNextDone = false;
  let isTransitioning = false;

  /* ── Buat urutan playlist acak ── */
  function buildPlaylist() {
    const arr = MUSIC_FILES.map((_, i) => i);
    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ── Buat Audio object dengan pengaturan dasar ── */
  function createAudio(src) {
    const a = new Audio();
    a.volume  = isMuted ? 0 : VOLUME;
    a.preload = 'auto';
    a.src     = src;
    return a;
  }

  /* ── Fade volume in ── */
  function fadeIn(audio, targetVol, durationMs) {
    audio.volume = 0;
    const steps    = 40;
    const interval = durationMs / steps;
    const step     = targetVol / steps;
    let   current  = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= targetVol) {
        audio.volume = targetVol;
        clearInterval(timer);
      } else {
        audio.volume = current;
      }
    }, interval);
    return timer;
  }

  /* ── Fade volume out ── */
  function fadeOut(audio, durationMs, cb) {
    const startVol = audio.volume;
    const steps    = 40;
    const interval = durationMs / steps;
    const step     = startVol / steps;
    let   current  = startVol;
    const timer = setInterval(() => {
      current -= step;
      if (current <= 0) {
        audio.volume = 0;
        clearInterval(timer);
        if (cb) cb();
      } else {
        audio.volume = current;
      }
    }, interval);
    return timer;
  }

  /* ── Preload lagu berikutnya ── */
  function preloadNext() {
    if (preloadNextDone) return;
    preloadNextDone = true;

    const nextFileIdx = playlist[(currentIdx + 1) % playlist.length];
    const src = MUSIC_FOLDER + MUSIC_FILES[nextFileIdx];
    nextAudio = createAudio(src);
    // Cukup panggil load() — browser akan mulai buffer tanpa play
    nextAudio.load();
    console.log('[MusicPlayer] Preloading next:', MUSIC_FILES[nextFileIdx]);
  }

  /* ── Pindah ke lagu berikutnya dengan crossfade ── */
  function playNext() {
    if (isTransitioning) return;
    isTransitioning = true;

    // Pindah indeks
    currentIdx = (currentIdx + 1) % playlist.length;
    preloadNextDone = false;

    const oldAudio = currentAudio;

    // Gunakan nextAudio jika sudah siap, kalau tidak buat baru
    if (nextAudio) {
      currentAudio = nextAudio;
      nextAudio = null;
    } else {
      const fileIdx = playlist[currentIdx];
      currentAudio  = createAudio(MUSIC_FOLDER + MUSIC_FILES[fileIdx]);
    }

    // Set volume sesuai state mute
    currentAudio.volume = isMuted ? 0 : 0; // mulai dari 0 untuk fade in

    currentAudio.play().then(() => {
      if (!isMuted) fadeIn(currentAudio, VOLUME, FADE_DURATION_MS);
      attachTimeUpdateListener(currentAudio);
      isTransitioning = false;
    }).catch(err => {
      console.warn('[MusicPlayer] Gagal play next:', err);
      isTransitioning = false;
    });

    // Fade out dan stop lagu lama
    if (oldAudio) {
      fadeOut(oldAudio, FADE_DURATION_MS, () => {
        oldAudio.pause();
        oldAudio.src = '';
      });
    }

    // Set event ended untuk lagu ini
    currentAudio.addEventListener('ended', () => playNext(), { once: true });

    // Update visualizer UI
    updatePlayerUI();
  }

  /* ── Pantau waktu untuk trigger preload & auto-next ── */
  function attachTimeUpdateListener(audio) {
    audio.addEventListener('timeupdate', function handler() {
      if (!audio.duration || isNaN(audio.duration)) return;

      const remaining = audio.duration - audio.currentTime;

      // Preload lagu berikutnya saat sisa PRELOAD_NEXT_WHEN detik
      if (remaining <= PRELOAD_NEXT_WHEN && !preloadNextDone) {
        preloadNext();
      }
    });
  }

  /* ── Mulai putar lagu pertama ── */
  function startPlayback() {
    playlist    = buildPlaylist();
    currentIdx  = 0;
    preloadNextDone = false;

    const fileIdx = playlist[currentIdx];
    const src     = MUSIC_FOLDER + MUSIC_FILES[fileIdx];

    currentAudio = createAudio(src);

    // Preload PRELOAD_SECONDS detik pertama lalu play
    currentAudio.addEventListener('canplay', function onCanPlay() {
      currentAudio.removeEventListener('canplay', onCanPlay);
      currentAudio.play().then(() => {
        console.log('[MusicPlayer] Mulai:', MUSIC_FILES[fileIdx]);
        if (!isMuted) fadeIn(currentAudio, VOLUME, FADE_DURATION_MS);
        attachTimeUpdateListener(currentAudio);
      }).catch(err => {
        // Autoplay diblokir browser → tunggu interaksi user pertama
        console.info('[MusicPlayer] Autoplay diblokir, menunggu interaksi pengguna.');
        setupAutoplayUnlock();
      });
    }, { once: true });

    // Event ketika lagu selesai
    currentAudio.addEventListener('ended', () => playNext(), { once: true });

    // Mulai load
    currentAudio.load();
    updatePlayerUI();
  }

  /* ── Fallback: play saat user pertama kali interaksi ── */
  function setupAutoplayUnlock() {
    const unlock = () => {
      if (!currentAudio) return;
      currentAudio.play().then(() => {
        if (!isMuted) fadeIn(currentAudio, VOLUME, FADE_DURATION_MS);
        attachTimeUpdateListener(currentAudio);
        document.removeEventListener('click',     unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('keydown',   unlock);
        console.log('[MusicPlayer] Autoplay unlocked oleh interaksi user.');
      }).catch(() => {});
    };
    document.addEventListener('click',     unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('keydown',   unlock, { once: true });
  }

  /* ── Toggle mute ── */
  function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem(STORAGE_KEY, isMuted ? '1' : '0');

    if (currentAudio) {
      if (isMuted) {
        fadeOut(currentAudio, 600);
      } else {
        fadeIn(currentAudio, VOLUME, 600);
      }
    }
    updatePlayerUI();
  }

  /* ── Bangun UI tombol player ── */
  function buildUI() {
    // Baca preferensi mute dari localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === '1') isMuted = true;

    const btn = document.createElement('button');
    btn.id = 'musicToggle';
    btn.className = 'music-toggle';
    btn.setAttribute('aria-label', 'Toggle musik');
    btn.setAttribute('title', 'Musik on/off');
    btn.innerHTML = getMuteIcon();

    btn.addEventListener('click', toggleMute);
    document.body.appendChild(btn);
  }

  /* ── Update tampilan ikon ── */
  function updatePlayerUI() {
    const btn = document.getElementById('musicToggle');
    if (!btn) return;
    btn.innerHTML = getMuteIcon();
    // Animasi denyut hanya saat musik aktif
    if (!isMuted) {
      btn.classList.add('is-playing');
    } else {
      btn.classList.remove('is-playing');
    }
  }

  /* ── SVG ikon speaker ── */
  function getMuteIcon() {
    if (isMuted) {
      // Speaker dengan X (muted)
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <line x1="23" y1="9" x2="17" y2="15"/>
        <line x1="17" y1="9" x2="23" y2="15"/>
      </svg>`;
    }
    // Speaker dengan gelombang suara (playing)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>`;
  }

  /* ── Entry point ── */
  function init() {
    buildUI();
    startPlayback();
  }

  // Tunggu DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
