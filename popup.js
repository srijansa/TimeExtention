(() => {
    const $ = id => document.getElementById(id);
    const startBtn = $('startBtn');
    const pauseBtn = $('pauseBtn');
    const resetBtn = $('resetBtn');
    const timerEl = $('timer');
    const statusEl = $('status');

    let intervalId = null;
    let elapsedMs = 0;
    let running = false;
    let lastStart = null;

    const STORAGE_KEYS = ['elapsedMs', 'running', 'lastStart'];

    function formatTime(ms) {
        const totalSec = Math.floor(ms / 1000);
        const hh = Math.floor(totalSec / 3600).toString().padStart(2, '0');
        const mm = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
        const ss = (totalSec % 60).toString().padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    }

    function updateDisplay() {
        const now = Date.now();
        const current = elapsedMs + (running && lastStart ? now - lastStart : 0);
        timerEl.textContent = formatTime(current);
        statusEl.textContent = running ? 'Running' : 'Paused';
        startBtn.setAttribute('aria-pressed', String(running));
        pauseBtn.setAttribute('aria-pressed', String(!running));
    }

    function startInterval() {
        if (intervalId) return;
        intervalId = setInterval(updateDisplay, 250);
    }

    function stopInterval() {
        if (!intervalId) return;
        clearInterval(intervalId);
        intervalId = null;
    }

    function saveState() {
        if (window.chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ elapsedMs, running, lastStart });
        } else {
            localStorage.setItem('elapsedMs', String(elapsedMs));
            localStorage.setItem('running', String(running));
            localStorage.setItem('lastStart', lastStart ? String(lastStart) : '');
        }
    }

    function loadState() {
        if (window.chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(STORAGE_KEYS, data => {
                elapsedMs = Number(data.elapsedMs || 0);
                running = Boolean(data.running);
                lastStart = data.lastStart ? Number(data.lastStart) : null;
                if (running && lastStart) {
                    // check ---
                } else {
                    running = false;
                    lastStart = null;
                }

                if (running) startInterval();
                updateDisplay();
            });
        } else {
            elapsedMs = Number(localStorage.getItem('elapsedMs') || 0);
            running = localStorage.getItem('running') === 'true';
            lastStart = localStorage.getItem('lastStart') ? Number(localStorage.getItem('lastStart')) : null;
            if (running && lastStart) startInterval();
            updateDisplay();
        }
    }

    startBtn.addEventListener('click', () => {
        if (running) return;
        running = true;
        lastStart = Date.now();
        startInterval();
        saveState();
        updateDisplay();
    });

    pauseBtn.addEventListener('click', () => {
        if (!running) return;
        elapsedMs += Date.now() - lastStart;
        running = false;
        lastStart = null;
        stopInterval();
        saveState();
        updateDisplay();
    });

    resetBtn.addEventListener('click', () => {
        elapsedMs = 0;
        running = false;
        lastStart = null;
        stopInterval();
        saveState();
        updateDisplay();
    });
    document.addEventListener('DOMContentLoaded', loadState);
})();