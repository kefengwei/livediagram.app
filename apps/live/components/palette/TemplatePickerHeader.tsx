import { useTranslation } from '@/lib/i18n';
import { CloseIcon } from '@livediagram/ui';
import { HelpArticleLink } from '@/components/primitives/HelpArticleLink';
import { WizardSteps, type WizardStep } from './template-picker-wizard';

// The template picker's header (TemplatePicker): the title and line for its mode and step, the help
// link, the Close button, and the wizard's step rail.
export function TemplatePickerHeader({
  isWelcome,
  isIdentity,
  isWizard,
  showTemplates,
  documentName,
  nameLocked,
  step,
  onStep,
  onClose,
}: {
  isWelcome: boolean;
  isIdentity: boolean;
  isWizard: boolean;
  showTemplates: boolean;
  documentName?: string;
  nameLocked: boolean;
  step: WizardStep;
  onStep: (step: WizardStep) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 px-6 pt-6 pb-5 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {isWelcome
              ? t('templatepickerheader.new-document')
              : isIdentity
                ? documentName && documentName.trim()
                  ? `Welcome to '${documentName.trim()}'`
                  : t('templatepickerheader.welcome-to-this-document')
                : t('templatepickerheader.quick-start')}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {!isIdentity
              ? step === 'template'
                ? t('templatepickerheader.build-anything-start-from-scratch-or')
                : t('templatepickerheader.name-your-document-and-choose-where')
              : nameLocked
                ? t('templatepickerheader.this-is-the-name-from-your')
                : t('templatepickerheader.pick-the-name-people-will-see')}
          </p>
        </div>
        <div className="-mr-2 -mt-1 flex shrink-0 items-center gap-0.5">
          {showTemplates ? (
            <HelpArticleLink
              article="templates"
              className="!h-8 !w-8 !rounded-lg !border-0 !text-sm !text-slate-400 hover:!bg-slate-100 hover:!text-slate-700 dark:!text-slate-400 dark:hover:!bg-slate-800 dark:hover:!text-slate-200"
            />
          ) : null}
          <button
            type="button"
            // The X backs out as Escape does, from any step, creating nothing
            // (docs/specs/007-editor/new-document-route.md "Escape backs out").
            onClick={onClose}
            aria-label={t('templatepickerheader.close')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      {/* Step indicator: a two-segment progress rail so the welcome
          wizard reads as 1 of 2 at a glance. Quick Start is one page and
          shows none. */}
      {isWizard ? <WizardSteps step={step} onStep={onStep} /> : null}
    </div>
  );
}
