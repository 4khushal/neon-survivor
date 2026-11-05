export class Particle {
  constructor(x, y, color, velocity, life, size, gravity = 0, fade = true) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.velocity = { ...velocity };
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.gravity = gravity;
    this.fade = fade;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
  }

  update(dt) {
    this.x += this.velocity.x * dt;
    this.y += this.velocity.y * dt;
    this.velocity.y += this.gravity * dt;
    this.life -= dt;
    this.rotation += this.rotationSpeed * dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = this.fade ? this.life / this.maxLife : 1;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    if (this.size > 3) {
      ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.emitters = [];
    this._pendingTimeouts = new Set();
  }

  addParticle(particle) {
    const MAX_PARTICLES = 500;
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push(particle);
  }

  addEmitter(emitter) {
    this.emitters.push(emitter);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update(dt)) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.emitters.length - 1; i >= 0; i--) {
      this.emitters[i].timer -= dt;
      if (this.emitters[i].timer <= 0) {
        this.emitters.splice(i, 1);
      } else {
        this.emitters[i].emit(this);
      }
    }
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }

  explode(x, y, color, count = 20, speed = 300, size = 4, life = 0.8) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const v = speed * (0.5 + Math.random() * 0.5);
      this.addParticle(new Particle(
        x, y, color,
        { x: Math.cos(angle) * v, y: Math.sin(angle) * v },
        life, size * (0.5 + Math.random() * 0.5), 0, true
      ));
    }
  }

  ringExplosion(x, y, color, count = 16, radius = 50, life = 0.6) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      this.addParticle(new Particle(
        x, y, color,
        { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
        life, 3, 0, true
      ));
    }
  }

  sparkTrail(x, y, color, count = 8, speed = 100) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * Math.random();
      this.addParticle(new Particle(
        x, y, color,
        { x: Math.cos(angle) * v, y: Math.sin(angle) * v },
        0.3 + Math.random() * 0.2, 1.5 + Math.random() * 1.5, 0, true
      ));
    }
  }

  xpPickup(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i;
      this.addParticle(new Particle(
        x, y, '#00ff88',
        { x: Math.cos(angle) * 80, y: Math.sin(angle) * 80 },
        0.5, 2, -100, true
      ));
    }
  }

  levelUp(x, y) {
    const colors = ['#00ffff', '#b300ff', '#ff00aa', '#0088ff'];
    for (let ring = 0; ring < 3; ring++) {
      const timeoutId = setTimeout(() => {
        this._pendingTimeouts.delete(timeoutId);
        for (let i = 0; i < 20; i++) {
          const angle = (Math.PI * 2 / 20) * i + ring * 0.3;
          this.addParticle(new Particle(
            x, y, colors[Math.floor(Math.random() * colors.length)],
            { x: Math.cos(angle) * 150, y: Math.sin(angle) * 150 },
            1.0, 3, -50, true
          ));
        }
      }, ring * 100);
      this._pendingTimeouts.add(timeoutId);
    }
  }

  screenShake(intensity = 5, duration = 0.2) {
    return { intensity, duration, timer: duration };
  }

  clear() {
    this.particles = [];
    this.emitters = [];
    for (const timeoutId of this._pendingTimeouts) {
      clearTimeout(timeoutId);
    }
    this._pendingTimeouts.clear();
  }
}

export const particles = new ParticleSystem();