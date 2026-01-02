(() => {
    const $ = id => document.getElementById(id);
    let startBtnb, pauseBtn, resetBtn, timerEl, statusEl, presetButtons, modeToggle, lapsList, clearLapsBtn;

    let intervalId = null;
    let elapsedMs = 0;
    let running = false;
    let lastStart = null;
    let laps = [];
    let mode = 'stopwatch'; 
    let durationMs = 0;
    let selectedPreset = null;
    const STORAGE_KEYS = ['elapsedMs', 'running', 'lastStart', 'laps', 'mode', 'durationMs', 'selectPreset'];

    function formatTime(ms) {
        ms = Math.max(0, Math.floor(ms));
        const totalSec = Math.floor(ms / 1000);
        const hh = Math.floor(totalSec / 3600).toString().padStart(2, '0');
        const mm = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
        const ss = (totalSec % 60).toString().padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    }

    function updateDisplay() {
        const now = Date.now();
        if (mode === 'stopwatch') {
            const current = elapsedMs + (running && lastStart ? now - lastStart : 0);
            timerEl.textContent = formatTime(current);
            statusEl.textContent = running ? 'Running (stopwatch)' : 'Paused'; 
        } else {
            const passed = elapsedMs + (running && lastStart ? now - lastStart : 0);
            let remaining = Math.max(0, durationMs - passed);
            timerEl.textContent = formatTime(remaining);
            if (remaining === 0 && running) {
                running = false;
                lastStart = null;
                stopInterval();
                statusEl.textContent = 'Finished!';
                saveState();
            } else {
                statusEl.textContent = runnning ? 'Running (countdown)' : 'Paused';
            }
        }
        startBtnb.setAttribute('aria-pressed', String(running));
        pauseBtn.setAttribute('aria-pressed', String(!running));
        modeToggle.setAttribute('aria-pressed', String(mode === 'countdown' ? 'true' : 'false'));
        renderLaps();
        updatePresetActive();
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
            localStorage.setItem('mode', mode);
            localStorage.setItem('durationMs', String(durationMs));
            localStorage.setItem('selectedPreset', selectedPreset ? String(selectedPreset) : '');
        }
    }

    function loadState() {
        if (window.chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(STORAGE_KEYS, data => {
                elapsedMs = Number(data.elapsedMs || 0);
                running = Boolean(data.running);
                lastStart = data.lastStart ? Number(data.lastStart) : null;
                laps = data.laps ? JSON.parse(data.laps) : [];
                mode = data.mode || 'stopwatch';
                durationMs = Number(data.durationMs || 0);
                selectedPreset = data.selectedPreset || null;

                // Normalize running for countdown: if finished, stop
                if (mode === 'countdown' && durationMs > 0) {
                    const passed = elapsedMs + (running && lastStart ? Date.now() - lastStart : 0);
                    if (passed >= durationMs) {
                        running = false;
                        lastStart = null;
                    }
                }

                if (running) startInterval();
                updateDisplay();
            });
        } else {
            elapsedMs = Number(localStorage.getItem('elapsedMs') || 0);
            running = localStorage.getItem('running') === 'true';
            lastStart = localStorage.getItem('lastStart') ? Number(localStorage.getItem('lastStart')) : null;
            laps = JSON.parse(localStorage.getItem('laps') || '[]');
            mode = localStorage.getItem('mode') || 'stopwatch';
            durationMs = Number(localStorage.getItem('durationMs') || 0);
            selectedPreset = localStorage.getItem('selectedPreset') || null;
            if (mode === 'countdown' && durationMs > 0) {
                const passed = elapsedMs + (running && lastStart ? Date.now() - lastStart : 0);
                if (passed >= durationMs) {
                    running = false;
                    lastStart = null;
                }
            }
            if (running) startInterval();
            updateDisplay();
        }
    }

    function start() {
        if (running) return;
        // If countdown and no duration set, do nothing
        if (mode === 'countdown' && durationMs <= 0) {
            statusEl.textContent = 'Select a preset first';
            return;
        }
        running = true;
        lastStart = Date.now();
        startInterval();
        saveState();
        updateDisplay();
    }

    function pause() {
        if (!running) return;
        elapsedMs += Date.now() - lastStart;
        running = false;
        lastStart = null;
        stopInterval();
        saveState();
        updateDisplay();
    }

    function reset() {
        elapsedMs = 0;
        running = false;
        lastStart = null;
        stopInterval();
        saveState();
        updateDisplay();
    }

    function recordLap() {
        const now = Date.now();
        if (mode === 'stopwatch') {
            const current = elapsedMs + (running && lastStart ? now - lastStart : 0);
            laps.unshift(current); 
        } else {
            const passed = elapsedMs + (running && lastStart ? now - lastStart : 0);
            const remaining = Math.max(0, durationMs - passed);
            laps.unshift(remaining);
        }
        saveState();
        renderLaps();
    }

    function clearLaps() {
        laps = [];
        saveState();
        renderLaps();
    }

    function applyPreset(button) {
        const dur = Number(button.dataset.duration || 0);
        durationMs = dur;
        selectedPreset = button.id;
        elapsedMs = 0;
        lastStart = null;
        running = false;
        stopInterval();
        saveState();
        updateDisplay();
    }

    function toggleMode() {
        mode = mode === 'stopwatch' ? 'countdown' : 'stopwatch';
        saveState();
        updateDisplay();
    }

    function renderLaps() {
        lapsList.innerHTML = '';
        if (!laps || laps.length === 0) {
            const li = document.createElement('li');
            li.className = 'lap-empty';
            li.textContent = 'No laps';
            lapsList.appendChild(li);
            return;
        }

        laps.forEach((ms, idx) => {
            const li = document.createElement('li');
            li.className = 'lap';
            const label = document.createElement('span');
            label.className = 'lap-label';
            label.textContent = `#${laps.length - idx}`;
            const time = document.createElement('span');
            time.className = 'lap-time';
            time.textContent = formatTime(ms);
            li.appendChild(label);
            li.appendChild(time);
            lapsList.appendChild(li);
        });
    }

    function updatePresetActive() {
        presetButtons.forEach(btn => {
            if (btn.id === selectedPreset) {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            }
        });
    }

    function wireEvents() {
        startBtn.addEventListener('click', start);
        pauseBtn.addEventListener('click', pause);
        resetBtn.addEventListener('click', reset);
        lapBtn.addEventListener('click', () => {
            if (!running) return;
            recordLap();
        });

        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => applyPreset(btn));
        });

        modeToggle.addEventListener('click', () => {
            toggleMode();
        });

        clearLapsBtn.addEventListener('click', clearLaps);
    }

    function initElements() {
        startBtn = $('startBtn');
        pauseBtn = $('pauseBtn');
        resetBtn = $('resetBtn');
        lapBtn = $('lapBtn');
        timerEl = $('timer');
        statusEl = $('status');
        presetButtons = Array.from(document.querySelectorAll('.preset-btn'));
        modeToggle = $('modeToggle');
        lapsList = $('lapsList');
        clearLapsBtn = $('clearLapsBtn');
    }

    function init() {
        initElements();
        wireEvents();
        loadState();
    }

    document.addEventListener('DOMContentLoaded', init);
})();