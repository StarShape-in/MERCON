import { Component, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const CHUNK_ERROR_PATTERN = /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed|ChunkLoadError/i;
const RELOAD_FLAG = 'mercon:chunk-reload-attempted';

// Catches render/lazy-import errors so a slow or flaky connection produces a
// retry screen instead of a permanent white screen. Chunk load failures
// (stale cached module a deploy since removed) get one silent auto-reload
// before falling back to the manual retry UI, so we don't reload-loop forever.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (CHUNK_ERROR_PATTERN.test(error.message) && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
    }
  }

  handleRetry = () => {
    sessionStorage.removeItem(RELOAD_FLAG);
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: '#F5F5F7',
          padding: 24,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>
            This page couldn't load — it may be a slow or unstable connection.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--color-brand)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
