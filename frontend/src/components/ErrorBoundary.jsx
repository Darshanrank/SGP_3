import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
                        <p className="text-gray-600 text-sm mb-6">
                            An unexpected error occurred. Please try again or go back to the homepage.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => { this.handleReset(); window.location.href = '/'; }}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
                            >
                                Go Home
                            </button>
                        </div>
                        {process.env.NODE_ENV !== 'production' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-xs text-gray-400 cursor-pointer">Error details</summary>
                                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-3 rounded overflow-auto max-h-40">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
