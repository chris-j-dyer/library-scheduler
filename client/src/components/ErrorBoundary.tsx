import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnNavigate?: boolean;
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

  private currentPath: string = window.location.pathname;

  componentDidUpdate() {
    // Reset error state if navigation happens and resetOnNavigate is true
    if (this.props.resetOnNavigate && 
        this.state.hasError && 
        window.location.pathname !== this.currentPath) {
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null 
      });
      this.currentPath = window.location.pathname;
    }
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { 
      hasError: true, 
      error, 
      errorInfo: null 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info for detailed debugging
    this.setState({ errorInfo });
    
    // Log error to console
    console.error("Uncaught error in component:", error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        console.error("Error in error handler:", handlerError);
      }
    }
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded shadow-md">
          <h2 className="text-lg font-medium text-red-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-red-600 mb-4">
            The application encountered an error. Please try refreshing the page.
          </p>
          <details className="text-sm text-red-700">
            <summary className="cursor-pointer font-medium">Error details (click to expand)</summary>
            <div className="mt-2 p-3 bg-white rounded overflow-auto max-h-48 text-xs">
              <p className="font-bold mb-1">Error:</p>
              <pre className="mb-2">
                {this.state.error && this.state.error.toString()}
              </pre>
              
              {this.state.errorInfo && (
                <>
                  <p className="font-bold mb-1">Component Stack:</p>
                  <pre className="text-gray-700">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          </details>
          
          <div className="mt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;