import { toast as toastFn } from '@/hooks/use-toast'

export const showToast = {
  success: (title: string, description?: string) => {
    toastFn({
      variant: 'success' as any,
      title,
      description,
    })
  },
  
  error: (title: string, description?: string) => {
    toastFn({
      variant: 'destructive',
      title,
      description,
    })
  },
  
  warning: (title: string, description?: string) => {
    toastFn({
      variant: 'warning' as any,
      title,
      description,
    })
  },
  
  info: (title: string, description?: string) => {
    toastFn({
      title,
      description,
    })
  },
}
