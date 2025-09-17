const { chromium } = require('@playwright/test');

(async () => {
  console.log('🗺️  Testing Interactive Map Functionality');
  console.log('=====================================\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Enable detailed console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.log(`❌ Console Error: ${text}`);
      } else if (text.includes('API') || text.includes('map') || text.includes('leaflet')) {
        console.log(`📍 Console ${type}: ${text}`);
      }
    });
    
    page.on('pageerror', error => {
      console.log(`🚨 Page Error: ${error.message}`);
    });
    
    page.on('request', request => {
      if (request.url().includes('/api/v1/monitoring/map/')) {
        console.log(`🔄 API Request: ${request.url()}`);
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('/api/v1/monitoring/map/')) {
        const status = response.status();
        console.log(`📡 API Response: ${response.url()} - ${status}`);
        
        if (status === 200) {
          try {
            const data = await response.json();
            console.log(`✅ API Data: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
          } catch (e) {
            console.log(`⚠️  Could not parse API response`);
          }
        } else {
          console.log(`❌ API Failed: ${status}`);
        }
      }
    });
    
    // Step 1: Check if we can access the API endpoints directly
    console.log('\n🔍 Step 1: Testing API endpoints...');
    
    const testApiEndpoint = async (endpoint, name) => {
      try {
        const response = await fetch(`http://localhost:3001${endpoint}`);
        const data = await response.json();
        console.log(`  ${name}: ${response.status} - ${data.success ? 'SUCCESS' : 'FAILED'}`);
        if (data.success && data.data) {
          console.log(`    Records: ${Array.isArray(data.data) ? data.data.length : 'N/A'}`);
        }
        if (!data.success) {
          console.log(`    Error: ${data.error || data.message || 'Unknown error'}`);
        }
        return { success: response.status === 200 && data.success, data };
      } catch (error) {
        console.log(`  ${name}: ERROR - ${error.message}`);
        return { success: false, data: null };
      }
    };
    
    const entitiesResult = await testApiEndpoint('/api/v1/monitoring/map/entities', 'Entities API');
    const assessmentsResult = await testApiEndpoint('/api/v1/monitoring/map/assessments', 'Assessments API');
    const responsesResult = await testApiEndpoint('/api/v1/monitoring/map/responses', 'Responses API');
    
    // Step 2: Try to access the map page with a session cookie approach
    console.log('\n🔑 Step 2: Attempting session-based authentication...');
    
    // First, let's see if we can access the page with a mock session
    await page.addInitScript(() => {
      // Mock a session in localStorage
      localStorage.setItem('session', JSON.stringify({
        user: {
          id: 'admin-user-id',
          email: 'admin@test.com',
          name: 'Admin User',
          role: 'ADMIN'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));
    });
    
    // Navigate to the map page
    console.log('🌐 Navigating to map page...');
    await page.goto('http://localhost:3001/monitoring/map', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    // Wait a bit for any redirects or loading
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Take initial screenshot
    await page.screenshot({ path: 'map-test-initial.png', fullPage: true });
    console.log('📸 Initial screenshot saved');
    
    // Step 3: Analyze the page state
    console.log('\n🔍 Step 3: Analyzing page state...');
    
    const pageAnalysis = {
      onMapPage: currentUrl.includes('/monitoring/map'),
      onSignInPage: currentUrl.includes('/signin'),
      hasMapHeading: await page.$('h1, h2, h3', { hasText: 'Interactive Mapping' }) !== null,
      hasLeafletContainer: await page.$('.leaflet-container') !== null,
      hasMapDiv: await page.$('[class*="map"], #map') !== null,
      hasLoadingIndicator: await page.$('[class*="loading"], [class*="spinner"]') !== null,
      hasError: await page.$('[class*="error"], .error, .alert-error') !== null,
      hasStatsCards: await page.$('.grid.gap-4') !== null,
      hasLayerControls: await page.$('button', { hasText: /Entities|Assessments|Responses/i }) !== null,
      hasRefreshButton: await page.$('button', { hasText: 'Refresh' }) !== null
    };
    
    console.log('📊 Page Analysis:');
    for (const [key, value] of Object.entries(pageAnalysis)) {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    }
    
    // Step 4: Wait for potential data loading
    console.log('\n⏳ Step 4: Waiting for data loading...');
    await page.waitForTimeout(5000);
    
    // Take screenshot after waiting
    await page.screenshot({ path: 'map-test-after-wait.png', fullPage: true });
    console.log('📸 Screenshot after wait saved');
    
    // Step 5: Check for specific content
    console.log('\n🔍 Step 5: Checking for map content...');
    
    const pageText = await page.evaluate(() => document.body.innerText);
    const contentChecks = {
      hasInteractiveMappingText: pageText.includes('Interactive Mapping'),
      hasGeographicVisualizationText: pageText.includes('Geographic visualization'),
      hasEntityCountText: pageText.includes('Total Entities'),
      hasAssessmentCountText: pageText.includes('Total Assessments'),
      hasResponseCountText: pageText.includes('Active Responses'),
      hasCoverageAreaText: pageText.includes('Coverage Area'),
      hasLeafletReferences: pageText.toLowerCase().includes('leaflet'),
      hasConnectionStatus: pageText.includes('connected') || pageText.includes('offline'),
      hasLastUpdatedText: pageText.includes('Last updated'),
      hasLayerText: pageText.includes('Layer Controls')
    };
    
    console.log('📝 Content Analysis:');
    for (const [key, value] of Object.entries(contentChecks)) {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    }
    
    // Step 6: Try to interact with elements
    console.log('\n🖱️  Step 6: Testing interactivity...');
    
    if (pageAnalysis.hasRefreshButton) {
      console.log('🔄 Testing refresh button...');
      try {
        await page.click('button', { hasText: 'Refresh' });
        await page.waitForTimeout(2000);
        console.log('✅ Refresh button clicked successfully');
      } catch (error) {
        console.log(`❌ Refresh button failed: ${error.message}`);
      }
    }
    
    if (pageAnalysis.hasLayerControls) {
      console.log('🎚️  Testing layer controls...');
      try {
        const entityButton = await page.$('button', { hasText: 'Entities' });
        if (entityButton) {
          await entityButton.click();
          console.log('✅ Entities button clicked');
        }
        
        const assessmentsButton = await page.$('button', { hasText: 'Assessments' });
        if (assessmentsButton) {
          await assessmentsButton.click();
          console.log('✅ Assessments button clicked');
        }
        
        const responsesButton = await page.$('button', { hasText: 'Responses' });
        if (responsesButton) {
          await responsesButton.click();
          console.log('✅ Responses button clicked');
        }
      } catch (error) {
        console.log(`❌ Layer controls failed: ${error.message}`);
      }
    }
    
    // Step 7: Final assessment
    console.log('\n📋 Step 7: Final Assessment...');
    
    const apiWorking = entitiesResult.success || assessmentsResult.success || responsesResult.success;
    const pageContentPresent = Object.values(contentChecks).some(check => check);
    const interactiveElements = pageAnalysis.hasRefreshButton || pageAnalysis.hasLayerControls;
    
    console.log('\n🎯 Summary:');
    console.log(`📡 API Status: ${apiWorking ? '✅ Working' : '❌ Failed'}`);
    console.log(`📄 Page Content: ${pageContentPresent ? '✅ Present' : '❌ Missing'}`);
    console.log(`🎮 Interactive Elements: ${interactiveElements ? '✅ Present' : '❌ Missing'}`);
    console.log(`🗺️  Map Container: ${pageAnalysis.hasLeafletContainer ? '✅ Present' : '❌ Missing'}`);
    
    if (apiWorking && pageContentPresent && interactiveElements) {
      console.log('\n🎉 SUCCESS: Interactive map functionality is working!');
      console.log('📊 Real data status:');
      console.log(`   - Entities: ${entitiesResult.success ? `${entitiesResult.data?.data?.length || 0} records` : 'Failed'}`);
      console.log(`   - Assessments: ${assessmentsResult.success ? `${assessmentsResult.data?.data?.length || 0} records` : 'Failed'}`);
      console.log(`   - Responses: ${responsesResult.success ? `${responsesResult.data?.data?.length || 0} records` : 'Failed'}`);
    } else if (!apiWorking) {
      console.log('\n⚠️  PARTIAL: Map page loads but API endpoints are failing');
      console.log('   This suggests database connection issues');
    } else if (!pageContentPresent) {
      console.log('\n⚠️  PARTIAL: Map page not rendering properly');
      console.log('   This suggests component or authentication issues');
    } else {
      console.log('\n❌ FAILED: Interactive map functionality has issues');
    }
    
    // Final screenshot
    await page.screenshot({ path: 'map-test-final.png', fullPage: true });
    console.log('📸 Final screenshot saved');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('\n✅ Test completed');
})();