# Localization

The live app ships in more than one language. **English is the source language** — every string is written in it first — and the fallback for any key a translation is missing. `zh-CN` is the first translation.

## What a locale is

A locale is a BCP 47 tag the app renders in: `en` or `zh-CN`. It decides (a) which message table the UI reads and (b) the locale handed to `Intl` for dates, numbers and relative times. It is **not** part of the URL: the editor is a signed-in application, so there is nothing for a crawler to index and a great deal to lose by reloading a canvas to change language.

## Where a locale comes from

On first read, in this order:

1. `?lang=<tag>` on the URL — a share link can pin the language, and support can ask somebody to open one.
2. The stored choice (`localStorage`, key `livediagram:language`).
3. `navigator.languages` — the first entry whose base language we ship (`zh-*` → `zh-CN`).
4. English.

## Switching

Switching is **instant and in place**: the message table swaps, `document.documentElement.lang` is updated, and no navigation, reload or canvas remount happens. The control is called **Language** and lives in two places: the account menu (Settings → Language) and the editor header, because a reader who cannot read the interface cannot find a settings dialog by reading it.

Reading the stored choice is done through `useSyncExternalStore` (`lib/i18n/store.ts`): the server snapshot is English, the client snapshot is the real choice, so the first paint never disagrees with the markup and no hydration warning is raised.

## Messages

One module per locale under `lib/i18n/messages/`, exporting a flat table of **dotted keys**:

```ts
export const en = {
  'header.share.label': 'Share',
  'header.rename.title': 'Rename document',
} as const;
```

- The English table is the **type source**: every other locale is typed `Record<keyof typeof en, string>`, so a missing key is a compile error rather than a blank label.
- Values may carry `{name}` placeholders, filled by `t('key', { name })`.
- A key that is missing at runtime falls back to English, then to the key itself — never to an empty string, and never to a crash.
- Keys are named by **where they appear**, then what they say: `explorer.section.spaces`, `palette.tool.eraser`.

## Rules for new work

- **No user-visible string is written inline in a component.** It is added to the English table and read through `useTranslation()`.
- A string that is _data_ rather than interface — a document name, an element's label, a comment, a template's own copy — is **never** translated by this system. It belongs to the person who wrote it.
- Placeholders and examples in tests keep reading English: tests assert against the `en` table, so a translation can never turn a test red.
- `aria-label`, `title`, tooltips and error copy are user-visible strings like any other.

## What this does not cover

- **SEO surfaces** (marketing, help, community) keep their own decision: they render for crawlers, so their locales belong in the **path** (`/zh/...`) with one build per locale. The editor's runtime store is not reused there.
- **Server-rendered text** — API errors, email, MCP tool descriptions — is not part of this spec; each surface carries its own.
- **Content**: everything a user typed (documents, boards, comments, template copy) stays exactly as written.
