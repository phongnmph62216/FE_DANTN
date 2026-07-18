/**
 * Formatting utilities for currency and dates
 */

/**
 * Formats a number to Vietnamese Dong currency string (e.g. 150.000 đ)
 * @param {number|string} value - The value to format
 * @returns {string}
 */
export function formatCurrency(value) {
  const val = Number(value);
  if (isNaN(val)) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
}

/**
 * Formats a date to DD/MM/YYYY string
 * @param {Date|string|number} value - The date to format
 * @returns {string}
 */
export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Formats a date-time to HH:mm:ss DD/MM/YYYY string
 * @param {Date|string|number} value - The date-time to format
 * @returns {string}
 */
export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Formats a date to HH:mm string
 * @param {Date|string|number} value - The date to format
 * @returns {string}
 */
export function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Default export as a helper object
export default {
  currency: formatCurrency,
  date: formatDate,
  dateTime: formatDateTime,
  time: formatTime,
  formatInputNumber,
  parseInputNumber
};

/**
 * Formats a raw number or string to a string with thousand separators (e.g. 500000 -> "500.000")
 * @param {number|string} value
 * @returns {string}
 */
export function formatInputNumber(value) {
  if (value === undefined || value === null || value === '') return '';
  const clean = String(value).replace(/\D/g, '');
  if (!clean || Number(clean) === 0) return '';
  return new Intl.NumberFormat('vi-VN').format(Number(clean));
}

/**
 * Parses a formatted string back to a number (e.g. "500.000" -> 500000)
 * @param {string} value
 * @returns {number}
 */
export function parseInputNumber(value) {
  if (!value) return 0;
  const clean = String(value).replace(/\D/g, '');
  return clean ? Number(clean) : 0;
}

export function trackNewItem(type, id) {
  try {
    const key = `newly_added_${type}`;
    const existing = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (!existing.includes(id)) {
      existing.push(id);
      sessionStorage.setItem(key, JSON.stringify(existing));
    }
  } catch (e) {
    console.error('Failed to track new item:', e);
  }
}

export function sortNewestAtTop(type, list) {
  if (!list || list.length <= 1) return list;
  try {
    const key = `newly_added_${type}`;
    const newlyAdded = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (newlyAdded.length === 0) return list;

    const newItems = list.filter(item => newlyAdded.includes(item.id));
    const oldItems = list.filter(item => !newlyAdded.includes(item.id));

    newItems.sort((a, b) => b.id - a.id);

    return [...newItems, ...oldItems];
  } catch (e) {
    return list;
  }
}

