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
      await page.goto(base + '/' + mode);
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
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    assert.deepEqual(errors, []);
    console.log(name + ': both editions render and respond without runtime errors');
  } finally { await browser.close(); }
}
