import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, firefox, webkit } from 'playwright';

const base = process.env.PIERRE_URL || 'http://127.0.0.1:4187';
const out = process.env.PIERRE_SCREENSHOTS || '/tmp/pierre-cross-browser';
await mkdir(out, { recursive: true });
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch({ headless: true, ...(name === 'chromium' ? { channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const mode of ['original', 'refresh']) {
      if (mode === 'original') await page.goto(base + '/original/');
      else await page.getByRole('link', { name: 'Refresh', exact: true }).click();
      await page.getByRole('button', { name: mode === 'original' ? 'Start original game' : 'Start adventure', exact: true }).click();
      await page.keyboard.down(mode === 'original' ? 'Digit3' : 'ArrowRight');
      await page.waitForFunction(() => !document.querySelector('#overlay').textContent.trim());
      await page.keyboard.up(mode === 'original' ? 'Digit3' : 'ArrowRight');
      await page.screenshot({ path: out + '/' + name + '-' + mode + '.png' });
      const image = await page.locator('canvas').screenshot();
      assert(image.byteLength > 10000, name + ' must render actual artwork');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => {
        const r = document.querySelector('canvas').getBoundingClientRect();
        return r.width > 100 && r.bottom <= innerHeight;
      });
      await page.screenshot({ path: out + '/' + name + '-' + mode + '-phone.png' });
      if (mode === 'refresh' && await page.evaluate(() => Boolean(window.__PIERRE_DEBUG__))) {
        for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }]) {
          await page.setViewportSize(viewport);
          for (let chapter = 1; chapter < 5; chapter++) {
            await page.evaluate(chapter => window.__PIERRE_DEBUG__.controller.setLevel(chapter), chapter);
            await page.waitForFunction(chapter => window.__PIERRE_DEBUG__.runtime.snapshot.levelIndex === chapter, chapter);
            const landscape = await page.evaluate(() => window.__PIERRE_DEBUG__.landscape);
            assert.equal(landscape.texture, ['landscape', 'refresh-dunes', 'refresh-ruins', 'refresh-snow', 'refresh-moon'][chapter]);
            assert(landscape.x <= 0 && landscape.y <= 0 && landscape.x + landscape.width >= landscape.viewWidth - 0.01 && landscape.y + landscape.height >= landscape.viewHeight - 0.01);
            assert((await page.locator('canvas').screenshot()).byteLength > 10000, 'Chapter artwork must be nonblank');
            await page.screenshot({ path: `${out}/${name}-refresh-chapter-${chapter + 1}-${viewport.width}.png` });
          }
        }
      }
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.reload();
      await page.getByRole('button', { name: mode === 'original' ? 'Start original game' : 'Start adventure', exact: true }).waitFor();
    }
    await page.getByRole('link', { name: 'Original', exact: true }).click();
    await page.getByRole('button', { name: 'Start original game', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(name + ': both editions render and respond without runtime errors');
  } finally { await browser.close(); }
}
