const { chromium } = require('@playwright/test');

(async () => {
  console.log('Debugging map page navigation...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Enable console logging
    page.on('console', msg => console.log('Console:', msg.text()));
    page.on('pageerror', error => console.log('Page error:', error.message));
    
    // Navigate to the map page
    console.log('Navigating to http://localhost:3001/monitoring/map...');
    await page.goto('http://localhost:3001/monitoring/map', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check if we were redirected
    if (currentUrl.includes('/signin')) {
      console.log('✗ Redirected to signin page - authentication required');
    } else if (currentUrl.includes('/monitoring/map')) {
      console.log('✓ On the correct map page');
    } else {
      console.log('⚠ On unexpected page:', currentUrl);
    }
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for authentication forms
    const signinForm = await page.$('form[action*="signin"], form[action*="auth"]');
    if (signinForm) {
      console.log('✗ Authentication form found - need to login');
    } else {
      console.log('✓ No authentication form found');
    }
    
    // Get page content to understand what's being rendered
    const bodyText = await page.$eval('body', el => el.textContent?.substring(0, 500) || '');
    console.log('Body text preview:', bodyText);
    
    // Check for common elements
    const elements = {
      'Interactive Mapping': await page.$('h1, h2, h3', { hasText: 'Interactive Mapping' }),
      'Map container': await page.$('.leaflet-container, #map, [class*="map"]'),
      'Loading indicator': await page.$('[class*="loading"], [class*="spinner"], .loading'),
      'Error message': await page.$('[class*="error"], .error, .alert-error'),
      'Login form': await page.$('form, input[type="email"], input[type="password"]'),
    };
    
    console.log('Element analysis:');
    for (const [name, element] of Object.entries(elements)) {
      console.log(`  ${name}: ${element ? 'Found' : 'Not found'}`);
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'map-page-debug.png', fullPage: true });
    console.log('Debug screenshot saved as map-page-debug.png');
    
  } catch (error) {
    console.error('Error during testing:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('Debug completed');
})();