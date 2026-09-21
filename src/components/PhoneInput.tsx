import { useEffect, useState } from 'react';
import {
  PHONE_COUNTRIES,
  joinPhoneInput,
  splitPhoneInput,
  type PhoneCountry,
} from '../utils/phone';

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (e164OrEmpty: string) => void;
  /** Preferred country when value has no dial code yet */
  defaultIso?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  autoComplete?: string;
};

export function PhoneInput({
  id,
  label,
  value,
  onChange,
  defaultIso = 'UG',
  placeholder = '7XX XXX XXX',
  required,
  disabled,
  hint,
  autoComplete = 'tel-national',
}: Props) {
  const initial = splitPhoneInput(value, defaultIso);
  const [iso, setIso] = useState(initial.iso);
  const [national, setNational] = useState(initial.national);

  useEffect(() => {
    const next = splitPhoneInput(value, defaultIso);
    setIso(next.iso);
    setNational(next.national);
  }, [value, defaultIso]);

  const emit = (nextIso: string, nextNational: string) => {
    onChange(joinPhoneInput(nextIso, nextNational));
  };

  return (
    <div className="field ec-phone-field">
      <label htmlFor={id}>{label}</label>
      <div className="ec-phone-row">
        <select
          className="ec-phone-cc"
          aria-label="Country code"
          value={iso}
          disabled={disabled}
          onChange={(e) => {
            const nextIso = e.target.value;
            setIso(nextIso);
            emit(nextIso, national);
          }}
        >
          {PHONE_COUNTRIES.map((c: PhoneCountry) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} +{c.dial} {c.iso}
            </option>
          ))}
        </select>
        <input
          id={id}
          value={national}
          onChange={(e) => {
            const next = e.target.value.replace(/[^\d\s]/g, '');
            setNational(next);
            emit(iso, next);
          }}
          placeholder={placeholder}
          inputMode="tel"
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
        />
      </div>
      {hint ? (
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
