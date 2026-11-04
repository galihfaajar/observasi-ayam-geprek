import React from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import { getCurrentTimeString } from '../../utils/timeUtils';

interface TimePickerInputProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  helperText?: string;
}

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  label,
  value,
  onChange,
  required = false,
  placeholder = 'HH:MM:SS',
  className = '',
  helperText
}) => {
  const handleSetNow = () => {
    onChange(getCurrentTimeString(true));
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 tracking-wide">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="flex items-center space-x-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono placeholder:text-slate-400 shadow-sm"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              title="Kosongkan"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleSetNow}
          title="Isi dengan waktu saat ini"
          className="inline-flex items-center px-2.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 active:bg-blue-200 transition shrink-0 shadow-sm gap-1"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Sekarang</span>
        </button>
      </div>
      {helperText && <p className="text-[11px] text-slate-500">{helperText}</p>}
    </div>
  );
};

