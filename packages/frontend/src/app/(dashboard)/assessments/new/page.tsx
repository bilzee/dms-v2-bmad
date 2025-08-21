'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AssessmentType, type RapidAssessment } from '@dms/shared';
import { AssessmentForm } from '@/components/features/assessment/AssessmentForm';

export default function NewAssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [assessmentType, setAssessmentType] = useState<AssessmentType | null>(null);

  useEffect(() => {
    const type = searchParams.get('type') as AssessmentType;
    if (type && Object.values(AssessmentType).includes(type)) {
      setAssessmentType(type);
    } else {
      // Default to HEALTH if no valid type provided
      setAssessmentType(AssessmentType.HEALTH);
    }
  }, [searchParams]);

  const handleSubmit = (assessment: RapidAssessment) => {
    // Redirect to the assessment detail page after successful submission
    router.push(`/assessments/${assessment.id}`);
  };

  const handleSaveDraft = (draftData: any) => {
    // Optional: Show a toast notification that draft was saved
    console.log('Draft saved:', draftData);
  };

  if (!assessmentType) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Assessments
        </button>
      </div>
      
      <AssessmentForm
        assessmentType={assessmentType}
        affectedEntityId="sample-entity-id" // In real app, this would come from context or props
        assessorName="Current User" // In real app, this would come from auth context
        assessorId="current-user-id" // In real app, this would come from auth context
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
      />
    </div>
  );
}