'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface InfoTooltipProps {
  /** Plain-English explanation shown in the tooltip body */
  text: string;
  /** Optional short heading shown above the explanation */
  title?: string;
  /** Accessible label for screen readers */
  label?: string;
  /** Visual color style of the circular trigger button */
  variant?: 'default' | 'inverted';
  /** Optional extra classes on the trigger button */
  className?: string;
}

interface FloatingCoords {
  top: number;
  left: number;
  width: number;
  arrowLeft: number;
  placement: 'top' | 'bottom';
}

/**
 * Portal-rendered hover/focus/tap info tooltip designed for both desktop pointers
 * and 375px+ mobile touchscreens without getting clipped by `overflow-hidden` cards.
 */
export default function InfoTooltip({
  text,
  title,
  label,
  variant = 'default',
  className = '',
}: InfoTooltipProps) {
  const [mounted, setMounted] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [coords, setCoords] = useState<FloatingCoords | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const isOpen = hoverOpen || pinnedOpen;

  useEffect(() => {
    setMounted(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const updatePosition = useCallback(() => {
    if (typeof window === 'undefined' || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const pad = 12;
    const width = Math.min(280, Math.max(200, window.innerWidth - pad * 2));
    const rawLeft = rect.left + rect.width / 2 - width / 2;
    const left = Math.max(pad, Math.min(rawLeft, window.innerWidth - width - pad));
    const arrowLeft = Math.max(12, Math.min(rect.left + rect.width / 2 - left, width - 12));

    const spaceBelow = window.innerHeight - rect.bottom;
    const preferTop = spaceBelow < 150 && rect.top > spaceBelow;

    setCoords({
      top: preferTop ? rect.top - 8 : rect.bottom + 8,
      left,
      width,
      arrowLeft,
      placement: preferTop ? 'top' : 'bottom',
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setHoverOpen(false);
      setPinnedOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHoverOpen(false);
        setPinnedOpen(false);
      }
    };

    const handleViewportChange = () => {
      setHoverOpen(false);
      setPinnedOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleViewportChange, { passive: true, capture: true });
    window.addEventListener('resize', handleViewportChange, { passive: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleViewportChange, { capture: true });
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoverOpen(true);
    }, 60);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoverOpen(false);
    }, 80);
  };

  const triggerColors =
    variant === 'inverted'
      ? 'bg-white/25 text-white border-white/40 hover:bg-white/35'
      : 'bg-slate-200/80 text-slate-600 border-slate-300/80 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-300';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label || (title ? `Explain ${title}` : 'Explain this metric')}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={() => setHoverOpen(true)}
        onBlur={() => setHoverOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPinnedOpen((prev) => !prev);
        }}
        className={`relative inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] font-bold leading-none shrink-0 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/70 before:content-[''] before:absolute before:-inset-2 ${triggerColors} ${className}`}
      >
        <span aria-hidden="true">i</span>
      </button>

      {mounted &&
        isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            id={tooltipId}
            role="tooltip"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none',
            }}
            className="z-[200] bg-slate-900 text-slate-100 rounded-xl p-3 shadow-2xl border border-slate-700/90 text-[11px] leading-relaxed pointer-events-auto"
          >
            <span
              aria-hidden="true"
              style={{ left: coords.arrowLeft }}
              className={`absolute w-2.5 h-2.5 bg-slate-900 border-slate-700/90 rotate-45 -translate-x-1/2 ${
                coords.placement === 'top'
                  ? '-bottom-[5px] border-r border-b'
                  : '-top-[5px] border-l border-t'
              }`}
            />
            {title && (
              <div className="font-bold text-amber-300 text-xs mb-1 pr-2">{title}</div>
            )}
            <p className="text-slate-100 font-normal">{text}</p>
          </div>,
          document.body
        )}
    </>
  );
}
