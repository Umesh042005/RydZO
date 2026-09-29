/**
 * Utility functions for consistent date & time formatting across the entire app.
 * Ensures a single source of truth for booking start/end times and slots.
 */

export const formatTime12Hour = (timeStr, dateVal) => {
  if (timeStr && typeof timeStr === 'string' && timeStr.trim()) {
    const trimmed = timeStr.trim();
    if (/am|pm/i.test(trimmed)) {
      return trimmed;
    }
    const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const hoursStr = String(hours).padStart(2, '0');
      return `${hoursStr}:${minutes} ${ampm}`;
    }
  }

  if (dateVal) {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  }

  return '—';
};

export const formatBookingDate = (dateVal) => {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatBookingDateTime = (dateVal, timeStr) => {
  if (!dateVal && !timeStr) return '—';
  const dateText = formatBookingDate(dateVal);
  const timeText = formatTime12Hour(timeStr, dateVal);
  if (timeText && timeText !== '—') {
    return `${dateText} at ${timeText}`;
  }
  return dateText;
};

export const formatBookingTimeSlot = (startTimeStr, endTimeStr, startTime, endTime) => {
  const start = formatTime12Hour(startTimeStr, startTime);
  const end = formatTime12Hour(endTimeStr, endTime);
  if (start !== '—' && end !== '—') {
    return `${start} to ${end}`;
  }
  return '—';
};
