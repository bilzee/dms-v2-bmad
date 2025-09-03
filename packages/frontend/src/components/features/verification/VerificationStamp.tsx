'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, 
  Shield, 
  Calendar, 
  User,
  Award,
  ExternalLink
} from 'lucide-react';

interface VerificationStampProps {
  responseId: string;
  verificationId: string;
  verifiedAt: Date;
  verifiedBy: string;
  verificationNotes?: string;
  donorName?: string;
  donorId?: string;
  achievements?: Array<{
    id: string;
    title: string;
    icon: string;
  }>;
  size?: 'compact' | 'full';
  showCertificate?: boolean;
}

export function VerificationStamp({
  responseId,
  verificationId,
  verifiedAt,
  verifiedBy,
  verificationNotes,
  donorName,
  donorId,
  achievements = [],
  size = 'full',
  showCertificate = true
}: VerificationStampProps) {
  
  const handleGenerateCertificate = async () => {
    if (!donorId) return;
    
    try {
      const response = await fetch(`/api/v1/verification/responses/${responseId}/certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorId,
          verificationId,
          includeAchievements: achievements.length > 0
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `verification-certificate-${responseId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to generate certificate:', error);
    }
  };

  if (size === 'compact') {
    return (
      <div className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-green-900 truncate">
            Verified by {verifiedBy}
          </p>
          <p className="text-xs text-green-700">
            {verifiedAt.toLocaleDateString()}
          </p>
        </div>
        {achievements.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            +{achievements.length} 🏆
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-4">
        {/* Header with verification status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Response Verified</h3>
              <p className="text-xs text-green-700">ID: {verificationId.slice(0, 8)}...</p>
            </div>
          </div>
          <Badge className="bg-green-600 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        </div>

        {/* Verification details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-green-800">
            <User className="w-4 h-4 mr-2" />
            <span className="font-medium">Verified by:</span>
            <span className="ml-1">{verifiedBy}</span>
          </div>
          
          <div className="flex items-center text-sm text-green-800">
            <Calendar className="w-4 h-4 mr-2" />
            <span className="font-medium">Verified on:</span>
            <span className="ml-1">{verifiedAt.toLocaleString()}</span>
          </div>

          {donorName && (
            <div className="flex items-center text-sm text-green-800">
              <Award className="w-4 h-4 mr-2" />
              <span className="font-medium">Donor:</span>
              <span className="ml-1">{donorName}</span>
            </div>
          )}
        </div>

        {/* Verification notes */}
        {verificationNotes && (
          <div className="mb-4 p-3 bg-white rounded border border-green-200">
            <p className="text-sm font-medium text-gray-900 mb-1">Verification Notes:</p>
            <p className="text-sm text-gray-700">{verificationNotes}</p>
          </div>
        )}

        {/* Achievements earned */}
        {achievements.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
            <div className="flex items-center mb-2">
              <Award className="w-4 h-4 text-yellow-600 mr-2" />
              <h4 className="text-sm font-semibold text-yellow-900">
                Achievements Earned
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {achievements.map((achievement) => (
                <Badge 
                  key={achievement.id} 
                  variant="outline" 
                  className="bg-yellow-100 text-yellow-800 border-yellow-300"
                >
                  <span className="mr-1">{achievement.icon}</span>
                  {achievement.title}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Certificate generation */}
        {showCertificate && donorId && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateCertificate}
              className="text-green-700 border-green-300 hover:bg-green-100"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Generate Certificate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}