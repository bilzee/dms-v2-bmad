'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface GapAnalysis {
  responseGap: boolean;
  unmetNeeds: number;
  responseTimestamp: string;
  gapSeverity: 'HIGH' | 'MEDIUM' | 'LOW';
  gapData: string[];
}

interface GapAnalysisViewProps {
  gapAnalysis: GapAnalysis;
}

export function GapAnalysisView({ gapAnalysis }: GapAnalysisViewProps) {
  const { responseGap, unmetNeeds, responseTimestamp, gapSeverity, gapData } = gapAnalysis;

  const getGapDisplay = () => {
    if (!responseGap) {
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        message: 'No significant gaps identified',
        severity: 'Minimal',
        severityColor: 'bg-green-100 text-green-800 border-green-300'
      };
    }

    // When there is a response gap, determine color based on severity
    switch (gapSeverity) {
      case 'HIGH':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          message: 'Critical response gaps identified',
          severity: 'High',
          severityColor: 'bg-red-100 text-red-800 border-red-300'
        };
      case 'MEDIUM':
        return {
          icon: AlertCircle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          message: 'Moderate response gaps identified',
          severity: 'Medium',
          severityColor: 'bg-yellow-100 text-yellow-800 border-yellow-300'
        };
      case 'LOW':
        return {
          icon: AlertCircle,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          message: 'Minor response gaps identified',
          severity: 'Low',
          severityColor: 'bg-blue-100 text-blue-800 border-blue-300'
        };
      default:
        // Fallback for boolean-only gaps (no severity classification)
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          message: 'Response gaps identified',
          severity: 'Present',
          severityColor: 'bg-red-100 text-red-800 border-red-300'
        };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatUnmetNeeds = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const display = getGapDisplay();
  const IconComponent = display.icon;

  const getGapItemColor = (item: string) => {
    const lowerItem = item.toLowerCase();
    
    // Red indicators (gaps/problems):
    // - Not available/sufficient
    // - Additional needs
    // - Bad "Yes" answers (overcrowded, concerns, GBV cases)
    // - Bad "No" answers (sufficient, available, access, protection)
    if (lowerItem.includes('not available') ||
        lowerItem.includes('not sufficient') ||
        lowerItem.includes('additional') && (lowerItem.includes('needed') || lowerItem.includes('required')) ||
        // Bad "Yes" answers
        lowerItem.includes('overcrowded: yes') ||
        lowerItem.includes('concerns: yes') ||
        lowerItem.includes('gbv cases reported: yes') ||
        // Bad "No" answers  
        lowerItem.includes('sufficient: no') ||
        lowerItem.includes('water sufficient: no') ||
        lowerItem.includes('latrines sufficient: no') ||
        lowerItem.includes('shelters sufficient: no') ||
        lowerItem.includes('have access: no') ||
        lowerItem.includes('protection: no') ||
        lowerItem.includes('weather protection: no')) {
      return 'text-red-600';
    }
    
    // Green indicators (no gaps/good status):
    // - Available/sufficient
    // - Good "No" answers (no overcrowding, no concerns)
    // - Good "Yes" answers (sufficient, available, access, protection)
    if (lowerItem.includes(': available') ||
        // Good "Yes" answers
        lowerItem.includes('sufficient: yes') ||
        lowerItem.includes('water sufficient: yes') ||
        lowerItem.includes('latrines sufficient: yes') ||
        lowerItem.includes('shelters sufficient: yes') ||
        lowerItem.includes('have access: yes') ||
        lowerItem.includes('protection: yes') ||
        lowerItem.includes('weather protection: yes') ||
        // Good "No" answers
        lowerItem.includes('overcrowded: no') ||
        lowerItem.includes('concerns: no') ||
        lowerItem.includes('gbv cases reported: no')) {
      return 'text-green-600';
    }
    
    // Default color for neutral items
    return 'text-gray-600';
  };

  return (
    <div className="space-y-3">
      {/* Gap Details */}
      <div className="space-y-2">
        {/* Gap Data Bullet Points */}
        {gapData && gapData.length > 0 && (
          <div>
            <ul className="text-sm space-y-1">
              {gapData.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1.5">•</span>
                  <span className={getGapItemColor(item)}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            <div>Last Response: {formatTimestamp(responseTimestamp)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}