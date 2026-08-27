import type { HTMLAttributes, ReactNode } from 'react'

export function Carte({
  children,
  className = '',
  ...reste
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <section className={`card p-4 sm:p-6 ${className}`} {...reste}>
      {children}
    </section>
  )
}

export function EnTeteCarte({
  titre,
  aide,
  action,
}: {
  titre: ReactNode
  aide?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="flex items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h2 className="text-[0.95rem] font-semibold tracking-tight">{titre}</h2>
        {aide && <p className="text-xs text-faint mt-1.5 leading-relaxed max-w-prose">{aide}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
