import { Component, type ReactNode } from 'react';

/** Keep failed route imports and rendering errors from removing the entire page. */
export class PageErrorBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main role="alert" className="min-h-screen bg-terminal-bg text-terminal-text flex items-center justify-center p-6">
      <div className="max-w-lg space-y-5">
        <h1 className="text-2xl font-bold">This page could not load</h1>
        <p>A connection problem or an outdated page file may have interrupted loading. Reload to try again.</p>
        <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl bg-neon-cyan text-terminal-bg px-6 py-3 font-semibold">Reload page</button>
        <a href="/" className="inline-flex min-h-11 items-center px-6 text-neon-cyan underline">Return to homepage</a>
      </div>
    </main>;
  }
}
