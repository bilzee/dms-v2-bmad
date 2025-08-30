
## Referencing Test Strategy by BMad Agents
The test strategy located in docs/qa/test-strategy.md and the following agents should reference it. 
  - Dev Agent: Always consult test strategy for quality requirements
  - PM Agent: Reference quality gates for timeline planning
  - Architect: Validate against testing architecture framework

Test Mocking - Avoid hardcoding mock values at the component level, instead frontend components should point to api endpoints where the mocking should happen. This makes all tests integration-ready by simply connecting the api endpoint to the backend. 

## Use of MCP Tools by BMad Agents
BMad agents should utilise available MCPs tools in their tasks. Below are list of BMad agents and recommended MCP tools to use.  
 - pm agent: Sequential Thinking
 - po agent: Sequential Thinking
 - sm agent: Sequential Thinking
 - dev agent: Context7; Sequential Thinking
 - qa agent: Playwright; Sequential Thinking
 - architect: Context7; Sequential Thinking
 - ux-expert: Context7; Sequential Thinking

 ## Common Error Fixes
 - Starting the dev server took about 85 seconds while implementing story 4.2 so give the server sufficient time before declaring the lack of response is an error. If such delays will affect building the app too, then consider it when building too. 
 - When you get a workspace error when using "npm", try using "pnmp" instead. 
 - Infinite loop is caused by a common React Hook Form anti-pattern: using watch() with useEffect and setValue (e.g. const currentValues = watch()) creates a circular dependency; the solution in this case would be "const currentValues = getValues(); // Doesn't subscribe to changes"
 - Enum import failures in Next.js monorepos: Instead of importing enums from workspace packages (e.g. CommitmentStatus.PLANNED), use string literals directly ('PLANNED') to avoid TypeScript compilation and workspace resolution issues in API routes.