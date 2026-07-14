import { phoneMask, isValidPhone, debounce, throttle } from '../src/lib/utils';

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

  describe('debounce', () => {
    jest.useFakeTimers();

    it('should debounce function calls', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 300);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    jest.useFakeTimers();

    it('should throttle function calls', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 1000);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
