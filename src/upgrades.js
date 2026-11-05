import { particles } from './particles.js';
import { audio } from './audio.js';

export const UPGRADES = [
  {
    id: 'health',
    name: 'VITALITY CORE',
    icon: '❤',
    description: '+25 Max Health\nFull heal on pickup',
    color: '#ff3333',
    maxLevel: 5
  },
  {
    id: 'speed',
    name: 'OVERDRIVE',
    icon: '⚡',
    description: '+15% Movement Speed',
    color: '#00ffff',
    maxLevel: 5
  },
  {
    id: 'damage',
    name: 'AMPLIFIER',
    icon: '💥',
    description: '+20% Damage',
    color: '#ff8800',
    maxLevel: 5
  },
  {
    id: 'fireRate',
    name: 'RAPID CYCLE',
    icon: '🔫',
    description: '-15% Fire Cooldown',
    color: '#ff00aa',
    maxLevel: 5
  },
  {
    id: 'projectileCount',
    name: 'MULTI-SHOT',
    icon: '🎯',
    description: '+1 Projectile',
    color: '#b300ff',
    maxLevel: 3
  },
  {
    id: 'pierce',
    name: 'PHASING ROUNDS',
    icon: '💎',
    description: '+1 Pierce Count',
    color: '#00ff88',
    maxLevel: 3
  },
  {
    id: 'projectileSpeed',
    name: 'VELOCITY MOD',
    icon: '🚀',
    description: '+15% Projectile Speed',
    color: '#0088ff',
    maxLevel: 3
  },
  {
    id: 'pickupRange',
    name: 'MAGNET FIELD',
    icon: '🧲',
    description: '+30% Pickup Range',
    color: '#ffcc00',
    maxLevel: 3
  },
  {
    id: 'xpBoost',
    name: 'EXP BOOSTER',
    icon: '⭐',
    description: '+20% XP Gain',
    color: '#8844ff',
    maxLevel: 3
  },
  {
    id: 'shield',
    name: 'ENERGY BARRIER',
    icon: '🛡',
    description: 'Gain 30 Shield\n+5/sec Regen',
    color: '#00ffff',
    maxLevel: 2
  },
  {
    id: 'shieldRegen',
    name: 'AUTO-REPAIR',
    icon: '🔧',
    description: '+8/sec Shield Regen',
    color: '#00ffaa',
    maxLevel: 3
  },
  {
    id: 'projectileSize',
    name: 'HEAVY ROUNDS',
    icon: '🔮',
    description: '+15% Projectile Size',
    color: '#ff6600',
    maxLevel: 3
  },
  {
    id: 'spread',
    name: 'FOCUSED BEAM',
    icon: '🔭',
    description: '-10% Spread Angle',
    color: '#ffffff',
    maxLevel: 3
  }
];

export class UpgradeManager {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 80;
    this.chosenUpgrades = {};
    this.pendingChoices = [];
    this.showingChoices = false;
    this.onLevelUpCallback = null;
  }

  addXP(amount) {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.xpToNext = Math.floor(this.xpToNext * 1.3);
    this.generateChoices();
    this.showingChoices = true;
    if (this.onLevelUpCallback) this.onLevelUpCallback();
    particles.levelUp(0, 0);
    audio.play('levelUp');
  }

  generateChoices() {
    const available = UPGRADES.filter(u => {
      const currentLevel = this.chosenUpgrades[u.id] || 0;
      return currentLevel < u.maxLevel;
    });

    this.pendingChoices = [];
    const count = Math.min(4, available.length);
    const shuffled = [...available].sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      this.pendingChoices.push(shuffled[i]);
    }
  }

  chooseUpgrade(upgradeId) {
    const upgrade = this.pendingChoices.find(u => u.id === upgradeId);
    if (!upgrade) return false;

    this.chosenUpgrades[upgradeId] = (this.chosenUpgrades[upgradeId] || 0) + 1;
    this.showingChoices = false;
    this.pendingChoices = [];
    return upgrade;
  }

  getUpgradeLevel(upgradeId) {
    return this.chosenUpgrades[upgradeId] || 0;
  }

  isMaxLevel(upgradeId) {
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return true;
    return (this.chosenUpgrades[upgradeId] || 0) >= upgrade.maxLevel;
  }

  onLevelUp(cb) {
    this.onLevelUpCallback = cb;
  }

  getXPProgress() {
    return this.xp / this.xpToNext;
  }

  reset() {
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 80;
    this.chosenUpgrades = {};
    this.pendingChoices = [];
    this.showingChoices = false;
  }
}