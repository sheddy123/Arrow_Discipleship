import { create } from 'zustand'

export interface Toast {
  id: number
  kind: 'streak' | 'badge' | 'info' | 'xp'
  title: string
  message?: string
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    // XP pings are frequent and lightweight — dismiss them quickly.
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })), toast.kind === 'xp' ? 2200 : 5000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
