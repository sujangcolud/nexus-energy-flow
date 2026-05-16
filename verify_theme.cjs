const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 Pro

  // Login
  await page.goto('http://localhost:8080/');
  await page.fill('input[type="email"]', 'sujan1nepal@gmail.com');
  await page.fill('input[type="password"]', 'precioussn');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000); // Wait for dashboard to load

  // Take screenshot of Dashboard
  await page.screenshot({ path: 'theme_dashboard.png' });

  // Navigate to Orders
  await page.click('text=Orders');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'theme_orders.png' });

  // Navigate to Expenses
  await page.goto('http://localhost:8080/');
  await page.waitForTimeout(1000);
  await page.click('text=Expenses');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'theme_expenses.png' });

  // Navigate to Daily Summary
  await page.goto('http://localhost:8080/');
  await page.waitForTimeout(1000);
  await page.click('text=Reports');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'theme_reports.png' });

  await browser.close();
})();
