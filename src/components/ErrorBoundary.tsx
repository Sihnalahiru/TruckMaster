import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TruckMaster UI error boundary caught:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F7FA] dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-4">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">{this.state.message}</p>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-[#0B4F8A] text-white text-sm font-semibold hover:bg-[#083D6B] whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>Recover Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
