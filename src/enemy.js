import { particles } from './particles.js';
import { audio } from './audio.js';

export const ENEMY_TYPES = {
  basic: {
    name: 'Drone',
    color: '#00ffff',
    speed: 100,
    health: 30,
    damage: 6,
    xp: 12,
    size: 18,
    glowColor: 'rgba(0, 255, 255, 0.4)'
  },
  fast: {
    name: 'Stalker',
    color: '#ff00aa',
    speed: 200,
    health: 15,
    damage: 8,
    xp: 15,
    size: 14,
    glowColor: 'rgba(255, 0, 170, 0.4)'
  },
  tank: {
    name: 'Behemoth',
    color: '#ff8800',
    speed: 70,
    health: 120,
    damage: 25,
    xp: 35,
    size: 30,
    glowColor: 'rgba(255, 136, 0, 0.4)'
  },
  elite: {
    name: 'Phantom',
    color: '#b300ff',
    speed: 150,
    health: 60,
    damage: 18,
    xp: 50,
    size: 22,
    glowColor: 'rgba(179, 0, 255, 0.4)'
  },
  splitter: {
    name: 'Fracture',
    color: '#00ff88',
    speed: 100,
    health: 40,
    damage: 12,
    xp: 25,
    size: 16,
    glowColor: 'rgba(0, 255, 136, 0.4)',
    splits: 3
  }
};

export class Enemy {
  constructor(x, y, type, difficulty = 1) {
    const config = ENEMY_TYPES[type];
    this.type = type;
    this.x = x;
    this.y = y;
    this.color = config.color;
    this.baseSpeed = config.speed;
    this.speed = config.speed * (0.9 + difficulty * 0.05);
    this.maxHealth = Math.floor(config.health * (1 + difficulty * 0.15));
    this.health = this.maxHealth;
    this.damage = Math.floor(config.damage * (1 + difficulty * 0.1));
    this.xp = config.xp;
    this.size = config.size;
    this.glowColor = config.glowColor;
    this.splits = config.splits || 0;
    this.alive = true;
    this.knockback = { x: 0, y: 0 };
    this.knockbackDecay = 0.95;
    this.angle = 0;
    this.pulse = 0;
  }

  update(dt, player) {
    if (!this.alive) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.angle = Math.atan2(dy, dx);

    if (dist > 0) {
      this.x += (dx / dist) * this.speed * dt + this.knockback.x;
      this.y += (dy / dist) * this.speed * dt + this.knockback.y;
    }

    this.knockback.x *= this.knockbackDecay;
    this.knockback.y *= this.knockbackDecay;
    this.pulse += dt * 8;
  }

  takeDamage(amount, angle, force = 0) {
    this.health -= amount;
    if (force > 0) {
      this.knockback.x = Math.cos(angle) * force;
      this.knockback.y = Math.sin(angle) * force;
    }
    particles.sparkTrail(this.x, this.y, this.color, 4, 80);
    audio.play('enemyHit');
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.alive = false;
    particles.explode(this.x, this.y, this.color, 25, 200, this.size * 0.5);
    audio.play('enemyDeath');
  }

  draw(ctx) {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const pulseScale = 1 + Math.sin(this.pulse) * 0.05;

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 2);
    glowGradient.addColorStop(0, this.glowColor);
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 2 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();

    switch (this.type) {
      case 'basic':
        ctx.moveTo(this.size * pulseScale, 0);
        ctx.lineTo(-this.size * 0.5 * pulseScale, this.size * 0.8 * pulseScale);
        ctx.lineTo(-this.size * 0.3 * pulseScale, 0);
        ctx.lineTo(-this.size * 0.5 * pulseScale, -this.size * 0.8 * pulseScale);
        ctx.closePath();
        break;
      case 'fast':
        ctx.moveTo(this.size * pulseScale, 0);
        ctx.lineTo(-this.size * 0.7 * pulseScale, this.size * 0.5 * pulseScale);
        ctx.lineTo(-this.size * 0.7 * pulseScale, -this.size * 0.5 * pulseScale);
        ctx.closePath();
        break;
      case 'tank': {
        const x = -this.size * 0.8 * pulseScale;
        const y = -this.size * 0.8 * pulseScale;
        const w = this.size * 1.6 * pulseScale;
        const h = this.size * 1.6 * pulseScale;
        const r = 6;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        break;
      }
      case 'elite':
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
          const r = i % 2 === 0 ? this.size * pulseScale : this.size * 0.5 * pulseScale;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        break;
      case 'splitter':
        ctx.moveTo(this.size * pulseScale, 0);
        for (let i = 1; i < 6; i++) {
          const a = (Math.PI * 2 / 6) * i;
          ctx.lineTo(Math.cos(a) * this.size * 0.7 * pulseScale, Math.sin(a) * this.size * 0.7 * pulseScale);
        }
        ctx.closePath();
        break;
    }
    ctx.fill();

    if (this.health < this.maxHealth) {
      const barWidth = this.size * 2;
      const barHeight = 4;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-barWidth/2, -this.size - 10, barWidth, barHeight);
      ctx.fillStyle = this.health / this.maxHealth > 0.3 ? '#00ff88' : '#ff3333';
      ctx.fillRect(-barWidth/2, -this.size - 10, barWidth * (this.health / this.maxHealth), barHeight);
    }

    ctx.restore();
  }
}

export class EnemyManager {
  constructor() {
    this.enemies = [];
    this.spawnTimer = 0;
    this.baseSpawnRate = 2.0;
    this.difficulty = 1;
    this.spawnRadius = 400;
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
  }

  update(dt, player, canvasWidth, canvasHeight) {
    this.spawnTimer -= dt;

    const spawnRate = Math.max(0.3, this.baseSpawnRate / (1 + this.difficulty * 0.3));

    if (this.spawnTimer <= 0 && this.enemies.length < 50 + this.difficulty * 10) {
      this.spawnTimer = spawnRate;
      this.spawnEnemy(canvasWidth, canvasHeight);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].update(dt, player);
      if (!this.enemies[i].alive) {
        this.enemies.splice(i, 1);
      }
    }
  }

  spawnEnemy(canvasWidth, canvasHeight) {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    const margin = 100;

    switch (side) {
      case 0: x = -margin; y = Math.random() * canvasHeight; break;
      case 1: x = canvasWidth + margin; y = Math.random() * canvasHeight; break;
      case 2: x = Math.random() * canvasWidth; y = -margin; break;
      case 3: x = Math.random() * canvasWidth; y = canvasHeight + margin; break;
    }

    const types = ['basic'];
    if (this.difficulty >= 2) types.push('fast');
    if (this.difficulty >= 3) types.push('tank');
    if (this.difficulty >= 5) types.push('elite');
    if (this.difficulty >= 7) types.push('splitter');

    const type = types[Math.floor(Math.random() * types.length)];
    this.enemies.push(new Enemy(x, y, type, this.difficulty));
  }

  draw(ctx) {
    this.enemies.forEach(e => e.draw(ctx));
  }

  getEnemies() {
    return this.enemies;
  }

  clear() {
    this.enemies = [];
  }

  checkCollisions(player, projectiles) {
    const results = { hits: [], kills: [] };
    // Track projectiles that have already hit an enemy this frame to prevent multi-hit
    const hitProjectiles = new Set();

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.alive) continue;

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < player.size + enemy.size) {
        results.hits.push({ enemy, damage: enemy.damage, angle: Math.atan2(dy, dx) });
      }

      for (let j = projectiles.length - 1; j >= 0; j--) {
        const proj = projectiles[j];
        if (!proj.isPlayer) continue;
        // Skip projectiles that already hit an enemy this frame
        if (hitProjectiles.has(proj)) continue;

        const pdx = proj.x - enemy.x;
        const pdy = proj.y - enemy.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

        if (pdist < enemy.size + proj.size) {
          enemy.takeDamage(proj.damage, Math.atan2(pdy, pdx), 50);
          proj.hit();
          hitProjectiles.add(proj); // Mark projectile as having hit this frame
          results.hits.push({ enemy, projectile: proj });

          if (!enemy.alive) {
            results.kills.push({ enemy, x: enemy.x, y: enemy.y, xp: enemy.xp, type: enemy.type });
          }
          // Don't break - continue checking other enemies but this projectile won't hit again
        }
      }
    }

    return results;
  }
}