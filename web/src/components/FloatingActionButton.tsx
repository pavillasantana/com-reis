import React from 'react';

interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ children, className = '', ...props }) => {
  return (
    <div className="fab-container">
      <button className={`fab-btn ${className}`} {...props}>
        {children}
      </button>
    </div>
  );
};
