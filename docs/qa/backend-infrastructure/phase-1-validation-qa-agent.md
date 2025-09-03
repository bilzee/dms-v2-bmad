# Phase 1: Foundation Validation - QA Agent Instructions

## 🚨 CRITICAL INFRASTRUCTURE VALIDATION
**Previous Agent**: Dev Agent (Phase 1 Foundation)
**Mission**: Validate infrastructure deployment and integration quality
**Dependencies**: Completed Phase 1 foundation implementation

## VALIDATION OBJECTIVES
Ensure the emergency backend infrastructure is properly deployed and integrated before proceeding to full API migration.

## REFERENCE DOCUMENTS
- **Architecture**: `/docs/architecture.md` (Version 2.0)
- **Test Strategy**: `/docs/qa/test-strategy.md`
- **Phase 1 Implementation**: Results from Dev Agent

## CRITICAL VALIDATION CHECKLIST

### Database Infrastructure Validation
**Test Commands:**
```bash
# Verify database connection
pnpm --filter frontend run prisma db pull
pnpm --filter frontend run prisma generate

# Verify schema deployment
npx prisma studio  # Should show all tables from schema
```

**Validation Points:**
- [ ] All Prisma schema tables exist in Supabase PostgreSQL
- [ ] Database indexes properly created
- [ ] Enum types deployed correctly
- [ ] Connection pooling working (no connection errors)
- [ ] Sample data can be inserted and retrieved

### Authentication System Testing (Epic 9)
**Test Scenarios:**
1. **Multi-role login flow:**
   - User with ASSESSOR + RESPONDER roles logs in successfully
   - JWT token contains role information
   - Role switching works without re-authentication
   - Session persists across browser refresh

2. **Permission validation:**
   - Admin endpoints properly reject non-admin users
   - Role-specific access controls function correctly
   - Unauthorized access returns 403 errors with proper format

**Test Files to Run:**
```bash
pnpm --filter frontend test auth
pnpm --filter frontend test middleware
pnpm playwright test auth-flow  # If E2E auth tests exist
```

### API Endpoint Integration Testing
**Validate Migrated Endpoints:**
For each endpoint migrated in Phase 1:

1. **Real database integration:**
   - Endpoint returns real data from PostgreSQL
   - No more mock data arrays in responses
   - Proper error handling for database failures

2. **Response format consistency:**
   - All endpoints use standard `{ success, data, message, timestamp }` format
   - Error responses follow unified error handling pattern
   - HTTP status codes appropriate (200, 400, 401, 403, 500)

**Test Commands:**
```bash
# Test critical migrated endpoints
curl -X GET "http://localhost:3000/api/v1/incidents"
curl -X GET "http://localhost:3000/api/v1/entities" 
curl -X GET "http://localhost:3000/api/v1/users" -H "Authorization: Bearer [token]"
```

### Frontend Integration Validation
**Critical Integration Points:**
1. **Existing components still function:**
   - Incident management pages load without errors
   - Assessment and response forms work with real backend
   - Dashboard components display real data

2. **Error handling:**
   - Network errors displayed appropriately to users
   - Loading states work correctly during database operations
   - Authentication failures handled gracefully

**Test Commands:**
```bash
# Verify existing tests still pass
pnpm --filter frontend test
pnpm --filter frontend run typecheck

# Start dev server and manual validation
pnpm dev
```

## PERFORMANCE VALIDATION (Epic 10)
**Load Time Requirements:**
- [ ] Initial page load < 3 seconds (Epic 10 requirement)
- [ ] API response times < 500ms for standard operations
- [ ] Database queries optimized (check Prisma query logs)
- [ ] No serverless cold start issues affecting user experience

**Test Approach:**
- Use browser DevTools Network tab to measure load times
- Monitor Vercel function execution times
- Check Supabase database metrics for query performance

## INTEGRATION RISK ASSESSMENT
**High-Risk Areas to Test:**
1. **Sync System Impact**: Verify sync operations don't conflict with real database
2. **Achievement System**: Story 8.3 achievement calculations work with real verification data
3. **Role Management**: Epic 9 multi-role functionality doesn't break existing workflows
4. **PWA Functionality**: Offline capabilities still work with real backend integration

## SUCCESS CRITERIA FOR PHASE 1
- [ ] All migrated API endpoints return real database data
- [ ] Authentication system supports multi-role users (Epic 9)
- [ ] Frontend integration works without breaking changes
- [ ] Performance meets Epic 10 requirements (<3s load)
- [ ] No regressions in existing functionality
- [ ] Database operations are secure and properly validated

## FAILURE SCENARIOS & ROLLBACK
**If Critical Issues Found:**
1. **Database connection failures**: Verify Supabase configuration and DATABASE_URL
2. **Authentication breaks existing flows**: Check NextAuth.js configuration
3. **Performance degradation**: Investigate database query optimization
4. **Frontend integration failures**: Verify API contract compatibility

**Rollback Strategy:**
- Keep git branch separate for Phase 1 work
- Document all issues clearly for Dev Agent remediation
- Provide specific error messages and reproduction steps

## HANDOFF TO NEXT PHASE
**If Phase 1 Validation PASSES:**
Handoff to **Dev Agent (Phase 2)** with:
- Database deployment confirmation
- Authentication system validation results
- List of successfully migrated endpoints
- Any performance optimization notes
- Integration testing results

**If Phase 1 Validation FAILS:**
Return to **Dev Agent (Phase 1)** with:
- Specific failure descriptions
- Error reproduction steps
- Recommended fix approaches
- Priority order for issue resolution