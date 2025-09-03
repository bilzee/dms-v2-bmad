#!/usr/bin/env node

/**
 * Integration Verification Script for Story 8.3
 * Tests the key integration points Quinn identified
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Story 8.3 Integration Verification\n');

// Test 1: Verify navigation integration
console.log('1. Navigation Integration:');
const navigationPath = path.join(__dirname, '../hooks/useRoleNavigation.ts');
const navigationContent = fs.readFileSync(navigationPath, 'utf8');

const hasAchievementsLink = navigationContent.includes("href: '/dashboard/donor/achievements'");
const hasLeaderboardLink = navigationContent.includes("href: '/dashboard/donor/leaderboard'");
const hasAwardIcon = navigationContent.includes("icon: 'Award'");
const hasTrophyIcon = navigationContent.includes("icon: 'Trophy'");

console.log(`   ✅ Achievement link: ${hasAchievementsLink}`);
console.log(`   ✅ Leaderboard link: ${hasLeaderboardLink}`);
console.log(`   ✅ Award icon: ${hasAwardIcon}`);
console.log(`   ✅ Trophy icon: ${hasTrophyIcon}`);

// Test 2: Verify sidebar icon integration
console.log('\n2. Sidebar Icon Integration:');
const sidebarPath = path.join(__dirname, '../components/layouts/Sidebar.tsx');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

const hasAwardImport = sidebarContent.includes('Award') && sidebarContent.includes('from \'lucide-react\'');
const hasTrophyImport = sidebarContent.includes('Trophy') && sidebarContent.includes('from \'lucide-react\'');
const hasAwardInMap = sidebarContent.includes('Award,') && sidebarContent.includes('iconMap');
const hasTrophyInMap = sidebarContent.includes('Trophy') && sidebarContent.includes('iconMap');

console.log(`   ✅ Award import: ${hasAwardImport}`);
console.log(`   ✅ Trophy import: ${hasTrophyImport}`);
console.log(`   ✅ Award in iconMap: ${hasAwardInMap}`);
console.log(`   ✅ Trophy in iconMap: ${hasTrophyInMap}`);

// Test 3: Verify page routes exist
console.log('\n3. Page Routes:');
const achievementPageExists = fs.existsSync(path.join(__dirname, '../app/(dashboard)/donor/achievements/page.tsx'));
const leaderboardPageExists = fs.existsSync(path.join(__dirname, '../app/(dashboard)/donor/leaderboard/page.tsx'));
const monitoringPageExists = fs.existsSync(path.join(__dirname, '../app/(dashboard)/monitoring/responses/[id]/page.tsx'));

console.log(`   ✅ Achievement page: ${achievementPageExists}`);
console.log(`   ✅ Leaderboard page: ${leaderboardPageExists}`);
console.log(`   ✅ Monitoring page: ${monitoringPageExists}`);

// Test 4: Verify VerificationStamp integration
console.log('\n4. VerificationStamp Integration:');
const responseInterfacePath = path.join(__dirname, '../components/features/verification/ResponseVerificationInterface.tsx');
const responseQueuePath = path.join(__dirname, '../components/features/verification/ResponseVerificationQueue.tsx');

const interfaceContent = fs.readFileSync(responseInterfacePath, 'utf8');
const queueContent = fs.readFileSync(responseQueuePath, 'utf8');

const hasStampImportInterface = interfaceContent.includes("import { VerificationStamp }");
const hasStampImportQueue = queueContent.includes("import { VerificationStamp }");
const hasStampUsageInterface = interfaceContent.includes("<VerificationStamp");
const hasStampUsageQueue = queueContent.includes("<VerificationStamp");

console.log(`   ✅ Stamp import in Interface: ${hasStampImportInterface}`);
console.log(`   ✅ Stamp import in Queue: ${hasStampImportQueue}`);
console.log(`   ✅ Stamp usage in Interface: ${hasStampUsageInterface}`);
console.log(`   ✅ Stamp usage in Queue: ${hasStampUsageQueue}`);

// Test 5: Verify achievement trigger integration
console.log('\n5. Achievement Trigger Integration:');
const approvalPath = path.join(__dirname, '../components/features/verification/ResponseApproval.tsx');
const approvalAPIPath = path.join(__dirname, '../app/api/v1/verification/responses/[id]/approve/route.ts');

const approvalContent = fs.readFileSync(approvalPath, 'utf8');
const approvalAPIContent = fs.readFileSync(approvalAPIPath, 'utf8');

const hasNotificationTrigger = approvalContent.includes('triggerAchievementNotification');
const hasEngineImport = approvalAPIContent.includes('VerificationAchievementEngine');
const hasAchievementCalculation = approvalAPIContent.includes('calculateAchievementsForVerifiedResponse');

console.log(`   ✅ Notification trigger in approval: ${hasNotificationTrigger}`);
console.log(`   ✅ Engine import in API: ${hasEngineImport}`);
console.log(`   ✅ Achievement calculation: ${hasAchievementCalculation}`);

// Test 6: Verify E2E test routes
console.log('\n6. E2E Test Routes:');
const e2ePath = path.join(__dirname, '../e2e/__tests__/story-8.3-verification-based-achievement-system.e2e.test.ts');
const e2eContent = fs.readFileSync(e2ePath, 'utf8');

const hasCorrectAchievementURL = e2eContent.includes("'/dashboard/donor/achievements'") && !e2eContent.includes("goto('/donor/achievements')");
const hasCorrectLeaderboardURL = e2eContent.includes("'/dashboard/donor/leaderboard'") && !e2eContent.includes("goto('/donor/leaderboard')");
const hasCorrectDonorURL = e2eContent.includes("'/dashboard/donor'") && !e2eContent.includes("goto('/donor')");
const hasCorrectMonitoringURL = e2eContent.includes("'/monitoring/responses/") && !e2eContent.includes("'/dashboard/monitoring/responses'");
const hasNavigationTests = e2eContent.includes('donor can navigate to achievements via sidebar');

console.log(`   ✅ Correct achievement URL: ${hasCorrectAchievementURL}`);
console.log(`   ✅ Correct leaderboard URL: ${hasCorrectLeaderboardURL}`);
console.log(`   ✅ Correct donor URL: ${hasCorrectDonorURL}`);
console.log(`   ✅ Correct monitoring URL: ${hasCorrectMonitoringURL}`);
console.log(`   ✅ Navigation tests added: ${hasNavigationTests}`);

// Test 7: API routes exist
console.log('\n7. API Routes:');
const leaderboardAPIExists = fs.existsSync(path.join(__dirname, '../app/api/v1/donors/leaderboard/route.ts'));
const achievementAPIExists = fs.existsSync(path.join(__dirname, '../app/api/v1/donors/achievements/route.ts'));
const stampAPIExists = fs.existsSync(path.join(__dirname, '../app/api/v1/verification/responses/[id]/stamp/route.ts'));

console.log(`   ✅ Leaderboard API: ${leaderboardAPIExists}`);
console.log(`   ✅ Achievement API: ${achievementAPIExists}`);
console.log(`   ✅ Stamp API: ${stampAPIExists}`);

// Summary
console.log('\n📊 Integration Summary:');
const allChecks = [
  hasAchievementsLink, hasLeaderboardLink, hasAwardIcon, hasTrophyIcon,
  hasAwardImport, hasTrophyImport, hasAwardInMap, hasTrophyInMap,
  achievementPageExists, leaderboardPageExists, monitoringPageExists,
  hasStampImportInterface, hasStampImportQueue, hasStampUsageInterface, hasStampUsageQueue,
  hasNotificationTrigger, hasEngineImport, hasAchievementCalculation,
  hasCorrectAchievementURL, hasCorrectLeaderboardURL, hasCorrectDonorURL, hasCorrectMonitoringURL, hasNavigationTests,
  leaderboardAPIExists, achievementAPIExists, stampAPIExists
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log(`   ✅ Passed: ${passedChecks}/${totalChecks} (${Math.round(passedChecks/totalChecks*100)}%)`);

if (passedChecks === totalChecks) {
  console.log('\n🎉 All integration points verified successfully!');
  console.log('   Quinn\'s QA requirements have been addressed.');
} else {
  console.log('\n⚠️  Some integration points may need attention.');
  console.log('   Review the failed checks above.');
}

console.log('\nNext steps:');
console.log('1. Run the E2E tests: pnpm playwright test story-8.3');
console.log('2. Test navigation manually in the browser');
console.log('3. Verify achievement notifications appear on verification');