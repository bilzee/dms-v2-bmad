const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function captureUIScreenshots() {
  // Create screenshots directory if it doesn't exist
  const screenshotsDir = path.join(__dirname, 'ui-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Add delay for better visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:3000...');
    
    // Navigate to the application
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait a bit for any animations or loading to complete
    await page.waitForTimeout(3000);

    // Take main page screenshot
    console.log('Taking main page screenshot...');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-main-page-full.png'),
      fullPage: true
    });

    // Take viewport screenshot (above the fold)
    await page.screenshot({ 
      path: path.join(screenshotsDir, '02-main-page-viewport.png'),
      fullPage: false
    });

    // Try to capture specific UI components if they exist
    const components = [
      { selector: 'nav', name: '03-navigation' },
      { selector: 'header', name: '04-header' },
      { selector: 'main', name: '05-main-content' },
      { selector: '.dashboard', name: '06-dashboard' },
      { selector: '.assessment-form', name: '07-assessment-form' },
      { selector: '.assessment-list', name: '08-assessment-list' },
      { selector: '.assessment-card', name: '09-assessment-card' },
      { selector: 'footer', name: '10-footer' }
    ];

    for (const component of components) {
      try {
        const element = await page.$(component.selector);
        if (element) {
          console.log(`Capturing ${component.name}...`);
          await element.screenshot({ 
            path: path.join(screenshotsDir, `${component.name}.png`) 
          });
        }
      } catch (error) {
        console.log(`Component ${component.selector} not found or couldn't capture: ${error.message}`);
      }
    }

    // Try to capture any visible buttons or interactive elements
    try {
      const buttons = await page.$$('button');
      if (buttons.length > 0) {
        console.log(`Found ${buttons.length} buttons, highlighting them...`);
        
        // Highlight all buttons for a comprehensive view
        await page.evaluate(() => {
          const allButtons = document.querySelectorAll('button');
          allButtons.forEach((btn, index) => {
            btn.style.border = '2px solid red';
            btn.style.boxShadow = '0 0 5px rgba(255,0,0,0.5)';
          });
        });

        await page.screenshot({ 
          path: path.join(screenshotsDir, '11-buttons-highlighted.png'),
          fullPage: true
        });
      }
    } catch (error) {
      console.log(`Couldn't highlight buttons: ${error.message}`);
    }

    // Try to capture any forms
    try {
      const forms = await page.$$('form');
      if (forms.length > 0) {
        console.log(`Found ${forms.length} forms...`);
        
        for (let i = 0; i < forms.length; i++) {
          await forms[i].screenshot({ 
            path: path.join(screenshotsDir, `12-form-${i + 1}.png`) 
          });
        }
      }
    } catch (error) {
      console.log(`Couldn't capture forms: ${error.message}`);
    }

    // Capture mobile viewport
    console.log('Switching to mobile viewport...');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '13-mobile-viewport.png'),
      fullPage: true
    });

    // Capture tablet viewport
    console.log('Switching to tablet viewport...');
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '14-tablet-viewport.png'),
      fullPage: true
    });

    console.log('Screenshots captured successfully!');
    console.log(`Screenshots saved to: ${screenshotsDir}`);

    // Keep browser open for 10 seconds for manual inspection
    console.log('Browser will stay open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

// Run the function
captureUIScreenshots().catch(console.error);