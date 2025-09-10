# Dev Agent Implementation Instructions
**Phase 3: Mock Data Migration Implementation**  
**Agent:** Dev Agent  
**Duration:** 3-5 days (based on audit findings)  
**Prerequisites:** QA audit phase completed

## 🎯 **IMPLEMENTATION OBJECTIVES**

Transform all frontend mock data to backend-sourced data following established patterns, ensuring zero functionality loss and maintaining integration-ready architecture.

## 📋 **IMPLEMENTATION WORKFLOW**

### **Step 1: Setup & Preparation** 🔧
**Duration:** 1-2 hours

**Pre-Implementation Checklist:**
- [ ] Review QA audit deliverables in `audit-results/`
- [ ] Understand priority task list and timeline estimates
- [ ] Set up implementation tracking in `implementation-log/`
- [ ] Create feature branch: `feature/mock-data-migration`
- [ ] Verify development environment is working
- [ ] Run baseline tests to ensure starting point is stable

**Branch Strategy:**
```bash
git checkout -b feature/mock-data-migration
git checkout -b feature/mock-migration-component-[name] # For each component
```

### **Step 2: Implementation Strategy by Priority** 🎯

#### **P0 Critical Components First**
**Approach:** One component at a time with immediate testing

**For Each P0 Component:**
1. **Analyze Current Mock Data**
   - Document data structure and usage
   - Identify all mock data consumption points
   - Note any complex data relationships

2. **API Endpoint Assessment**
   - Check if API endpoint exists in `src/app/api/v1/`
   - Test endpoint response structure matches mock data
   - If endpoint missing: create it (see API Creation Guidelines below)

3. **Component Migration**
   - Replace hardcoded mock data with API fetch
   - Use existing data fetching patterns from similar components
   - Implement proper loading states
   - Handle error states appropriately
   - Maintain TypeScript type safety

4. **Immediate Validation**
   - Component renders correctly with API data
   - All functionality preserved
   - TypeScript compilation passes
   - Related tests still pass

#### **P1-P3 Components**
Continue same pattern after P0 components are stable.

### **Step 3: API Endpoint Creation Guidelines** 🌐

**When New Endpoints Needed:**
Follow established patterns from existing 189 endpoints in `src/app/api/v1/`

**Standard API Route Structure:**
```typescript
// src/app/api/v1/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // For dev environment, return mock data from here
    // Structure should match what component expects
    const mockData = {
      // Move frontend mock data structure here
    };
    
    return NextResponse.json(mockData);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**API Design Principles:**
- Match existing endpoint patterns in the project
- Use consistent response formats
- Include proper error handling
- Add TypeScript types for request/response
- Follow RESTful conventions where applicable

### **Step 4: Component Migration Patterns** ⚛️

**Before Migration (Violation Pattern):**
```typescript
// ❌ CLAUDE.md Violation - Hardcoded mock at component level
const MyComponent = () => {
  const mockData = [
    { id: 1, name: 'Sample Item 1' },
    { id: 2, name: 'Sample Item 2' }
  ];
  
  return (
    <div>
      {mockData.map(item => <ItemCard key={item.id} item={item} />)}
    </div>
  );
};
```

**After Migration (Compliant Pattern):**
```typescript
// ✅ CLAUDE.md Compliant - API endpoint sourced
const MyComponent = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetch('/api/v1/my-feature')
      .then(response => response.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  
  return (
    <div>
      {data.map(item => <ItemCard key={item.id} item={item} />)}
    </div>
  );
};
```

**Alternative: Using Custom Hooks (Preferred)**
```typescript
// ✅ Even better - Use existing data fetching patterns
const MyComponent = () => {
  const { data, loading, error } = useApiData('/api/v1/my-feature');
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  
  return (
    <div>
      {data.map(item => <ItemCard key={item.id} item={item} />)}
    </div>
  );
};
```

### **Step 5: Testing & Validation** ✅

**After Each Component Migration:**
1. **Functionality Test**
   - Component renders without errors
   - All interactive features work
   - Data displays correctly
   - Loading and error states function

2. **Integration Test**
   - API endpoint returns expected data structure
   - Component handles API response properly
   - Related components still work

3. **TypeScript Validation**
   ```bash
   pnpm --filter @dms/frontend run tsc --noEmit
   ```

4. **Test Suite Validation**
   ```bash
   pnmp --filter @dms/frontend test [ComponentName].test.tsx
   ```

5. **Development Server Test**
   ```bash
   pnpm dev
   ```
   Verify component loads correctly in browser.

## 📊 **IMPLEMENTATION TRACKING**

### **Component Migration Log**
**File:** `implementation-log/component-migration-log.md`

**Format:**
```markdown
# Component Migration Log

## [Date] - [ComponentName]
- **Status:** [In Progress/Complete/Blocked]
- **API Endpoint:** [Existing/Created/Modified]
- **Migration Type:** [Simple/Complex/Required New Endpoint]
- **Test Results:** [Pass/Fail/Partial]
- **Notes:** [Any issues or special considerations]
- **Time Spent:** [Hours]

## Issues & Resolutions
- **Issue:** [Description]
- **Resolution:** [How it was solved]
- **Impact:** [Other components affected]
```

### **API Endpoint Changes Log**
**File:** `implementation-log/api-endpoint-changes.md`

Document all new endpoints created and modifications made.

## 🚨 **COMMON PITFALLS & SOLUTIONS**

### **TypeScript Errors**
- **Issue:** Type mismatches between mock data and API response
- **Solution:** Update types in `src/types/` to match actual API structure
- **Prevention:** Validate API response structure matches component expectations

### **Async Data Loading**
- **Issue:** Components expecting immediate data availability
- **Solution:** Implement proper loading states and conditional rendering
- **Pattern:** Use existing loading component patterns from the codebase

### **Test Failures**
- **Issue:** Tests still expecting hardcoded mock data
- **Solution:** Update test mocks to use MSW or API mocking patterns
- **Reference:** Check existing test patterns in `__tests__/` directories

### **Performance Issues**
- **Issue:** Too many API calls on component mount
- **Solution:** Implement proper caching or use existing data management patterns
- **Check:** Review how similar components handle data fetching

## 🔄 **INCREMENTAL MIGRATION STRATEGY**

**Daily Progress Goals:**
- **Day 1:** P0 Critical components (2-3 components)
- **Day 2:** Remaining P0 + start P1 High (3-4 components)  
- **Day 3:** P1 High priority components (4-5 components)
- **Day 4:** P2 Medium priority components (5-6 components)
- **Day 5:** P3 Low priority + cleanup (remaining components)

**After Each Day:**
- Commit all changes to feature branch
- Run full test suite validation
- Update implementation log
- Report progress to PM

## ✅ **SUCCESS CRITERIA**

**Implementation Complete When:**
- [ ] All components identified in QA audit have been migrated
- [ ] No hardcoded mock data remains in `src/components/`
- [ ] All new/modified API endpoints return proper mock data
- [ ] TypeScript compilation passes without mock-related errors
- [ ] Test suites continue passing (or updated appropriately)
- [ ] Development server starts successfully
- [ ] All functionality preserved from before migration
- [ ] Implementation log completed with full tracking

## 🤝 **HANDOFF TO QA VALIDATION**

**Preparation for QA Phase:**
1. Complete implementation log with all changes documented
2. Provide summary of:
   - Components migrated
   - New API endpoints created
   - Any architectural decisions made
   - Outstanding issues or concerns
3. Ensure feature branch is ready for QA testing
4. Provide test instructions for QA validation

**Handoff Deliverables:**
- Updated codebase with all migrations complete
- Complete implementation log
- List of new API endpoints created
- Summary of any test modifications needed
- Performance impact notes

---

**Next Phase:** QA Agent Final Validation (`03-qa-validation-instructions.md`)  
**Estimated Handoff:** 3-5 days after implementation start