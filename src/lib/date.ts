import { Timestamp } from 'firebase/firestore';

const toDateSafe = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (timestamp instanceof Date) return isNaN(timestamp.getTime()) ? null : timestamp;
  if (typeof timestamp?.toDate === 'function') {
    try {
      const d = timestamp.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch (e) {}
  }
  if (typeof timestamp?.toMillis === 'function') {
    try {
      const ms = timestamp.toMillis();
      if (typeof ms === 'number' && !isNaN(ms) && ms > 0) return new Date(ms);
    } catch (e) {}
  }
  if (typeof timestamp === 'number' && !isNaN(timestamp) && timestamp > 0) {
    return new Date(timestamp);
  }
  if (timestamp.seconds && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }
  if (typeof timestamp === 'string') {
    const trimmed = timestamp.trim();
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed) && parsed > 0) return new Date(parsed);
  }
  return null;
};

/**
 * Intelligent relative timestamp formatter for Aeirmist
 * - Within 24h: 2m ago, 3h ago, etc.
 * - Same year: 12 Jun at 6:45 PM
 * - Different year: 12 Jun 2024 at 6:45 PM
 */
export const formatAeirmistTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'Just now';
  
  const date = toDateSafe(timestamp);
  if (!date) return 'Just now';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  
  if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  }
  
  if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  }

  const isSameYear = date.getFullYear() === now.getFullYear();
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  const time = date.toLocaleString('default', { hour: 'numeric', minute: '2-digit', hour12: true });

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${time}`;
  }

  if (isSameYear) {
    return `${day} ${month} at ${time}`;
  }

  return `${day} ${month} ${year} at ${time}`;
};

/**
 * Short relative timestamp for messages/comments/seen status
 * e.g. "2m", "3h", "1d"
 */
export const formatShortTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'now';
  
  const date = toDateSafe(timestamp);
  if (!date) return 'now';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/**
 * Formats a timestamp for use as a date separator in chat
 * e.g. "Today", "Yesterday", "June 12"
 */
export const formatDateSeparator = (timestamp: any): string => {
  if (!timestamp) return '';
  
  const date = toDateSafe(timestamp);
  if (!date) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (messageDate.getTime() === today.getTime()) return 'Today';
  if (messageDate.getTime() === yesterday.getTime()) return 'Yesterday';

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  if (date.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }
  return date.toLocaleDateString('en-US', options);
};

/**
 * Formats a timestamp to show only the time (e.g. "9:50 PM")
 */
export const formatTimeOnly = (timestamp: any): string => {
  if (!timestamp) return '';
  if (typeof timestamp === 'string') {
    const trimmed = timestamp.trim();
    if (/^\d{1,2}:\d{2}(\s*(AM|PM|am|pm))?$/.test(trimmed)) {
      return trimmed;
    }
  }
  
  const date = toDateSafe(timestamp);
  if (!date) return typeof timestamp === 'string' ? timestamp : '';

  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

/**
 * Formatter for active status (e.g. "Active now", "Active 2m ago")
 */
export const formatActiveStatus = (isOnline: boolean, lastSeen: any, hideExactTime: boolean = false): string => {
  if (isOnline && !hideExactTime) return 'Active now';
  if (hideExactTime) return 'Last seen recently';
  if (!lastSeen) return 'Offline';
  
  const formattedTime = formatAeirmistTimestamp(lastSeen);
  if (formattedTime === 'Just now' || formattedTime.includes('ago')) {
    return `Active ${formattedTime}`;
  }
  return `Last seen ${formattedTime}`;
};
