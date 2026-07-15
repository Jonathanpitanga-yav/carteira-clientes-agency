const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = 'C:\\Users\\YAVER\\AppData\\Local\\Temp\\opencode\\screenshots';

const urls = [
  { path: '/', name: '01-home' },
  { path: '/admin/analytics', name: '02-admin-analytics' },
  { path: '/admin/analytics/share', name: '03-admin-analytics-share' },
  { path: '/admin/analytics/benchmarks', name: '04-admin-analytics-benchmarks' },
  { path: '/admin/analytics/clients', name: '05-admin-analytics-clients' },
  { path: '/admin/analytics/clients/abc', name: '06-admin-analytics-clients-abc' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  for (const { path, name } of urls) {
    const page = await context.newPage();
    const url = BASE_URL + path;
    console.log(`\n=== Navigating to: ${url} ===`);
    try {
      await page.goto(url, { timeout: 15000, waitUntil: 'networkidle' });
      const title = await page.title();
      const bodyText = await page.locator('body').innerText().catch(() => '(could not extract text)');
      const truncated = bodyText.substring(0, 500);
      console.log(`STATUS: OK (loaded successfully)`);
      console.log(`TITLE: ${title}`);
      console.log(`CONTENT: ${truncated.replace(/\n/g, ' | ')}`);
      await page.screenshot({ path: `${SCREENSHOT_DIR}\\${name}.png`, fullPage: true });
      console.log(`SCREENSHOT: saved to ${name}.png`);
    } catch (err) {
      console.log(`STATUS: ERROR`);
      console.log(`ERROR: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\n=== All done ===');
})();
