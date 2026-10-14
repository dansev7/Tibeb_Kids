'use client';

import React, { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type BigButtonVariant =
  | 'primary'
  | 'success'
  | 'danger'
  | 'world-abc'
  | 'world-num'
  | 'world-fidel';

export type BigButtonSize = 'sm' | 'md' | 'lg';

export interface BigButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: BigButtonVariant;
  size?: BigButtonSize;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

const variantStyles: Record<BigButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-[0_8px_0_#1d4ed8] active:shadow-[0_2px_0_#1d4ed8] active:translate-y-1.5 border-2 border-blue-300',
  success:
    'bg-gradient-to-b from-emerald-400 to-green-600 hover:from-emerald-500 hover:to-green-700 text-white shadow-[0_8px_0_#15803d] active:shadow-[0_2px_0_#15803d] active:translate-y-1.5 border-2 border-green-300',
  danger:
    'bg-gradient-to-b from-rose-400 to-red-600 hover:from-rose-500 hover:to-red-700 text-white shadow-[0_8px_0_#b91c1c] active:shadow-[0_2px_0_#b91c1c] active:translate-y-1.5 border-2 border-red-300',
  'world-abc':
    'bg-gradient-to-b from-teal-400 to-emerald-600 hover:from-teal-500 hover:to-emerald-700 text-white shadow-[0_8px_0_#0f766e] active:shadow-[0_2px_0_#0f766e] active:translate-y-1.5 border-2 border-emerald-300',
  'world-num':
    'bg-gradient-to-b from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-[0_8px_0_#c2410c] active:shadow-[0_2px_0_#c2410c] active:translate-y-1.5 border-2 border-amber-300',
  'world-fidel':
    'bg-gradient-to-b from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white shadow-[0_8px_0_#7e22ce] active:shadow-[0_2px_0_#7e22ce] active:translate-y-1.5 border-2 border-purple-300',
};

const sizeStyles: Record<BigButtonSize, string> = {
  sm: 'px-5 py-2.5 text-lg rounded-2xl min-w-[64px] min-h-[56px] gap-2',
  md: 'px-7 py-3.5 text-xl rounded-3xl min-w-[80px] min-h-[64px] gap-3',
  lg: 'px-10 py-5 text-2xl rounded-3xl min-w-[96px] min-h-[80px] gap-4',
};

export default function BigButton({
  children,
  icon,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  ariaLabel,
  ...props
}: BigButtonProps) {
  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { scale: 1.05 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`relative inline-flex items-center justify-center font-extrabold cursor-pointer select-none tracking-wide transition-all duration-150 ${variantStyles[variant]} ${sizeStyles[size]} ${
        disabled
          ? 'opacity-40 cursor-not-allowed shadow-none active:translate-y-0 active:shadow-none'
          : ''
      } ${className}`}
      {...props}
    >
      {/* Top highlight shine overlay for 3D candy look */}
      <span
        aria-hidden="true"
        className="absolute top-1 left-3 right-3 h-1/3 bg-gradient-to-b from-white/35 to-transparent rounded-t-xl pointer-events-none"
      />

      {icon && (
        <span className="flex-shrink-0 flex items-center justify-center text-current drop-shadow-sm">
          {icon}
        </span>
      )}

      <span className="relative z-10 flex items-center justify-center drop-shadow-sm">
        {children}
      </span>
    </motion.button>
  );
}
