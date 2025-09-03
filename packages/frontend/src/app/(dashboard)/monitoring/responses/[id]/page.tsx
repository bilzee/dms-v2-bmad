'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { ConnectionStatusHeader } from '@/components/shared/ConnectionStatusHeader';
import { ResponseVerificationInterface } from '@/components/features/verification/ResponseVerificationInterface';
import { VerificationStamp } from '@/components/features/verification/VerificationStamp';

export default function ResponseDetailsPage() {
  const params = useParams();
  const responseId = params?.id as string;
  
  const [response, setResponse] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!responseId) return;
    
    const loadResponseDetails = async () => {
      try {
        setLoading(true);
        
        // Mock response data for testing
        const mockResponse = {
          id: responseId,
          responseType: 'HEALTH',
          responderName: 'Test Responder',
          donorName: 'Test Donor',
          plannedDate: new Date().toISOString(),
          deliveredDate: new Date().toISOString(),
          status: 'DELIVERED',
          verificationStatus: 'VERIFIED',
          verificationId: 'verification-' + responseId,
          verifiedAt: new Date().toISOString(),
          verifiedByName: 'Test Coordinator',
          verificationNotes: 'Response successfully verified with complete documentation.',
        };
        
        setResponse(mockResponse);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load response details');
      } finally {
        setLoading(false);
      }
    };

    loadResponseDetails();
  }, [responseId]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <ConnectionStatusHeader />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading response details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <ConnectionStatusHeader />
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-2">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <ConnectionStatusHeader />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/monitoring">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Monitoring
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
              Response Details
            </h1>
            <p className="text-gray-600 mt-1">
              Verification and achievement tracking for response {responseId}
            </p>
          </div>
        </div>
      </div>

      {/* Response Verification Interface */}
      {response && (
        <>
          <ResponseVerificationInterface
            response={response}
            onVerificationComplete={(responseId, status) => {
              console.log(`Verification completed: ${responseId} -> ${status}`);
              // Refresh response data if needed
            }}
          />
          
          {/* Additional Verification Stamp for verified responses */}
          {response.verificationStatus === 'VERIFIED' && response.verificationId && (
            <Card>
              <CardHeader>
                <CardTitle>Verification Certificate</CardTitle>
              </CardHeader>
              <CardContent>
                <VerificationStamp 
                  responseId={response.id}
                  verificationId={response.verificationId}
                  verifiedAt={new Date(response.verifiedAt)}
                  verifiedBy={response.verifiedByName}
                  verificationNotes={response.verificationNotes}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}