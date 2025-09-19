'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff, Database, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorType?: 'network' | 'database' | 'validation' | 'general';
  retryCount: number;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Determine error type based on error message or properties
    let errorType: ErrorBoundaryState['errorType'] = 'general';
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      errorType = 'network';
    } else if (error.message.includes('database') || error.message.includes('prisma')) {
      errorType = 'database';
    } else if (error.message.includes('validation') || error.message.includes('schema')) {
      errorType = 'validation';
    }

    return { hasError: true, error, errorType, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.props.resetOnPropsChange && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: undefined, errorType: undefined, retryCount: 0 });
    }
  }

  handleRetry = () => {
    this.setState((state) => ({
      hasError: false,
      error: undefined,
      errorType: undefined,
      retryCount: state.retryCount + 1,
    }));
  };

  getErrorIcon = () => {
    switch (this.state.errorType) {
      case 'network':
        return <WifiOff className="h-5 w-5" />;
      case 'database':
        return <Database className="h-5 w-5" />;
      case 'validation':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  getErrorMessage = () => {
    const { error, errorType } = this.state;
    
    if (!error) return 'An unknown error occurred';
    
    switch (errorType) {
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case 'database':
        return 'Database connection error. Our team has been notified and is working on a fix.';
      case 'validation':
        return 'Data validation error. Please check your input and try again.';
      default:
        return error.message || 'Something went wrong. Please try again.';
    }
  };

  getErrorColor = () => {
    switch (this.state.errorType) {
      case 'network':
        return 'text-orange-600';
      case 'database':
        return 'text-red-600';
      case 'validation':
        return 'text-yellow-600';
      default:
        return 'text-red-600';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="max-w-lg mx-auto mt-8">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${this.getErrorColor()}`}>
              {this.getErrorIcon()}
              {this.state.errorType === 'network' && 'Connection Error'}
              {this.state.errorType === 'database' && 'Database Error'}
              {this.state.errorType === 'validation' && 'Validation Error'}
              {!this.state.errorType && 'Something went wrong'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {this.getErrorMessage()}
            </p>
            
            {this.state.retryCount > 0 && (
              <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                Retry attempt {this.state.retryCount} of 3
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={this.handleRetry} 
                className="flex-1"
                disabled={this.state.retryCount >= 3}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {this.state.retryCount < 3 ? 'Try Again' : 'Max Retries Reached'}
              </Button>
              
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}