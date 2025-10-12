'use client';

import React from 'react';
import { formatDateTime } from '../utils/dateFormatters';
import { formatDistanceToNow } from 'date-fns';

interface TimeAgoProps {
  date: Date | string;
  className?: string;
  titleFormat?: 'datetime' | 'date'; // Currently only datetime implemented
}

export function TimeAgo({ date, className, titleFormat = 'datetime' }: TimeAgoProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const title =
    titleFormat === 'datetime' ? formatDateTime(dateObj) : dateObj.toLocaleDateString('en-GB');

  return (
    <time dateTime={dateObj.toISOString()} title={title} className={className}>
      {(() => {
        const now = new Date();
        const diffInMinutes = Math.abs(now.getTime() - dateObj.getTime()) / (1000 * 60);
        if (diffInMinutes < 1) return 'Just now';
        return formatDistanceToNow(dateObj, { addSuffix: true });
      })()}
    </time>
  );
}

export default TimeAgo;
