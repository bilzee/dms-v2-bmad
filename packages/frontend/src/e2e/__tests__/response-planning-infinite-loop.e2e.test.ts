import { test, expect } from '@playwright/test';

test.describe('Response Planning Form - Infinite Loop Prevention', () => {
  let consoleMessages: { type: string; text: string; timestamp: string }[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset console messages
    consoleMessages = [];
    
    // Capture all console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
      
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`🚨 CONSOLE ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });
  });

  test('should not cause infinite loop when clicking WASH tab', async ({ page }) => {
    console.log('🎭 Testing WASH tab click for infinite loops...');
    
    // Navigate to response planning page
    await page.goto('/responses/plan');
    await page.waitForLoadState('networkidle');
    
    // Wait for form to fully render
    await page.waitForTimeout(2000);
    
    console.log('📊 Console messages before WASH tab click:', consoleMessages.length);
    const beforeClick = consoleMessages.length;
    
    // Click WASH tab (the original problematic scenario)
    const washTab = page.locator('button:has-text("WASH")');
    await expect(washTab).toBeVisible();
    await washTab.click();
    
    // Wait for any reactions
    await page.waitForTimeout(3000);
    
    console.log('📊 Console messages after WASH tab click:', consoleMessages.length);
    const afterClick = consoleMessages.length;
    console.log('📈 New messages generated:', afterClick - beforeClick);
    
    // Check for infinite loop indicators
    const infiniteLoopErrors = consoleMessages.filter(msg => 
      msg.text.includes('Maximum update depth exceeded') || 
      msg.text.includes('Too many re-renders') ||
      msg.text.includes('Maximum call stack') ||
      msg.text.includes('RangeError') ||
      msg.text.includes('Cannot update a component') ||
      (msg.text.includes('setState') && msg.text.includes('infinite'))
    );
    
    console.log('♾️ Infinite loop indicators found:', infiniteLoopErrors.length);
    
    if (infiniteLoopErrors.length > 0) {
      console.log('❌ INFINITE LOOP DETECTED:');
      infiniteLoopErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. [${error.type}] ${error.text}`);
      });
    }
    
    // Assert no infinite loop errors
    expect(infiniteLoopErrors).toHaveLength(0);
    
    // Verify form is still functional
    await expect(washTab).toHaveClass(/bg-blue-50|border-blue-200|text-blue-800/);
    
    console.log('✅ WASH tab click test completed successfully');
  });

  test('should handle rapid tab switching without infinite loops', async ({ page }) => {
    console.log('🎭 Testing rapid tab switching...');
    
    await page.goto('/responses/plan');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const beforeRapid = consoleMessages.length;
    console.log('📊 Console messages before rapid switching:', beforeRapid);
    
    // Define all response types to test
    const tabTexts = ['Health', 'WASH', 'Shelter', 'Food', 'Security', 'Population'];
    
    // Rapid tab switching
    for (let i = 0; i < tabTexts.length; i++) {
      const tabText = tabTexts[i];
      console.log(`🖱️ Clicking ${tabText} tab (${i + 1}/${tabTexts.length})`);
      
      const tab = page.locator(`button:has-text("${tabText}")`);
      await expect(tab).toBeVisible();
      await tab.click();
      await page.waitForTimeout(300); // Small delay between clicks
    }
    
    // Wait for any delayed reactions
    await page.waitForTimeout(2000);
    
    const afterRapid = consoleMessages.length;
    console.log('📊 Console messages after rapid switching:', afterRapid);
    console.log('📈 Messages from rapid switching:', afterRapid - beforeRapid);
    
    // Check for infinite loop errors
    const infiniteLoopErrors = consoleMessages.filter(msg => 
      msg.text.includes('Maximum update depth exceeded') || 
      msg.text.includes('Too many re-renders') ||
      msg.text.includes('Maximum call stack') ||
      msg.text.includes('RangeError')
    );
    
    console.log('♾️ Infinite loop indicators after rapid switching:', infiniteLoopErrors.length);
    
    // Assert no infinite loop errors
    expect(infiniteLoopErrors).toHaveLength(0);
    
    // Verify final tab is still functional
    const populationTab = page.locator('button:has-text("Population")');
    await expect(populationTab).toHaveClass(/bg-gray-50|border-gray-200|text-gray-800/);
    
    console.log('✅ Rapid tab switching test completed successfully');
  });

  test('should maintain form functionality after tab switching', async ({ page }) => {
    console.log('🎭 Testing form functionality after tab switching...');
    
    await page.goto('/responses/plan');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Switch to WASH tab
    const washTab = page.locator('button:has-text("WASH")');
    await washTab.click();
    await page.waitForTimeout(1000);
    
    // Try to interact with WASH-specific form fields
    const waterDeliveredInput = page.locator('input[name="data.waterDeliveredLiters"]');
    if (await waterDeliveredInput.count() > 0) {
      await waterDeliveredInput.fill('500');
      await expect(waterDeliveredInput).toHaveValue('500');
      console.log('✅ WASH form fields functional');
    }
    
    // Switch to Health tab
    const healthTab = page.locator('button:has-text("Health")');
    await healthTab.click();
    await page.waitForTimeout(1000);
    
    // Try to interact with Health-specific form fields
    const healthWorkersInput = page.locator('input[name="data.healthWorkersDeployed"]');
    if (await healthWorkersInput.count() > 0) {
      await healthWorkersInput.fill('3');
      await expect(healthWorkersInput).toHaveValue('3');
      console.log('✅ Health form fields functional');
    }
    
    // Test general form elements
    const notesTextarea = page.locator('textarea[name="notes"]');
    await notesTextarea.fill('Test notes after tab switching');
    await expect(notesTextarea).toHaveValue('Test notes after tab switching');
    
    // Check for any errors during form interactions
    const formErrors = consoleMessages.filter(msg => 
      msg.type === 'error' && 
      (msg.text.includes('form') || msg.text.includes('input'))
    );
    
    expect(formErrors).toHaveLength(0);
    
    console.log('✅ Form functionality test completed successfully');
  });

  test.afterEach(async () => {
    // Summary of test results
    const totalMessages = consoleMessages.length;
    const errorCount = consoleMessages.filter(msg => msg.type === 'error').length;
    const warningCount = consoleMessages.filter(msg => msg.type === 'warning').length;
    const infiniteLoopCount = consoleMessages.filter(msg => 
      msg.text.includes('Maximum update depth exceeded') || 
      msg.text.includes('Too many re-renders')
    ).length;
    
    console.log('📋 TEST SUMMARY:');
    console.log(`   Total console messages: ${totalMessages}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Warnings: ${warningCount}`);
    console.log(`   Infinite loop indicators: ${infiniteLoopCount}`);
    
    if (infiniteLoopCount === 0) {
      console.log('🎉 SUCCESS: No infinite loop issues detected!');
    } else {
      console.log('❌ FAILED: Infinite loop issues found');
    }
  });
});