import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { getTexts } from '../i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Discord Thread Monitor] Error caught by boundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const t = getTexts();
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>{t.language === 'zh' ? '\u51FA\u73b0\u9519\u8bef' : 'An error occurred'}</h2>
            <p>
              {t.language === 'zh'
                ? '\u7ebf\u7a0b\u76d1\u63a7\u5668\u9047\u5230\u4e86\u9519\u8bef\u3002'
                : 'The thread monitor encountered an error.'}
            </p>
            {this.state.error && <pre className="error-message">{this.state.error.message}</pre>}
            <button onClick={this.handleReset} className="error-reset-button">
              {t.language === 'zh' ? '\u91cd\u8bd5' : 'Reset'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
