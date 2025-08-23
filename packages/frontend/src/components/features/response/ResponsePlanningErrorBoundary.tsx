'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface ResponsePlanningErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ResponsePlanningErrorBoundary extends React.Component<
  ResponsePlanningErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ResponsePlanningErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ResponsePlanningForm Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center border border-red-200 bg-red-50 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Response Planning Error
          </h2>
          <p className="text-red-600 mb-4">
            The form encountered an infinite update loop. Please try again.
          </p>
          <div className="space-x-2">
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                this.props.onReset?.();
              }}
              variant="outline"
              size="sm"
            >
              Try Again
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="destructive" 
              size="sm"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}