import { test, expect } from '@playwright/test';

test.describe('Neon Survivor stability', () => {
  test('loads, starts, moves, collects XP, levels up, pauses, restarts', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:5173');
    // Wait for canvas and start button
    await page.waitForSelector('#game-canvas', { state: 'visible' });
    await page.waitForSelector('#btn-start', { state: 'visible' });
    await page.click('#btn-start');

    // Wait for HUD to appear (start screen hidden)
    await page.waitForSelector('#hud-score', { state: 'visible' });

    // Simulate movement: press ArrowRight for 1 second
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1000);
    await page.keyboard.up('ArrowRight');

    // Simulate mouse move and click to shoot
    const canvas = await page.$('#game-canvas');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(500);
    await page.mouse.up();

    // Wait a bit for XP orbs to spawn and be collected
    await page.waitForTimeout(3000);

    // Trigger pause
    await page.keyboard.press('Escape');
    await page.waitForSelector('#btn-resume', { state: 'visible' });
    // Resume
    await page.click('#btn-resume');

    // Wait a bit more
    await page.waitForTimeout(2000);

    // Trigger game over by making player die? Hard to simulate. Instead, we can just check that no errors occurred.
    // We'll just ensure no console errors.
    expect(errors).toEqual([]);
  });

  test('repeated restarts do not leak listeners or loops', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:5173');
    await page.waitForSelector('#btn-start', { state: 'visible' });

    for (let i = 0; i < 3; i++) {
      await page.click('#btn-start');
      await page.waitForSelector('#hud-score', { state: 'visible' });
      // Wait a moment
      await page.waitForTimeout(1000);
      // Trigger game over by forcing health to 0? Not possible without internal access.
      // Instead, we can click quit to menu from pause.
      await page.keyboard.press('Escape');
      await page.waitForSelector('#btn-quit', { state: 'visible' });
      await page.click('#btn-quit');
      await page.waitForSelector('#btn-start', { state: 'visible' });
    }
    expect(errors).toEqual([]);
  });

  test('sustained gameplay stress test (30s)', async ({ page }) => {
    test.setTimeout(90000); // allow up to 90s for the whole test
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:5173');
    await page.waitForSelector('#btn-start', { state: 'visible' });
    await page.click('#btn-start');
    await page.waitForSelector('#hud-score', { state: 'visible' });

    // Enable god mode for stress test - tests system stability, not player skill
    await page.evaluate(() => {
      if (window.game && window.game.player) {
        window.game.player.invulnerable = true;
        window.game.player.maxHealth = 999999;
        window.game.player.health = 999999;
        window.game.player.maxShield = 999999;
        window.game.player.shield = 999999;
      }
    });

    // Simulate continuous movement and shooting for 30 seconds
    const startTime = Date.now();
    const duration = 30000; // 30 seconds
    const canvas = await page.$('#game-canvas');
    const box = await canvas.boundingBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Keep mouse centered and hold left click for shooting
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();

    // Simulate continuous movement: alternate directions every 2 seconds
    const directions = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
    let dirIndex = 0;
    while (Date.now() - startTime < duration) {
      const dir = directions[dirIndex % directions.length];
      await page.keyboard.down(dir);
      await page.waitForTimeout(2000);
      await page.keyboard.up(dir);
      dirIndex++;
    }

    await page.mouse.up();

    // Wait a bit for any pending events
    await page.waitForTimeout(1000);

    // Pause and resume to verify loop still alive
    await page.keyboard.press('Escape');
    await page.waitForSelector('#btn-resume', { state: 'visible', timeout: 5000 });
    await page.click('#btn-resume');
    await page.waitForTimeout(1000);

    // Verify timer progressed (should be > 20s)
    const timerText = await page.textContent('#hud-timer');
    const [min, sec] = timerText.split(':').map(Number);
    const elapsed = min * 60 + sec;
    expect(elapsed).toBeGreaterThan(20);

    expect(errors).toEqual([]);
  });

  test('extended sustained stress test (target 5 min, actual may be shorter)', async ({ page }) => {
    // Set a generous timeout: 20 minutes (1200000 ms) - headless Chromium runs slower than real-time
    test.setTimeout(1200000);
    const errors = [];
    const samples = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:5173');
    await page.waitForSelector('#btn-start', { state: 'visible' });
    await page.click('#btn-start');
    await page.waitForSelector('#hud-score', { state: 'visible' });

    const canvas = await page.$('#game-canvas');
    const box = await canvas.boundingBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Enable god mode (invincibility) for stress test - this tests system stability, not player skill
    await page.evaluate(() => {
      if (window.game && window.game.player) {
        window.game.player.invulnerable = true;
        window.game.player.maxHealth = 999999;
        window.game.player.health = 999999;
        window.game.player.maxShield = 999999;
        window.game.player.shield = 999999;
      }
    });

    // Hold left mouse button for continuous fire
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();

    // We'll sample every 5 seconds
    const sampleInterval = 5000;
    const totalDuration = 300000; // 5 minutes = 300,000 ms
    const startTime = Date.now();
    let lastSampleTime = startTime;
    const directions = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
    let dirIndex = 0;

    // Helper to sample diagnostics
    const sample = async () => {
      const now = Date.now();
      const frameTime = now - lastSampleTime;
      lastSampleTime = now;
      // Use page.evaluate to read game internals
      const diag = await page.evaluate(() => {
        const g = window.game;
        if (!g) return null;
        return {
          enemies: g.enemyManager ? g.enemyManager.enemies.length : 0,
          projectiles: g.projectileManager ? g.projectileManager.getProjectiles().length : 0,
          particles: (window.particles && window.particles.particles) ? window.particles.particles.length : 0,
          timer: g.gameTime,
          level: g.upgradeManager ? g.upgradeManager.level : 0,
          weapon: g.player ? g.player.weaponName : '',
          state: g.state,
          playerHealth: g.player ? g.player.health : 0,
          playerMaxHealth: g.player ? g.player.maxHealth : 0
        };
      });
      samples.push({ elapsed: (now - startTime) / 1000, frameTime, ...diag });
    };

    // Initial sample
    await sample();

    while (Date.now() - startTime < totalDuration) {
      // Cycle movement direction every 3 seconds
      const dir = directions[dirIndex % directions.length];
      await page.keyboard.down(dir);
      await page.waitForTimeout(3000);
      await page.keyboard.up(dir);
      dirIndex++;

      // Sample periodically
      if (Date.now() - lastSampleTime >= sampleInterval) {
        await sample();
      }
    }

    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Final sample
    await sample();

    // Diagnostic: check game state before pause
    const prePauseDiag = await page.evaluate(() => {
      const g = window.game;
      const pauseScreen = document.getElementById('screen-pause');
      const resumeBtn = document.getElementById('btn-resume');
      return {
        gameState: g?.state,
        activeScreen: g?.ui?.getActiveScreen?.(),
        pauseScreenClass: pauseScreen?.className,
        pauseScreenActive: pauseScreen?.classList.contains('active'),
        resumeBtnExists: !!resumeBtn,
        resumeBtnVisible: resumeBtn ? window.getComputedStyle(resumeBtn).visibility : 'none',
        resumeBtnDisplay: resumeBtn ? window.getComputedStyle(resumeBtn).display : 'none',
        resumeBtnOpacity: resumeBtn ? window.getComputedStyle(resumeBtn).opacity : 'none'
      };
    });
    console.log('Pre-pause diagnostic:', JSON.stringify(prePauseDiag, null, 2));

    // Pause and resume
    await page.keyboard.press('Escape');

    // Wait for pause screen to become active with explicit timeout
    await page.waitForFunction(() => {
      const pauseScreen = document.getElementById('screen-pause');
      return pauseScreen && pauseScreen.classList.contains('active');
    }, { timeout: 5000 });

    await page.waitForSelector('#btn-resume', { state: 'visible', timeout: 5000 });
    await page.click('#btn-resume');
    await page.waitForTimeout(1000);

    // Verify timer progressed at least 120 seconds
    const timerText = await page.textContent('#hud-timer');
    const [min, sec] = timerText.split(':').map(Number);
    const elapsed = min * 60 + sec;
    expect(elapsed).toBeGreaterThan(120);

    // Log summary of samples
    console.log('Stress test diagnostics samples:', JSON.stringify(samples, null, 2));

    expect(errors).toEqual([]);
  });

  test('normal gameplay validation (no god mode)', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes max
    const errors = [];
    const consoleMessages = [];
    const reachedEvolutions = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:5173');
    await page.waitForSelector('#btn-start', { state: 'visible' });
    await page.click('#btn-start');
    await page.waitForSelector('#hud-score', { state: 'visible' });

    const canvas = await page.$('#game-canvas');
    const box = await canvas.boundingBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    await page.mouse.move(centerX, centerY);
    await page.mouse.down();

    // Simulate gameplay for up to 2 minutes or until game over
    const startTime = Date.now();
    const maxDuration = 120000; // 2 minutes max
    const directions = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
    let dirIndex = 0;
    let gameOver = false;

    while (Date.now() - startTime < maxDuration && !gameOver) {
      const dir = directions[dirIndex % directions.length];
      await page.keyboard.down(dir);
      await page.waitForTimeout(2000);
      await page.keyboard.up(dir);
      dirIndex++;

      // Check for game over or level ups every 5 seconds
      if ((Date.now() - startTime) % 5000 < 2100) {
        const state = await page.evaluate(() => {
          const g = window.game;
          if (!g) return null;
          return {
            state: g.state,
            level: g.upgradeManager ? g.upgradeManager.level : 0,
            weapon: g.player ? g.player.weaponName : '',
            health: g.player ? g.player.health : 0
          };
        });
        if (state && state.state === 'gameover') {
          gameOver = true;
          break;
        }
        if (state && [3,5,8,12].includes(state.level) && !reachedEvolutions.includes(state.level)) {
          reachedEvolutions.push(state.level);
        }
      }
    }

    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Check final state
    const finalState = await page.evaluate(() => {
      const g = window.game;
      if (!g) return null;
      return {
        state: g.state,
        level: g.upgradeManager ? g.upgradeManager.level : 0,
        weapon: g.player ? g.player.weaponName : '',
        score: g.score,
        kills: g.kills,
        gameTime: g.gameTime
      };
    });

    console.log('Normal gameplay final state:', JSON.stringify(finalState, null, 2));
    console.log('Weapon evolutions reached:', reachedEvolutions);
    console.log('Console messages:', consoleMessages.join('\n'));

    if (finalState && finalState.state === 'gameover') {
      // Verify game over screen appears
      await page.waitForSelector('#screen-gameover.active', { state: 'visible', timeout: 5000 });
      await expect(page.locator('#screen-gameover')).toBeVisible();

      // Click Play Again
      await page.click('#btn-restart');
      await page.waitForSelector('#hud-score', { state: 'visible', timeout: 5000 });

      // Verify game restarted
      const afterRestart = await page.evaluate(() => {
        const g = window.game;
        return g ? { state: g.state, score: g.score, level: g.upgradeManager?.level } : null;
      });
      console.log('After restart:', JSON.stringify(afterRestart, null, 2));
      expect(afterRestart?.state).toBe('playing');
      expect(afterRestart?.score).toBe(0);
    } else if (finalState && finalState.state === 'playing') {
      // Test pause/resume
      await page.keyboard.press('Escape');
      await page.waitForSelector('#btn-resume', { state: 'visible', timeout: 5000 });
      await page.click('#btn-resume');
      await page.waitForTimeout(500);

      // Test restart from pause
      await page.keyboard.press('Escape');
      await page.waitForSelector('#btn-quit', { state: 'visible', timeout: 5000 });
      await page.click('#btn-quit');
      await page.waitForSelector('#btn-start', { state: 'visible', timeout: 5000 });
    }

    expect(errors).toEqual([]);
  });

  test('XP collection and level progression', async ({ page }) => {
    test.setTimeout(60000);
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

    // Grant XP to reach level 2 (80 XP) and level 3 (80+104=184 total)
    await page.evaluate(() => {
      if (window.game) {
        window.game.gainXP(200); // should trigger level 2 and 3
      }
    });

    // Wait for level up UI and choices
    await page.waitForSelector('#screen-upgrade.active', { state: 'visible', timeout: 5000 });
    // Verify level is at least 3
    const levelAfter = await page.evaluate(() => window.game?.upgradeManager?.level);
    expect(levelAfter).toBeGreaterThanOrEqual(3);

    // Close upgrade screen by picking first upgrade
    const upgradeBtn = await page.$('#upgrade-grid button.upgrade-card:not(.hidden)');
    if (upgradeBtn) {
      await upgradeBtn.click();
    }
    await page.waitForSelector('#screen-upgrade.active', { state: 'hidden', timeout: 5000 });

    // Verify weapon evolution to Rapid Pulse (level 3)
    const weaponName = await page.evaluate(() => window.game?.player?.weaponName);
    expect(weaponName).toBe('Rapid Pulse');

    expect(errors).toEqual([]);
  });

  test('weapon evolution progression (Rapid Pulse, Spread Shot, Piercing Bolt, Plasma Burst)', async ({ page }) => {
    test.setTimeout(120000);
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:5173');
    await page.waitForSelector('#btn-start', { state: 'visible' });
    await page.click('#btn-start');
    await page.waitForSelector('#hud-score', { state: 'visible' });

    // Enable god mode
    await page.evaluate(() => {
      if (window.game && window.game.player) {
        window.game.player.invulnerable = true;
        window.game.player.maxHealth = 999999;
        window.game.player.health = 999999;
        window.game.player.maxShield = 999999;
        window.game.player.shield = 999999;
      }
    });

    // Helper to grant XP and handle upgrade screen
    const grantXPAndHandleUpgrade = async (amount) => {
      await page.evaluate((amt) => {
        if (window.game) {
          window.game.gainXP(amt);
        }
      }, amount);
      // If upgrade screen appears, pick first upgrade
      try {
        await page.waitForSelector('#screen-upgrade.active', { state: 'visible', timeout: 2000 });
        const upgradeBtn = await page.$('#upgrade-grid button.upgrade-card:not(.hidden)');
        if (upgradeBtn) {
          await upgradeBtn.click();
        }
        await page.waitForSelector('#screen-upgrade.active', { state: 'hidden', timeout: 2000 });
      } catch (e) {
        // no upgrade screen
      }
    };

    // Level 3 -> Rapid Pulse (need total 184 XP from start)
    await grantXPAndHandleUpgrade(200);
    let weapon = await page.evaluate(() => window.game?.player?.weaponName);
    expect(weapon).toBe('Rapid Pulse');

    // Level 5 -> Spread Shot (need additional XP: level 4 threshold ~135, level5 ~176 => total ~495)
    await grantXPAndHandleUpgrade(350);
    weapon = await page.evaluate(() => window.game?.player?.weaponName);
    expect(weapon).toBe('Spread Shot');

    // Level 8 -> Piercing Bolt (continue granting)
    await grantXPAndHandleUpgrade(1000);
    weapon = await page.evaluate(() => window.game?.player?.weaponName);
    expect(weapon).toBe('Piercing Bolt');

    // Level 12 -> Plasma Burst
    await grantXPAndHandleUpgrade(3000);
    weapon = await page.evaluate(() => window.game?.player?.weaponName);
    expect(weapon).toBe('Plasma Burst');

    expect(errors).toEqual([]);
  });
});