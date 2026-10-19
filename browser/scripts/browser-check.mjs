import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.PIERRE_URL || 'http://127.0.0.1:4187';
const output = process.env.PIERRE_SCREENSHOTS || '/tmp/pierre-browser-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', error => errors.push(error.message));
const requests = [];
page.on('request', request => requests.push(request.url()));
const snapshot = () => page.evaluate(() => window.__PIERRE_DEBUG__?.runtime?.snapshot);
const open = async mode => {
  await page.goto(base + '/' + mode);
  await page.locator('canvas').waitFor();
  await page.getByRole('button', { name: mode === 'original' ? 'Start original game' : 'Start adventure', exact: true }).waitFor();
};
const checkPatrols = async mode => {
  const expected = mode === 'original' ? [[307], [232, 307], [207], [], []] : [[307], [232, 307], [207], [-83], []];
  const tracks = ['training', 'egypt', 'egypt', 'snow', 'moon'];
  for (let level = 0; level < expected.length; level++) {
    const nextTrack = level > 0 && tracks[level] !== tracks[level - 1]
      ? page.waitForRequest(request => new RegExp(`/assets/derived/${tracks[level]}\\.(mp3|ogg)$`).test(request.url())) : null;
    await page.evaluate(level => window.__PIERRE_DEBUG__.controller.setLevel(level), level);
    await page.waitForFunction(level => window.__PIERRE_DEBUG__.runtime.snapshot.levelIndex === level, level);
    if (nextTrack) await nextTrack;
    const enemies = await page.evaluate(() => window.__PIERRE_DEBUG__.enemies);
    assert.deepEqual(enemies.map(enemy => enemy.y), expected[level], `${mode} chapter ${level + 1} corgis stand on their platforms`);
    assert(enemies.every(enemy => Number.isFinite(enemy.minX) && Number.isFinite(enemy.maxX) && enemy.x >= enemy.minX && enemy.x <= enemy.maxX));
    if (enemies.length) {
      await page.evaluate(enemy => {
        const player = { x: enemy.x - 50, y: enemy.y + 33 - 50 };
        window.__PIERRE_DEBUG__.controller.warpTo(player.x - 515, player.y - 50);
      }, enemies[0]);
      await page.waitForTimeout(750);
      await page.screenshot({ path: `${output}/${mode}-chapter-${level + 1}-corgi.png` });
    }
  }
  await page.evaluate(() => window.__PIERRE_DEBUG__.controller.setLevel(0));
  await page.waitForFunction(() => window.__PIERRE_DEBUG__.runtime.snapshot.levelIndex === 0);
};
const checkFlags = async mode => {
  const marker = await page.evaluate(() => window.__PIERRE_DEBUG__.checkpoints[0]);
  assert.equal(marker.active, false);
  assert.equal(marker.y, 340, 'Checkpoint pole sits on the floor rather than inside its trigger');
  await page.evaluate(marker => window.__PIERRE_DEBUG__.controller.warpTo(marker.x - 100 - 515, marker.y - 100), marker);
  await page.waitForTimeout(750);
  await page.screenshot({ path: `${output}/${mode}-checkpoint-unselected.png` });
  await page.evaluate(marker => window.__PIERRE_DEBUG__.controller.warpTo(marker.x - 515, marker.y - 100), marker);
  await page.waitForFunction(ordinal => window.__PIERRE_DEBUG__.runtime.snapshot.checkpointOrdinal === ordinal, marker.ordinal);
  assert.equal(await page.evaluate(() => window.__PIERRE_DEBUG__.checkpoints.filter(marker => marker.active).length), 1);
  await page.screenshot({ path: `${output}/${mode}-checkpoint-selected.png` });
  await page.evaluate(() => window.__PIERRE_DEBUG__.controller.setLevel(0));
  await page.waitForFunction(() => window.__PIERRE_DEBUG__.runtime.snapshot.checkpointOrdinal === -1 && window.__PIERRE_DEBUG__.runtime.playerWorldX === 415);
};
const assertLandscape = async () => {
  const landscape = await page.evaluate(() => window.__PIERRE_DEBUG__?.landscape);
  if (!landscape) return;
  assert.equal(landscape.type, 'Image', 'Landscape is a single image, not a repeating tile');
  assert(landscape.x <= 0 && landscape.y <= 0);
  assert(landscape.x + landscape.width >= landscape.viewWidth - 0.01, 'No exposed right edge');
  assert(landscape.y + landscape.height >= landscape.viewHeight - 0.01, 'No exposed bottom edge');
  assert(Math.abs(landscape.width / landscape.height - 1280 / 720) < 0.0001, 'Artwork aspect ratio is preserved');
};
const checkBackground = async mode => {
  for (const [name, worldX, worldY] of [['opening', 415, 290], ['far-right', 4315, 290], ['high-platform', 2355, -200]]) {
    await page.evaluate(({ worldX, worldY }) => window.__PIERRE_DEBUG__.controller.warpTo(worldX - 515, worldY - 50), { worldX, worldY });
    await page.waitForFunction(worldX => window.__PIERRE_DEBUG__.runtime.playerWorldX === worldX, worldX);
    await page.waitForTimeout(750);
    await assertLandscape();
    await page.screenshot({ path: `${output}/${mode}-background-${name}.png` });
  }
  await page.evaluate(() => window.__PIERRE_DEBUG__.controller.setLevel(0));
  await page.waitForFunction(() => window.__PIERRE_DEBUG__.runtime.playerWorldX === 415);
};
try {
  await open('refresh');
  assert.equal(requests.filter(url => /\.(wav|mp3|ogg)(\?|$)/.test(url)).length, 0, 'Menu must not download audio');
  await page.screenshot({ path: output + '/refresh-menu-desktop.png' });
  await page.getByRole('button', { name: 'Start adventure', exact: true }).click();
  const debug = await page.evaluate(() => Boolean(window.__PIERRE_DEBUG__));
  if (debug) { await checkPatrols('refresh'); await checkFlags('refresh'); await checkBackground('refresh'); }
  await page.keyboard.down('ArrowRight');
  if (debug) {
    await page.waitForFunction(() => window.__PIERRE_DEBUG__.playerTexture === 'player-run-right');
    const frame = await page.evaluate(() => window.__PIERRE_DEBUG__.animationFrame);
    await page.waitForFunction(frame => window.__PIERRE_DEBUG__.animationFrame !== frame, frame);
  }
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('KeyA'); await page.keyboard.down('ArrowLeft'); await page.keyboard.up('KeyA');
  if (debug) await page.waitForFunction(() => window.__PIERRE_DEBUG__.runtime.snapshot.leftPressed);
  await page.keyboard.up('ArrowLeft');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('heading', { name: 'Taking a breather' }).waitFor();
  await page.getByRole('button', { name: 'Resume', exact: true }).last().click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#bind-left').click(); await page.keyboard.press('KeyQ');
  assert.equal(await page.locator('#bind-left').textContent(), 'Q');
  await page.getByRole('button', { name: 'Reset controls', exact: true }).click();
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.screenshot({ path: output + '/refresh-playing-desktop.png' });
  if (debug) {
    for (let death = 0; death < 5; death++) {
      await page.evaluate(() => window.__PIERRE_DEBUG__.controller.warpTo(0, 500));
      await page.waitForFunction(lives => window.__PIERRE_DEBUG__.runtime.snapshot.lives === lives, 4 - death);
      if (death < 4) await page.waitForFunction(() => window.__PIERRE_DEBUG__.runtime.snapshot.deathMs === 0);
    }
    await page.getByRole('button', { name: 'Retry chapter', exact: true }).click();
    await page.waitForFunction(() => window.__PIERRE_DEBUG__.runtime.snapshot.status === 'playing' && window.__PIERRE_DEBUG__.runtime.snapshot.lives === 5);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.getByRole('heading', { name: 'Taking a breather' }).waitFor();
    await page.getByRole('button', { name: 'Resume', exact: true }).last().click();
  }
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(() => {
      const r = document.querySelector('canvas').getBoundingClientRect();
      return r.width > 100 && r.height > 100 && r.top >= 0 && r.bottom <= innerHeight;
    });
    const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.equal(sizes.scroll, sizes.width, 'No horizontal overflow');
    await assertLandscape();
    await page.screenshot({ path: output + '/refresh-' + viewport.width + 'x' + viewport.height + '.png' });
  }
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await mobile.newPage();
  phone.on('pageerror', error => errors.push(error.message));
  await phone.goto(base + '/refresh');
  await phone.getByRole('button', { name: 'Start adventure', exact: true }).click();
  const right = await phone.getByRole('button', { name: 'Move right', exact: true }).boundingBox();
  const jump = await phone.getByRole('button', { name: 'Jump', exact: true }).boundingBox();
  const cdp = await mobile.newCDPSession(phone);
  const first = { x: right.x + right.width / 2, y: right.y + right.height / 2, id: 1 };
  const second = { x: jump.x + jump.width / 2, y: jump.y + jump.height / 2, id: 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  if (debug) await phone.waitForFunction(() => window.__PIERRE_DEBUG__.runtime.snapshot.rightPressed);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (debug) await phone.waitForFunction(() => !window.__PIERRE_DEBUG__.runtime.snapshot.rightPressed);
  await phone.screenshot({ path: output + '/refresh-touch.png' });
  await mobile.close();
  const silent = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  silent.on('pageerror', error => errors.push(error.message));
  await silent.route(/\/assets\/derived\/.*\.(mp3|ogg)$/, route => route.abort());
  await silent.goto(base + '/refresh');
  await silent.getByRole('button', { name: 'Start adventure', exact: true }).click();
  await silent.locator('#audio-status').waitFor({ state: 'visible' });
  assert.equal(await silent.locator('#overlay').isHidden(), true, 'Audio failure must not block play');
  await silent.close();
  const failed = await browser.newPage();
  failed.on('pageerror', error => errors.push(error.message));
  await failed.route('**/Background%201.png', route => route.abort());
  await failed.goto(base + '/refresh');
  await failed.getByRole('button', { name: 'Try again', exact: true }).waitFor();
  await failed.unroute('**/Background%201.png');
  await failed.getByRole('button', { name: 'Try again', exact: true }).click();
  await failed.getByRole('button', { name: 'Start adventure', exact: true }).waitFor();
  await failed.close();
  await page.setViewportSize({ width: 1440, height: 900 });
  await open('original');
  await page.getByRole('button', { name: 'Controls', exact: true }).click();
  await page.getByRole('button', { name: 'Remap left', exact: true }).click();
  await page.keyboard.press('Digit2');
  await page.getByRole('button', { name: 'Back to menu', exact: true }).click();
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await page.getByRole('button', { name: 'Back to menu', exact: true }).click();
  await page.screenshot({ path: output + '/original-menu.png' });
  const originalTraining = page.waitForRequest(request => /\/assets\/derived\/training\.(mp3|ogg)$/.test(request.url()));
  await page.getByRole('button', { name: 'Start original game', exact: true }).click();
  await originalTraining;
  if (debug) {
    await page.waitForFunction(() => window.__PIERRE_DEBUG__.started);
    const opening = await page.evaluate(() => window.__PIERRE_DEBUG__.runtime);
    assert.equal(opening.snapshot.levelIndex, 0, 'Original starts on the first chapter');
    assert.equal(opening.playerWorldY, 290, 'Original starts on the ground, not above the opening');
    await checkPatrols('original');
    await checkFlags('original');
    await checkBackground('original');
  }
  await page.keyboard.down('Digit3');
  if (debug) await page.waitForFunction(() => window.__PIERRE_DEBUG__.runtime.snapshot.rightPressed);
  await page.keyboard.up('Digit3');
  if (debug) {
    const count = await page.evaluate(() => window.__PIERRE_DEBUG__.sceneObjects);
    for (let cycle = 0; cycle < 2; cycle++) {
      for (let death = 0; death < 5; death++) {
        await page.evaluate(() => window.__PIERRE_DEBUG__.controller.warpTo(0, 500));
        await page.waitForFunction(lives => window.__PIERRE_DEBUG__.runtime.snapshot.lives === lives, 4 - death);
        if (death < 4) await page.waitForFunction(() => window.__PIERRE_DEBUG__.runtime.snapshot.deathMs === 0);
      }
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await page.getByRole('button', { name: 'Start original game', exact: true }).click();
      assert.equal(await page.evaluate(() => window.__PIERRE_DEBUG__.sceneObjects), count);
    }
  }
  await page.screenshot({ path: output + '/original-playing.png' });
  assert.equal(requests.some(url => /\.wav(\?|$)/.test(url)), false, 'No raw WAV requests');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log(JSON.stringify({ passed: true, debugChecks: debug, screenshots: output, audioRequests: requests.filter(url => /\.(mp3|ogg)(\?|$)/.test(url)).length }, null, 2));
} finally { await browser.close(); }
