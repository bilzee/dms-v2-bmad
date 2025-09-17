const { chromium } = require('playwright');

(async () => {
  console.log('Starting interactive map test...');
  
  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  // Listen for network requests
  page.on('request', request => {
    if (request.url().includes('/api/v1/')) {
      console.log('API Request:', request.method(), request.url());
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('/api/v1/')) {
      try {
        const body = await response.text();
        console.log('API Response:', response.status(), response.url(), body.substring(0, 200));
      } catch (e) {
        console.log('API Response:', response.status(), response.url());
      }
    }
  });
  
  try {
    // Navigate to monitoring/map page
    console.log('Navigating to http://localhost:3001/monitoring/map...');
    await page.goto('http://localhost:3001/monitoring/map', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for page to load
    console.log('Waiting for page to load...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'map-initial-state.png', fullPage: true });
    console.log('Screenshot saved: map-initial-state.png');
    
    // Check if map container exists
    const mapContainer = await page.$('#map-container, .map-container, [data-testid="map-container"], .leaflet-container');
    if (mapContainer) {
      console.log('✓ Map container found');
    } else {
      console.log('✗ Map container not found');
    }
    
    // Wait for map to load (look for leaflet elements)
    await page.waitForTimeout(5000);
    
    // Check for map elements
    const leafletContainer = await page.$('.leaflet-container');
    if (leafletContainer) {
      console.log('✓ Leaflet map container found');
      
      // Check for markers
      const markers = await page.$$('.leaflet-marker-icon');
      console.log(`✓ Found ${markers.length} markers`);
      
      // Check for layer controls
      const layerControls = await page.$$('.leaflet-control-layers, .map-controls, [data-testid="layer-controls"]');
      console.log(`✓ Found ${layerControls.length} layer controls`);
      
      // Test layer controls if found
      if (layerControls.length > 0) {
        console.log('Testing layer controls...');
        await layerControls[0].click();
        await page.waitForTimeout(2000);
        
        // Take screenshot with layer controls open
        await page.screenshot({ path: 'map-layer-controls.png' });
        console.log('Screenshot saved: map-layer-controls.png');
      }
      
      // Test map interaction
      console.log('Testing map interaction...');
      await page.mouse.move(400, 300);
      await page.mouse.down();
      await page.mouse.move(450, 350);
      await page.mouse.up();
      await page.waitForTimeout(1000);
      
      // Take screenshot after interaction
      await page.screenshot({ path: 'map-after-interaction.png' });
      console.log('Screenshot saved: map-after-interaction.png');
      
    } else {
      console.log('✗ Leaflet map container not found');
    }
    
    // Check for any error messages
    const errorMessages = await page.$$('.error, .alert-error, [data-testid="error"]');
    console.log(`Found ${errorMessages.length} error messages`);
    
    // Get page title and URL
    const title = await page.title();
    const url = page.url();
    console.log(`Page title: ${title}`);
    console.log(`Final URL: ${url}`);
    
    // Final screenshot
    await page.screenshot({ path: 'map-final-state.png', fullPage: true });
    console.log('Screenshot saved: map-final-state.png');
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'map-error-state.png', fullPage: true });
    console.log('Error screenshot saved: map-error-state.png');
  } finally {
    await browser.close();
  }
  
  console.log('Test completed');
})();