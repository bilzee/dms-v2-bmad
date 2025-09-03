# Phase 3: Epic 10 Implementation - Dev Agent Instructions

## 🚀 PWA INFRASTRUCTURE COMPLETION
**Previous Agent**: PM Agent (Phase 3 Planning)
**Mission**: Complete Epic 10 PWA features and production optimization
**Duration**: Days 11-14
**Dependencies**: All 189 endpoints migrated, Epic 9 + Story 8.3 complete

## EPIC 10 IMPLEMENTATION FOCUS
Transform the existing application into a production-ready PWA meeting humanitarian field operation requirements.

## REFERENCE DOCUMENTS
- **Architecture**: `/docs/architecture.md` (Epic 10 specifications)
- **User Stories**: `/docs/prd/user-stories-epics.md` (TI-001 through TI-004)
- **Performance Requirements**: <3s load, <1s offline access, battery optimization

## TI-001: PROGRESSIVE WEB APP CORE (Day 11)

### Service Worker Enhancement
**File**: `packages/frontend/public/sw.js` (enhance existing)

**Requirements:**
- Cache critical offline functionality (assessment forms, entity data)
- Background sync for assessment/response submission
- Offline fallback pages for all critical workflows
- Cache management with automatic cleanup

**Implementation:**
```javascript
// Enhanced service worker for humanitarian operations
const CACHE_NAME = 'dms-v2-humanitarian-v1';
const CRITICAL_OFFLINE_ROUTES = [
  '/dashboard',
  '/dashboard/assessments/new',
  '/dashboard/responses/new',
  '/dashboard/entities',
  '/dashboard/queue'
];

// Cache strategy for offline-first operation
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/v1/')) {
    // API requests - cache with network fallback
    event.respondWith(cacheFirst(event.request));
  } else {
    // UI routes - network first with cache fallback
    event.respondWith(networkFirst(event.request));
  }
});
```

### PWA Manifest Enhancement
**File**: `packages/frontend/public/manifest.json` (enhance existing)

**Requirements:**
- Proper humanitarian app icons (512x512, 192x192, maskable)
- Start URL optimization for offline access
- Display mode standalone for app-like experience
- Theme colors matching humanitarian operations

### Installation Prompts
**File**: `packages/frontend/src/components/layout/PWAInstallPrompt.tsx`

**Requirements:**
- Smart installation prompts for field workers
- Platform-specific installation instructions
- Installation success tracking for Epic metrics

## TI-002: PERFORMANCE OPTIMIZATION (Day 12)

### Load Time Optimization
**Critical Performance Targets:**
- Initial page load: <3 seconds on 3G connection
- Time to Interactive: <5 seconds
- First Contentful Paint: <2 seconds

**Implementation Areas:**
1. **Bundle Optimization:**
```bash
# Analyze bundle size
pnpm --filter frontend run build
pnpm dlx @next/bundle-analyzer

# Target: <500KB initial JS bundle
```

2. **Database Query Optimization:**
```typescript
// Optimize dashboard queries with proper indexing
static async getDashboardData(userId: string): Promise<DashboardData> {
  // Use database indexes effectively
  // Implement query batching for related data
  // Add query result caching where appropriate
}
```

3. **Image and Asset Optimization:**
- Optimize PWA icons and splash screens
- Implement lazy loading for non-critical images
- Use Next.js Image component for automatic optimization

### Battery Usage Optimization
**Field Operation Requirements:**
- Minimize background processing during offline periods
- Efficient IndexedDB operations
- Optimize GPS and camera usage patterns
- Smart connectivity detection to reduce battery drain

**Implementation:**
```typescript
// Battery-conscious field operation patterns
export class FieldOperationManager {
  static async optimizeForBattery(): Promise<void> {
    // Reduce background sync frequency when battery low
    // Optimize GPS polling intervals
    // Minimize DOM updates during offline periods
  }
}
```

## TI-003: SECURITY IMPLEMENTATION (Day 13)

### Offline Data Encryption
**File**: `packages/frontend/src/lib/security/offlineEncryption.ts`

**Requirements:**
- AES-256 encryption for sensitive data in IndexedDB
- Secure key management using browser APIs
- Encryption/decryption for assessment and response data

**Implementation:**
```typescript
export class OfflineEncryption {
  static async encryptSensitiveData(data: any): Promise<string> {
    // AES-256 encryption for offline storage
    // Use WebCrypto API for browser compatibility
    // Secure key derivation from user session
  }

  static async decryptSensitiveData(encryptedData: string): Promise<any> {
    // Decrypt data for offline access
    // Handle decryption errors gracefully
    // Maintain performance for field operations
  }
}
```

### Authentication Security Hardening
**Enhancements to existing NextAuth.js configuration:**

1. **Secure Cookie Configuration:**
```typescript
// Enhanced security for humanitarian data
export const authOptions: NextAuthOptions = {
  cookies: {
    sessionToken: {
      name: 'dms-session',
      options: {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 24 hours
      }
    }
  },
  session: {
    maxAge: 24 * 60 * 60, // 24 hour sessions for field operations
    updateAge: 60 * 60,   // Refresh every hour
  }
}
```

2. **Rate Limiting Implementation:**
**File**: `packages/frontend/src/lib/middleware/rateLimiting.ts`

```typescript
// Protect against abuse while allowing legitimate field operations
export async function rateLimitAuth(request: NextRequest): Promise<Response | null> {
  const ip = request.ip || 'unknown';
  const key = `auth_attempts_${ip}`;
  
  // Allow 5 auth attempts per minute
  const attempts = await redis.incr(key);
  if (attempts > 5) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  await redis.expire(key, 60); // 1 minute window
  return null;
}
```

### Data Transmission Security
**Requirements:**
- HTTPS enforcement in production
- Request payload validation and sanitization
- Audit logging for sensitive operations
- CSP headers implementation

## TI-004: DATA BACKUP & RECOVERY (Day 14)

### Automated Backup Verification
**File**: `packages/frontend/src/lib/admin/backupManager.ts`

**Requirements:**
- Verify Supabase automated backup configuration
- Implement backup integrity checking
- Point-in-time recovery testing procedures

**Implementation:**
```typescript
export class BackupManager {
  static async verifyBackupIntegrity(): Promise<BackupStatus> {
    // Check latest backup timestamp
    // Verify backup completeness
    // Test restoration capability
  }

  static async scheduleBackupValidation(): Promise<void> {
    // Daily backup verification
    // Alert if backup failures detected
    // Generate backup health reports
  }
}
```

### Disaster Recovery Procedures
**Documentation Required:**
- Step-by-step recovery procedures
- Data migration scripts for emergency scenarios
- Backup restoration testing protocols
- Emergency contact procedures for data recovery

## PRODUCTION DEPLOYMENT COORDINATION

### Environment Configuration
**PM Tasks:**
1. **Supabase Production Setup:**
   - Create production Supabase project
   - Configure production DATABASE_URL
   - Set up automated backup schedules
   - Configure monitoring and alerting

2. **Vercel Production Deployment:**
   - Configure production environment variables
   - Set up custom domain (if applicable)
   - Configure Vercel Analytics and monitoring
   - Test production deployment pipeline

### Performance Validation in Production
**Coordination with QA Agent:**
- Real-world load testing with humanitarian users
- Mobile device testing on actual field devices
- Network condition simulation (3G, intermittent connectivity)
- Battery usage validation during extended field operations

## TIMELINE COORDINATION

### Day 11 Schedule
**9:00 AM**: Dev Agent starts TI-001 PWA Core implementation
**2:00 PM**: QA Agent begins PWA installation testing
**5:00 PM**: Daily standup - PWA progress and blockers

### Day 12 Schedule  
**9:00 AM**: Dev Agent starts TI-002 Performance optimization
**2:00 PM**: QA Agent begins performance benchmarking
**5:00 PM**: Daily standup - Performance metrics and optimization results

### Day 13 Schedule
**9:00 AM**: Dev Agent starts TI-003 Security implementation
**2:00 PM**: QA Agent begins security audit
**5:00 PM**: Daily standup - Security validation and findings

### Day 14 Schedule
**9:00 AM**: Dev Agent + Architect Agent start TI-004 Backup implementation
**2:00 PM**: QA Agent begins disaster recovery testing
**4:00 PM**: Final production readiness review
**5:00 PM**: Project completion celebration! 🎉

## RISK MITIGATION PLANNING

### Critical Risk Areas
1. **Performance Regression**: Database optimization may affect functionality
   - **Mitigation**: Measure performance before/after each optimization
   - **Escalation**: Architect Agent for complex performance issues

2. **PWA Integration Conflicts**: Service worker may conflict with existing offline functionality
   - **Mitigation**: Incremental service worker enhancement
   - **Escalation**: Rollback to existing offline implementation if critical issues

3. **Security Implementation Impact**: Security changes may break existing workflows
   - **Mitigation**: Test all user workflows after each security enhancement
   - **Escalation**: Security vs functionality trade-off decisions

### Timeline Risk Management
- **Daily Progress Checkpoints**: Ensure each Epic 10 story completes on schedule
- **Buffer Time**: 0.5 day buffer built into each story for issue resolution
- **Parallel Work**: QA validation runs concurrently to minimize timeline impact
- **Escalation Matrix**: Clear decision points for scope reduction if needed

## SUCCESS METRICS TRACKING
**Epic 10 Completion Criteria:**
- [ ] TI-001: PWA installation and service worker functional
- [ ] TI-002: Performance targets achieved (<3s load, <1s offline)
- [ ] TI-003: Security audit passed, encryption implemented
- [ ] TI-004: Backup procedures tested and documented

**Overall Project Completion:**
- [ ] Infrastructure crisis resolved (✅ Already complete)
- [ ] 189 API endpoints connected to real backend (✅ Phase 2)
- [ ] Epic 9 user management operational (✅ Phase 2)
- [ ] Story 8.3 achievement system integrated (✅ Phase 2)
- [ ] Epic 10 PWA features complete (🎯 Phase 3 target)

## PROJECT COMPLETION HANDOFF
**Upon successful Phase 3 completion:**
- **Status**: All critical infrastructure implemented
- **Delivery**: MVP-ready humanitarian disaster management PWA
- **Handoff**: Production operations team for ongoing maintenance
- **Documentation**: Complete architecture and operational procedures
- **Celebration**: Infrastructure crisis successfully resolved! 🎉

**Final PM Report**: Document complete project timeline, lessons learned, and recommendations for future humanitarian technology projects.