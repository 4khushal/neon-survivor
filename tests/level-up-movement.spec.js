import { test, expect } from '@playwright/test';

test.describe('Level-up movement bug fix', () => {
  test.beforeEach(async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('http://localhost:5173');
    await page.waitForSelector('#btn-start', { state: 'visible' });
    await page.click('#btn-start');
    await page.waitForSelector('#hud-score', { state: 'visible' });

    // Enable god mode to avoid death during test
    await page.evaluate(() => {
      if (window.game && window.game.player) {
        window.game.player.invulnerable = true;
        window.game.player.maxHealth = 999999;
        window.game.player.health = 999999;
        window.game.player.maxShield = 999999;
        window.game.player.shield = 999999;
      }
    });
  });

  test('movement keys are cleared when upgrade dialog opens and closes (ArrowRight)', async ({ page }) => {
    // Hold ArrowRight key
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);

    // Grant XP to trigger level up while key is held
    await page.evaluate(() => {
      if (window.game) {
        window.game.gainXP(200); // should trigger level up
      }
    });

    // Wait for upgrade screen to appear
    await page.waitForSelector('#screen-upgrade.active', { state: 'visible', timeout: 5000 });

    // Verify movement flags are cleared while upgrade screen is open
    const inputWhileOpen = await page.evaluate(() => {
      const g = window.game;
      return g ? {
        up: g.input.up,
        down: g.input.down,
        left: g.input.left,
        right: g.input.right
      } : null;
    });
    expect(inputWhileOpen.right).toBe(false);
    expect(inputWhileOpen.up).toBe(false);
    expect(inputWhileOpen.down).toBe(false);
    expect(inputWhileOpen.left).toBe(false);

    // Release the physical key (simulate keyup)
    await page.keyboard.up('ArrowRight');

    // Close upgrade screen by picking first upgrade
    const upgradeBtn = await page.$('#upgrade-grid button.upgrade-card:not(.hidden)');
    if (upgradeBtn) {
      await upgradeBtn.click();
    }
    await page.waitForSelector('#screen-upgrade.active', { state: 'hidden', timeout: 5000 });

    // Verify movement flags are still cleared after upgrade screen closes
    const inputAfterClose = await page.evaluate(() => {
      const g = window.game;
      return g ? {
        up: g.input.up,
        down: g.input.down,
        left: g.input.left,
        right: g.input.right
      } : null;
    });
    expect(inputAfterClose.right).toBe(false);
    expect(inputAfterClose.up).toBe(false);
    expect(inputAfterClose.down).toBe(false);
    expect(inputAfterClose.left).toBe(false);
  });

  test('movement keys are cleared for all movement keys (WASD + Arrows)', async ({ page }) => {
    const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];

    for (const key of keys) {
      // Reset level and XP for each key test to ensure level up triggers
      await page.evaluate(() => {
        if (window.game && window.game.upgradeManager) {
          window.game.upgradeManager.level = 1;
          window.game.upgradeManager.xp = 0;
          window.game.upgradeManager.xpToNext = 80;
          window.game.upgradeManager.chosenUpgrades = {};
        }
      });

      // Hold the key
      await page.keyboard.down(key);
      await page.waitForTimeout(200);

      // Grant XP to trigger level up (80 XP needed for level 2)
      await page.evaluate(() => {
        if (window.game) {
          window.game.gainXP(100);
        }
      });

      // Wait for upgrade screen
      await page.waitForSelector('#screen-upgrade.active', { state: 'visible', timeout: 5000 });

      // Verify all movement flags are false
      const inputWhileOpen = await page.evaluate(() => {
        const g = window.game;
        return g ? {
          up: g.input.up,
          down: g.input.down,
          left: g.input.left,
          right: g.input.right
        } : null;
      });
      expect(inputWhileOpen.up).toBe(false);
      expect(inputWhileOpen.down).toBe(false);
      expect(inputWhileOpen.left).toBe(false);
      expect(inputWhileOpen.right).toBe(false);

      // Release key
      await page.keyboard.up(key);

      // Close upgrade screen
      const upgradeBtn = await page.$('#upgrade-grid button.upgrade-card:not(.hidden)');
      if (upgradeBtn) {
        await upgradeBtn.click();
      }
      await page.waitForSelector('#screen-upgrade.active', { state: 'hidden', timeout: 5000 });

      // Verify flags still false after close
      const inputAfterClose = await page.evaluate(() => {
        const g = window.game;
        return g ? {
          up: g.input.up,
          down: g.input.down,
          left: g.input.left,
          right: g.input.right
        } : null;
      });
      expect(inputAfterClose.up).toBe(false);
      expect(inputAfterClose.down).toBe(false);
      expect(inputAfterClose.left).toBe(false);
      expect(inputAfterClose.right).toBe(false);
    }
  });

  test('simultaneous movement keys are cleared on level-up', async ({ page }) => {
    // Hold multiple movement keys simultaneously
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(200);

    // Grant XP to trigger level up
    await page.evaluate(() => {
      if (window.game) {
        window.game.gainXP(200);
      }
    });

    // Wait for upgrade screen
    await page.waitForSelector('#screen-upgrade.active', { state: 'visible', timeout: 5000 });

    // Verify all movement flags are cleared
    const inputWhileOpen = await page.evaluate(() => {
      const g = window.game;
      return g ? {
        up: g.input.up,
        down: g.input.down,
        left: g.input.left,
        right: g.input.right
      } : null;
    });
    expect(inputWhileOpen.up).toBe(false);
    expect(inputWhileOpen.right).toBe(false);
    expect(inputWhileOpen.down).toBe(false);
    expect(inputWhileOpen.left).toBe(false);

    // Release keys
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowUp');

    // Close upgrade screen
    const upgradeBtn = await page.$('#upgrade-grid button.upgrade-card:not(.hidden)');
    if (upgradeBtn) {
      await upgradeBtn.click();
    }
    await page.waitForSelector('#screen-upgrade.active', { state: 'hidden', timeout: 5000 });

    // Verify flags still false after close
    const inputAfterClose = await page.evaluate(() => {
      const g = window.game;
      return g ? {
        up: g.input.up,
        down: g.input.down,
        left: g.input.left,
        right: g.input.right
      } : null;
    });
    expect(inputAfterClose.up).toBe(false);
    expect(inputAfterClose.right).toBe(false);
    expect(inputAfterClose.down).toBe(false);
    expect(inputAfterClose.left).toBe(false);
  });

  test('repeated level-ups do not cause stuck keys', async ({ page }) => {
    // Test multiple level-ups in sequence
    for (let i = 0; i < 4; i++) {
      // Hold a movement key
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(200);

      // Grant XP to trigger level up
      await page.evaluate(() => {
        if (window.game) {
          window.game.gainXP(200);
        }
      });

      // Wait for upgrade screen
      await page.waitForSelector('#screen-upgrade.active', { state: 'visible', timeout: 5000 });

      // Verify movement cleared
      const inputWhileOpen = await page.evaluate(() => {
        const g = window.game;
        return g ? {
          up: g.input.up,
          down: g.input.down,
          left: g.input.left,
          right: g.input.right
        } : null;
      });
      expect(inputWhileOpen.right).toBe(false);

      // Release key
      await page.keyboard.up('ArrowRight');

      // Close upgrade screen
      const upgradeBtn = await page.$('#upgrade-grid button.upgrade-card:not(.hidden)');
      if (upgradeBtn) {
        await upgradeBtn.click();
      }
      await page.waitForSelector('#screen-upgrade.active', { state: 'hidden', timeout: 5000 });

      // Verify still cleared
      const inputAfterClose = await page.evaluate(() => {
        const g = window.game;
        return g ? {
          up: g.input.up,
          down: g.input.down,
          left: g.input.left,
          right: g.input.right
        } : null;
      });
      expect(inputAfterClose.right).toBe(false);
    }
  });

  test('pause/resume clears movement', async ({ page }) => {
    // Hold movement key
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(200);

    // Pause
    await page.keyboard.press('Escape');
    await page.waitForSelector('#btn-resume', { state: 'visible', timeout: 5000 });

    // Verify movement cleared during pause
    const inputWhilePaused = await page.evaluate(() => {
      const g = window.game;
      return g ? {
        up: g.input.up,
        down: g.input.down,
        left: g.input.left,
        right: g.input.right
      } : null;
    });
    expect(inputWhilePaused.right).toBe(false);

    // Release key during pause
    await page.keyboard.up('ArrowRight');

    // Resume
    await page.click('#btn-resume');
    await page.waitForTimeout(200);

    // Verify movement still cleared after resume
    const inputAfterResume = await page.evaluate(() => {
      const g = window.game;
      return g ? {
        up: g.input.up,
        down: g.input.down,
        left: g.input.left,
        right: g.input.right
      } : null;
    });
    expect(inputAfterResume.right).toBe(false);
  });

  test('game over clears movement', async ({ page }) => {
    // Disable god mode to allow death
    await page.evaluate(() => {
      if (window.game && window.game.player) {
        window.game.player.invulnerable = false;
        window.game.player.maxHealth = 100;
        window.game.player.health = 1;
        window.game.player.maxShield = 0;
        window.game.player.shield = 0;
      }
    });

    // Hold movement key
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(200);

    // Take damage to trigger game over
    await page.evaluate(() => {
      if (window.game && window.game.player) {
        window.game.player.takeDamage(100);
      }
    });

    // Wait for game over screen
    await page.waitForSelector('#screen-gameover.active', { state: 'visible', timeout: 5000 });

    // Verify movement cleared
    const inputGameOver = await page.evaluate(() => {
      const g = window.game;
      return g ? {
        up: g.input.up,
        down: g.input.down,
        left: g.input.left,
        right: g.input.right
      } : null;
    });
    expect(inputGameOver.right).toBe(false);

    // Release key
    await page.keyboard.up('ArrowRight');

    // Click Play Again
    await page.click('#btn-restart');
    await page.waitForSelector('#hud-score', { state: 'visible', timeout: 5000 });

    // Verify movement still cleared after restart
    const inputAfterRestart = await page.evaluate(() => {
      const g = window.game;
      return g ? {
        up: g.input.up,
        down: g.input.down,
        left: g.input.left,
        right: g.input.right
      } : null;
    });
    expect(inputAfterRestart.right).toBe(false);
  });

  test('window blur clears movement', async ({ page }) => {
    // Hold movement key
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(200);

    // Simulate window blur
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });
    await page.waitForTimeout(100);

    // Verify movement cleared
    const inputAfterBlur = await page.evaluate(() => {
      const g = window.game;
      return g ? {
        up: g.input.up,
        down: g.input.down,
        left: g.input.left,
        right: g.input.right
      } : null;
    });
    expect(inputAfterBlur.right).toBe(false);

    // Release key
    await page.keyboard.up('ArrowRight');
  });

  test('tab hidden (visibilitychange) clears movement', async ({ page }) => {
    // Hold movement key
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(200);

    // Simulate tab hidden - use page.emulateMedia or evaluate to trigger properly
    await page.evaluate(() => {
      // Dispatch visibilitychange with document.hidden = true
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(100);

    // Verify movement cleared
    const inputAfterHidden = await page.evaluate(() => {
      const g = window.game;
      return g ? {
        up: g.input.up,
        down: g.input.down,
        left: g.input.left,
        right: g.input.right
      } : null;
    });
    expect(inputAfterHidden.right).toBe(false);

    // Restore visibility
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Release key
    await page.keyboard.up('ArrowRight');
  });
});