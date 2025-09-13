# 📁 Role Switching Fixes - Dev Instructions

## 🎯 Overview

This directory contains comprehensive instructions for fixing the **critical functionality disparity** discovered between superuser role-switched interfaces and dedicated single-role user interfaces.

## 📊 Issue Summary

**QA Finding**: Superuser role-switched interfaces provide significantly less functionality than dedicated single-role users, particularly for COORDINATOR and DONOR roles.

**Impact**: 
- COORDINATOR: Superuser gets 4/7 navigation sections and 4/7 feature cards
- DONOR: Superuser sees "No features available" message
- User experience disparity creates confusion and workflow barriers

## 📚 Document Structure

### 01-main-implementation-guide.md
**Primary Document** - Complete implementation roadmap including:
- Detailed issue analysis and QA findings
- 4-phase implementation plan (Investigation → Implementation → Testing → Deployment)
- Technical specifications and success criteria
- Implementation checklist and validation requirements

### 02-technical-analysis.md  
**Deep Dive** - Comprehensive technical analysis including:
- Side-by-side interface comparisons with exact missing functionality
- Suspected root cause files and component architecture analysis
- Session data structure differences between user types  
- Complete ROLE_INTERFACES configuration for all 6 roles
- Database schema investigation and permission resolution details

### 03-testing-strategy.md
**Quality Assurance** - Exhaustive testing approach including:
- Unit tests for component-level interface consistency
- Integration tests for user flow validation
- End-to-end Playwright tests for browser automation
- Performance and security validation tests
- Test coverage requirements and execution strategy

## 🚀 Quick Start Guide

### For Dev Agent Implementation:

1. **Start with Investigation** (Phase 1):
   ```bash
   # Search for multi-role conditional logic
   rg "isMultiRole|multiRole" packages/frontend/src --type tsx
   rg "roles\.length" packages/frontend/src --type tsx
   ```

2. **Focus on Critical Files**:
   - `src/components/layouts/Header.tsx`
   - `src/hooks/useMultiRole.ts` 
   - `src/app/page.tsx`
   - `src/auth.config.ts`

3. **Implement Unified Architecture**:
   - Create `ROLE_INTERFACES` configuration
   - Refactor navigation components
   - Complete DONOR role implementation
   - Remove multi-role discrimination logic

4. **Validate with Tests**:
   - Run interface consistency tests
   - Execute Playwright E2E validation
   - Verify performance requirements

## 🎯 Success Criteria

- ✅ COORDINATOR: 7 navigation sections for superuser (currently 4)
- ✅ DONOR: Functional interface (no "No features available")
- ✅ All roles: Identical functionality regardless of authentication type
- ✅ Performance: Role switching under 2 seconds
- ✅ Security: Permission boundaries properly enforced

## 📞 Support

**QA Contact**: Available for clarification on findings and expected behavior
**Priority**: P0 - Critical architectural issue
**Timeline**: Complete within 1 sprint (2 weeks recommended)

## 🔗 Related Documentation

- `docs/qa/comprehensive-auth-qa-report.md` - Full QA analysis report
- `docs/qa/dev-instructions/critical-edge-runtime-prisma-fix.md` - Previous fix context
- `packages/frontend/src/auth.config.ts` - Authentication configuration
- `packages/frontend/src/hooks/useMultiRole.ts` - Role management hook

---

**Next Action**: Review `01-main-implementation-guide.md` for detailed implementation steps.