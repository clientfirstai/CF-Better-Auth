/**
 * Formatting utilities for CF-Better-Auth
 * 
 * @fileoverview This module provides formatting functions for dates, strings,
 * numbers, currencies, and other data types commonly used in applications.
 * 
 * Features:
 * - Date and time formatting
 * - Number and currency formatting
 * - String formatting and transformation
 * - File size formatting
 * - Duration formatting
 * - Localization support
 */

import type { Brand } from '@cf-auth/types';
import { TIME_CONSTANTS } from './constants';

/**
 * Branded types for formatted data
 */
export type FormattedDate = Brand<string, 'FormattedDate'>;
export type FormattedCurrency = Brand<string, 'FormattedCurrency'>;
export type FormattedNumber = Brand<string, 'FormattedNumber'>;
export type FormattedFileSize = Brand<string, 'FormattedFileSize'>;
export type FormattedDuration = Brand<string, 'FormattedDuration'>;

/**
 * Formatting options
 */
export interface DateFormatOptions {
  /** Locale for formatting */
  locale?: string;
  /** Date style */
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  /** Time style */
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  /** Time zone */
  timeZone?: string;
  /** Custom format pattern */
  pattern?: string;
  /** Use relative time (e.g., '2 hours ago') */
  relative?: boolean;
}

export interface NumberFormatOptions {
  /** Locale for formatting */
  locale?: string;
  /** Number style */
  style?: 'decimal' | 'currency' | 'percent' | 'unit';
  /** Currency code (for currency style) */
  currency?: string;
  /** Unit (for unit style) */
  unit?: string;
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Use grouping separators */
  useGrouping?: boolean;
  /** Notation (e.g., 'compact', 'scientific') */
  notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
}

export interface StringFormatOptions {
  /** Maximum length before truncation */
  maxLength?: number;
  /** Truncation suffix */
  suffix?: string;
  /** Case transformation */
  case?: 'upper' | 'lower' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab';
  /** Trim whitespace */
  trim?: boolean;
}

export interface DurationFormatOptions {
  /** Units to include */
  units?: ('years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds')[];
  /** Maximum number of units to show */
  maxUnits?: number;
  /** Show zero values */
  showZero?: boolean;
  /** Use short format */
  short?: boolean;
  /** Locale for formatting */
  locale?: string;
}

/**
 * Date formatting utilities
 */

/**
 * Format date with various options
 * 
 * @param date - Date to format
 * @param options - Formatting options
 * @returns Formatted date string
 * 
 * @example
 * ```typescript
 * const formatted = formatDate(new Date(), { 
 *   dateStyle: 'medium', 
 *   timeStyle: 'short' 
 * });
 * console.log(formatted); // "Jan 1, 2024 at 12:00 PM"
 * ```
 */
export function formatDate(date: Date, options: DateFormatOptions = {}): FormattedDate {
  if (!date || isNaN(date.getTime())) {
    return 'Invalid Date' as FormattedDate;
  }

  const {
    locale = 'en-US',
    dateStyle,
    timeStyle,
    timeZone,
    pattern,
    relative = false
  } = options;

  // Handle relative formatting
  if (relative) {
    return formatRelativeTime(date, locale) as FormattedDate;
  }

  // Handle custom patterns
  if (pattern) {
    return formatDateWithPattern(date, pattern) as FormattedDate;
  }

  // Use Intl.DateTimeFormat
  const formatOptions: Intl.DateTimeFormatOptions = {};
  
  if (dateStyle) formatOptions.dateStyle = dateStyle;
  if (timeStyle) formatOptions.timeStyle = timeStyle;
  if (timeZone) formatOptions.timeZone = timeZone;

  try {
    return new Intl.DateTimeFormat(locale, formatOptions).format(date) as FormattedDate;
  } catch (error) {
    return date.toLocaleDateString() as FormattedDate;
  }
}

/**
 * Format date as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date, locale: string = 'en-US'): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const absDiff = Math.abs(diff);
  const isFuture = diff < 0;

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const units: Array<[string, number]> = [
    ['year', TIME_CONSTANTS.MILLISECONDS.YEAR],
    ['month', TIME_CONSTANTS.MILLISECONDS.MONTH],
    ['week', TIME_CONSTANTS.MILLISECONDS.WEEK],
    ['day', TIME_CONSTANTS.MILLISECONDS.DAY],
    ['hour', TIME_CONSTANTS.MILLISECONDS.HOUR],
    ['minute', TIME_CONSTANTS.MILLISECONDS.MINUTE],
    ['second', TIME_CONSTANTS.MILLISECONDS.SECOND]
  ];

  for (const [unit, ms] of units) {
    if (absDiff >= ms) {
      const value = Math.floor(absDiff / ms);
      return rtf.format(isFuture ? value : -value, unit as Intl.RelativeTimeFormatUnit);
    }
  }

  return rtf.format(0, 'second');
}

/**
 * Format date with custom pattern
 */
function formatDateWithPattern(date: Date, pattern: string): string {
  const tokens: Record<string, () => string> = {
    'YYYY': () => date.getFullYear().toString(),
    'YY': () => date.getFullYear().toString().slice(-2),
    'MM': () => (date.getMonth() + 1).toString().padStart(2, '0'),
    'M': () => (date.getMonth() + 1).toString(),
    'DD': () => date.getDate().toString().padStart(2, '0'),
    'D': () => date.getDate().toString(),
    'HH': () => date.getHours().toString().padStart(2, '0'),
    'H': () => date.getHours().toString(),
    'mm': () => date.getMinutes().toString().padStart(2, '0'),
    'm': () => date.getMinutes().toString(),
    'ss': () => date.getSeconds().toString().padStart(2, '0'),
    's': () => date.getSeconds().toString(),
    'SSS': () => date.getMilliseconds().toString().padStart(3, '0')
  };

  let result = pattern;
  for (const [token, fn] of Object.entries(tokens)) {
    result = result.replace(new RegExp(token, 'g'), fn());
  }

  return result;
}

/**
 * Format time duration in human-readable format
 * 
 * @param milliseconds - Duration in milliseconds
 * @param options - Formatting options
 * @returns Formatted duration string
 * 
 * @example
 * ```typescript
 * const formatted = formatDuration(90000); // 90 seconds
 * console.log(formatted); // "1 minute 30 seconds"
 * ```
 */
export function formatDuration(milliseconds: number, options: DurationFormatOptions = {}): FormattedDuration {
  const {
    units = ['days', 'hours', 'minutes', 'seconds'],
    maxUnits = 2,
    showZero = false,
    short = false
  } = options;

  if (milliseconds < 0) {
    return formatDuration(-milliseconds, options) as FormattedDuration;
  }

  const unitValues: Record<string, number> = {
    years: Math.floor(milliseconds / TIME_CONSTANTS.MILLISECONDS.YEAR),
    months: Math.floor((milliseconds % TIME_CONSTANTS.MILLISECONDS.YEAR) / TIME_CONSTANTS.MILLISECONDS.MONTH),
    weeks: Math.floor((milliseconds % TIME_CONSTANTS.MILLISECONDS.MONTH) / TIME_CONSTANTS.MILLISECONDS.WEEK),
    days: Math.floor((milliseconds % TIME_CONSTANTS.MILLISECONDS.WEEK) / TIME_CONSTANTS.MILLISECONDS.DAY),
    hours: Math.floor((milliseconds % TIME_CONSTANTS.MILLISECONDS.DAY) / TIME_CONSTANTS.MILLISECONDS.HOUR),
    minutes: Math.floor((milliseconds % TIME_CONSTANTS.MILLISECONDS.HOUR) / TIME_CONSTANTS.MILLISECONDS.MINUTE),
    seconds: Math.floor((milliseconds % TIME_CONSTANTS.MILLISECONDS.MINUTE) / TIME_CONSTANTS.MILLISECONDS.SECOND),
    milliseconds: milliseconds % TIME_CONSTANTS.MILLISECONDS.SECOND
  };

  const parts: string[] = [];
  let addedUnits = 0;

  for (const unit of units) {
    const value = unitValues[unit];
    
    if (value > 0 || (showZero && addedUnits === 0)) {
      const label = short ? getShortUnitLabel(unit) : getUnitLabel(unit, value);
      parts.push(`${value}${short ? '' : ' '}${label}`);
      addedUnits++;
      
      if (addedUnits >= maxUnits) break;
    }
  }

  if (parts.length === 0) {
    const firstUnit = units[0] || 'seconds';
    const label = short ? getShortUnitLabel(firstUnit) : getUnitLabel(firstUnit, 0);
    return `0${short ? '' : ' '}${label}` as FormattedDuration;
  }

  return parts.join(short ? ' ' : ', ') as FormattedDuration;
}

function getUnitLabel(unit: string, value: number): string {
  const labels: Record<string, [string, string]> = {
    years: ['year', 'years'],
    months: ['month', 'months'],
    weeks: ['week', 'weeks'],
    days: ['day', 'days'],
    hours: ['hour', 'hours'],
    minutes: ['minute', 'minutes'],
    seconds: ['second', 'seconds'],
    milliseconds: ['millisecond', 'milliseconds']
  };

  const [singular, plural] = labels[unit] || ['unit', 'units'];
  return value === 1 ? singular : plural;
}

function getShortUnitLabel(unit: string): string {
  const shortLabels: Record<string, string> = {
    years: 'y',
    months: 'mo',
    weeks: 'w',
    days: 'd',
    hours: 'h',
    minutes: 'm',
    seconds: 's',
    milliseconds: 'ms'
  };

  return shortLabels[unit] || 'u';
}

/**
 * Number formatting utilities
 */

/**
 * Format number with various options
 * 
 * @param value - Number to format
 * @param options - Formatting options
 * @returns Formatted number string
 * 
 * @example
 * ```typescript
 * const formatted = formatNumber(1234.56, { 
 *   style: 'currency', 
 *   currency: 'USD' 
 * });
 * console.log(formatted); // "$1,234.56"
 * ```
 */
export function formatNumber(value: number, options: NumberFormatOptions = {}): FormattedNumber {
  if (!isFinite(value)) {
    return String(value) as FormattedNumber;
  }

  const {
    locale = 'en-US',
    style = 'decimal',
    currency = 'USD',
    unit,
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping = true,
    notation = 'standard'
  } = options;

  const formatOptions: Intl.NumberFormatOptions = {
    style,
    useGrouping,
    notation
  };

  if (style === 'currency') {
    formatOptions.currency = currency;
  }

  if (style === 'unit' && unit) {
    formatOptions.unit = unit;
  }

  if (minimumFractionDigits !== undefined) {
    formatOptions.minimumFractionDigits = minimumFractionDigits;
  }

  if (maximumFractionDigits !== undefined) {
    formatOptions.maximumFractionDigits = maximumFractionDigits;
  }

  try {
    return new Intl.NumberFormat(locale, formatOptions).format(value) as FormattedNumber;
  } catch (error) {
    return value.toLocaleString() as FormattedNumber;
  }
}

/**
 * Format currency with symbol and proper decimals
 * 
 * @param amount - Amount to format
 * @param currency - Currency code
 * @param locale - Locale for formatting
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): FormattedCurrency {
  return formatNumber(amount, {
    style: 'currency',
    currency,
    locale
  }) as FormattedCurrency;
}

/**
 * Format percentage with proper symbol
 * 
 * @param value - Value to format (0.5 = 50%)
 * @param locale - Locale for formatting
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  locale: string = 'en-US',
  decimals: number = 0
): FormattedNumber {
  return formatNumber(value, {
    style: 'percent',
    locale,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}

/**
 * Format file size in human-readable format
 * 
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places
 * @returns Formatted file size string
 * 
 * @example
 * ```typescript
 * const size = formatFileSize(1536);
 * console.log(size); // "1.5 KB"
 * ```
 */
export function formatFileSize(bytes: number, decimals: number = 1): FormattedFileSize {
  if (bytes === 0) return '0 Bytes' as FormattedFileSize;
  if (bytes < 0) return `-${formatFileSize(-bytes, decimals)}` as FormattedFileSize;

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  if (i >= units.length) {
    return `${(bytes / Math.pow(k, units.length - 1)).toFixed(decimals)} ${units[units.length - 1]}` as FormattedFileSize;
  }

  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${units[i]}` as FormattedFileSize;
}

/**
 * String formatting utilities
 */

/**
 * Format string with various transformations
 * 
 * @param str - String to format
 * @param options - Formatting options
 * @returns Formatted string
 */
export function formatString(str: string, options: StringFormatOptions = {}): string {
  if (!str) return str;

  let result = str;
  const { maxLength, suffix = '...', case: caseType, trim = true } = options;

  // Trim whitespace
  if (trim) {
    result = result.trim();
  }

  // Truncate if needed
  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength - suffix.length) + suffix;
  }

  // Apply case transformation
  if (caseType) {
    result = transformCase(result, caseType);
  }

  return result;
}

/**
 * Transform string case
 */
function transformCase(str: string, caseType: NonNullable<StringFormatOptions['case']>): string {
  switch (caseType) {
    case 'upper':
      return str.toUpperCase();
    case 'lower':
      return str.toLowerCase();
    case 'title':
      return str.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
      );
    case 'sentence':
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    case 'camel':
      return str.replace(/[-_\s]+(\w)/g, (_, c) => c.toUpperCase())
                .replace(/^\w/, c => c.toLowerCase());
    case 'pascal':
      return str.replace(/[-_\s]+(\w)/g, (_, c) => c.toUpperCase())
                .replace(/^\w/, c => c.toUpperCase());
    case 'snake':
      return str.replace(/([A-Z])/g, '_$1')
                .replace(/[-\s]+/g, '_')
                .toLowerCase()
                .replace(/^_/, '');
    case 'kebab':
      return str.replace(/([A-Z])/g, '-$1')
                .replace(/[_\s]+/g, '-')
                .toLowerCase()
                .replace(/^-/, '');
    default:
      return str;
  }
}

/**
 * Truncate string with ellipsis
 * 
 * @param str - String to truncate
 * @param length - Maximum length
 * @param suffix - Truncation suffix
 * @returns Truncated string
 */
export function truncate(str: string, length: number, suffix: string = '...'): string {
  if (!str || str.length <= length) {
    return str;
  }
  
  return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Pad string to specified length
 * 
 * @param str - String to pad
 * @param length - Target length
 * @param char - Padding character
 * @param side - Side to pad ('start', 'end', 'both')
 * @returns Padded string
 */
export function pad(
  str: string, 
  length: number, 
  char: string = ' ', 
  side: 'start' | 'end' | 'both' = 'start'
): string {
  if (str.length >= length) {
    return str;
  }

  const padLength = length - str.length;
  
  switch (side) {
    case 'start':
      return char.repeat(padLength) + str;
    case 'end':
      return str + char.repeat(padLength);
    case 'both':
      const leftPad = Math.floor(padLength / 2);
      const rightPad = padLength - leftPad;
      return char.repeat(leftPad) + str + char.repeat(rightPad);
    default:
      return str;
  }
}

/**
 * Pluralize word based on count
 * 
 * @param word - Word to pluralize
 * @param count - Count to check
 * @param plural - Custom plural form
 * @returns Pluralized word
 */
export function pluralize(word: string, count: number, plural?: string): string {
  if (count === 1) {
    return word;
  }
  
  if (plural) {
    return plural;
  }
  
  // Simple pluralization rules
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  }
  
  if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x') || word.endsWith('z')) {
    return word + 'es';
  }
  
  return word + 's';
}

/**
 * Format phone number with standard formatting
 * 
 * @param phone - Phone number to format
 * @param format - Format pattern
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phone: string, format: string = '(XXX) XXX-XXXX'): string {
  const cleaned = phone.replace(/\D/g, '');
  let formatted = format;
  
  for (let i = 0; i < cleaned.length; i++) {
    formatted = formatted.replace('X', cleaned[i]);
  }
  
  return formatted.replace(/X/g, '');
}

/**
 * Mask sensitive string (e.g., credit card, SSN)
 * 
 * @param str - String to mask
 * @param visibleStart - Characters to show at start
 * @param visibleEnd - Characters to show at end
 * @param maskChar - Character to use for masking
 * @returns Masked string
 */
export function maskString(
  str: string,
  visibleStart: number = 4,
  visibleEnd: number = 4,
  maskChar: string = '*'
): string {
  if (str.length <= visibleStart + visibleEnd) {
    return str;
  }
  
  const start = str.substring(0, visibleStart);
  const end = str.substring(str.length - visibleEnd);
  const maskLength = str.length - visibleStart - visibleEnd;
  
  return start + maskChar.repeat(maskLength) + end;
}

/**
 * Format social security number
 * 
 * @param ssn - SSN to format
 * @returns Formatted SSN
 */
export function formatSSN(ssn: string): string {
  const cleaned = ssn.replace(/\D/g, '');
  
  if (cleaned.length !== 9) {
    return ssn;
  }
  
  return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 5)}-${cleaned.substring(5)}`;
}

/**
 * Format credit card number with spaces
 * 
 * @param cardNumber - Credit card number to format
 * @returns Formatted credit card number
 */
export function formatCreditCard(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  const match = cleaned.match(/.{1,4}/g);
  
  return match ? match.join(' ') : cardNumber;
}

/**
 * Utility functions
 */

/**
 * Get ordinal suffix for number (1st, 2nd, 3rd, etc.)
 * 
 * @param num - Number to get ordinal for
 * @returns Ordinal string
 */
export function getOrdinal(num: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

/**
 * Format time in 12-hour or 24-hour format
 * 
 * @param date - Date to format
 * @param use24Hour - Use 24-hour format
 * @param showSeconds - Include seconds
 * @returns Formatted time string
 */
export function formatTime(date: Date, use24Hour: boolean = false, showSeconds: boolean = false): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !use24Hour
  };
  
  if (showSeconds) {
    options.second = '2-digit';
  }
  
  return date.toLocaleTimeString([], options);
}

/**
 * Format age from birth date
 * 
 * @param birthDate - Birth date
 * @param referenceDate - Reference date (default: now)
 * @returns Age string
 */
export function formatAge(birthDate: Date, referenceDate: Date = new Date()): string {
  const ageMs = referenceDate.getTime() - birthDate.getTime();
  const ageYears = Math.floor(ageMs / TIME_CONSTANTS.MILLISECONDS.YEAR);
  
  if (ageYears < 1) {
    const ageMonths = Math.floor(ageMs / TIME_CONSTANTS.MILLISECONDS.MONTH);
    return `${ageMonths} month${ageMonths !== 1 ? 's' : ''}`;
  }
  
  return `${ageYears} year${ageYears !== 1 ? 's' : ''}`;
}

/**
 * Format initials from name
 * 
 * @param name - Full name
 * @param maxInitials - Maximum number of initials
 * @returns Initials string
 */
export function formatInitials(name: string, maxInitials: number = 2): string {
  return name
    .split(' ')
    .filter(part => part.length > 0)
    .slice(0, maxInitials)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

/**
 * Format address in standard format
 * 
 * @param address - Address components
 * @returns Formatted address string
 */
export function formatAddress(address: {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}): string {
  const parts = [];
  
  if (address.street) parts.push(address.street);
  
  const cityStateZip = [];
  if (address.city) cityStateZip.push(address.city);
  if (address.state) cityStateZip.push(address.state);
  if (address.zipCode) cityStateZip.push(address.zipCode);
  
  if (cityStateZip.length > 0) {
    parts.push(cityStateZip.join(', '));
  }
  
  if (address.country && address.country.toLowerCase() !== 'usa') {
    parts.push(address.country);
  }
  
  return parts.join('\n');
}