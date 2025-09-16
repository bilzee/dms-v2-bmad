
## Referencing Test Strategy by BMad Agents
The test strategy located in docs/qa/test-strategy.md and the following agents should reference it. 
  - Dev Agent: Always consult test strategy for quality requirements
  - PM Agent: Reference quality gates for timeline planning
  - Architect: Validate against testing architecture framework

Test Mocking - Avoid hardcoding mock values at the component level, if the backend is not ready, frontend components should point to api endpoints where the mocking should happen. This makes all tests integration-ready by simply connecting the api endpoint to the backend. If backend is ready ready then the mocking should happen on the backend. 

## Use of MCP Tools by BMad Agents
BMad agents should utilise available MCPs tools in their tasks. Below are list of BMad agents and recommended MCP tools to use.  
 - pm agent: Sequential Thinking
 - po agent: Sequential Thinking
 - sm agent: Sequential Thinking
 - dev agent: Context7; Sequential Thinking
 - qa agent: Playwright; Sequential Thinking
 - architect: Context7; Sequential Thinking
 - ux-expert: Context7; Sequential Thinking

## QA Agent Implementation Review Protocol
**CRITICAL**: When reviewing dev agent implementations, QA agents must validate both "implementation complete" AND "working correctly"

### Two-Phase Validation Required:
1. **Implementation Complete**: Code connections, API endpoints, hook integrations 
2. **Working Correctly**: Data quality, user experience, performance, realistic behavior

### Mandatory QA Validation Checklist:
- [ ] **Data Quality**: APIs return realistic data, not random/mock values  
- [ ] **User Experience**: Values make sense in user context (e.g. "45 active users" when system has 5 users)
- [ ] **Performance**: API call frequency reasonable (avoid excessive polling)
- [ ] **End-to-End Testing**: Test actual user workflows, not just code connectivity
- [ ] **Error Scenarios**: Test API failures, network issues, edge cases
- [ ] **Loading States**: Verify loading/error states work in real browser
- [ ] **Cross-Role Testing**: Test functionality across different user roles

### Dev Agent Instruction Requirements:
- Always specify data quality expectations (realistic vs. mock data)
- Define acceptable performance thresholds (API call frequency, response times)
- Include user experience validation criteria
- Require end-to-end testing, not just integration testing

**Example Failure**: Claiming "implementation complete" when APIs return `Math.random()` values and poll every 15 seconds, causing poor UX despite correct code connections.

## Common Error Fixes
 - Starting the dev server took about 85 seconds while implementing story 4.2 so give the server sufficient time before declaring the lack of response is an error. If such delays will affect building the app too, then consider it when building too. 
 - When you get a workspace error when using "npm", try using "pnmp" instead. 
 - Infinite loop is caused by a common React Hook Form anti-pattern: using watch() with useEffect and setValue (e.g. const currentValues = watch()) creates a circular dependency; the solution in this case would be "const currentValues = getValues(); // Doesn't subscribe to changes"
 - Enum import failures in Next.js monorepos: Instead of importing enums from workspace packages (e.g. CommitmentStatus.PLANNED), use string literals directly ('PLANNED') to avoid TypeScript compilation and workspace resolution issues in API routes.
 - If you make "ignoreDuringBuilds: true" for esLint or Typescript in next.config.js as part of troubleshooting, make sure to rever to  "ignoreDuringBuilds: false" right after so that code quality is maintained. Also, report if you change  ignoreDuringBuilds in your implementation summary.   