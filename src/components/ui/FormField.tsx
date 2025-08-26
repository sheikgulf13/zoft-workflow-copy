import type { ReactNode } from 'react'

type Props = {
  label: string
  error?: string
  children: ReactNode
}

export function FormField({ label, error, children }: Props) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}


