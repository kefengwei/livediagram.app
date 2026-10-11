'use client';


import type { QuizPhase } from '@livediagram/document';
import { QUIZ_CORRECT_GREEN } from '@livediagram/document';
import { CollabButton } from '../collab-chrome';
import { useTranslation } from '@/lib/i18n';

// What the disc in the middle of a Quiz says (docs/specs/012-collaboration/quiz.md), one branch per phase.
// The question itself stays hidden until the round opens, so nobody reads
// ahead while the facilitator is still talking.

export type QuizCentreActions = {
  start?: () => void;
  lock?: () => void;
  reveal?: () => void;
  reset?: () => void;
  edit?: () => void;
};

function Question({
  text,
  textColor,
  small,
}: {
  text: string;
  textColor: string;
  small?: boolean;
}) {
  
  
  return (
    <p
      className={`font-semibold leading-snug ${small ? 'line-clamp-2 text-[12px]' : 'line-clamp-4 text-[15px]'}`}
      style={{ color: textColor }}
    >
      {text}
    </p>
  );
}

function Meta({ children, textColor }: { children: React.ReactNode; textColor: string }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-60"
      style={{ color: textColor }}
    >
      {children}
    </p>
  );
}

export function QuizCentre({
  phase,
  question,
  optionCount,
  seconds,
  secondsLeft,
  answered,
  correctCount,
  textColor,
  actions,
}: {
  phase: QuizPhase;
  question: string;
  optionCount: number;
  seconds: number;
  secondsLeft: number;
  answered: number;
  correctCount: number;
  textColor: string;
  actions: QuizCentreActions;
}) {
  const { t } = useTranslation();
  
  if (phase === 'setup' || phase === 'ready') {
    return (
      <>
        <span
          aria-hidden
          className="text-[56px] font-black leading-none opacity-80"
          style={{ color: textColor }}
        >
          ?
        </span>
        <Meta textColor={textColor}>
          {phase === 'setup' ? 'Quiz' : `Quiz · ${optionCount} answers · ${seconds}s`}
        </Meta>
        {phase === 'setup' ? (
          actions.edit ? (
            <CollabButton tone="loud" textColor={textColor} onPress={actions.edit}>{t('quizcentre.set-up-question')}</CollabButton>
          ) : (
            <Meta textColor={textColor}>{t('quizcentre.waiting-for-a-question')}</Meta>
          )
        ) : actions.start ? (
          <CollabButton tone="loud" textColor={textColor} onPress={actions.start}>{t('quizcentre.start')}</CollabButton>
        ) : (
          <Meta textColor={textColor}>{t('quizcentre.waiting-to-start')}</Meta>
        )}
      </>
    );
  }

  if (phase === 'open') {
    return (
      <>
        <span
          className="text-[22px] font-black leading-none tabular-nums"
          style={{ color: textColor }}
          aria-live="off"
        >
          {secondsLeft}
        </span>
        <Question text={question} textColor={textColor} />
        <Meta textColor={textColor}>{answered}{t('quizcentre.answered')}</Meta>
        {actions.lock ? (
          <CollabButton textColor={textColor} onPress={actions.lock}>{t('quizcentre.lock-now')}</CollabButton>
        ) : null}
      </>
    );
  }

  if (phase === 'locked') {
    return (
      <>
        <Meta textColor={textColor}>{t('quizcentre.time-s-up')}</Meta>
        <Question text={question} textColor={textColor} />
        <Meta textColor={textColor}>{answered}{t('quizcentre.answered-2')}</Meta>
        {actions.reveal ? (
          <CollabButton tone="loud" textColor={textColor} onPress={actions.reveal}>{t('quizcentre.reveal-answer')}</CollabButton>
        ) : (
          <Meta textColor={textColor}>{t('quizcentre.waiting-for-the-reveal')}</Meta>
        )}
      </>
    );
  }

  // Revealed: the score. WHO picked what is drawn on the answers themselves
  // (QuizPickers), so the disc only carries the question and the tally.
  return (
    <>
      <Question text={question} textColor={textColor} small />
      <p className="text-[13px] font-bold" style={{ color: QUIZ_CORRECT_GREEN }}>
        {correctCount}{t('quizcentre.of')}{answered}{t('quizcentre.correct')}</p>
      {answered > 0 && correctCount === 0 ? <Meta textColor={textColor}>{t('quizcentre.nobody-got-it')}</Meta> : null}
      {actions.reset ? (
        <CollabButton textColor={textColor} onPress={actions.reset}>{t('quizcentre.run-again')}</CollabButton>
      ) : null}
    </>
  );
}
