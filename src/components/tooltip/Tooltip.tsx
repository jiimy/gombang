'use client';
import React, { useEffect, useRef, useState } from 'react';
import s from './tooltip.module.scss';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const Tooltip = ({ children, text, className }: { children: React.ReactNode, text: string, className?: string }) => {

  const isMobile = useMediaQuery('(max-width: 768px)');

  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isMobile, isOpen]);

  const hoverHandlers = !isMobile
    ? {
        onMouseEnter: () => setIsOpen(true),
        onMouseLeave: () => setIsOpen(false),
      }
    : {};

  const clickHandler = isMobile
    ? { onClick: () => setIsOpen((prev) => !prev) }
    : {};

  return (
    <div
      ref={tooltipRef}
      className={cn(s.tooltip, className)}
      {...hoverHandlers}
      {...clickHandler}
    >
      {children}
      {isOpen && <span className={s.tooltipText}>{text}</span>}
    </div>
  );
};

export default Tooltip;
