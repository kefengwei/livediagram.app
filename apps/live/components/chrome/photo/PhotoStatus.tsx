'use client';

import type { ModelDownload as Download } from '@/lib/reading/download-progress';
import { ModelDownload } from './ModelDownload';
import type { ProcessorReason, ReaderBackend } from '@/lib/reading/reader-protocol';
import type { ReaderFallback } from '@/lib/reading/types';
import { useTranslation } from '@/lib/i18n';

// Why the reader is on the processor, said in the author's terms.
const PROCESSOR_WHY: Record<ProcessorReason, string> = {
  'no-webgpu': 'this browser has no WebGPU',
  'no-adapter': 'no graphics card is available to the browser',
  'gpu-failed': 'the graphics card failed to start the model',
};

// What the surface is doing, said ON the photograph (docs/specs/021-event-storming/event-storming.md Phase 9).
//
// Pills rather than a panel: the photo is the whole interface, and a strip of
// chrome beside it would be the sidebar coming back through the window. They
// float in a fixed row at the top of the frame, so one appearing or going
// never moves anything else.

function Pill({
  tone = 'quiet',
  testId,
  children,
}: {
  tone?: 'quiet' | 'warn';
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      data-testid={testId}
      className={`pointer-events-auto flex max-w-[min(32rem,80vw)] items-center gap-2 rounded-full px-3 py-1.5 text-xs shadow-lg backdrop-blur ${
        tone === 'warn' ? 'bg-amber-100/95 text-amber-900' : 'bg-slate-900/85 text-white'
      }`}
    >
      {children}
    </p>
  );
}

// The sign that reading is under way. A spinning spinner keeps the browser's
// compositor drawing every frame, and while the model reads on the graphics
// card that starved it: 42 notes took 200 s with a spinner on screen and 25 s
// without. On the card it is a still dot, and the count ticking up is the
// sign of life; on the processor, where it costs the reader nothing, it spins.
function Busy({ still }: { still: boolean }) {
  return still ? (
    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-brand-400" />
  ) : (
    <span
      aria-hidden
      className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-slate-500 border-t-brand-400"
    />
  );
}

export function PhotoStatus({
  detecting,
  foundNothing,
  dropped = 0,
  labelError = null,
  modelDownload,
  readSoFar = 0,
  readTotal = 0,
  readerBackend,
  readerWhy,
  readerFallback,
  rereading = 0,
  revealed,
  detected,
  reading,
  readError,
}: {
  detecting: boolean;
  foundNothing: boolean;
  // Notes found beyond what one photo may yield, and left out.
  dropped?: number;
  // Why a label file could not be opened over this photo.
  labelError?: string | null;
  // The reading model's download, while it runs.
  modelDownload?: Download;
  // How far the reader has got, and where a reader that runs HERE runs.
  readSoFar?: number;
  readTotal?: number;
  readerBackend?: ReaderBackend;
  // Why a reader that runs HERE is on the processor.
  readerWhy?: ProcessorReason;
  // The hosted reader's budget was spent and this device reads instead.
  readerFallback?: ReaderFallback;
  // Boxes being read again after the author moved, resized or drew them.
  rereading?: number;
  revealed: number;
  detected: number;
  reading: boolean;
  readError: string | null;
}) {
  const { t } = useTranslation();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-2 p-3"
    >
      {detecting ? (
        <Pill testId="photo-finding">
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-slate-500 border-t-brand-400"
          />
          {t('photostatus.finding-the-stickies')}
        </Pill>
      ) : null}
      {revealed < detected ? (
        <Pill>
          {t('photostatus.detecting')}
          {revealed}
          {t('photostatus.of')}
          {detected}
        </Pill>
      ) : null}
      {reading ? (
        <Pill testId="photo-reading">
          <Busy still={readerBackend === 'webgpu'} />
          {/* Whole phrases: only the engine's reason may wrap. */}
          <span className="shrink-0 whitespace-nowrap">{t('photostatus.reading-the-words')}</span>
          {readTotal > 0 ? (
            <span className="shrink-0 whitespace-nowrap tabular-nums text-slate-300">
              {readSoFar}
              {t('photostatus.of-2')}
              {readTotal}
            </span>
          ) : null}
          {readerBackend === 'webgpu' ? (
            <span className="text-slate-300">{t('photostatus.on-your-graphics-card')}</span>
          ) : readerBackend === 'wasm' ? (
            // A big wall is minutes here, not seconds: say so, rather than
            // let a slow bar pass for a stuck one.
            <span className="text-slate-300">
              {t('photostatus.on-the-processor-which-is-slower')}
              {readerWhy ? `: ${PROCESSOR_WHY[readerWhy]}` : null}
            </span>
          ) : null}
        </Pill>
      ) : null}
      {rereading > 0 ? (
        <Pill testId="photo-rereading">
          <Busy still={readerBackend === 'webgpu'} />
          {t('photostatus.reading')}
          {rereading}
          {t('photostatus.changed')}
          {rereading === 1 ? 'note' : 'notes'}…
        </Pill>
      ) : null}
      {readerFallback === 'budget' ? (
        // Whose budget it was (the deployment's key, or the author's free
        // share) is deliberately not said.
        <Pill tone="warn" testId="photo-reader-fallback">
          {t('photostatus.free-monthly-budget-reached-reading-on')}
        </Pill>
      ) : null}
      {readError === 'reader_unavailable' ? (
        // The in-browser model never started: not the photograph's fault, and
        // not a partial read — say what it is.
        <Pill tone="warn" testId="photo-reader-unavailable">
          {t('photostatus.the-reading-model-couldn-t-start')}
        </Pill>
      ) : readError?.startsWith('partial:') ? (
        // PART of the run is not all of it. The words that arrived are on their
        // notes; this says how many did not, so the author knows which boxes
        // are blank because nobody read them rather than because the paper was
        // blank.
        <Pill tone="warn">
          {readError.slice('partial:'.length)}
          {t('photostatus.notes-could-not-be-read-type')}
        </Pill>
      ) : readError ? (
        <Pill tone="warn">
          {t('photostatus.the-reader-could-not-finish')}
          {readError}
          {t('photostatus.type-the-words-in-yourself')}
        </Pill>
      ) : null}
      {modelDownload && !modelDownload.done && modelDownload.total > 0 ? (
        <ModelDownload download={modelDownload} />
      ) : null}
      {labelError ? (
        <Pill tone="warn" testId="photo-label-error">
          {labelError}
        </Pill>
      ) : null}
      {dropped > 0 ? (
        <Pill tone="warn" testId="photo-dropped">
          {dropped}
          {t('photostatus.more-notes-were-found-than-one')}
        </Pill>
      ) : null}
      {foundNothing ? (
        <Pill tone="warn" testId="photo-found-nothing">
          No stickies found in this photo. Fill the frame with the wall, shoot straight on, and give
          it good light, then try another photo. You can still drag a box around a note to add it by
          hand.
        </Pill>
      ) : null}
    </div>
  );
}
