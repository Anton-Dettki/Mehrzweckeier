(function () {
  const images = window.__MEHRZWECKEIER_IMAGES__ || {};
  const aehmSrc = window.__MEHRZWECKEIER_AEHM__ || '';
  const stage = document.querySelector('.stage');
  const merzImage = document.getElementById('merzImage');
  const speech = document.querySelector('.speech');
  const speechText = document.getElementById('speechText');
  const wpm = document.getElementById('wpm');
  const streak = document.getElementById('streak');
  const muteButton = document.getElementById('muteButton');
  const volumeSlider = document.getElementById('volumeSlider');
  const aehmAudio = aehmSrc ? new Audio(aehmSrc) : null;

  const STORAGE_KEY_MUTED = 'mehrzweckeier-muted';
  const STORAGE_KEY_VOLUME = 'mehrzweckeier-volume';
  const DEFAULT_VOLUME = 0.3;

  if (!stage || !merzImage || !speech || !speechText || !wpm || !streak) {
    return;
  }

  let speechTimer;
  let applauseTimer;
  let lickTimer;
  let moodBeforeLick = 'normal';
  let muted = false;
  let volume = DEFAULT_VOLUME;

  if (aehmAudio) {
    aehmAudio.preload = 'auto';
  }

  function loadAudioPrefs() {
    try {
      const storedMuted = localStorage.getItem(STORAGE_KEY_MUTED);
      const storedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
      muted = storedMuted === 'true';
      if (storedVolume !== null) {
        const parsed = Number(storedVolume);
        if (!Number.isNaN(parsed)) {
          volume = Math.min(1, Math.max(0, parsed));
        }
      }
    } catch {
      // localStorage may be unavailable in some webview contexts.
    }
  }

  function saveAudioPrefs() {
    try {
      localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
      localStorage.setItem(STORAGE_KEY_VOLUME, String(volume));
    } catch {
      // Ignore persistence failures.
    }
  }

  function applyAudioPrefs() {
    if (aehmAudio) {
      aehmAudio.volume = muted ? 0 : volume;
    }

    if (volumeSlider) {
      volumeSlider.value = String(Math.round(volume * 100));
    }

    if (muteButton) {
      muteButton.classList.toggle('is-muted', muted);
      muteButton.setAttribute('aria-pressed', String(muted));
      muteButton.title = muted ? 'Ton einschalten' : 'Ton stummschalten';
      muteButton.setAttribute('aria-label', muted ? 'Ton einschalten' : 'Ton stummschalten');
    }
  }

  function playQuoteSound() {
    if (!aehmAudio || muted || volume <= 0) {
      return;
    }

    aehmAudio.volume = volume;
    aehmAudio.currentTime = 0;
    void aehmAudio.play().catch(() => {
      // Webview may block playback until the panel has been interacted with.
    });
  }

  function setMuted(nextMuted) {
    muted = nextMuted;
    applyAudioPrefs();
    saveAudioPrefs();
  }

  function setVolume(nextVolume) {
    volume = Math.min(1, Math.max(0, nextVolume));
    if (volume > 0 && muted) {
      muted = false;
    }
    applyAudioPrefs();
    saveAudioPrefs();
  }

  if (muteButton) {
    muteButton.addEventListener('click', () => {
      setMuted(!muted);
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', () => {
      setVolume(Number(volumeSlider.value) / 100);
    });
  }

  loadAudioPrefs();
  applyAudioPrefs();

  function setMood(mood) {
    const safeMood = mood && images[mood] ? mood : 'normal';
    stage.dataset.mood = mood === 'disabled' ? 'disabled' : safeMood;
    if (images[safeMood]) {
      merzImage.src = images[safeMood];
    }
  }

  function shouldSuppressLick() {
    const mood = stage.dataset.mood;
    return mood === 'turbo' || mood === 'speaking' || !speech.hidden;
  }

  function clearLick() {
    clearTimeout(lickTimer);
  }

  function lickEgg() {
    if (shouldSuppressLick()) {
      return;
    }

    clearLick();
    if (stage.dataset.mood !== 'licking') {
      moodBeforeLick = stage.dataset.mood || 'normal';
    }
    setMood('licking');

    lickTimer = setTimeout(() => {
      if (stage.dataset.mood === 'licking' && !shouldSuppressLick()) {
        setMood(moodBeforeLick);
      }
    }, 1800);
  }

  function setStats(stats) {
    if (!stats) {
      return;
    }

    wpm.textContent = `BIP-Beitrag: ${stats.wpm} WPM`;
    streak.textContent = `Streak: ${stats.streak}`;
    stage.classList.toggle('is-disabled', !stats.enabled);
  }

  function say(text, mood, duration = 7500) {
    clearTimeout(speechTimer);
    clearLick();
    speechText.textContent = text;
    speech.hidden = false;
    speech.classList.add('is-visible');
    setMood(mood || 'speaking');
    playQuoteSound();

    speechTimer = setTimeout(() => {
      speech.classList.remove('is-visible');
      setTimeout(() => {
        speech.hidden = true;
      }, 180);
      if (stage.dataset.mood !== 'turbo') {
        setMood('normal');
      }
    }, duration);
  }

  function applaud(text) {
    clearTimeout(applauseTimer);
    setMood('applaud');
    stage.classList.add('is-applauding');
    say(text, 'applaud', 4200);

    applauseTimer = setTimeout(() => {
      stage.classList.remove('is-applauding');
      if (stage.dataset.mood !== 'turbo') {
        setMood('normal');
      }
    }, 1200);
  }

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || typeof message !== 'object') {
      return;
    }

    setStats(message.stats);

    switch (message.type) {
      case 'state':
        // Update numbers always, but only force mood for turbo/disabled transitions.
        // Continuous typing must not wipe speech/applaud animations.
        if (message.mood === 'turbo' || message.mood === 'disabled') {
          clearLick();
          setMood(message.mood);
        } else if (
          message.mood === 'normal' &&
          (stage.dataset.mood === 'turbo' || stage.dataset.mood === 'disabled')
        ) {
          setMood('normal');
        }
        if (message.stats?.enabled) {
          stage.classList.remove('is-disabled');
        }
        break;
      case 'say':
        say(message.text, message.mood);
        break;
      case 'applaud':
        applaud(message.text);
        break;
      case 'lick':
        if (!message.stats?.turbo) {
          lickEgg();
        }
        break;
      case 'turbo':
        clearLick();
        setMood(message.mood);
        if (message.text) {
          say(message.text, message.mood, 3600);
        }
        break;
      case 'reset':
        clearTimeout(speechTimer);
        clearTimeout(applauseTimer);
        clearTimeout(lickTimer);
        speech.hidden = true;
        speech.classList.remove('is-visible');
        stage.classList.remove('is-applauding');
        setMood(message.mood);
        break;
    }
  });
}());
