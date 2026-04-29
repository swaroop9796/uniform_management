import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function friendlyError(error: { message?: string } | null | undefined): string {
  const msg = error?.message ?? ''
  if (msg.includes('duplicate key') && msg.includes('employee_code'))
    return 'Employee code already exists. Please use a different code.'
  if (msg.includes('duplicate key') && msg.includes('qr_code'))
    return 'A uniform with this QR code already exists.'
  if (msg.includes('duplicate key'))
    return 'This record already exists. Please check for duplicates.'
  if (msg.includes('violates not-null constraint'))
    return 'A required field is missing. Please fill in all fields.'
  if (msg.includes('violates foreign key constraint'))
    return 'Invalid reference — the selected item may have been deleted.'
  if (msg.includes('JWT') || msg.includes('auth'))
    return 'Session expired. Please log in again.'
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Network error. Check your connection and try again.'
  return msg || 'Something went wrong. Please try again.'
}
