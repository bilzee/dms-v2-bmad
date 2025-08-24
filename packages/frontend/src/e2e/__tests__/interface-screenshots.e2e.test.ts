import { test, expect } from '@playwright/test';

test.describe('Disaster Management PWA Interface Screenshots', () => {
  const pages = [
    { name: 'homepage', url: '/', description: 'Homepage/Dashboard' },
    { name: 'assessments-list', url: '/assessments', description: 'Assessments List' },
    { name: 'assessment-creation', url: '/assessments/new', description: 'Assessment Creation Form' },
    { name: 'preliminary-assessment', url: '/assessments/new?type=PRELIMINARY', description: 'Preliminary Assessment Form' },
  ];

  test.describe('Desktop Screenshots (1920x1080)', () => {
    pages.forEach(({ name, url, description }) => {
      test(`Desktop - ${description}`, async ({ page }) => {
        // Set desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });
        
        // Navigate to the page
        await page.goto(url);
        
        // Wait for the page to be fully loaded
        await page.waitForLoadState('networkidle');
        
        // Take full page screenshot
        await page.screenshot({ 
          path: `test-results/desktop-${name}-full-page.png`, 
          fullPage: true 
        });
        
        // Take viewport screenshot
        await page.screenshot({ 
          path: `test-results/desktop-${name}-viewport.png` 
        });
      });
    });
  });

  test.describe('Tablet Screenshots (768x1024)', () => {
    pages.forEach(({ name, url, description }) => {
      test(`Tablet - ${description}`, async ({ page }) => {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        
        // Navigate to the page
        await page.goto(url);
        
        // Wait for the page to be fully loaded
        await page.waitForLoadState('networkidle');
        
        // Take full page screenshot
        await page.screenshot({ 
          path: `test-results/tablet-${name}-full-page.png`, 
          fullPage: true 
        });
        
        // Take viewport screenshot
        await page.screenshot({ 
          path: `test-results/tablet-${name}-viewport.png` 
        });
      });
    });
  });

  test.describe('Mobile Screenshots (375x667)', () => {
    pages.forEach(({ name, url, description }) => {
      test(`Mobile - ${description}`, async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'Mobile tests only run on Chromium');
        
        // Set mobile viewport (375x667)
        await page.setViewportSize({ width: 375, height: 667 });
        
        // Navigate to the page
        await page.goto(url);
        
        // Wait for the page to be fully loaded
        await page.waitForLoadState('networkidle');
        
        // Take full page screenshot
        await page.screenshot({ 
          path: `test-results/mobile-${name}-full-page.png`, 
          fullPage: true 
        });
        
        // Take viewport screenshot
        await page.screenshot({ 
          path: `test-results/mobile-${name}-viewport.png` 
        });
      });
    });
  });

  test.describe('Interactive Elements Screenshots', () => {
    test('Desktop - Navigation and Interactive Elements', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Take initial screenshot
      await page.screenshot({ 
        path: 'test-results/desktop-navigation-initial.png' 
      });

      // Try to capture hover states on navigation items
      const navLinks = page.locator('nav a, [role="navigation"] a, header a');
      const navCount = await navLinks.count();
      
      for (let i = 0; i < Math.min(navCount, 5); i++) {
        try {
          await navLinks.nth(i).hover();
          await page.screenshot({ 
            path: `test-results/desktop-nav-hover-${i}.png` 
          });
        } catch (error) {
          console.log(`Could not hover on navigation item ${i}:`, error);
        }
      }

      // Try to capture form interactions on assessment creation page
      await page.goto('/assessments/new');
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'test-results/desktop-form-initial.png' 
      });

      // Look for interactive form elements
      const formElements = page.locator('input, select, button, textarea');
      const formCount = await formElements.count();
      
      for (let i = 0; i < Math.min(formCount, 3); i++) {
        try {
          await formElements.nth(i).focus();
          await page.screenshot({ 
            path: `test-results/desktop-form-focus-${i}.png` 
          });
        } catch (error) {
          console.log(`Could not focus form element ${i}:`, error);
        }
      }
    });

    test('Mobile - Touch and Interactive Elements', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile tests only run on Chromium');
      
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Take initial mobile screenshot
      await page.screenshot({ 
        path: 'test-results/mobile-navigation-initial.png' 
      });

      // Look for mobile menu toggles or hamburger menus
      const mobileMenus = page.locator('[aria-label*="menu"], [aria-label*="Menu"], .hamburger, [data-testid*="menu"]');
      const menuCount = await mobileMenus.count();
      
      if (menuCount > 0) {
        try {
          await mobileMenus.first().click();
          await page.waitForTimeout(500); // Wait for animation
          await page.screenshot({ 
            path: 'test-results/mobile-menu-open.png' 
          });
        } catch (error) {
          console.log('Could not open mobile menu:', error);
        }
      }

      // Test mobile form interactions
      await page.goto('/assessments/new');
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'test-results/mobile-form-initial.png' 
      });
    });
  });

  test.describe('Component Analysis Screenshots', () => {
    test('shadcn/ui Component Detection', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Test different pages to see shadcn/ui implementation
      const testPages = [
        { url: '/', name: 'homepage' },
        { url: '/assessments', name: 'assessments' },
        { url: '/assessments/new', name: 'form' }
      ];

      for (const { url, name } of testPages) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        
        // Take screenshot with browser dev tools style indicators
        await page.addStyleTag({
          content: `
            * { 
              outline: 1px solid rgba(255, 0, 0, 0.2) !important; 
            }
            [data-radix-collection-item], 
            [data-radix-*],
            [class*="shadcn"],
            [class*="radix"] { 
              outline: 2px solid rgba(0, 255, 0, 0.8) !important; 
              background: rgba(0, 255, 0, 0.1) !important;
            }
          `
        });
        
        await page.screenshot({ 
          path: `test-results/component-analysis-${name}.png` 
        });
        
        // Remove the debug styling
        await page.evaluate(() => {
          const style = document.querySelector('style[data-playwright-injected]');
          if (style) style.remove();
        });
      }
    });
  });
});