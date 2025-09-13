# Role-Based Authentication Test Guide

**Date:** 2025-09-10  
**Purpose:** Manual testing guide for role-based access and post-login behavior  
**Server:** http://localhost:3003  

## 🔍 Analysis Summary

Based on codebase analysis, here's what should happen vs what's currently happening:

### Expected Authentication Flow
1. **All roles** should redirect to role-specific dashboard routes after login
2. **Each role** should see only features they're authorized for
3. **Multi-role users** should be able to switch between roles in navigation
4. **Unauthorized routes** should redirect to `/dashboard` (fallback)

### Current Issues Identified
- ❌ **Missing route implementations** for assessor, responder, verifier
- ❌ **Admin 404 error** despite route existing
- ❌ **No post-login redirection logic** - users stay on current page
- ❌ **No role switching UI** implemented

---

## 📋 Manual Test Scenarios

### Test Environment Setup
1. Navigate to http://localhost:3003
2. Click "Sign In" button
3. Use credential-based login (not GitHub)

---

## 🎯 Role-by-Role Testing

### 1. ADMIN Testing
**Credentials:** admin@test.com / admin123

**Expected Behavior:**
- ✅ **Route:** Should redirect to `/admin` dashboard
- ✅ **Features:** Access to all admin features (users, roles, audit, monitoring)
- ✅ **Navigation:** Should see admin-specific navigation options
- ✅ **Access:** Can access all other role routes as fallback

**Test Steps:**
1. Login with admin credentials
2. Verify landing on `/admin` page (not 404)
3. Check navigation sidebar for admin options:
   - User Management
   - Role Management  
   - System Audit
   - Monitoring Dashboard
4. Test access to other role routes (should work due to admin permission)
5. Look for role switching UI (if user has multiple roles)

**Current Issue:** User reports seeing 404 after admin login

---

### 2. ASSESSOR Testing  
**Credentials:** assessor@test.com / assessor123

**Expected Behavior:**
- ✅ **Route:** Should redirect to `/assessor` dashboard
- ✅ **Features:** Assessment creation, review, incident reporting
- ✅ **Navigation:** Assessment-focused navigation
- ❌ **Access:** Cannot access admin, coordinator specific routes

**Test Steps:**
1. Login with assessor credentials
2. Check landing page shows assessor dashboard
3. Verify navigation shows:
   - Assessment creation tools
   - Incident reporting
   - Assessment history
4. Test that admin/coordinator routes are blocked
5. Check for assessment-specific features on main page

**Current Status:** Route `/assessor` doesn't exist - will show 404 or redirect

---

### 3. RESPONDER Testing
**Credentials:** responder@test.com / responder123  

**Expected Behavior:**
- ✅ **Route:** Should redirect to `/responder` dashboard
- ✅ **Features:** Response management, delivery tracking
- ✅ **Navigation:** Response-focused tools
- ❌ **Access:** Cannot access admin, coordinator specific routes

**Test Steps:**
1. Login with responder credentials
2. Check landing page shows responder dashboard
3. Verify navigation shows:
   - Response queue
   - Delivery tracking
   - Status updates
4. Test response-specific functionality
5. Verify blocked access to other role routes

**Current Status:** Route `/responder` doesn't exist - will show 404 or redirect

---

### 4. COORDINATOR Testing
**Credentials:** coordinator@test.com / coordinator123

**Expected Behavior:**  
- ✅ **Route:** Should redirect to `/coordinator` dashboard
- ✅ **Features:** Full coordination features (donors, incidents, responses, monitoring)
- ✅ **Navigation:** Comprehensive coordination tools
- ✅ **Access:** Can coordinate between assessors, responders, verifiers

**Test Steps:**
1. Login with coordinator credentials
2. Verify landing on `/coordinator` dashboard 
3. Check navigation includes:
   - Incident Management
   - Donor Coordination  
   - Response Review
   - Auto-approval Settings
   - Monitoring Dashboard
4. Test coordinator-specific features are accessible
5. Verify can access donor coordination tools

**Current Status:** Route exists - should work correctly

---

### 5. VERIFIER Testing
**Credentials:** verifier@test.com / verifier123

**Expected Behavior:**
- ✅ **Route:** Should redirect to `/verifier` dashboard  
- ✅ **Features:** Verification queue, review tools
- ✅ **Navigation:** Verification-focused interface
- ❌ **Access:** Limited access compared to coordinator

**Test Steps:**
1. Login with verifier credentials
2. Check landing page shows verifier dashboard
3. Verify navigation shows verification tools
4. Compare features with coordinator (should be subset)
5. Test verification-specific workflows

**Current Status:** Route `/verifier` doesn't exist - will show 404 or redirect

---

### 6. DONOR Testing  
**Credentials:** donor@test.com / donor123

**Expected Behavior:**
- ✅ **Route:** Should redirect to `/donor` dashboard
- ✅ **Features:** Donation tracking, resource contribution history, impact metrics
- ✅ **Navigation:** Donor-focused interface
- ❌ **Access:** Cannot access admin, coordinator specific routes

**Test Steps:**
1. Login with donor credentials
2. Check landing page shows donor dashboard
3. Verify navigation shows donor tools:
   - Donation tracking
   - Resource contribution history
   - Impact metrics and achievements
4. Test donor-specific workflows
5. Verify blocked access to other role routes

**Current Status:** Route exists but needs donor user in auth config

---

### 7. SUPER USER (Multi-Role) Testing
**Credentials:** superuser@test.com / superuser123

**Expected Behavior:**
- ✅ **Route:** Should redirect to `/admin` dashboard (primary role)
- ✅ **Features:** Access to ALL role features through role switching
- ✅ **Navigation:** Role switcher dropdown visible in header
- ✅ **Access:** Can switch between all 6 roles and access their features

**Test Steps:**
1. Login with superuser credentials
2. Verify landing on `/admin` dashboard (primary role)
3. **CRITICAL TEST**: Check header for role switcher dropdown
4. Test role switching functionality:
   - Switch to COORDINATOR → should redirect to `/coordinator`
   - Switch to ASSESSOR → should redirect to `/assessor`
   - Switch to RESPONDER → should redirect to `/responder`
   - Switch to VERIFIER → should redirect to `/verifier`
   - Switch to DONOR → should redirect to `/donor`
   - Switch back to ADMIN → should redirect to `/admin`
5. For each role switch:
   - Verify correct dashboard loads
   - Check role-specific navigation appears
   - Test role-appropriate features are accessible
   - Verify unauthorized features are hidden
6. Test session persistence after page refresh
7. Verify sign-out works from any active role

**Current Status:** NEW USER - needs implementation

---

## 🔧 Issues to Document

### Missing Route Implementation
Based on middleware configuration vs actual routes:

**Routes Defined in Middleware but Missing:**
- `/assessor` - No page.tsx exists
- `/responder` - No page.tsx exists  
- `/verifier` - No page.tsx exists

**Routes That Exist:**
- `/admin` - ✅ Exists but shows 404 (routing issue)
- `/coordinator` - ✅ Exists and should work
- `/donor` - ✅ Exists (but no donor user in auth config)

### Authentication Flow Issues
1. **No Post-Login Redirection:** Users stay on sign-in page after login
2. **Role Switching UI Missing:** No interface for users with multiple roles
3. **Dashboard Fallback:** Unauthorized users redirected to `/dashboard` but should go to role-specific dashboard

### Business Logic Questions
1. **Verifier vs Coordinator:** Are verifiers separate from coordinators?
2. **Donor Role:** Donor routes exist but no donor user in auth config
3. **Role Hierarchy:** Should admin access all features or have separate admin interface?

---

## 🎯 Expected Test Results

### What Should Happen (Fixed System)

| Role        | Login Redirect | Landing Page Features | Navigation Access | User Type |
|-------------|----------------|----------------------|-------------------|-----------|
| Admin       | `/admin`       | User management, system admin | All admin tools | Single Role |
| Assessor    | `/assessor`    | Assessment tools, incident reporting | Assessment-focused | Single Role |  
| Responder   | `/responder`   | Response queue, delivery tracking | Response-focused | Single Role |
| Coordinator | `/coordinator` | Full coordination dashboard | All coordination tools | Single Role |
| Verifier    | `/verifier`    | Verification queue, review tools | Verification-focused | Single Role |
| Donor       | `/donor`       | Donation tracking, impact metrics | Donor-focused | Single Role |
| Super User  | `/admin`       | Multi-role dashboard + role switcher | ALL tools via role switching | Multi-Role |

### What Currently Happens (Broken System)

| Role        | Current Behavior | Issues |
|-------------|------------------|--------|
| Admin       | 404 error page | Route exists but routing broken |
| Assessor    | Unknown (no route) | Will redirect to `/dashboard` or show error |
| Responder   | Unknown (no route) | Will redirect to `/dashboard` or show error |
| Coordinator | Should work | Route exists, likely functional |
| Verifier    | Unknown (no route) | Will redirect to `/dashboard` or show error |
| Donor       | User doesn't exist | Need to add donor user to auth config |
| Super User  | User doesn't exist | Need to implement multi-role user and role switcher |

---

## 📝 Manual Testing Checklist

**For Each Role:**
- [ ] Login successful (no errors)
- [ ] Redirected to appropriate dashboard (not 404)
- [ ] Role-specific navigation visible
- [ ] Role-appropriate features accessible  
- [ ] Unauthorized routes properly blocked
- [ ] Sign-out functionality present and working
- [ ] Role switching UI (if applicable)

**Cross-Role Testing:**
- [ ] Admin can access all role features
- [ ] Non-admin roles blocked from admin features
- [ ] Coordinator can access donor/verifier tools
- [ ] Session persists across page refreshes
- [ ] Proper error handling for unauthorized access

---

## 🛠️ Next Steps for Development

1. **Fix Admin 404 Error** - Debug routing to `/admin` page
2. **Create Missing Routes** - Implement `/assessor`, `/responder`, `/verifier` dashboards  
3. **Add Post-Login Redirection** - Implement role-based redirect after authentication
4. **Implement Role Switching** - Add UI for users with multiple roles
5. **Test All Flows** - Manual verification of each role's complete user journey

---

*This guide provides systematic testing approach for validating role-based authentication without automated browser testing tools.*