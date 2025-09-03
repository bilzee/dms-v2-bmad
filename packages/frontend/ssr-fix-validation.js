/**
 * SSR Fix Validation Test
 * Tests if the Leaflet map component loads without SSR errors
 */

const { chromium } = require('playwright');

async function validateMapComponent() {
  console.log('🔍 Starting SSR fix validation test...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Track console errors
  const consoleErrors = [];
  const networkErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  page.on('requestfailed', request => {
    networkErrors.push(`${request.method()} ${request.url()} - ${request.failure().errorText}`);
  });

  try {
    console.log('📍 Navigating to map page...');
    
    // Navigate to the map page with timeout
    await page.goto('http://localhost:3001/monitoring/map', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    console.log('✅ Page navigation successful');

    // Wait for the page to load and look for key elements
    console.log('🔄 Waiting for map components to load...');
    
    // Check for page title - get the Interactive Mapping heading specifically
    const title = await page.locator('h2:has-text("Interactive Mapping")').textContent({ timeout: 10000 });
    console.log(`📝 Page title: "${title}"`);
    
    // Wait for the map wrapper to be present - be more flexible
    try {
      await page.waitForSelector('div[class*="rounded-lg border"]', { timeout: 10000 });
      console.log('🗺️  Map container found');
    } catch (e) {
      console.log('⚠️  Specific map container not found, checking for any content...');
      // Try to find any loading or content elements
      const hasAnyContent = await page.locator('text=Loading').count() > 0 || 
                           await page.locator('text=Interactive Mapping').count() > 0;
      console.log(`🔍  Has page content: ${hasAnyContent}`);
    }
    
    // Check for loading states or actual map
    const hasLoadingText = await page.locator('text=Loading interactive map').count();
    const hasMapContent = await page.locator('.leaflet-container').count();
    
    console.log(`⏳ Loading indicators: ${hasLoadingText}`);
    console.log(`🗺️  Leaflet containers: ${hasMapContent}`);
    
    // Wait a bit more for dynamic loading
    await page.waitForTimeout(5000);
    
    // Check again for map content after dynamic loading
    const finalMapCount = await page.locator('.leaflet-container').count();
    console.log(`🗺️  Final Leaflet containers: ${finalMapCount}`);
    
    // Check for layer controls
    const entityButton = await page.locator('button:has-text("Entities")').count();
    const assessmentButton = await page.locator('button:has-text("Assessments")').count();
    const responseButton = await page.locator('button:has-text("Responses")').count();
    
    console.log(`🎛️  Layer controls found - Entities: ${entityButton}, Assessments: ${assessmentButton}, Responses: ${responseButton}`);
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'map-component-validation.png', fullPage: true });
    console.log('📸 Screenshot saved as map-component-validation.png');
    
    // Summary
    console.log('\n📊 VALIDATION RESULTS:');
    console.log(`✅ Page loads without navigation errors: ${networkErrors.length === 0}`);
    console.log(`✅ No SSR-related console errors: ${!consoleErrors.some(e => e.includes('window is not defined'))}`);
    console.log(`✅ Map container loads: ${finalMapCount > 0 ? 'YES' : 'NO'}`);
    console.log(`✅ Layer controls present: ${entityButton + assessmentButton + responseButton >= 3 ? 'YES' : 'NO'}`);
    
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Console Errors:');
      consoleErrors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (networkErrors.length > 0) {
      console.log('\n⚠️  Network Errors:');
      networkErrors.forEach(error => console.log(`   - ${error}`));
    }
    
    const success = networkErrors.length === 0 && 
                   !consoleErrors.some(e => e.includes('window is not defined')) &&
                   (finalMapCount > 0 || hasLoadingText > 0);
    
    console.log(`\n🎯 OVERALL RESULT: ${success ? '✅ SUCCESS - SSR fixes are working!' : '❌ FAILED - Issues detected'}`);
    
    return success;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

validateMapComponent().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Validation script crashed:', error);
  process.exit(1);
});