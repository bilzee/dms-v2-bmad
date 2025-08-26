# Dev Instructions: Fix Text Contrast Issue - Missing CSS Variables

## Issue Summary
**Critical UI Issue**: Text appears white/transparent with poor contrast in browsers (Edge, Chrome, Opera) making content nearly invisible until hover/highlight.

## QA Test Results
✅ **Playwright Browser**: Text displays correctly with good contrast  
❌ **Standard Browsers**: Text appears white on light background  
⚠️ **Impact**: Major accessibility and usability issue affecting entire application  

## Root Cause Analysis
The issue is caused by **missing CSS variable definitions** in the global stylesheet. The shadcn/ui components reference CSS variables like `--card`, `--card-foreground`, `--destructive`, etc., but these variables are not defined in `globals.css`, causing the text colors to resolve to transparent/white values.

### Evidence:
1. **Component Usage**: `text-card-foreground`, `text-muted-foreground`, `bg-card` classes are used throughout
2. **Missing Variables**: Variables like `--card`, `--card-foreground`, `--destructive` are not defined
3. **Browser Behavior**: Browsers render undefined CSS variables as empty/transparent values

## Required Fix

### Update globals.css with Missing Variables

**File**: `packages/frontend/src/app/globals.css`

Replace the existing `:root` section (lines 7-26) with this complete CSS variable definition:

```css
:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
  
  /* Complete shadcn/ui CSS Variables */
  --background: 0 0% 100%;
  --foreground: 224 71.4% 4.1%;
  
  /* Card Variables - MISSING CRITICAL VARIABLES */
  --card: 0 0% 100%;
  --card-foreground: 224 71.4% 4.1%;
  
  /* Muted Variables */
  --muted: 220 14.3% 95.9%;
  --muted-foreground: 220 8.9% 46.1%;
  
  /* Border and Input */
  --border: 220 13% 91%;
  --input: 220 13% 91%;
  
  /* Primary Colors */
  --primary: 224 71.4% 4.1%;
  --primary-foreground: 210 20% 98%;
  
  /* Secondary Colors */
  --secondary: 220 14.3% 95.9%;
  --secondary-foreground: 220 8.9% 46.1%;
  
  /* Accent Colors */
  --accent: 220 14.3% 95.9%;
  --accent-foreground: 220 8.9% 46.1%;
  
  /* Destructive Colors - CRITICAL MISSING VARIABLES */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 20% 98%;
  
  /* Ring Color */
  --ring: 224 71.4% 4.1%;
  
  /* Additional UI Variables */
  --radius: 0.5rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
    
    /* Dark Mode Variables */
    --background: 224 71.4% 4.1%;
    --foreground: 210 20% 98%;
    --card: 224 71.4% 4.1%;
    --card-foreground: 210 20% 98%;
    --muted: 215 27.9% 16.9%;
    --muted-foreground: 217.9 10.6% 64.9%;
    --border: 215 27.9% 16.9%;
    --input: 215 27.9% 16.9%;
    --primary: 210 20% 98%;
    --primary-foreground: 224 71.4% 4.1%;
    --secondary: 215 27.9% 16.9%;
    --secondary-foreground: 210 20% 98%;
    --accent: 215 27.9% 16.9%;
    --accent-foreground: 210 20% 98%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 210 20% 98%;
    --ring: 216 12.2% 83.9%;
  }
}
```

## Implementation Steps

### Step 1: Update globals.css
```bash
cd packages/frontend/src/app
# Backup the current file
cp globals.css globals.css.backup
# Edit the file to add the missing CSS variables
```

### Step 2: Verify Tailwind Integration
Ensure `tailwind.config.js` properly maps these variables (current mapping appears correct):

```javascript
colors: {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  card: {
    DEFAULT: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
  },
  // ... other colors
}
```

### Step 3: Test Across Browsers
1. Start dev server: `pnpm dev`
2. Test in multiple browsers:
   - Chrome
   - Edge  
   - Opera
   - Firefox
3. Verify text contrast on:
   - Home page welcome text
   - Card titles and descriptions
   - Button text
   - Navigation elements

### Step 4: Validate Color Accessibility
Check that text contrast ratios meet WCAG standards:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

## CSS Variable Color Values Explained

The HSL values used follow shadcn/ui's design system:

- **Background**: `0 0% 100%` = Pure white
- **Foreground**: `224 71.4% 4.1%` = Very dark blue-gray (high contrast text)
- **Card**: `0 0% 100%` = White card background
- **Card Foreground**: `224 71.4% 4.1%` = Dark text on cards
- **Muted Foreground**: `220 8.9% 46.1%` = Medium gray for secondary text
- **Destructive**: `0 84.2% 60.2%` = Red for error states

## Testing Checklist

- [ ] Text is clearly visible in Chrome without hover
- [ ] Text is clearly visible in Edge without hover  
- [ ] Text is clearly visible in Opera without hover
- [ ] Card titles have sufficient contrast
- [ ] Welcome messages are readable
- [ ] Button text is properly visible
- [ ] Navigation links have good contrast
- [ ] Dark mode works properly (if enabled)
- [ ] No console errors related to CSS variables

## Affected Components

This fix will improve contrast for:
- **Cards**: All card titles and content
- **Buttons**: Text visibility in all button variants
- **Typography**: Headings, paragraphs, and labels
- **Navigation**: Sidebar and header text
- **Forms**: Input labels and descriptions
- **Alerts**: Error and warning messages

## Additional Recommendations

### 1. Color Contrast Audit
Consider using tools like:
- Chrome DevTools Accessibility tab
- WAVE Web Accessibility Evaluator
- Colour Contrast Analyser

### 2. CSS Variable Validation
Add a development check to ensure all required variables are defined:

```css
/* Development warning for missing variables */
@media (min-width: 0) {
  :root:not([style*="--card"]) body::before {
    content: "Missing CSS variables detected!";
    position: fixed;
    top: 0;
    left: 0;
    background: red;
    color: white;
    z-index: 9999;
    padding: 10px;
  }
}
```

### 3. Future Prevention
- Document all required CSS variables
- Add CSS variable validation to build process
- Include browser testing in CI/CD pipeline

## Priority: CRITICAL
This is a critical accessibility issue that makes the application unusable in standard browsers. This fix should be implemented immediately and tested across all supported browsers before deployment.

## Expected Outcome
After applying this fix:
- ✅ Text will be clearly visible in all browsers
- ✅ Proper contrast ratios will be maintained  
- ✅ No more white/transparent text issues
- ✅ Improved accessibility compliance
- ✅ Consistent appearance across browsers