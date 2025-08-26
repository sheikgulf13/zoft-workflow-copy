import { toast } from 'sonner'
import { X, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'neutral' | 'warning'

type ShowToastOptions = {
  title: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
  action?: { label: string; onClick: () => void }
}

type VariantStyle = {
  container: string
  icon: React.ReactElement
  actionBtn: string
}

const variantStyles: Record<ToastVariant, VariantStyle> = {
  success: {
    container:
      'border border-emerald-200 bg-white text-emerald-900 shadow-lg',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />,
    actionBtn:
      'text-emerald-700 hover:bg-emerald-50 focus-visible:ring-emerald-300',
  },
  error: {
    container:
      'border border-red-200 bg-white text-red-900 shadow-lg',
    icon: <XCircle className="h-5 w-5 text-red-600" aria-hidden />,
    actionBtn: 'text-red-700 hover:bg-red-50 focus-visible:ring-red-300',
  },
  neutral: {
    container:
      'border border-gray-200 bg-white text-gray-900 shadow-lg',
    icon: <Info className="h-5 w-5 text-blue-600" aria-hidden />,
    actionBtn: 'text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-300',
  },
  warning: {
    container:
      'border border-amber-200 bg-white text-amber-900 shadow-lg',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />,
    actionBtn: 'text-amber-700 hover:bg-amber-50 focus-visible:ring-amber-300',
  },
}

export function showToast({
  title,
  description,
  variant = 'neutral',
  durationMs = 4000,
  action,
}: ShowToastOptions) {
  const styles = variantStyles[variant]

  toast.custom((t) => (
    <div
      role="alert"
      className={
        'pointer-events-auto flex w-full max-w-sm items-start gap-4 rounded-2xl p-5 ' +
        styles.container
      }
    >
      <div className="shrink-0 mt-0.5">{styles.icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-gray-600 leading-relaxed">{description}</p>
        )}
        {action && (
          <div className="mt-3">
            <button
              type="button"
              className={
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
                styles.actionBtn
              }
              onClick={() => {
                try {
                  action.onClick()
                } finally {
                  toast.dismiss(t)
                }
              }}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        className="rounded-xl p-1.5 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
        aria-label="Close notification"
        onClick={() => toast.dismiss(t)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ), {
    duration: durationMs,
  })
}

export function toastSuccess(title: string, description?: string, durationMs?: number) {
  showToast({ title, description, durationMs, variant: 'success' })
}

export function toastError(title: string, description?: string, durationMs?: number) {
  showToast({ title, description, durationMs, variant: 'error' })
}

export function toastNeutral(title: string, description?: string, durationMs?: number) {
  showToast({ title, description, durationMs, variant: 'neutral' })
}

export function toastWarning(title: string, description?: string, durationMs?: number) {
  showToast({ title, description, durationMs, variant: 'warning' })
}



