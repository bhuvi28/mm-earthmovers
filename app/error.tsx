'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { getTracker } from '@/lib/analytics/tracker';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reportedRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname || '/';
    if (currentPath.startsWith('/admin')) return;

    const dedupeKey = error?.digest || error?.message || 'react_boundary_error';
    if (reportedRef.current === dedupeKey) return;
    reportedRef.current = dedupeKey;

    try {
      getTracker().track('client_error', {
        pagePath: currentPath,
        metadata: {
          kind: 'react_boundary',
          message: String(error?.message || 'Unexpected application error').slice(0, 300),
          source: currentPath.slice(0, 200),
          ...(error?.digest ? { digest: String(error.digest).slice(0, 64) } : {}),
          ...(error?.stack ? { stack: String(error.stack).slice(0, 400) } : {}),
        },
      });
    } catch {
      // Never throw inside error boundary telemetry
    }
  }, [error]);

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full mb-6">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Something went <span className="text-amber-600">wrong</span>
        </h1>
        <div className="w-20 h-1.5 bg-amber-500 mx-auto rounded-full mb-6" />
        <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-8">
          We ran into an unexpected page error while loading this section. You can retry loading
          the page or reach our Kolkata parts desk directly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 px-7 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[44px] bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-300 hover:border-amber-600 font-bold py-3.5 px-7 rounded-lg transition-all duration-300"
          >
            Go to Homepage
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <a
            href="https://wa.me/+918334887009?text=Hi%2C%20I%20encountered%20a%20page%20error%20on%20your%20website%20and%20need%20help%20finding%20a%20spare%20part."
            target="_blank"
            rel="noopener noreferrer"
            data-track="error_boundary_whatsapp"
            data-placement="error_boundary_whatsapp"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold rounded-full hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 shadow"
          >
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      </div>
    </main>
  );
}
