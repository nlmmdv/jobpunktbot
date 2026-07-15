import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  phoneMask,
  isValidPhone,
  isNotEmpty,
  formatTime,
  getInitials,
  toTitleCase,
  debounce,
  throttle,
} from '../src/lib/utils';

describe('Utils', () => {
  describe('phoneMask', () => {
    it('should format phone with 8 prefix', () => {
      expect(phoneMask('89991234567')).toBe('+79991234567');
    });

    it('should format phone with 7 prefix', () => {
      expect(phoneMask('79991234567')).toBe('+79991234567');
    });

    it('should handle partial input', () => {
      expect(phoneMask('999')).toBe('+7999');
    });

    it('should handle empty input', () => {
      expect(phoneMask('')).toBe('');
    });

    it('should strip non-digits', () => {
      expect(phoneMask('+7 (999) 123-45-67')).toBe('+79991234567');
    });

    it('should limit to 11 digits', () => {
      expect(phoneMask('799912345679999')).toBe('+79991234567');
    });
  });

  describe('isValidPhone', () => {
    it('should validate correct phone', () => {
      expect(isValidPhone('+79991234567')).toBe(true);
    });

    it('should reject short phone', () => {
      expect(isValidPhone('+7999123456')).toBe(false);
    });

    it('should reject empty phone', () => {
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('isNotEmpty', () => {
    it('is false for blank/whitespace', () => {
      expect(isNotEmpty('')).toBe(false);
      expect(isNotEmpty('   ')).toBe(false);
    });

    it('is true for non-blank', () => {
      expect(isNotEmpty(' a ')).toBe(true);
    });
  });

  describe('formatTime', () => {
    it('pads hours and minutes', () => {
      expect(formatTime(9, 5)).toBe('09:05');
      expect(formatTime(14, 30)).toBe('14:30');
    });
  });

  describe('getInitials', () => {
    it('builds initials from first and last name', () => {
      expect(getInitials('иван', 'петров')).toBe('ИП');
    });

    it('works without last name', () => {
      expect(getInitials('анна')).toBe('А');
    });
  });

  describe('toTitleCase', () => {
    it('capitalizes each word', () => {
      expect(toTitleCase('иван ПЕТРОВ')).toBe('Иван Петров');
    });
  });

  describe('debounce', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 300);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should throttle function calls', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 1000);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
