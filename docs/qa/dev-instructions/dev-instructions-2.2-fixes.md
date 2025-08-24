  Dev Agent Fix Instructions for Story 2.2

  Priority 1: Fix Failing Unit Tests (Required Before Production)

  Issue 1: Multiple "HEALTH" Text Query Ambiguity
  - File: ResponseConversionForm.test.tsx:172
  - Problem: screen.getByText('HEALTH') finds multiple elements
  - Fix: Use more specific query with getAllByText() or target specific container
  - Solution:
  // Replace:
  expect(screen.getByText('HEALTH')).toBeInTheDocument();

  // With:
  const healthElements = screen.getAllByText('HEALTH');
  expect(healthElements).toHaveLength(2); // Or target specific one
  expect(healthElements[0]).toBeInTheDocument();

  Issue 2: Form Accessibility Role Detection
  - File: ResponseConversionForm.test.tsx:360
  - Problem: screen.getByRole('form') not finding form element
  - Fix: Add explicit role="form" to form element or use alternative query
  - Location: ResponseConversionForm.tsx:298
  - Solution:
  // In component:
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" role="form">

  // Or in test, use alternative:
  const form = container.querySelector('form');
  expect(form).toBeInTheDocument();

  Issue 3: Button State Testing in Loading Scenarios
  - File: ResponseConversionForm.test.tsx:386
  - Problem: Button not found when in loading state
  - Fix: Button only appears in 'complete' step, mock the conversion step state
  - Solution:
  // Mock store to be in 'complete' step
  mockUseResponseStore.mockReturnValue({
    ...mockStoreState,
    isConverting: true,
    conversionInProgress: true,
    conversionDraft: mockConversionDraft,
  });

  // Mock the internal step state - may need to expose via store or test differently
  // Alternative: Test button existence conditionally based on step

  Issue 4: Auto-save Test Verification
  - File: ResponseConversionForm.test.tsx:326
  - Problem: Auto-save trigger test not properly simulating form changes
  - Fix: Properly simulate user interaction that triggers auto-save
  - Solution:
  // Simulate actual form field change that would trigger auto-save
  const beneficiariesInput = screen.getByLabelText(/beneficiaries/i);
  await userEvent.type(beneficiariesInput, '50');

  // Wait for auto-save to be called
  await waitFor(() => {
    expect(mockStoreState.updateConversionData).toHaveBeenCalledWith(
      expect.objectContaining({
        beneficiariesServed: 50,
      })
    );
  });

  Priority 2: Enhance Error Handling (Required Before Production)

  GPS Capture Error Handling
  - File: ResponseConversionForm.tsx:93-113
  - Enhancement: Add better error handling when GPS capture fails
  - Solution:
  useEffect(() => {
    const captureCurrentLocation = async () => {
      try {
        const location = await captureLocation();
        if (location) {
          // existing code
        }
      } catch (error) {
        console.warn('Failed to capture GPS location:', error);
        // Add fallback: show manual entry option or use default location
        setValue('deliveryLocation', {
          latitude: 0,
          longitude: 0,
          timestamp: new Date(),
          captureMethod: 'MANUAL',
        });
        // Optionally show user notification about GPS failure
      }
    };
  }, []);

  Priority 3: Documentation Updates (Required Before Production)

  Photo Capture Simulation Documentation
  - File: DeliveryCompletionForm.tsx:52-82
  - Action: Add comprehensive comments explaining simulation
  - Solution:
  // Handle photo capture
  const handlePhotoCapture = useCallback(async () => {
    setIsCapturingPhoto(true);

    try {
      // NOTE: This is currently simulated for MVP
      // TODO: Replace with actual device camera integration
      // Implementation should use navigator.mediaDevices.getUserMedia()
      // or a camera library like react-camera-pro

      const timestamp = new Date();
      const newPhoto: MediaAttachment = {
        // ... existing simulation code
      };

      // Production implementation would:
      // 1. Access device camera
      // 2. Capture actual photo
      // 3. Store in device storage
      // 4. Upload when online
    } catch (error) {
      console.error('Failed to capture photo:', error);
    }
  }, []);

  Priority 4: Testing Commands for Validation

  Run these commands to verify fixes:

  # Run specific failing test file
  cd packages/frontend
  pnpm test ResponseConversionForm.test.tsx --verbose

  # Run all response conversion related tests
  pnpm test --testPathPattern="conversion" --verbose

  # Run integration tests
  pnpm test response-conversion-workflow.integration.test.ts

  # Verify TypeScript compilation
  pnpm run typecheck

  # Run linting
  pnpm run lint

  Additional Recommendations (Future Enhancements)

  1. Camera Integration Planning:
    - Research navigator.mediaDevices.getUserMedia() API
    - Consider using react-camera-pro library
    - Plan offline photo storage strategy
  2. Manual GPS Entry Fallback:
    - Add manual coordinate input fields
    - Implement location search/geocoding
    - Add validation for coordinate formats
  3. Performance Optimization:
    - Implement lazy loading for media files
    - Add compression for photos before storage
    - Optimize form re-renders during quantity updates

  Verification Checklist

  After implementing fixes, verify:
  - All unit tests pass (16/16)
  - Integration tests pass
  - TypeScript compilation clean
  - Linting passes
  - GPS error handling tested manually
  - Photo capture simulation documented
  - Form accessibility improved
