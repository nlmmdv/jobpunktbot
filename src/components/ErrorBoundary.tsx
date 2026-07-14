import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center',
            background: '#F7F6FB',
            color: '#17151F',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Ошибка приложения</h1>
          <p style={{ fontSize: 14, color: '#6E6A7C', marginBottom: 16, maxWidth: 320 }}>
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              border: 'none',
              background: '#6D28D9',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Перезагрузить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
