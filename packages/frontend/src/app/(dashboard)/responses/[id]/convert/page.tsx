'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ResponseConversionForm } from '@/components/features/response/ResponseConversionForm';

interface ResponseConvertPageProps {
  params: {
    id: string;
  };
}

export default function ResponseConvertPage({ params }: ResponseConvertPageProps) {
  const router = useRouter();
  const responseId = params.id;

  const handleConversionComplete = () => {
    // Navigate back to response details or responses list
    router.push(`/responses/${responseId}`);
  };

  const handleConversionCancel = () => {
    // Navigate back to response details or responses list
    router.push('/responses');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <ResponseConversionForm
        responseId={responseId}
        onComplete={handleConversionComplete}
        onCancel={handleConversionCancel}
        className="max-w-4xl mx-auto"
      />
    </div>
  );
}