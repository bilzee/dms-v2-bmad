'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useResponseStore } from '@/stores/response.store';
import { DeliveryDocumentationForm } from '@/components/features/response/DeliveryDocumentationForm';
import type { DeliveryDocumentationFormData } from '@dms/shared';

interface DeliveryPageProps {
  params: {
    id: string;
  };
}

export default function DeliveryPage({ params }: DeliveryPageProps) {
  const router = useRouter();
  const { 
    completeDocumentation,
    error,
    isDocumenting,
  } = useResponseStore();

  const handleDocumentationComplete = async (documentation: DeliveryDocumentationFormData) => {
    try {
      await completeDocumentation(params.id);
      
      // Navigate back to response list or details
      router.push(`/responses/${params.id}`);
    } catch (error) {
      console.error('Failed to complete delivery documentation:', error);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container mx-auto py-6">
      <DeliveryDocumentationForm
        responseId={params.id}
        onComplete={handleDocumentationComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}