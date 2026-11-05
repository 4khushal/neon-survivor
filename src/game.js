import { Player } from './player.js';
import { EnemyManager, ENEMY_TYPES } from './enemy.js';
import { ProjectileManager, Projectile } from './projectile.js';
import { particles } from './particles.js';
import { UpgradeManager, UPGRADES } from './upgrades.js';
import { audio } from './audio.js';
import { UIManager } from './ui.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();

    this.ui = new UIManager();
    this.player = new Player(this.canvasWidth, this.canvasHeight);
    this.enemyManager = new EnemyManager();
    this.projectileManager = new ProjectileManager();
    this.upgradeManager = new UpgradeManager();

    this.input = {
      up: false, down: false, left: false, right: false,
      shooting: false, mouseX: 0, mouseY: 0
    };

    this.state = 'menu';
    this.lastTime = 0;
    this.animationId = null;
    this.isPaused = false;
    this.isTabHidden = false;

    this.score = 0;
    this.kills = 0;
    this.gameTime = 0;
    this.difficulty = 1;
    this.highScore = parseInt(localStorage.getItem('neon-survivor-highscore') || '0', 10);

    this.xpOrbs = [];
    this.powerUps = [];

    this._lastHudUpdate = 0;
    // Track active timers for cleanup
    this._activeTimers = new Set();

    this.bindUI();
    this.bindInput();
    this.bindResize();
    this.bindVisibility();

    this.ui.updateHighScore(this.highScore);
    this.ui.showScreen('start');
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvasWidth = container.clientWidth || window.innerWidth;
    this.canvasHeight = container.clientHeight || window.innerHeight;
    this.canvas.width = this.canvasWidth * window.devicePixelRatio;
    this.canvas.height = this.canvasHeight * window.devicePixelRatio;
    this.canvas.style.width = this.canvasWidth + 'px';
    this.canvas.style.height = this.canvasHeight + 'px';
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  bindResize() {
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  bindVisibility() {
    document.addEventListener('visibilitychange', () => {
      this.isTabHidden = document.hidden;
      if (this.isTabHidden && this.state === 'playing') {
        this.pause();
      }
    });
  }

  bindUI() {
    this.ui.on('onStart', () => this.start());
    this.ui.on('onPause', () => this.pause());
    this.ui.on('onResume', () => this.resume());
    this.ui.on('onRestart', () => this.restart());
    this.ui.on('onQuit', () => this.quitToMenu());
    this.ui.on('onUpgradeChoose', (id) => this.chooseUpgrade(id));

    this.upgradeManager.onLevelUp(() => {
      this.clearMovement(); // Clear any stuck keys when upgrade screen opens
      this.ui.showUpgradeChoices(this.upgradeManager.pendingChoices, this.upgradeManager);
    });
  }

  bindInput() {
    const handleKey = (e, pressed) => {
      if (this.ui.getActiveScreen() === 'upgrade') return;

      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.input.up = pressed; break;
        case 'KeyS': case 'ArrowDown': this.input.down = pressed; break;
        case 'KeyA': case 'ArrowLeft': this.input.left = pressed; break;
        case 'KeyD': case 'ArrowRight': this.input.right = pressed; break;
        case 'KeyM':
          if (pressed) {
            const muted = audio.toggleMute();
            this.ui.setMuteButton(muted);
          }
          break;
      }
      if (pressed) e.preventDefault();
    };

    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));

    // Clear movement on window blur
    window.addEventListener('blur', () => this.clearMovement());
    // visibilitychange handled in bindVisibility()

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.input.mouseX = e.clientX - rect.left;
      this.input.mouseY = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.input.shooting = true;
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.input.shooting = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.input.shooting = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  clearMovement() {
    this.input.up = false;
    this.input.down = false;
    this.input.left = false;
    this.input.right = false;
    this.input.shooting = false;
  }

  // Timer tracking for proper cleanup
  _trackTimer(timerId) {
    this._activeTimers.add(timerId);
    return timerId;
  }

  _clearAllTimers() {
    for (const timerId of this._activeTimers) {
      clearTimeout(timerId);
    }
    this._activeTimers.clear();
  }

  start() {
    this.resetGame();
    this.state = 'playing';
    this.ui.hideAllScreens();
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame((ts) => this.loop(ts));
  }

  restart() {
    this.resetGame();
    this.state = 'playing';
    this.ui.hideAllScreens();
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame((ts) => this.loop(ts));
  }

  quitToMenu() {
    this.state = 'menu';
    this.stopLoop();
    this._clearAllTimers(); // Clear any pending timers (e.g., rapidFire)
    this.clearMovement(); // Clear movement when quitting to menu
    this.ui.showScreen('start');
  }

  pause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.isPaused = true;
      this.stopLoop();
      this.clearMovement(); // Clear movement when pausing
      this.ui.showScreen('pause');
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'playing';
      this.isPaused = false;
      this.clearMovement(); // Clear any stuck keys when resuming
      this.lastTime = performance.now();
      this.animationId = requestAnimationFrame((ts) => this.loop(ts));
    }
  }

  stopLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resetGame() {
    this._clearAllTimers(); // Clear any pending timers from previous game
    this.clearMovement(); // Clear any stuck keys on reset
    this.player = new Player(this.canvasWidth, this.canvasHeight);
    // Spawn protection: 3 seconds of invulnerability
    this.player.invulnerable = true;
    this.player.invulnTimer = 3.0;

    this.enemyManager = new EnemyManager();
    this.projectileManager = new ProjectileManager();
    this.upgradeManager = new UpgradeManager();
    this.xpOrbs = [];
    this.powerUps = [];
    particles.clear();

    this.score = 0;
    this.kills = 0;
    this.gameTime = 0;
    this.difficulty = 1;
    this.enemyManager.setDifficulty(this.difficulty);

    this.upgradeManager.onLevelUp(() => {
      this.clearMovement(); // Clear any stuck keys when upgrade screen opens
      this.ui.showUpgradeChoices(this.upgradeManager.pendingChoices, this.upgradeManager);
    });

    audio.resume();
  }

  gainXP(amount) {
    let oldLevel = this.upgradeManager.level;
    this.upgradeManager.addXP(amount);
    // If multiple level-ups occurred, check each new level
    while (this.upgradeManager.level > oldLevel) {
      oldLevel++;
      this.checkWeaponEvolution(oldLevel);
    }
  }

  checkWeaponEvolution(level) {
    // Evolution thresholds
    if (level === 3) {
      this.player.evolveWeapon(2); // Rapid Pulse
      this.ui.showToast('WEAPON EVOLVED: RAPID PULSE');
    } else if (level === 5) {
      this.player.evolveWeapon(3); // Spread Shot
      this.ui.showToast('WEAPON EVOLVED: SPREAD SHOT');
    } else if (level === 8) {
      this.player.evolveWeapon(4); // Piercing Bolt
      this.ui.showToast('WEAPON EVOLVED: PIERCING BOLT');
    } else if (level === 12) {
      this.player.evolveWeapon(5); // Plasma Burst
      this.ui.showToast('WEAPON EVOLVED: PLASMA BURST');
    }
  }

  chooseUpgrade(upgradeId) {
    const chosen = this.upgradeManager.chooseUpgrade(upgradeId);
    if (chosen) {
      this.player.applyUpgrade(upgradeId);
      this.ui.hideScreen('upgrade');
      this.clearMovement(); // Clear any stuck keys when upgrade screen closes
    }
  }

  loop(timestamp) {
    if (this.state !== 'playing') return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    try {
      this.update(dt);
      this.render();
    } catch (err) {
      console.error('Game loop error:', err);
      // Continue the loop to avoid permanent freeze
    }

    // Optional: log slow frames (development only)
    const frameTime = performance.now() - timestamp;
    if (frameTime > 100) {
      console.warn(`Slow frame: ${frameTime.toFixed(1)}ms`);
    }

    this.animationId = requestAnimationFrame((ts) => this.loop(ts));
  }

  update(dt) {
    this.gameTime += dt;
    this.updateDifficulty();

    const shouldShoot = this.player.update(dt, this.input, this.canvasWidth, this.canvasHeight);
    if (shouldShoot) this.shoot();

    this.enemyManager.update(dt, this.player, this.canvasWidth, this.canvasHeight);
    this.projectileManager.update(dt, this.canvasWidth, this.canvasHeight);
    particles.update(dt);

    this.handleCollisions();
    this.handleXPOrbs(dt);
    this.handlePowerUps(dt);

    // Throttle HUD updates to ~30 FPS to avoid excessive DOM writes
    if (this.gameTime - this._lastHudUpdate >= 1/30) {
      this.ui.updateHUD({
        health: this.player.health,
        maxHealth: this.player.maxHealth,
        xpProgress: this.upgradeManager.getXPProgress(),
        score: this.score,
        level: this.upgradeManager.level,
        time: this.gameTime,
        weaponName: this.player.weaponName
      });
      this._lastHudUpdate = this.gameTime;
    }

    if (this.player.health <= 0) {
      this.gameOver();
    }
  }

  updateDifficulty() {
    const newDifficulty = Math.floor(this.gameTime / 45) + 1;
    if (newDifficulty !== this.difficulty) {
      this.difficulty = newDifficulty;
      this.enemyManager.setDifficulty(this.difficulty);
    }
  }

  shoot() {
    this.player.shoot();
    const count = this.player.projectileCount;
    const spread = this.player.projectileSpread;
    const baseAngle = this.player.angle;

    // Hard limit on active projectiles
    const MAX_PROJECTILES = 200;
    if (this.projectileManager.getProjectiles().length + count > MAX_PROJECTILES) return;

    for (let i = 0; i < count; i++) {
      let angle = baseAngle;
      if (count > 1) {
        angle = baseAngle - (spread * (count - 1) / 2) + spread * i;
      }
      angle += (Math.random() - 0.5) * 0.02;

      const proj = new Projectile(
        this.player.x, this.player.y, angle,
        this.player.projectileSpeed,
        this.player.damage,
        this.player.projectileSize,
        this.player.color,
        this.player.pierce,
        true
      );
      this.projectileManager.add(proj);
    }
  }

  handleCollisions() {
    const collisions = this.enemyManager.checkCollisions(this.player, this.projectileManager.getProjectiles());

    for (const hit of collisions.hits) {
      if (hit.damage !== undefined) {
        this.player.takeDamage(hit.damage);
      }
    }

    for (const kill of collisions.kills) {
      this.kills++;
      this.score += 100 * this.difficulty;
      this.spawnXPOrb(kill.x, kill.y, kill.xp * this.player.xpMultiplier);

      if (Math.random() < 0.08) {
        this.spawnPowerUp(kill.x, kill.y);
      }
    }
  }

  handleXPOrbs(dt) {
    for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
      const orb = this.xpOrbs[i];
      orb.life -= dt;

      const dx = this.player.x - orb.x;
      const dy = this.player.y - orb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.player.pickupRange && dist > 0) {
        const speed = 400;
        orb.x += (dx / dist) * speed * dt;
        orb.y += (dy / dist) * speed * dt;
      }

      if (dist < this.player.size + orb.size) {
        this.gainXP(orb.value);
        particles.xpPickup(orb.x, orb.y);
        audio.play('xpPickup');
        this.xpOrbs.splice(i, 1);
      } else if (orb.life <= 0) {
        this.xpOrbs.splice(i, 1);
      }
    }
  }

  handlePowerUps(dt) {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.life -= dt;

      const dx = this.player.x - pu.x;
      const dy = this.player.y - pu.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.player.size + pu.size) {
        this.applyPowerUp(pu.type);
        particles.ringExplosion(pu.x, pu.y, pu.color, 12, 40, 0.5);
        audio.play('powerup');
        this.powerUps.splice(i, 1);
      } else if (pu.life <= 0) {
        this.powerUps.splice(i, 1);
      }
    }
  }

  spawnXPOrb(x, y, value) {
    this.xpOrbs.push({
      x, y, value,
      size: 8,
      color: '#00ff88',
      life: 15
    });
  }

  spawnPowerUp(x, y) {
    const types = ['health', 'shield', 'rapidFire'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = { health: '#ff3333', shield: '#00ffff', rapidFire: '#ff00aa' };

    this.powerUps.push({
      x, y, type,
      size: 14,
      color: colors[type],
      life: 10
    });
  }

  applyPowerUp(type) {
    switch (type) {
      case 'health':
        this.player.heal(30);
        this.ui.showToast('HEALTH RESTORED');
        break;
      case 'shield':
        this.player.addShield(50);
        this.ui.showToast('SHIELD RECHARGED');
        break;
      case 'rapidFire':
        this.player.fireRate *= 0.5;
        this._trackTimer(setTimeout(() => {
          this.player.fireRate *= 2;
        }, 8000));
        this.ui.showToast('RAPID FIRE ACTIVATED');
        break;
    }
  }

  gameOver() {
    this.state = 'gameover';
    this.stopLoop();
    this._clearAllTimers(); // Clear any pending timers (e.g., rapidFire)
    this.clearMovement(); // Clear movement on game over

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('neon-survivor-highscore', this.highScore.toString());
      this.ui.updateHighScore(this.highScore);
    }

    audio.play('gameOver');

    this.ui.showGameOver({
      score: this.score,
      kills: this.kills,
      level: this.upgradeManager.level,
      time: this.gameTime
    });
  }

  render() {
    const shake = this.player.getScreenShakeOffset();

    // Clear the entire canvas before applying shake to avoid edge artifacts
    this.ctx.fillStyle = '#050510';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.ctx.save();
    this.ctx.translate(shake.x, shake.y);

    this.drawBackground();

    particles.draw(this.ctx);

    for (const orb of this.xpOrbs) {
      this.drawXPOrb(orb);
    }

    for (const pu of this.powerUps) {
      this.drawPowerUp(pu);
    }

    this.enemyManager.draw(this.ctx);
    this.projectileManager.draw(this.ctx);
    this.player.draw(this.ctx);

    this.ctx.restore();
  }

  drawBackground() {
    this.ctx.fillStyle = '#050510';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    const gridSize = 50;
    const time = Date.now() * 0.0001;

    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;

    for (let x = -time * 50 % gridSize; x < this.canvasWidth; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvasHeight);
      this.ctx.stroke();
    }

    for (let y = -time * 30 % gridSize; y < this.canvasHeight; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvasWidth, y);
      this.ctx.stroke();
    }

    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const maxRadius = Math.max(this.canvasWidth, this.canvasHeight) * 0.7;

    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, maxRadius
    );
    gradient.addColorStop(0, 'rgba(10, 10, 30, 0)');
    gradient.addColorStop(1, 'rgba(2, 2, 5, 1)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  drawXPOrb(orb) {
    const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;
    const alpha = Math.min(1, orb.life);

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    const gradient = this.ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.size * 2 * pulse);
    gradient.addColorStop(0, orb.color);
    gradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(orb.x, orb.y, orb.size * 2 * pulse, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = orb.color;
    this.ctx.beginPath();
    this.ctx.arc(orb.x, orb.y, orb.size * pulse, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawPowerUp(pu) {
    const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 1;
    const alpha = Math.min(1, pu.life);

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(pu.x, pu.y);
    this.ctx.rotate(Date.now() * 0.002);

    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, pu.size * 2 * pulse);
    gradient.addColorStop(0, pu.color);
    gradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, pu.size * 2 * pulse, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = pu.color;
    this.ctx.beginPath();
    this.ctx.moveTo(pu.size * pulse, 0);
    for (let i = 1; i < 6; i++) {
      const angle = (Math.PI * 2 / 5) * i;
      const r = i % 2 === 0 ? pu.size * pulse : pu.size * 0.5 * pulse;
      this.ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }
}

export function createGame(canvas) {
  return new Game(canvas);
}