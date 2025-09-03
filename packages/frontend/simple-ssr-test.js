/**
 * Simple SSR Fix Validation
 * Tests if the page loads without "window is not defined" errors
 */

const { chromium } = require('playwright');

async function testSSRFix() {
  console.log('🔍 Testing SSR fix...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Track console errors
  const consoleErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    console.log('📍 Navigating to map page...');
    
    // Navigate to the map page
    await page.goto('http://localhost:3001/monitoring/map', { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });

    console.log('✅ Page navigation successful');

    // Check for the page title
    const title = await page.locator('h2').first().textContent({ timeout: 5000 });
    console.log(`📝 Found title: "${title}"`);
    
    // Wait for any content to load
    await page.waitForTimeout(3000);
    
    // Take a screenshot
    await page.screenshot({ path: 'ssr-test-result.png', fullPage: true });
    console.log('📸 Screenshot saved as ssr-test-result.png');
    
    // Check for SSR-specific errors
    const hasSSRError = consoleErrors.some(error => 
      error.includes('window is not defined') || 
      error.includes('document is not defined') ||
      error.includes('navigator is not defined')
    );
    
    console.log('\n📊 RESULTS:');
    console.log(`✅ Page loads successfully: true`);
    console.log(`✅ No SSR errors: ${!hasSSRError}`);
    console.log(`✅ Console errors count: ${consoleErrors.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Console Messages:');
      consoleErrors.forEach(error => console.log(`   - ${error.substring(0, 100)}...`));
    }
    
    const success = !hasSSRError;
    console.log(`\n🎯 RESULT: ${success ? '✅ SSR FIX SUCCESS!' : '❌ SSR Issues Remain'}`);
    
    return success;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testSSRFix().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});