'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AssessmentType, type RapidAssessment } from '@dms/shared';
import { AssessmentList } from '@/components/features/assessment/AssessmentList';

export default function AssessmentsPage() {
  const router = useRouter();

  const handleAssessmentSelect = (assessment: RapidAssessment) => {
    router.push(`/assessments/${assessment.id}`);
  };

  const handleNewAssessment = (type: AssessmentType | null) => {
    if (type) {
      router.push(`/assessments/new?type=${type}`);
    } else {
      router.push('/assessments/new');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <AssessmentList
        onAssessmentSelect={handleAssessmentSelect}
        onNewAssessment={handleNewAssessment}
        showDrafts={false}
      />
    </div>
  );
}