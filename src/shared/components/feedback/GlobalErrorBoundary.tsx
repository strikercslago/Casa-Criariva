import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { reportError } from '@/lib/monitoring/reportError'
import { Button } from '@/shared/components/ui/Button'
import { ErrorState } from './ErrorState'

type GlobalErrorBoundaryProps = {
  children: ReactNode
}

type GlobalErrorBoundaryState = {
  error: Error | null
}

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, {
      componentStack: info.componentStack,
      scope: 'global-error-boundary',
    })
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <main className="min-h-screen bg-background p-6">
        <ErrorState
          title="Algo deu errado."
          description="A aplicacao encontrou uma falha inesperada. Tente recarregar esta area ou volte ao inicio."
          onRetry={() => this.setState({ error: null })}
        />
        <Link to="/">
          <Button className="mt-4" variant="secondary">Voltar ao inicio</Button>
        </Link>
        {import.meta.env.DEV ? (
          <pre className="mt-4 overflow-auto rounded border border-border bg-muted p-3 text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
        ) : null}
      </main>
    )
  }
}
