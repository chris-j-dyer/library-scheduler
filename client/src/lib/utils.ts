import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDateTimeRange(startDate: Date, endDate: Date): string {
  // Check if the dates are on the same day
  const sameDay = startDate.toDateString() === endDate.toDateString();
  
  if (sameDay) {
    // Format: Monday, January 1, 2025 from 9:00 AM to 11:00 AM
    return `${formatDate(startDate)} from ${formatTime(startDate)} to ${formatTime(endDate)}`;
  } else {
    // Format: Monday, January 1, 2025 at 9:00 AM to Tuesday, January 2, 2025 at 11:00 AM
    return `${formatDate(startDate)} at ${formatTime(startDate)} to ${formatDate(endDate)} at ${formatTime(endDate)}`;
  }
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
}
