import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', padding: 20,
        }}>
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24 }}>
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              style={{
                backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Refresh Page
            </button>
            {this.state.error && (
              <pre style={{
                marginTop: 20, padding: 12, borderRadius: 8, backgroundColor: '#1e293b',
                fontSize: 12, color: '#f87171', textAlign: 'left', overflow: 'auto',
              }}>
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
