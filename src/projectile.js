import { particles } from './particles.js';
import { audio } from './audio.js';

export class Projectile {
  constructor(x, y, angle, speed, damage, size, color, pierce = 0, isPlayer = true) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.size = size;
    this.color = color;
    this.pierce = pierce;
    this.maxPierce = pierce;
    this.isPlayer = isPlayer;
    this.alive = true;
    this.trail = [];
    this.maxTrail = 8;
  }

  update(dt, canvasWidth, canvasHeight) {
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * dt * this.speed;

    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) this.trail.pop();

    if (this.x < -50 || this.x > canvasWidth + 50 || this.y < -50 || this.y > canvasHeight + 50) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.save();

    if (this.trail.length > 1) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size * 0.6;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(this.trail[this.trail.length - 1].x, this.trail[this.trail.length - 1].y);
      for (let i = this.trail.length - 2; i >= 0; i--) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.stroke();
    }

    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, 'transparent');

    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  hit() {
    this.pierce--;
    if (this.pierce < 0) {
      this.alive = false;
      particles.sparkTrail(this.x, this.y, this.color, 5, 50);
      audio.play('hit');
    }
  }
}

export class ProjectileManager {
  constructor() {
    this.projectiles = [];
  }

  add(projectile) {
    this.projectiles.push(projectile);
  }

  update(dt, canvasWidth, canvasHeight) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.projectiles[i].update(dt, canvasWidth, canvasHeight);
      if (!this.projectiles[i].alive) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    this.projectiles.forEach(p => p.draw(ctx));
  }

  clear() {
    this.projectiles = [];
  }

  getProjectiles() {
    return this.projectiles;
  }
}