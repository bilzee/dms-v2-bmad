# Dev Instructions: Story 1.3 Preliminary Assessment Form Completion

## Issue Summary

**Status**: ⚠️ Architecture Complete, Form Fields Missing  
**Discovered**: Playwright browser testing revealed preliminary assessment form shows placeholder message instead of actual incident reporting fields  
**Priority**: Medium (functionality exists but not accessible to users)

## Current State Analysis

✅ **What's Working**:
- Navigation from dashboard "Emergency Report" link
- PRELIMINARY assessment type detection and routing  
- `PreliminaryAssessmentForm.tsx` component exists in codebase
- Standard components available: GPS capture, media attachments, entity selection
- Proper UI messaging and integration points

❌ **What's Missing**:
- Dedicated incident form fields not rendering
- Shows placeholder: "Use the dedicated Preliminary Assessment Form for initial incident reporting"
- Users cannot complete preliminary assessments through the UI

## Root Cause Analysis

The `AssessmentForm.tsx` component includes this placeholder for PRELIMINARY type:

```typescript
case AssessmentType.PRELIMINARY:
  return (
    <div className="text-center py-8 text-blue-600">
      <p className="mb-4">Use the dedicated Preliminary Assessment Form for initial incident reporting.</p>
      <p className="text-sm text-gray-600">
        Preliminary assessments trigger automatic incident creation and coordinator notifications.
      </p>
    </div>
  );
```

The dedicated `PreliminaryAssessmentForm` component exists but is not integrated into the assessment workflow.

## Solution Requirements

### 1. Integration Approach Options

**Option A: Replace Placeholder (Recommended)**
- Integrate `PreliminaryAssessmentForm` component directly into `AssessmentForm.tsx`
- Maintain consistent UI/UX with other assessment types
- Leverage existing GPS, media, and entity selection components

**Option B: Dedicated Route** 
- Create separate `/preliminary` route with standalone form
- More complex but provides dedicated emergency workflow

### 2. Required Form Fields

Based on `PreliminaryAssessmentDataSchema`, implement these fields:

```typescript
interface PreliminaryAssessmentData {
  incidentType: IncidentType;
  severity: IncidentSeverity;  
  affectedPopulationEstimate: number;
  affectedHouseholdsEstimate: number;
  immediateNeedsDescription: string;
  accessibilityStatus: 'ACCESSIBLE' | 'RESTRICTED' | 'INACCESSIBLE';
  priorityLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
}
```

### 3. UI Requirements

**Form Layout**:
- Emergency-themed styling (red/orange accents)
- Clear field labels and validation
- Dropdowns for enum values
- Number inputs for estimates
- Textarea for description
- Radio buttons or dropdown for priority

**Validation**:
- All fields required except estimates (optional)
- Proper error messaging
- Form submission validation

## Implementation Instructions

### Step 1: Analyze Existing Component
```bash
# Review the existing preliminary form component
cat packages/frontend/src/components/features/assessment/PreliminaryAssessmentForm.tsx
```

### Step 2: Choose Integration Approach

**Recommended**: Replace placeholder in `AssessmentForm.tsx`

```typescript
// In renderAssessmentFields() function
case AssessmentType.PRELIMINARY:
  return (
    <div className="space-y-6">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-4">🚨 Emergency Incident Report</h3>
        
        {/* Incident Type Field */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-red-700 mb-2">Incident Type *</label>
          <select {...form.register('data.incidentType')} className="w-full p-2 border rounded-md">
            <option value="">Select incident type...</option>
            <option value="FLOOD">Flood</option>
            <option value="FIRE">Fire</option>
            <option value="EARTHQUAKE">Earthquake</option>
            <option value="CONFLICT">Conflict</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Severity Field */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-red-700 mb-2">Severity Level *</label>
          <select {...form.register('data.severity')} className="w-full p-2 border rounded-md">
            <option value="">Select severity...</option>
            <option value="LOW">Low</option>
            <option value="MODERATE">Moderate</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        {/* Population Estimates */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-red-700 mb-2">Affected Population</label>
            <input 
              type="number" 
              {...form.register('data.affectedPopulationEstimate', { valueAsNumber: true })}
              className="w-full p-2 border rounded-md"
              min="0"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-red-700 mb-2">Affected Households</label>
            <input 
              type="number" 
              {...form.register('data.affectedHouseholdsEstimate', { valueAsNumber: true })}
              className="w-full p-2 border rounded-md"
              min="0"
              placeholder="0"
            />
          </div>
        </div>

        {/* Immediate Needs */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-red-700 mb-2">Immediate Needs Description *</label>
          <textarea 
            {...form.register('data.immediateNeedsDescription')}
            className="w-full p-2 border rounded-md h-24"
            placeholder="Describe urgent needs and required assistance..."
          />
        </div>

        {/* Accessibility Status */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-red-700 mb-2">Site Accessibility *</label>
          <select {...form.register('data.accessibilityStatus')} className="w-full p-2 border rounded-md">
            <option value="">Select accessibility...</option>
            <option value="ACCESSIBLE">Accessible</option>
            <option value="RESTRICTED">Restricted Access</option>
            <option value="INACCESSIBLE">Inaccessible</option>
          </select>
        </div>

        {/* Priority Level */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-red-700 mb-2">Response Priority *</label>
          <div className="grid grid-cols-2 gap-2">
            {['LOW', 'NORMAL', 'HIGH', 'CRITICAL'].map(priority => (
              <label key={priority} className="flex items-center p-2 border rounded-md cursor-pointer hover:bg-red-50">
                <input 
                  type="radio" 
                  {...form.register('data.priorityLevel')}
                  value={priority}
                  className="mr-2"
                />
                <span className={`text-sm ${priority === 'CRITICAL' ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                  {priority}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
```

### Step 3: Update Default Form Data

Ensure the default values in `getDefaultFormData()` are correct for PRELIMINARY type:

```typescript
[AssessmentType.PRELIMINARY]: {
  incidentType: '', // Don't set default, force user selection
  severity: '', // Don't set default, force user selection  
  affectedPopulationEstimate: 0,
  affectedHouseholdsEstimate: 0,
  immediateNeedsDescription: '',
  accessibilityStatus: '', // Don't set default, force user selection
  priorityLevel: '', // Don't set default, force user selection
},
```

### Step 4: Enhance Validation

Add proper validation rules for required fields:

```typescript
case AssessmentType.PRELIMINARY:
  return z.object({ 
    ...baseSchema, 
    data: PreliminaryAssessmentDataSchema.refine(
      (data) => data.incidentType && data.severity && data.immediateNeedsDescription && data.accessibilityStatus && data.priorityLevel,
      { message: "All required fields must be completed for emergency reports" }
    )
  });
```

### Step 5: Add Emergency Styling

Create emergency-themed CSS classes or use Tailwind:

```css
/* Emergency form styling */
.emergency-form {
  border-left: 4px solid #dc2626;
  background: linear-gradient(to right, #fef2f2, #ffffff);
}

.emergency-field {
  border-color: #fca5a5;
}

.emergency-field:focus {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}
```

## Testing Requirements

### 1. Unit Tests
Update existing test file: `PreliminaryAssessmentForm.test.tsx`

```typescript
describe('Preliminary Assessment Form Fields', () => {
  it('renders all required incident fields', () => {
    render(<AssessmentForm assessmentType={AssessmentType.PRELIMINARY} {...props} />);
    
    expect(screen.getByLabelText(/incident type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/severity level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/immediate needs/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/site accessibility/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/response priority/i)).toBeInTheDocument();
  });

  it('validates required fields on submission', async () => {
    render(<AssessmentForm assessmentType={AssessmentType.PRELIMINARY} {...props} />);
    
    fireEvent.click(screen.getByText(/submit assessment/i));
    
    await waitFor(() => {
      expect(screen.getByText(/incident type.*required/i)).toBeInTheDocument();
      expect(screen.getByText(/severity.*required/i)).toBeInTheDocument();
    });
  });

  it('submits preliminary assessment with all fields', async () => {
    const mockSubmit = jest.fn();
    render(<AssessmentForm assessmentType={AssessmentType.PRELIMINARY} onSubmit={mockSubmit} {...props} />);
    
    // Fill all required fields
    fireEvent.change(screen.getByLabelText(/incident type/i), { target: { value: 'FLOOD' } });
    fireEvent.change(screen.getByLabelText(/severity/i), { target: { value: 'HIGH' } });
    fireEvent.change(screen.getByLabelText(/immediate needs/i), { target: { value: 'Emergency shelter needed' } });
    fireEvent.change(screen.getByLabelText(/accessibility/i), { target: { value: 'ACCESSIBLE' } });
    fireEvent.click(screen.getByRole('radio', { name: /high/i }));
    
    fireEvent.click(screen.getByText(/submit assessment/i));
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PRELIMINARY',
          data: expect.objectContaining({
            incidentType: 'FLOOD',
            severity: 'HIGH',
            immediateNeedsDescription: 'Emergency shelter needed',
            accessibilityStatus: 'ACCESSIBLE',
            priorityLevel: 'HIGH'
          })
        })
      );
    });
  });
});
```

### 2. Playwright Testing
Create/update e2e test: `preliminary-assessment-flow.e2e.test.ts`

```typescript
test('preliminary assessment form completion flow', async ({ page }) => {
  await page.goto('/assessments/new?type=PRELIMINARY');
  
  // Verify form renders
  await expect(page.getByText('Emergency Incident Report')).toBeVisible();
  
  // Fill required fields
  await page.selectOption('[name="data.incidentType"]', 'FLOOD');
  await page.selectOption('[name="data.severity"]', 'HIGH'); 
  await page.fill('[name="data.immediateNeedsDescription"]', 'Emergency shelter and medical aid needed');
  await page.selectOption('[name="data.accessibilityStatus"]', 'ACCESSIBLE');
  await page.click('input[value="HIGH"][name="data.priorityLevel"]');
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Verify submission (should redirect or show success message)
  await expect(page).toHaveURL(/\/assessments\/\w+/);
});
```

## Validation Steps

1. **Visual Verification**: Form renders with emergency styling
2. **Field Testing**: All form fields accept input and validate correctly  
3. **Submission Testing**: Form submits with proper data structure
4. **Integration Testing**: GPS, media, entity selection still work
5. **Playwright Testing**: End-to-end user workflow completion

## Acceptance Criteria

✅ **Preliminary assessment form fields render correctly**  
✅ **All required fields validated on submission**  
✅ **Emergency-themed styling applied**  
✅ **Form submits with proper data structure**  
✅ **Integration with existing GPS/media/entity components maintained**  
✅ **Unit tests pass**  
✅ **Playwright e2e tests pass**

## Expected Outcome

After implementation:
- Users can complete full preliminary assessments through the UI
- Emergency reports trigger incident creation workflow
- Form maintains consistency with other assessment types
- All existing functionality (GPS, media, entities) continues working

## Files to Modify

**Primary**:
- `packages/frontend/src/components/features/assessment/AssessmentForm.tsx`

**Testing**:  
- `packages/frontend/__tests__/components/features/assessment/PreliminaryAssessmentForm.test.tsx`
- `packages/frontend/src/e2e/__tests__/preliminary-assessment-flow.e2e.test.ts`

**Optional**:
- `packages/frontend/src/styles/emergency-forms.css` (if creating custom styles)

This will complete the preliminary assessment functionality and bring Story 1.3 to full production readiness.