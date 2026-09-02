'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';

export function ArticleFeedback() {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-stone-500 transition-opacity">
        {feedback ? '¡Gracias por tu opinión!' : '¿Te resultó útil?'}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFeedback('up')}
          disabled={feedback !== null}
          className={`action-button flex size-10 items-center justify-center rounded-full border transition-colors ${
            feedback === 'up'
              ? 'border-[#365DC4] bg-[#365DC4] text-white'
              : feedback === 'down'
              ? 'border-stone-100 bg-stone-50 text-stone-300 cursor-default'
              : 'border-stone-200 bg-white text-stone-400 hover:border-[#365DC4] hover:text-[#365DC4]'
          }`}
          aria-label="Sí, fue útil"
        >
          {feedback === 'up' ? <Check className="size-4" /> : <ThumbsUp className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => setFeedback('down')}
          disabled={feedback !== null}
          className={`action-button flex size-10 items-center justify-center rounded-full border transition-colors ${
            feedback === 'down'
              ? 'border-stone-800 bg-stone-800 text-white'
              : feedback === 'up'
              ? 'border-stone-100 bg-stone-50 text-stone-300 cursor-default'
              : 'border-stone-200 bg-white text-stone-400 hover:border-stone-800 hover:text-stone-800'
          }`}
          aria-label="No fue útil"
        >
          {feedback === 'down' ? <Check className="size-4" /> : <ThumbsDown className="size-4" />}
        </button>
      </div>
    </div>
  );
}
