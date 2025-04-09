import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => ReactNode);
  onReset?: () => void;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log the error
    console.error('Uncaught error:', error, errorInfo);
    
    // Call the onError prop if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        console.error('Error in onError callback:', callbackError);
      }
    }
  }
  
  private resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (resetError) {
        console.error('Error in onReset callback:', resetError);
        // If the reset callback throws, we want to keep the error state
        this.setState({ hasError: true, error: resetError as Error });
      }
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback({
            error: this.state.error as Error,
            resetErrorBoundary: this.resetErrorBoundary
          });
        }
        return this.props.fallback;
      }
      
      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">Something went wrong</h2>
            <p className="text-gray-600 mb-6 text-center">
              The application encountered an error. We apologize for the inconvenience.
            </p>
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded mb-4 overflow-auto max-h-32">
              {this.state.error && this.state.error.toString()}
            </div>
            <div className="flex justify-center">
              <Button
                onClick={this.resetErrorBoundary}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Try again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 ml-2"
              >
                Refresh the page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;