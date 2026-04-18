"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ContentViewer] Module component error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex flex-col items-center justify-center py-20 px-8 text-center rounded-2xl"
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <AlertTriangle size={32} className="text-error mb-4 opacity-80" />
          <h3 className="text-lg font-semibold text-primary mb-2">
            Module failed to load
          </h3>
          <p className="text-sm text-secondary mb-6 max-w-sm">
            This module&apos;s content ran into an error. Try refreshing the page.
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="inline-flex items-center gap-2 text-sm font-medium text-error hover:text-error/80 transition-colors"
          >
            <RefreshCw size={14} />
            Try again
          </button>
          <pre className="mt-6 text-left text-xs text-muted bg-black/30 rounded-lg px-4 py-3 max-w-full overflow-auto">
            {this.state.error.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
