import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createPageUrl(page: string) {
  switch (page) {
    case 'Feed': return '/';
    case 'CreatePost': return '/create-post';
    case 'AdminDashboard': return '/admin';
    case 'Profile': return '/profile';
    default: return '/';
  }
}
