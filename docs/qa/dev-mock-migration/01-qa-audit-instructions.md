# QA Agent Audit Instructions
**Phase 2: Comprehensive Mock Data Audit**  
**Agent:** Quinn (Test Architect & Quality Advisor)  
**Duration:** 1-2 days  
**Prerequisites:** PM planning phase completed

## 🎯 **AUDIT OBJECTIVES**

Your mission is to identify all remaining frontend mock data and assess compliance with established patterns. This audit will drive the entire migration strategy.

## 📋 **AUDIT CHECKLIST**

### **Step 1: Frontend Mock Data Discovery** 🔍
**Duration:** 4-6 hours

**Search Patterns to Identify:**
```bash
# Search for common mock data patterns
grep -r "const.*mock" src/
grep -r "mockData" src/
grep -r "dummy" src/
grep -r "fake" src/
grep -r "sample.*data" src/
grep -r "hardcoded" src/
grep -r "\[\{.*id.*:" src/ --include="*.tsx" --include="*.ts"
```

**Key Areas to Audit:**
- [ ] `src/components/` - React component mock data
- [ ] `src/pages/` or `src/app/` - Page-level hardcoded data  
- [ ] `src/lib/` - Utility functions with mock data
- [ ] `src/hooks/` - Custom hooks with placeholder data
- [ ] `src/stores/` - State management mock data
- [ ] `src/__tests__/` - Test-specific mocks (note but don't migrate)

### **Step 2: CLAUDE.md Compliance Assessment** 📖
**Duration:** 2 hours

**Validation Checklist:**
- [ ] Review CLAUDE.md mock data guidelines
- [ ] Identify components violating "avoid hardcoding mock values at component level"
- [ ] Check if components properly "point to api endpoints where mocking should happen"
- [ ] Document integration-readiness gaps

**Reference:** 
> "Test Mocking - Avoid hardcoding mock values at the component level, instead frontend components should point to api endpoints where the mocking should happen. This makes all tests integration-ready by simply connecting the api endpoint to the backend."

### **Step 3: Backend API Coverage Analysis** 🌐
**Duration:** 2-3 hours

**API Endpoint Inventory:**
- [ ] Review all endpoints in `src/app/api/v1/` (189 confirmed endpoints)
- [ ] Map frontend mock data to existing API endpoints
- [ ] Identify gaps where mock data exists but no corresponding API endpoint
- [ ] Check MSW (Mock Service Worker) configuration if present

**Coverage Assessment Matrix:**
```
Component/Feature | Mock Data Present | API Endpoint Exists | Migration Required
Assessment Forms  | [Y/N]            | [Y/N]              | [Y/N]
Response Planning | [Y/N]            | [Y/N]              | [Y/N]
Incident Mgmt     | [Y/N]            | [Y/N]              | [Y/N]
User Management   | [Y/N]            | [Y/N]              | [Y/N]
...
```

### **Step 4: Risk & Priority Assessment** ⚠️
**Duration:** 1-2 hours

**Risk Categories:**
- **P0 Critical:** Core functionality with hardcoded data affecting user workflows
- **P1 High:** Important features with mock data blocking integration testing
- **P2 Medium:** Secondary features with minor mock data usage
- **P3 Low:** Development utilities or debug components

**Assessment Criteria:**
- Business impact of the component
- Complexity of the mock data structure  
- Availability of corresponding backend API
- Number of dependent components
- Test coverage implications

## 📊 **DELIVERABLES**

### **1. Frontend Mock Inventory** 
**File:** `audit-results/frontend-mock-inventory.md`

Format:
```markdown
# Frontend Mock Data Inventory

## Summary
- Total Components Audited: [X]
- Components with Mock Data: [Y] 
- Mock Data Violations Found: [Z]

## Detailed Findings

### Component: [ComponentName]
- **Location:** src/path/to/Component.tsx
- **Mock Data Type:** [Object/Array/Constant]
- **Data Structure:** [Brief description]
- **Current Usage:** [How it's used]
- **CLAUDE.md Compliance:** [Compliant/Violation]
- **Migration Complexity:** [Low/Medium/High]
```

### **2. API Coverage Gaps**
**File:** `audit-results/api-coverage-gaps.md`

Document:
- Mock data without corresponding API endpoints
- API endpoints that could serve existing mock data
- Recommended new endpoints needed

### **3. Priority Task List**  
**File:** `audit-results/priority-task-list.md`

**Priority Format:**
```markdown
## P0 Critical Tasks
1. [Component/Feature] - [Brief description] - [Estimated hours]

## P1 High Priority Tasks  
1. [Component/Feature] - [Brief description] - [Estimated hours]
...
```

### **4. Risk Assessment Report**
Include in priority task list with risk mitigation strategies.

## 🔧 **TOOLS & TECHNIQUES**

### **Recommended Search Commands:**
```bash
# Find hardcoded arrays/objects
rg -A 5 -B 2 "const \w+.*=.*\[" src/ --type ts --type tsx

# Find useState with mock data
rg "useState.*\[.*\{" src/ --type ts --type tsx

# Find components returning hardcoded data
rg "return.*\[.*id.*:" src/ --type ts --type tsx

# Find mock API responses in components  
rg "fetch.*then.*=>" src/ --type ts --type tsx
```

### **VSCode Extensions (if available):**
- Search for hardcoded object patterns
- Find references to identify component dependencies
- TypeScript error checking for unused mocks

## ✅ **SUCCESS CRITERIA**

**Audit Complete When:**
- [ ] All frontend directories searched systematically
- [ ] Every mock data instance documented with location and type
- [ ] CLAUDE.md compliance assessment completed
- [ ] API coverage gaps identified and documented
- [ ] Priority-ranked task list created for Dev agent
- [ ] Risk assessment completed with mitigation strategies
- [ ] All deliverable files created in `audit-results/`

## 🤝 **HANDOFF TO DEV AGENT**

**Preparation for Dev Phase:**
1. Review all audit deliverables for completeness
2. Prepare priority task list with clear instructions
3. Include risk mitigation strategies for each high-risk item
4. Provide API endpoint recommendations for gaps
5. Document any architectural decisions needed

**Handoff Meeting Agenda:**
- Present audit findings summary
- Review priority task list and timeline estimates
- Discuss risk mitigation strategies
- Clarify any complex migration scenarios
- Confirm API endpoint creation requirements

## 🚨 **ESCALATION TRIGGERS**

**Escalate to PM if:**
- Massive mock data usage discovered (>50 components)
- Architectural changes required beyond simple migration
- Timeline estimates exceed 1 week for implementation
- Critical dependencies on non-existent backend infrastructure discovered

---

**Next Phase:** Dev Agent Implementation (`02-dev-implementation-instructions.md`)  
**Estimated Handoff:** 1-2 days after audit start