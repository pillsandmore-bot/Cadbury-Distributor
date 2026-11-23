import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Cadbury DMS component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-red-100 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-inner">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h2 className="text-xl font-black text-slate-800">Distributor Dashboard Notice</h2>
            <p className="text-sm text-slate-500">
              An unexpected display issue occurred. Your data, orders, and vehicle telemetry are completely safe.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl text-left font-mono text-xs text-red-600 overflow-x-auto border border-slate-200">
              {this.state.error?.message || 'Unknown error'}
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-6 py-2.5 bg-cadbury-900 hover:bg-cadbury-800 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-rotate-right"></i> Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
