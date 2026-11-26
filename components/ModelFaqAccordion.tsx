'use client';

import { useRef } from 'react';
import { getTracker } from '@/lib/analytics/tracker';

export interface ModelFaqItem {
  question: string;
  answer: string;
}

interface ModelFaqAccordionProps {
  faqs: ModelFaqItem[];
  machineSlug: string;
}

export default function ModelFaqAccordion({
  faqs,
  machineSlug,
}: ModelFaqAccordionProps) {
  const prevOpenRef = useRef<Record<number, boolean>>({});

  const handleToggle = (
    index: number,
    faq: ModelFaqItem,
    e: React.SyntheticEvent<HTMLDetailsElement>
  ) => {
    const isOpen = e.currentTarget.open;
    if (Boolean(prevOpenRef.current[index]) === isOpen) return;
    prevOpenRef.current[index] = isOpen;

    try {
      getTracker().track?.('model_faq_accordion_toggle', {
        elementTag: 'details',
        elementText: faq.question.slice(0, 200),
        metadata: {
          open: isOpen,
          machineSlug,
          faqIndex: index,
          question: faq.question,
        },
      });
    } catch {}
  };

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <details
          key={index}
          onToggle={(e) => handleToggle(index, faq, e)}
          data-faq-question={faq.question}
          data-machine-slug={machineSlug}
          className="group border border-gray-200 rounded-xl overflow-hidden bg-white"
        >
          <summary className="flex items-center justify-between cursor-pointer px-6 py-4 bg-gray-50/60 hover:bg-gray-100 transition-colors text-gray-900 font-semibold text-sm">
            <span>{faq.question}</span>
            <svg
              className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180 flex-shrink-0 ml-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 py-4 text-sm text-gray-700 leading-relaxed border-t border-gray-100">
            {faq.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
