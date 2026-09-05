import { useState } from "react";

export default function DateInput({
  value,
  onChange,
  placeholder = "eg: 09-09-2026",
  required,
  className,
  id,
  name,
  disabled,
  min,
  max,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const showDate = focused || Boolean(value);

  return (
    <input
      type={showDate ? "date" : "text"}
      value={value || ""}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={onChange}
      required={required}
      className={className}
      id={id}
      name={name}
      disabled={disabled}
      min={min}
      max={max}
      {...props}
    />
  );
}
