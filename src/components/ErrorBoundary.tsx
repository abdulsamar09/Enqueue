import type { ReactNode } from 'react';
import React from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[Enqueue] Render error:', error);
    this.setState({ hasError: true, error });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-3 p-6 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-sm text-[var(--eq-muted)]">Open the browser console for details.</p>
          <pre className="w-full overflow-auto rounded border bg-white p-3 text-left text-xs">{String(this.state.error?.message ?? '')}</pre>
        </main>
      );
    }

    return this.props.children;
  }
}

