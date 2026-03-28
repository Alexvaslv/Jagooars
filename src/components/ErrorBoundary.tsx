import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      let parsedError = null;
      try {
        if (this.state.error?.message) {
          parsedError = JSON.parse(this.state.error.message);
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-vk-bg flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-2xl w-full border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">Что-то пошло не так</h1>
            
            {parsedError ? (
              <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm mb-6 overflow-auto max-h-64">
                <p className="font-bold mb-2">Ошибка доступа к базе данных (Firestore):</p>
                <p className="mb-2"><strong>Операция:</strong> {parsedError.operationType}</p>
                <p className="mb-2"><strong>Путь:</strong> {parsedError.path}</p>
                <p className="mb-2"><strong>Ошибка:</strong> {parsedError.error}</p>
                <details className="mt-4 cursor-pointer">
                  <summary className="font-bold">Технические детали</summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap">{JSON.stringify(parsedError, null, 2)}</pre>
                </details>
              </div>
            ) : (
              <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm mb-6 overflow-auto max-h-64">
                <p className="font-bold mb-2">Ошибка:</p>
                <p>{this.state.error?.message || 'Неизвестная ошибка'}</p>
              </div>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-vk-accent text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-600 transition-colors"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
