'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  formName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class FormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[FormErrorBoundary${this.props.formName ? ` - ${this.props.formName}` : ''}] Error caught:`,
      error,
      errorInfo,
    );

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Track error in performance monitoring if available
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`form-error-${this.props.formName || 'unknown'}`);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Form Error</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">
              An error occurred while rendering{' '}
              {this.props.formName ? `the ${this.props.formName} form` : 'this form'}.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium">Error details</summary>
                <pre className="mt-2 overflow-auto rounded bg-destructive/10 p-2 text-xs">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <Button onClick={this.handleReset} variant="outline" size="sm" className="mt-4">
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to wrap form sections with error boundary
 */
export function withFormErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  formName?: string,
): React.ComponentType<P> {
  return function WrappedComponent(props: P) {
    return (
      <FormErrorBoundary formName={formName}>
        <Component {...props} />
      </FormErrorBoundary>
    );
  };
}
