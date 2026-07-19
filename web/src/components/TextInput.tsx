import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Add extra custom props here if needed
}

export const TextInput: React.FC<TextInputProps> = ({ className = '', ...props }) => {
  return (
    <input
      type="text"
      className={`input-text ${className}`}
      {...props}
    />
  );
};
