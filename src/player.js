import { particles } from './particles.js';
import { audio } from './audio.js';

export class Player {
  constructor(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight / 2;
    this.size = 20;
    this.color = '#00ffff';
    this.glowColor = 'rgba(0, 255, 255, 0.4)';

    this.maxHealth = 120;
    this.health = 120;
    this.maxShield = 20;
    this.shield = 20;
    this.shieldRegen = 3;
    this.shieldRegenTimer = 0;

    this.speed = 300;
    this.baseSpeed = 300;

    this.fireRate = 0.25;
    this.fireTimer = 0;
    this.baseDamage = 25;
    this.damage = 25;
    this.projectileSpeed = 600;
    this.projectileSize = 6;
    this.projectileCount = 1;
    this.projectileSpread = 0.15;
    this.pierce = 0;

    this.pickupRange = 50;
    this.xpMultiplier = 1;

    this.invulnerable = false;
    this.invulnTimer = 0;
    this.invulnDuration = 0.5;

    this.angle = 0;
    this.moving = false;
    this.pulse = 0;
    this.screenShake = { intensity: 0, duration: 0, timer: 0 };

    this.velocity = { x: 0, y: 0 };

    // Weapon evolution
    this.weaponLevel = 1;
    this.weaponName = 'Pulse Shot';
  }

  evolveWeapon(newLevel) {
    if (newLevel <= this.weaponLevel) return;
    this.weaponLevel = newLevel;
    switch (newLevel) {
      case 2: // Rapid Pulse (level 3)
        this.weaponName = 'Rapid Pulse';
        this.projectileSpeed = Math.min(this.projectileSpeed * 1.25, 1200);
        this.fireRate = Math.max(this.fireRate * 0.9, 0.08);
        break;
      case 3: // Spread Shot (level 5)
        this.weaponName = 'Spread Shot';
        this.projectileCount = 3;
        this.projectileSpread = 0.25;
        break;
      case 4: // Piercing Bolt (level 8)
        this.weaponName = 'Piercing Bolt';
        this.color = '#ff00aa';
        this.glowColor = 'rgba(255, 0, 170, 0.4)';
        this.damage = Math.floor(this.damage * 1.5);
        this.baseDamage = this.damage;
        this.pierce = Math.min(this.pierce + 2, 3);
        this.projectileSize = Math.min(this.projectileSize * 1.3, 12);
        break;
      case 5: // Plasma Burst (level 12)
        this.weaponName = 'Plasma Burst';
        this.color = '#00ff88';
        this.glowColor = 'rgba(0, 255, 136, 0.4)';
        this.projectileSpeed = Math.min(this.projectileSpeed * 1.1, 1400);
        this.explosive = true;
        break;
    }
  }

  update(dt, input, canvasWidth, canvasHeight) {
    this.pulse += dt * 6;

    if (this.invulnerable) {
      this.invulnTimer -= dt;
      if (this.invulnTimer <= 0) {
        this.invulnerable = false;
      }
    }

    if (this.shield < this.maxShield) {
      this.shieldRegenTimer -= dt;
      if (this.shieldRegenTimer <= 0) {
        this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen * dt);
      }
    }

    if (this.screenShake.timer > 0) {
      this.screenShake.timer -= dt;
    }

    this.velocity.x = 0;
    this.velocity.y = 0;
    this.moving = false;

    if (input.up) { this.velocity.y -= 1; this.moving = true; }
    if (input.down) { this.velocity.y += 1; this.moving = true; }
    if (input.left) { this.velocity.x -= 1; this.moving = true; }
    if (input.right) { this.velocity.x += 1; this.moving = true; }

    if (this.moving) {
      const len = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      if (len > 0) {
        this.velocity.x /= len;
        this.velocity.y /= len;
        this.x += this.velocity.x * this.speed * dt;
        this.y += this.velocity.y * this.speed * dt;
      } else {
        this.moving = false;
      }
    }

    this.x = Math.max(this.size, Math.min(canvasWidth - this.size, this.x));
    this.y = Math.max(this.size, Math.min(canvasHeight - this.size, this.y));

    if (input.mouseX !== undefined && input.mouseY !== undefined) {
      this.angle = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);
    }

    this.fireTimer -= dt;
    if (input.shooting && this.fireTimer <= 0) {
      this.fireTimer = this.fireRate;
      return true;
    }
    return false;
  }

  shoot() {
    audio.play(this.fireRate < 0.15 ? 'shootFast' : 'shoot');
  }

  takeDamage(amount) {
    if (this.invulnerable) return false;

    if (this.shield > 0) {
      this.shield -= amount;
      if (this.shield < 0) {
        amount = -this.shield;
        this.shield = 0;
      } else {
        particles.ringExplosion(this.x, this.y, '#00ffff', 8, 30, 0.3);
        audio.play('hit');
        return true;
      }
    }

    this.health -= amount;
    this.invulnerable = true;
    this.invulnTimer = this.invulnDuration;
    this.shieldRegenTimer = 3;

    this.screenShake = { intensity: 8, duration: 0.15, timer: 0.15 };
    particles.explode(this.x, this.y, '#ff3333', 20, 150, 4);
    audio.play('damage');

    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    particles.xpPickup(this.x, this.y);
    audio.play('powerup');
  }

  addShield(amount) {
    this.shield = Math.min(this.maxShield, this.shield + amount);
    particles.ringExplosion(this.x, this.y, '#00ffff', 12, 40, 0.5);
    audio.play('powerup');
  }

  getScreenShakeOffset() {
    if (this.screenShake.timer > 0) {
      const progress = 1 - this.screenShake.timer / this.screenShake.duration;
      const intensity = this.screenShake.intensity * (1 - progress);
      return {
        x: (Math.random() - 0.5) * intensity * 2,
        y: (Math.random() - 0.5) * intensity * 2
      };
    }
    return { x: 0, y: 0 };
  }

  draw(ctx) {
    if (this.invulnerable && Math.floor(this.invulnTimer * 20) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const pulseScale = 1 + Math.sin(this.pulse) * 0.08;

    if (this.shield > 0) {
      const shieldGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 2);
      shieldGradient.addColorStop(0, 'rgba(0, 255, 255, 0.1)');
      shieldGradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.05)');
      shieldGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = shieldGradient;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 2 * pulseScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + Math.sin(this.pulse * 3) * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 1.8 * pulseScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 2);
    glowGradient.addColorStop(0, this.glowColor);
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 2.5 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.size * 1.5 * pulseScale, 0);
    ctx.lineTo(-this.size * 0.7 * pulseScale, this.size * pulseScale);
    ctx.lineTo(-this.size * 0.3 * pulseScale, 0);
    ctx.lineTo(-this.size * 0.7 * pulseScale, -this.size * pulseScale);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.size * 0.3 * pulseScale, 0, this.size * 0.25 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    if (this.moving) {
      ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.moveTo(-this.size * 1.2 * pulseScale, 0);
      ctx.lineTo(-this.size * (1.5 + Math.sin(this.pulse * 4) * 0.3) * pulseScale, this.size * 0.4 * pulseScale);
      ctx.lineTo(-this.size * (1.5 + Math.sin(this.pulse * 4) * 0.3) * pulseScale, -this.size * 0.4 * pulseScale);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  applyUpgrade(upgradeId) {
    switch (upgradeId) {
      case 'health':
        this.maxHealth += 25;
        this.health = this.maxHealth;
        break;
      case 'speed':
        this.speed = this.baseSpeed * 1.15;
        this.baseSpeed = this.speed;
        break;
      case 'damage':
        this.damage = Math.floor(this.baseDamage * 1.2);
        this.baseDamage = this.damage;
        break;
      case 'fireRate':
        this.fireRate *= 0.85;
        break;
      case 'projectileCount':
        this.projectileCount += 1;
        break;
      case 'pierce':
        this.pierce += 1;
        break;
      case 'projectileSpeed':
        this.projectileSpeed *= 1.15;
        break;
      case 'pickupRange':
        this.pickupRange *= 1.3;
        break;
      case 'xpBoost':
        this.xpMultiplier *= 1.2;
        break;
      case 'shield':
        this.maxShield = Math.max(this.maxShield, 30);
        this.shield = this.maxShield;
        this.shieldRegen = Math.max(this.shieldRegen, 5);
        break;
      case 'shieldRegen':
        this.shieldRegen += 8;
        break;
      case 'projectileSize':
        this.projectileSize *= 1.15;
        break;
      case 'spread':
        this.projectileSpread *= 0.9;
        break;
    }
  }
}