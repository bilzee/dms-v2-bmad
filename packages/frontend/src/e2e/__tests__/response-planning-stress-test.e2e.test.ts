import { test, expect } from '@playwright/test';

test.describe('Response Planning Form - Stress Test for Infinite Loops', () => {
  let consoleMessages: { type: string; text: string; timestamp: string }[] = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });
  });

  test('extreme stress test - 50+ rapid tab switches', async ({ page }) => {
    console.log('🎭 Starting extreme stress test - 50+ rapid tab switches...');
    
    await page.goto('/responses/plan');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const beforeStress = consoleMessages.length;
    console.log('📊 Console messages before stress test:', beforeStress);
    
    const tabTexts = ['Health', 'WASH', 'Shelter', 'Food', 'Security', 'Population'];
    
    // Perform 10 rounds of rapid switching (60 total clicks)
    for (let round = 1; round <= 10; round++) {
      console.log(`🔄 Stress test round ${round}/10`);
      
      for (const tabText of tabTexts) {
        const tab = page.locator(`button:has-text("${tabText}")`);
        await tab.click();
        // Minimal delay - stress testing
        await page.waitForTimeout(50);
      }
      
      // Brief pause between rounds
      await page.waitForTimeout(100);
    }
    
    console.log('⏳ Waiting for any delayed reactions...');
    await page.waitForTimeout(5000);
    
    const afterStress = consoleMessages.length;
    console.log('📊 Console messages after stress test:', afterStress);
    console.log('📈 Messages generated during stress test:', afterStress - beforeStress);
    
    // Check for infinite loop patterns
    const infiniteLoopErrors = consoleMessages.filter(msg => 
      msg.text.includes('Maximum update depth exceeded') || 
      msg.text.includes('Too many re-renders') ||
      msg.text.includes('Maximum call stack') ||
      msg.text.includes('RangeError') ||
      msg.text.includes('Cannot update a component') ||
      (msg.text.includes('setState') && msg.text.includes('infinite')) ||
      msg.text.includes('recursive') ||
      msg.text.includes('cyclic')
    );
    
    console.log('♾️ Infinite loop indicators after stress test:', infiniteLoopErrors.length);
    
    if (infiniteLoopErrors.length > 0) {
      console.log('❌ INFINITE LOOP DETECTED during stress test:');
      infiniteLoopErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. [${error.type}] ${error.text}`);
      });
    } else {
      console.log('🎉 SUCCESS: No infinite loops detected during extreme stress test!');
    }
    
    // Assert no infinite loop errors
    expect(infiniteLoopErrors).toHaveLength(0);
    
    // Verify the form is still responsive after stress test
    const populationTab = page.locator('button:has-text("Population")');
    await expect(populationTab).toBeVisible();
    
    // Test that form interactions still work
    const notesTextarea = page.locator('textarea[name="notes"]');
    await notesTextarea.fill('Form still functional after stress test');
    await expect(notesTextarea).toHaveValue('Form still functional after stress test');
    
    console.log('✅ Form remains functional after stress test');
    console.log('🎉 STRESS TEST PASSED - No infinite loops detected!');
  });
});