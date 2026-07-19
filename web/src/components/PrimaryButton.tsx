import React from 'react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({ children, className = '', ...props }) => {
  return (
    <button className={`btn-primary ${className}`} {...props}>
      {children}
    </button>
  );
};
