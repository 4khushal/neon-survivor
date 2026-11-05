import { UPGRADES } from './upgrades.js';
import { audio } from './audio.js';

export class UIManager {
  constructor() {
    this.overlay = document.getElementById('ui-overlay');
    this.screens = {};
    this.hud = null;
    this.toastEl = null;
    this.activeScreen = null;
    this.callbacks = {};
    this.init();
  }

  init() {
    this.createScreens();
    this.createHUD();
    this.createToast();
    this.bindGlobalKeys();
  }

  createScreens() {
    this.screens.start = this.createStartScreen();
    this.screens.pause = this.createPauseScreen();
    this.screens.upgrade = this.createUpgradeScreen();
    this.screens.gameover = this.createGameOverScreen();

    Object.values(this.screens).forEach(screen => {
      this.overlay.appendChild(screen);
    });
  }

  createScreen(id, title, subtitle) {
    const screen = document.createElement('div');
    screen.id = `screen-${id}`;
    screen.className = 'screen';
    screen.setAttribute('role', 'dialog');
    screen.setAttribute('aria-modal', 'true');
    screen.setAttribute('aria-labelledby', `${id}-title`);

    screen.innerHTML = `
      <h1 id="${id}-title">${title}</h1>
      <p class="subtitle">${subtitle}</p>
      <div class="screen-content"></div>
    `;
    return screen;
  }

  createStartScreen() {
    const screen = this.createScreen('start', 'NEON SURVIVOR', 'Survive the arena. Collect XP. Upgrade. Repeat.');

    const content = screen.querySelector('.screen-content');
    content.innerHTML = `
      <div class="controls-list" id="start-controls">
        <div class="control-item"><span class="control-desc">Move</span><span class="control-key">WASD / Arrows</span></div>
        <div class="control-item"><span class="control-desc">Aim</span><span class="control-key">Mouse</span></div>
        <div class="control-item"><span class="control-desc">Shoot</span><span class="control-key">Left Click / Hold</span></div>
        <div class="control-item"><span class="control-desc">Pause</span><span class="control-key">Esc</span></div>
        <div class="control-item"><span class="control-desc">Mute</span><span class="control-key">M</span></div>
      </div>
      <button class="btn btn-primary" id="btn-start" type="button">Start Game</button>
      <div class="stats" style="margin-top: 20px;">
        <div class="stat">
          <span class="stat-value" id="high-score">0</span>
          <span class="stat-label">High Score</span>
        </div>
      </div>
    `;

    screen.querySelector('#btn-start').addEventListener('click', () => {
      audio.play('menuSelect');
      this.hideScreen('start');
      this.callbacks.onStart?.();
    });

    return screen;
  }

  createPauseScreen() {
    const screen = this.createScreen('pause', 'PAUSED', 'Game is paused');

    const content = screen.querySelector('.screen-content');
    content.innerHTML = `
      <button class="btn btn-primary" id="btn-resume" type="button" style="margin-bottom: 12px;">Resume</button>
      <button class="btn btn-secondary" id="btn-quit" type="button">Quit to Menu</button>
    `;

    screen.querySelector('#btn-resume').addEventListener('click', () => {
      audio.play('menuSelect');
      this.hideScreen('pause');
      this.callbacks.onResume?.();
    });

    screen.querySelector('#btn-quit').addEventListener('click', () => {
      audio.play('menuSelect');
      this.hideScreen('pause');
      this.callbacks.onQuit?.();
    });

    return screen;
  }

  createUpgradeScreen() {
    const screen = this.createScreen('upgrade', 'LEVEL UP', 'Choose an upgrade');

    const content = screen.querySelector('.screen-content');
    content.innerHTML = `
      <div class="upgrade-grid" id="upgrade-grid" role="listbox" aria-label="Available upgrades"></div>
    `;

    return screen;
  }

  createGameOverScreen() {
    const screen = this.createScreen('gameover', 'GAME OVER', 'Your run has ended');

    const content = screen.querySelector('.screen-content');
    content.innerHTML = `
      <div class="stats" id="final-stats"></div>
      <button class="btn btn-primary" id="btn-restart" type="button" style="margin-bottom: 12px;">Play Again</button>
      <button class="btn btn-secondary" id="btn-menu" type="button">Main Menu</button>
    `;

    screen.querySelector('#btn-restart').addEventListener('click', () => {
      audio.play('menuSelect');
      this.hideScreen('gameover');
      this.callbacks.onRestart?.();
    });

    screen.querySelector('#btn-menu').addEventListener('click', () => {
      audio.play('menuSelect');
      this.hideScreen('gameover');
      this.showScreen('start');
    });

    return screen;
  }

  createHUD() {
    this.hud = document.createElement('div');
    this.hud.className = 'hud';
    this.hud.innerHTML = `
      <div class="hud-top">
        <div class="hud-stat">
          <span class="hud-stat-value" id="hud-score">0</span>
          <span class="hud-stat-label">Score</span>
        </div>
        <div class="hud-level">
          <span class="hud-level-badge" id="hud-level">LV 1</span>
        </div>
        <div class="hud-stat" style="align-items: flex-end;">
          <span class="hud-stat-value" id="hud-timer">00:00</span>
          <span class="hud-stat-label">Time</span>
        </div>
      </div>
      <div class="hud-weapon" id="hud-weapon" style="margin-top: 8px; font-family: 'Orbitron', sans-serif; font-size: 0.85rem; color: var(--neon-violet); text-shadow: 0 0 8px rgba(179,0,255,0.5);"></div>
      <div class="hud-health" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Health">
        <div class="hud-health-fill" id="hud-health-fill" style="width: 100%"></div>
      </div>
      <div class="hud-xp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Experience">
        <div class="hud-xp-fill" id="hud-xp-fill" style="width: 0%"></div>
      </div>
      <div class="hud-controls">
        <button class="hud-btn" id="hud-pause" type="button" aria-label="Pause">⏸ Pause</button>
        <button class="hud-btn" id="hud-mute" type="button" aria-label="Mute" aria-pressed="false">🔊 Sound</button>
      </div>
    `;

    this.overlay.appendChild(this.hud);

    this.hud.querySelector('#hud-pause').addEventListener('click', () => {
      audio.play('menuSelect');
      this.callbacks.onPause?.();
    });

    this.hud.querySelector('#hud-mute').addEventListener('click', (e) => {
      const muted = audio.toggleMute();
      e.target.textContent = muted ? '🔇 Muted' : '🔊 Sound';
      e.target.setAttribute('aria-pressed', muted);
      audio.play('menuSelect');
    });
  }

  createToast() {
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'toast';
    this.toastEl.setAttribute('role', 'status');
    this.toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.toastEl);
  }

  bindGlobalKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.activeScreen === 'pause') {
          this.hideScreen('pause');
          this.callbacks.onResume?.();
        } else if (this.activeScreen === 'upgrade') {
        } else if (!this.activeScreen || this.activeScreen === 'game') {
          this.callbacks.onPause?.();
        }
      }
    });
  }

  showScreen(id) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    if (this.screens[id]) {
      this.screens[id].classList.add('active');
      this.activeScreen = id;
      const focusable = this.screens[id].querySelector('button, [tabindex="0"]');
      focusable?.focus();
    }
  }

  hideScreen(id) {
    if (this.screens[id]) {
      this.screens[id].classList.remove('active');
      if (this.activeScreen === id) this.activeScreen = null;
    }
  }

  hideAllScreens() {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    this.activeScreen = 'game';
  }

  _formatTime(seconds) {
    const t = typeof seconds === 'number' && isFinite(seconds) && seconds >= 0 ? seconds : 0;
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  updateHUD(state) {
    if (!this.hud) return;

    const healthFill = this.hud.querySelector('#hud-health-fill');
    const xpFill = this.hud.querySelector('#hud-xp-fill');
    const scoreEl = this.hud.querySelector('#hud-score');
    const levelEl = this.hud.querySelector('#hud-level');
    const timerEl = this.hud.querySelector('#hud-timer');
    const weaponEl = this.hud.querySelector('#hud-weapon');

    if (healthFill) healthFill.style.width = `${Math.max(0, Math.min(100, (state.health / state.maxHealth) * 100))}%`;
    if (xpFill) xpFill.style.width = `${Math.max(0, Math.min(100, state.xpProgress * 100))}%`;
    if (scoreEl) scoreEl.textContent = state.score.toLocaleString();
    if (levelEl) levelEl.textContent = `LV ${state.level}`;
    if (weaponEl && state.weaponName) weaponEl.textContent = state.weaponName;

    if (timerEl) timerEl.textContent = this._formatTime(state.time);

    this.hud.querySelector('#hud-health-fill').parentElement.setAttribute('aria-valuenow', Math.round((state.health / state.maxHealth) * 100));
    this.hud.querySelector('#hud-xp-fill').parentElement.setAttribute('aria-valuenow', Math.round(state.xpProgress * 100));
  }

  showUpgradeChoices(choices, upgradeManager) {
    const grid = this.screens.upgrade.querySelector('#upgrade-grid');
    grid.innerHTML = '';

    // Filter out max-level upgrades - don't render them at all
    const availableChoices = choices.filter(upgrade => {
      const level = upgradeManager.getUpgradeLevel(upgrade.id);
      return level < upgrade.maxLevel;
    });

    availableChoices.forEach((upgrade) => {
      const level = upgradeManager.getUpgradeLevel(upgrade.id);
      const maxLevel = upgrade.maxLevel;

      const card = document.createElement('button');
      card.className = 'upgrade-card';
      card.setAttribute('role', 'option');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-upgrade-id', upgrade.id);
      card.innerHTML = `
        <div class="upgrade-icon">${upgrade.icon}</div>
        <div class="upgrade-name">${upgrade.name}</div>
        <div class="upgrade-desc">${upgrade.description.replace('\\n', '<br>')}</div>
        <div style="margin-top: 8px; font-size: 0.65rem; color: var(--text-dim);">
          Level ${level + 1} / ${maxLevel}
        </div>
      `;

      card.addEventListener('click', () => {
        audio.play('menuSelect');
        this.callbacks.onUpgradeChoose?.(upgrade.id);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          audio.play('menuSelect');
          this.callbacks.onUpgradeChoose?.(upgrade.id);
        }
      });

      grid.appendChild(card);
    });

    this.showScreen('upgrade');
  }

  showGameOver(stats) {
    const container = this.screens.gameover.querySelector('#final-stats');
    container.innerHTML = `
      <div class="stat">
        <span class="stat-value">${stats.score.toLocaleString()}</span>
        <span class="stat-label">Score</span>
      </div>
      <div class="stat">
        <span class="stat-value">${stats.kills}</span>
        <span class="stat-label">Kills</span>
      </div>
      <div class="stat">
        <span class="stat-value">${stats.level}</span>
        <span class="stat-label">Level</span>
      </div>
      <div class="stat">
        <span class="stat-value">${this._formatTime(stats.time)}</span>
        <span class="stat-label">Time</span>
      </div>
    `;
    this.showScreen('gameover');
  }

  updateHighScore(score) {
    const el = this.screens.start.querySelector('#high-score');
    if (el) el.textContent = score.toLocaleString();
  }

  showToast(message) {
    this.toastEl.textContent = message;
    this.toastEl.classList.add('show');
    setTimeout(() => this.toastEl.classList.remove('show'), 2500);
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  getActiveScreen() {
    return this.activeScreen;
  }

  setMuteButton(muted) {
    const btn = this.hud?.querySelector('#hud-mute');
    if (btn) {
      btn.textContent = muted ? '🔇 Muted' : '🔊 Sound';
      btn.setAttribute('aria-pressed', muted);
    }
  }
}