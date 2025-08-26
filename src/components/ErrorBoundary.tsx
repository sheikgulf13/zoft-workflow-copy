import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; message?: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return { hasError: true, message }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught', error, info)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="container-page py-10">
          <div className="mx-auto max-w-lg rounded-[--radius] border border-gray-200 bg-white p-6 text-center shadow-soft">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="mt-2 text-sm text-gray-600">{this.state.message}</p>
            <button
              className="btn-primary mt-6"
              onClick={() => this.setState({ hasError: false, message: undefined })}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}


