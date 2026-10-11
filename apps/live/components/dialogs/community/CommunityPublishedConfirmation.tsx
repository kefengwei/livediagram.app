'use client';

import { useTranslation } from '@/lib/i18n';
import { communityPostPath } from '@livediagram/api-schema';
import { buttonClassName, Button, lucideGlyph, useCopiedFlash } from '@livediagram/ui';
import { lucideExternalLink, lucideLink, lucideSparkles } from '@livediagram/icons/lucide';
import { DialogFooter } from '@/components/dialogs/DialogFooter';
import { useToast } from '@/hooks/ui/useToast';

const SparklesIcon = lucideGlyph(lucideSparkles, 28);
const OpenIcon = lucideGlyph(lucideExternalLink, 14);
const LinkIcon = lucideGlyph(lucideLink, 14);

// The moment after Share to Community lands (docs/specs/025-community/community.md "Publishing"): a
// small celebration, the way to the post, and its link to hand around.
export function CommunityPublishedConfirmation({
  postId,
  title,
  titleId,
  onDone,
}: {
  postId: string;
  title: string;
  // The heading's id, which the dialog it sits in is labelled by.
  titleId: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { copied, flash } = useCopiedFlash<true>(1500);
  const path = communityPostPath(postId);
  const absolute = typeof window === 'undefined' ? path : `${window.location.origin}${path}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(absolute);
      flash(true);
    } catch {
      toast.error('Could not copy the link. Open the post to copy it from there.');
    }
  };

  return (
    <>
      {/* It replaces the form the person just submitted: announced as it appears, with focus on Done. */}
      <div role="status" className="flex flex-col items-center gap-3 px-6 pt-8 pb-6 text-center">
        <span className="flex h-16 w-16 animate-fade-in items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
          <SparklesIcon />
        </span>
        <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t('communitypublishedconfirmation.shared-to-the-community')}</h2>
        <p className="max-w-sm text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-800 dark:text-slate-100">{title}</span>{t('communitypublishedconfirmation.is-live-anyone-can-find-it')}</p>
      </div>
      <DialogFooter>
        <Button variant="secondary" size="xs" onClick={copyLink}>
          <LinkIcon />
          {copied ? 'Copied' : t('communitypublishedconfirmation.copy-link')}
        </Button>
        <a
          href={path}
          target="_blank"
          rel="noopener"
          className={buttonClassName({ variant: 'secondary', size: 'xs' })}
        >
          <OpenIcon />{t('communitypublishedconfirmation.view-post')}</a>
        <Button size="xs" onClick={onDone} autoFocus>{t('communitypublishedconfirmation.done')}</Button>
      </DialogFooter>
    </>
  );
}
