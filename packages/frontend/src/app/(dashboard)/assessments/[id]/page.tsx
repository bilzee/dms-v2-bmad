'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type RapidAssessment } from '@dms/shared';
import { db, type AssessmentRecord } from '@/lib/offline/db';
import { Button } from '@/components/ui/button';

interface AssessmentDetailPageProps {
  params: {
    id: string;
  };
}

export default function AssessmentDetailPage({ params }: AssessmentDetailPageProps) {
  const router = useRouter();
  const [assessment, setAssessment] = useState<AssessmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssessment();
  }, [params.id]);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      // In a real app, you'd query by ID more efficiently
      const assessments = await db.getAssessments();
      const found = assessments.find(a => a.id === params.id);
      
      if (found) {
        setAssessment(found);
      } else {
        setError('Assessment not found');
      }
    } catch (err) {
      setError('Failed to load assessment');
      console.error('Error loading assessment:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading assessment...</div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-600">
          {error || 'Assessment not found'}
        </div>
        <div className="text-center mt-4">
          <Button onClick={() => router.push('/assessments')}>
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <button
          onClick={() => router.push('/assessments')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Assessments
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {assessment.type} Assessment
          </h1>
          <p className="text-gray-600 mt-2">
            By {assessment.assessorName} • {new Date(assessment.date).toLocaleDateString()}
          </p>
        </div>

        {/* Status Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700">Sync Status</h3>
            <p className={`mt-1 font-medium ${
              assessment.syncStatus === 'SYNCED' ? 'text-green-600' :
              assessment.syncStatus === 'FAILED' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {assessment.syncStatus}
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700">Verification Status</h3>
            <p className={`mt-1 font-medium ${
              assessment.verificationStatus === 'VERIFIED' ? 'text-green-600' :
              assessment.verificationStatus === 'REJECTED' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {assessment.verificationStatus}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700">Created</h3>
            <p className="mt-1 font-medium text-gray-600">
              {new Date(assessment.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Assessment Data */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Assessment Data</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm text-gray-600 whitespace-pre-wrap">
              {JSON.stringify(assessment.data, null, 2)}
            </pre>
          </div>
        </div>

        {/* Media Attachments */}
        {assessment.mediaAttachments && assessment.mediaAttachments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Media Attachments ({assessment.mediaAttachments.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessment.mediaAttachments.map((media, index) => (
                <div key={media.id || index} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-medium">File {index + 1}</p>
                  <p className="text-sm text-gray-600">Type: {media.mimeType}</p>
                  <p className="text-sm text-gray-600">Size: {media.size} bytes</p>
                  {media.localPath && (
                    <p className="text-sm text-gray-600">Local: {media.localPath}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-4 pt-6 border-t">
          <Button
            onClick={() => router.push(`/assessments/new?type=${assessment.type}`)}
            variant="outline"
          >
            Create Similar
          </Button>
          
          {assessment.syncStatus === 'FAILED' && (
            <Button variant="outline">
              Retry Sync
            </Button>
          )}
          
          <Button
            variant="destructive"
            onClick={async () => {
              if (confirm('Are you sure you want to delete this assessment?')) {
                await db.deleteAssessment(assessment.id);
                router.push('/assessments');
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}