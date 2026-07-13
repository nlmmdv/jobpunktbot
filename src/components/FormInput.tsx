import React from 'react';

interface FormInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: 'text' | 'tel' | 'date' | 'textarea';
  rows?: number;
  mask?: (value: string) => string;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  error,
  required,
  type = 'text',
  rows,
  mask,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    if (mask) {
      newValue = mask(newValue);
    }
    onChange(newValue);
  };

  const inputClassName = `w-full px-4 py-3 rounded-card bg-card text-text-primary placeholder-text-hint border-2 transition-colors ${
    error ? 'border-[#DC2626]' : 'border-transparent focus:border-accent-freelancer'
  } focus:outline-none`;

  return (
    <div className="w-full mb-4">
      {label && (
        <label className="block text-text-primary text-sm font-medium mb-2">
          {label}
          {required && <span className="text-accent-freelancer ml-1">*</span>}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className={inputClassName}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className={inputClassName}
        />
      )}
      {error && <p className="text-[#DC2626] text-sm mt-1">{error}</p>}
    </div>
  );
};
