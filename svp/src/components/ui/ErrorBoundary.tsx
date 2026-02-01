'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    
    this.setState({ errorInfo });
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-lg text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-400 mb-6">
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </p>
            
            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-red-400 hover:text-red-300">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 p-4 bg-gray-900 rounded-lg overflow-auto">
                  <p className="text-red-400 font-mono text-sm mb-2">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-gray-500 text-xs whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-6 rounded-lg transition"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap any component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
