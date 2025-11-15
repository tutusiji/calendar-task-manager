'use client'

import { useToast } from '@/hooks/use-toast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react'

export function Toaster() {
  const { toasts } = useToast()

  const getIcon = (variant?: string | null) => {
    switch (variant) {
      case 'destructive':
        return <XCircle className="h-5 w-5 text-red-500 shrink-0" />
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
      default:
        return <Info className="h-5 w-5 text-blue-500 shrink-0" />
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} duration={5000} {...props}>
            <div className="flex items-start gap-3 w-full">
              {getIcon(variant)}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
