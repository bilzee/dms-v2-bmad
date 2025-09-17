const { chromium } = require('@playwright/test');

(async () => {
  console.log('Testing interactive map with authentication...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Enable console logging
    page.on('console', msg => console.log('Console:', msg.text()));
    page.on('pageerror', error => console.log('Page error:', error.message));
    
    // Navigate to the map page
    console.log('Navigating to http://localhost:3001/monitoring/map...');
    await page.goto('http://localhost:3001/monitoring/map', { waitUntil: 'domcontentloaded' });
    
    // Wait for redirect to complete
    await page.waitForLoadState('domcontentloaded');
    
    // Check if we're on the signin page
    if (page.url().includes('/signin')) {
      console.log('✓ Redirected to signin page - proceeding with login');
      
      // Fill in the admin credentials
      console.log('Filling in admin credentials...');
      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'admin123');
      
      // Click the sign in button
      console.log('Clicking sign in button...');
      await page.click('button[type="submit"]');
      
      // Wait for navigation to complete
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Check if we're now on the map page
      const currentUrl = page.url();
      console.log('Current URL after login:', currentUrl);
      
      if (currentUrl.includes('/monitoring/map')) {
        console.log('✓ Successfully logged in and redirected to map page');
      } else {
        console.log('⚠ Not on map page, trying to navigate manually...');
        await page.goto('http://localhost:3001/monitoring/map', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle');
      }
    }
    
    // Take a screenshot of the map page
    await page.screenshot({ path: 'map-page-after-login.png', fullPage: true });
    console.log('Screenshot saved as map-page-after-login.png');
    
    // Check for map elements
    const elements = {
      'Interactive Mapping heading': await page.$('h1, h2, h3', { hasText: 'Interactive Mapping' }),
      'Leaflet map container': await page.$('.leaflet-container'),
      'Map markers': await page.$('[data-testid="marker"], .leaflet-marker-icon'),
      'Layer controls': await page.$('button', { hasText: /Entities|Assessments|Responses/i }),
      'Loading indicator': await page.$('[class*="loading"], [class*="spinner"]'),
      'Error message': await page.$('[class*="error"], .error, .alert-error'),
    };
    
    console.log('Element analysis after login:');
    for (const [name, element] of Object.entries(elements)) {
      console.log(`  ${name}: ${element ? 'Found' : 'Not found'}`);
    }
    
    // Check page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for API calls (even if they fail)
    console.log('Checking for API calls...');
    page.on('request', request => {
      if (request.url().includes('/api/v1/monitoring/map/')) {
        console.log('API request:', request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/v1/monitoring/map/')) {
        console.log('API response:', response.url(), '-', response.status());
      }
    });
    
    // Wait a bit to see if the map loads
    console.log('Waiting 5 seconds for map to load...');
    await page.waitForTimeout(5000);
    
    // Take another screenshot
    await page.screenshot({ path: 'map-page-after-wait.png', fullPage: true });
    console.log('Second screenshot saved as map-page-after-wait.png');
    
    // Check again for map elements
    const mapContainerAfterWait = await page.$('.leaflet-container');
    if (mapContainerAfterWait) {
      console.log('✓ Leaflet map container found after wait');
    } else {
      console.log('✗ Leaflet map container still not found');
    }
    
    // Check for any error messages that might be displayed
    const errorText = await page.$$eval('[class*="error"], .error, .alert-error, .text-red-600', elements => 
      elements.map(el => el.textContent?.trim()).filter(text => text)
    );
    
    if (errorText.length > 0) {
      console.log('Error messages found:', errorText);
    } else {
      console.log('No error messages found');
    }
    
    // Try to click on refresh button if it exists
    const refreshButton = await page.$('button', { hasText: 'Refresh' });
    if (refreshButton) {
      console.log('Clicking refresh button...');
      await refreshButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'map-page-after-refresh.png', fullPage: true });
      console.log('Screenshot after refresh saved');
    }
    
  } catch (error) {
    console.error('Error during testing:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('Test completed');
})();