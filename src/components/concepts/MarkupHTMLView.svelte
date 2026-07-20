<script module lang="ts">
    type ParagraphOrList = Paragraph | { items: Paragraph[] };
    let idCounter = 0;
</script>

<script lang="ts">
    import LocallyRevisedAnnotation from '@components/app/LocallyRevisedAnnotation.svelte';
    import MachineTranslatedAnnotation from '@components/app/MachineTranslatedAnnotation.svelte';
    import Notice from '@components/app/Notice.svelte';
    import SegmentHTMLView from '@components/concepts/SegmentHTMLView.svelte';
    import { accessorToLocalePath } from '@components/localization/accessorToLocalePath';
    import LocalizationQuality from '@components/localization/LocalizationQuality.svelte';
    import { getLocalizing } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { animationDuration, animationFactor, locales } from '@db/Database';
    import {
        deleteLocaleEdit,
        localeEdits,
        saveLocaleEdit,
    } from '@db/locales/LocalizationDexie';
    import type Locales from '@locale/Locales';
    import type { LocaleTextsAccessor, TemplateInput } from '@locale/Locales';
    import { isUnwritten, toLocaleString } from '@locale/LocaleText';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import ConceptLink from '@nodes/ConceptLink';
    import Markup from '@nodes/Markup';
    import Paragraph from '@nodes/Paragraph';
    import { parseDocs, parseFormattedLiteral } from '@parser/parseExpression';
    import type Spaces from '@parser/Spaces';
    import {
        CANCEL_SYMBOL,
        CONFIRM_SYMBOL,
        DOCS_SYMBOL,
        FORMATTED_SYMBOL,
        REVERT_SYMBOL,
    } from '@parser/Symbols';
    import { toMarkup } from '@parser/toMarkup';
    import { toTokens } from '@parser/toTokens';
    import { tick } from 'svelte';

    interface Props {
        markup:
            | Markup
            | string[]
            | string
            | LocaleTextsAccessor
            | [LocaleTextsAccessor, Record<string, TemplateInput>]
            /** A resolver that produces the Markup for a given set of locales. Use for
             *  content that isn't a locale-tree string but still varies by locale (e.g. a
             *  concept's docs). MarkupHTMLView calls it for the primary locale and for each
             *  additional chosen locale, echoing the results like any other multilingual
             *  text. */
            | { perLocale: (locales: Locales) => Markup | undefined };
        inline?: boolean;
        note?: boolean;
        /** Storage key for an override, used when the markup doesn't live in the
         *  regular locale tree (e.g., tutorial dialog). When provided, the
         *  component becomes localizable just as it is for `LocaleTextsAccessor`
         *  markup, looking up `LocalizationDexie` under this key. */
        overrideKey?: string;
        /** Raw text used as the editor's initial value and the "no-override"
         *  fallback when `overrideKey` is supplied. Should already be in
         *  Wordplay markup syntax. */
        sourceText?: string;
    }

    let {
        markup,
        inline = false,
        note = false,
        overrideKey,
        sourceText,
    }: Props = $props();

    const fieldId = `markup-editor-${idCounter++}`;

    /** A per-locale Markup resolver (e.g. concept docs), distinguished from the other
     *  markup forms by its `perLocale` method. */
    function isPerLocale(
        m: typeof markup,
    ): m is { perLocale: (locales: Locales) => Markup | undefined } {
        return (
            typeof m === 'object' &&
            m !== null &&
            !(m instanceof Markup) &&
            !Array.isArray(m) &&
            'perLocale' in m
        );
    }

    /* Convert the markup into a Markup node. */
    let parsed = $derived.by(() => {
        // If markup was given, just pass it back and render it.
        if (markup instanceof Markup) return markup;
        // A per-locale resolver: render the primary locale's Markup.
        else if (isPerLocale(markup))
            return markup.perLocale($locales) ?? Markup.words('?');
        // If markup was given as an accessor and inputs, concretize it with the inputs
        else if (Array.isArray(markup) && markup[0] instanceof Function) {
            const accessor = markup[0];
            const inputs = markup[1] as Record<string, TemplateInput>;
            const words = $locales.getWithAnnotations(accessor);
            return (
                Markup.words(
                    Array.isArray(words) ? words.join('\n\n') : words,
                ).concretize($locales, inputs) ?? Markup.words('?')
            );
        }
        // If an accessor function was given, get the corresponding locale text and render it as markup,
        // automatically adding newlines to create multiple paragraphs.
        else if (markup instanceof Function) {
            const text = $locales.getWithAnnotations(markup);
            return Markup.words(Array.isArray(text) ? text.join('\n\n') : text);
        }
        // If it's a list of strings, join them with newlines to create multiple paragraphs, and render that as markup.
        else if (Array.isArray(markup))
            return Markup.words(markup.join('\n\n'));
        // Does it start with a docs symbol? Pull out the relevant markup matching
        // the preferred locale.
        else if (markup.startsWith(DOCS_SYMBOL)) {
            const docs = parseDocs(toTokens(markup));
            return (
                docs.getLanguage($locales.getLocale().language)?.markup ??
                docs.docs[0].markup ??
                undefined
            );
        }
        // Does it start with a formatted symbol? Pull out the relevant markup matching
        // the preferred locale.
        if (markup.startsWith(FORMATTED_SYMBOL)) {
            const formatted = parseFormattedLiteral(toTokens(markup));
            return (
                formatted.getLanguage($locales.getLocale().language)?.markup ??
                formatted.texts[0].markup ??
                undefined
            );
        }
        // Otherwise, just render the string as a single paragraph of markup.
        return Markup.words(markup);
    });

    let spaces = $derived(parsed.spaces);

    // Convert sequences of paragraphs that start with bullets into an HTML list.
    function toParagraphsAndLists(m: Markup): ParagraphOrList[] {
        return m.paragraphs.reduce(
            (stuff: ParagraphOrList[], next: Paragraph) => {
                if (next.isBulleted()) {
                    const items = next.getBullets();
                    const previous = stuff.at(-1);
                    if (previous instanceof Paragraph)
                        return [...stuff, { items }];
                    else if (previous !== undefined) {
                        previous.items.push(next);
                        return stuff;
                    } else return [{ items }];
                } else return [...stuff, next];
            },
            [],
        );
    }

    let paragraphsAndLists = $derived(toParagraphsAndLists(parsed));

    // Localization editing state
    let localizing = getLocalizing();
    let editing = $state(false);
    let editedText = $state('');
    let editorView = $state<HTMLTextAreaElement | undefined>(undefined);

    /** Localizable in two modes:
     *   1. `markup` is a plain locale accessor (not a template array).
     *   2. Caller supplies an explicit `overrideKey` + `sourceText` (used by
     *      tutorial dialog, whose markup doesn't live in the locale tree). */
    let isLocalizable = $derived(
        overrideKey !== undefined ||
            (markup instanceof Function && !(markup instanceof Markup)),
    );

    /** The raw text used as the editor's initial value. For locale-accessor markup
     *  this is the resolved annotation-free locale string; for an explicit
     *  `overrideKey` it's the caller-supplied `sourceText`. */
    let rawText = $derived.by(() => {
        if (overrideKey !== undefined) return sourceText ?? '';
        if (!(markup instanceof Function)) return '';
        const text = $locales.getWithAnnotations(markup);
        return withoutAnnotations(
            Array.isArray(text) ? text.join('\n\n') : text,
        );
    });

    /** Storage key for the override: caller-supplied `overrideKey` wins; otherwise
     *  we parse it from the accessor. */
    let storageKey = $derived(
        overrideKey !== undefined
            ? overrideKey
            : markup instanceof Function
              ? accessorToLocalePath(markup)?.toString()
              : undefined,
    );
    const activeLocaleString = $derived(toLocaleString($locales.getLocale()));
    let override = $derived(
        storageKey !== undefined
            ? $localeEdits.get(activeLocaleString)?.get(storageKey)
            : undefined,
    );

    /** Parsed markup for display in localizing mode, using the override if one exists. */
    let displayParsed = $derived(override ? Markup.words(override) : parsed);
    let displaySpaces = $derived(displayParsed.spaces);
    let displayParagraphsAndLists = $derived(
        toParagraphsAndLists(displayParsed),
    );

    // Echo this markup in each additional chosen locale (rendered smaller and dimmed
    // after the primary). For accessor-driven or per-locale-resolver markup; skips locales
    // where the text is unwritten or duplicates the primary. Empty for the common
    // single-locale case.
    let secondaryMarkups = $derived.by(() => {
        const result: {
            markup: Markup;
            language: string;
            direction: 'ltr' | 'rtl';
        }[] = [];

        // A per-locale resolver (e.g. concept docs): call it for each secondary locale.
        if (isPerLocale(markup)) {
            const resolve = markup.perLocale;
            const seen = new Set<string>();
            const primary = resolve($locales);
            if (primary) seen.add(primary.toText());
            for (const view of $locales.getSecondaryLocaleViews()) {
                const built = resolve(view);
                if (built === undefined) continue;
                const text = built.toText();
                if (text.length === 0 || seen.has(text)) continue;
                seen.add(text);
                result.push({
                    markup: built,
                    language: view.getLocale().language,
                    direction: view.getDirection(),
                });
            }
            return result;
        }

        const accessor =
            markup instanceof Function
                ? markup
                : Array.isArray(markup) && markup[0] instanceof Function
                  ? markup[0]
                  : undefined;
        if (accessor === undefined) return result;
        const inputs =
            Array.isArray(markup) && markup[0] instanceof Function
                ? (markup[1] as Record<string, TemplateInput>)
                : undefined;
        const joinWords = (text: string | string[]) =>
            Array.isArray(text) ? text.join('\n\n') : text;

        const seen = new Set([
            withoutAnnotations(
                joinWords($locales.getWithAnnotations(accessor)),
            ),
        ]);
        for (const view of $locales.getSecondaryLocaleViews()) {
            const raw = joinWords(view.getWithAnnotations(accessor));
            if (typeof raw !== 'string' || isUnwritten(raw)) continue;
            const plain = withoutAnnotations(raw);
            if (plain.length === 0 || seen.has(plain)) continue;
            seen.add(plain);
            const built =
                inputs !== undefined
                    ? (Markup.words(raw).concretize(view, inputs) ??
                      Markup.words(plain))
                    : Markup.words(raw);
            result.push({
                markup: built,
                language: view.getLocale().language,
                direction: view.getDirection(),
            });
        }
        return result;
    });

    $effect(() => {
        if (localizing && markup instanceof Function)
            localizing.focused = editing ? markup : undefined;
    });

    async function startEditing() {
        editedText = override ?? rawText;
        editing = true;
        await tick();
        editorView?.focus();
    }

    function cancelEditing() {
        editing = false;
    }

    function confirmEditing() {
        if (storageKey !== undefined) {
            if (editedText === rawText)
                deleteLocaleEdit(activeLocaleString, storageKey);
            else saveLocaleEdit(activeLocaleString, storageKey, editedText);
        }
        editing = false;
    }

    /** Names of concept links found in the current draft that don't resolve in the
     *  active locale. Populated by a dwell after the contributor stops typing and
     *  rendered as a warning Notice below the editor. */
    let invalidConceptLinks = $state<string[]>([]);

    /** Parse the draft as markup and return the set of unresolved concept names
     *  (e.g. `@FunctionDefinition`, `@UI/foo`). Robust to parse failures: any error
     *  yields no warnings, since the formatted-editor's own validation will surface
     *  bigger syntax problems on save. */
    function findInvalidConceptLinks(text: string): string[] {
        if (text.trim().length === 0) return [];
        let parsed: Markup;
        try {
            parsed = toMarkup(text)[0];
        } catch {
            return [];
        }
        const locale = $locales.getLocale();
        const seen = new Set<string>();
        const result: string[] = [];
        for (const node of parsed.nodes()) {
            if (!(node instanceof ConceptLink)) continue;
            if (node.isValid(locale)) continue;
            const name = node.getName();
            if (seen.has(name)) continue;
            seen.add(name);
            result.push(name);
        }
        return result;
    }

    // Debounced concept-link validation: re-check ~1s after the contributor stops
    // typing. Cleared when the editor closes or the targeted cell changes.
    $effect(() => {
        if (!editing) {
            invalidConceptLinks = [];
            return;
        }
        const text = editedText;
        const timer = setTimeout(() => {
            invalidConceptLinks = findInvalidConceptLinks(text);
        }, 1000);
        return () => clearTimeout(timer);
    });
</script>

{#snippet paragraphsView(
    items: ParagraphOrList[],
    sp: Spaces,
)}{#each items as paragraphOrList, index}{#if paragraphOrList instanceof Paragraph}<!--
            `div` rather than `p`: an inline Example's NodeView produces a
            `<div>` for its wrapper, and `<div>` isn't phrasing content so `<p>`
            rejects it (SSR errors and hydration mismatch). The paragraph styling
            carries via the `.paragraph` class either way.
        -->
            <div
                class="paragraph"
                class:animated={$animationFactor > 0}
                style="--delay:{$animationDuration * index * 0.1}ms"
                >{#each paragraphOrList.segments as segment, segIndex}<SegmentHTMLView
                        {segment}
                        spaces={sp}
                        alone={paragraphOrList.segments.length === 1}
                        first={segIndex === 0}
                    />{/each}</div
            >{:else}<ul
                class:animated={$animationFactor > 0}
                style="--delay:{$animationDuration * index * 0.1}ms"
                >{#each paragraphOrList.items as paragraph}<li
                        >{#each paragraph.segments as segment, segIndex}<SegmentHTMLView
                                {segment}
                                spaces={sp}
                                alone={paragraph.segments.length === 1}
                                first={segIndex === 0}
                            />{/each}</li
                    >{/each}</ul
            >{/if}{/each}{/snippet}

{#if localizing?.on && isLocalizable}
    <span
        class="markup-localizing"
        role="none"
        onclick={(e) => {
            e.stopPropagation();
            e.preventDefault();
        }}
    >
        {#if editing}
            <FormattedEditor
                id={fieldId}
                description={(l) => l.ui.localize.field.plain.description}
                placeholder={(l) => l.ui.localize.field.plain.placeholder}
                bind:text={editedText}
                bind:view={editorView}
            />
            {#if invalidConceptLinks.length > 0}
                <Notice>
                    <p>
                        <LocalizedText
                            path={(l) => l.ui.localize.invalidConceptLinks}
                        />
                    </p>
                    <p class="invalid-concept-links"
                        >{invalidConceptLinks.map((n) => `@${n}`).join(', ')}</p
                    >
                </Notice>
            {/if}
            <LocalizationQuality
                text={editedText}
                localeKey={storageKey}
                onfix={(suggestion) => (editedText = suggestion)}
            />
            <div class="edit-actions">
                <Button
                    tip={(l) => l.ui.localize.button.submit}
                    action={confirmEditing}
                    background
                    >{CONFIRM_SYMBOL}</Button
                >
                <Button
                    tip={(l) => l.ui.localize.button.cancel}
                    action={cancelEditing}
                    background
                    >{CANCEL_SYMBOL}</Button
                >
                {#if override}<Button
                        tip={(l) => l.ui.localize.button.revert}
                        action={() => {
                            if (storageKey !== undefined)
                                deleteLocaleEdit(
                                    activeLocaleString,
                                    storageKey,
                                );
                            cancelEditing();
                        }}
                        background
                        >{REVERT_SYMBOL}</Button
                    >{/if}
            </div>
        {:else}
            <span class="edit-button"
                ><Button
                    tip={(l) => l.ui.localize.button.edit}
                    action={startEditing}
                    background="salient"
                    size="inherit"
                    wrap={true}
                >
                    {#if displaySpaces}
                        {#if inline}
                            {#each displayParsed.asLine().paragraphs[0].segments as segment}
                                <SegmentHTMLView
                                    {segment}
                                    spaces={displaySpaces}
                                    alone={false}
                                />
                            {/each}
                        {:else}
                            <div class="markup" class:note>
                                {@render paragraphsView(
                                    displayParagraphsAndLists,
                                    displaySpaces,
                                )}{#if displayParsed.isMachineTranslated() && !override}<MachineTranslatedAnnotation
                                    />{/if}
                            </div>
                        {/if}
                    {:else}
                        unable to render markup without spaces
                    {/if}
                    {#if override}<LocallyRevisedAnnotation />{/if}
                </Button></span
            >
        {/if}
    </span>
{:else if spaces}
    {#if inline}
        {#each parsed.asLine().paragraphs[0].segments as segment}
            <SegmentHTMLView {segment} {spaces} alone={false} />
        {/each}{#each secondaryMarkups as entry, i}{#if entry.markup.spaces}<span
                    class="secondary-inline"
                    lang={entry.language}
                    dir={entry.direction}
                    style="font-size: {0.8 ** (i + 1)}em"
                    >{#each entry.markup.asLine().paragraphs[0].segments as segment}<SegmentHTMLView
                            {segment}
                            spaces={entry.markup.spaces}
                            alone={false}
                        />{/each}</span
                >{/if}{/each}
    {:else}<!-- Tag prose with the active locale's language/direction (a11y, font
        fallback, bidi). Each additional chosen locale is echoed below in its own
        language/direction, dimmed and successively smaller. The wrapper keeps the
        primary and its echoes a single block (one --wordplay-spacing gap between them)
        rather than the larger inter-prose-block margin. -->
        <div class="markup-block">
            <div
                class="markup"
                class:note
                lang={$locales.getLocale().language}
                dir={$locales.getDirection()}
                >{@render paragraphsView(
                    paragraphsAndLists,
                    spaces,
                )}{#if parsed.isMachineTranslated()}<MachineTranslatedAnnotation
                    />{/if}</div
            >{#each secondaryMarkups as entry, i}{#if entry.markup.spaces}<div
                        class="markup secondary"
                        class:note
                        lang={entry.language}
                        dir={entry.direction}
                        style="font-size: {0.8 ** (i + 1)}em"
                        >{@render paragraphsView(
                            toParagraphsAndLists(entry.markup),
                            entry.markup.spaces,
                        )}{#if entry.markup.isMachineTranslated()}<MachineTranslatedAnnotation
                            />{/if}</div
                    >{/if}{/each}
        </div>{/if}
{:else}unable to render markup without spaces{/if}

<style>
    .markup {
        display: flex;
        flex-direction: column;
        /* Put Noto Color Emoji first so emoji codepoints in markup
           prose render in color in Safari. The inherited
           --wordplay-app-font has Noto Sans first, which Safari can't
           reliably skip past for emoji codepoints — it picks Noto Emoji
           later in the cascade and renders monochrome. The CSSFallbackFaces
           used by PhraseView already follows this Color-Emoji-first pattern;
           this mirrors it for markup text. Safe to put Color Emoji first
           because its unicode-range in fonts.css is restricted to true
           emoji codepoints — it doesn't claim ASCII/digits and so doesn't
           shadow Noto Sans for normal text. */
        font-family: 'Noto Color Emoji', 'Noto Sans', sans-serif;
    }

    .markup:not(:last-child) {
        margin-block-end: 1em;
    }

    .paragraph.animated {
        transform: scaleY(0);
        animation-name: pop;
        animation-duration: 200ms;
        animation-delay: var(--delay);
        animation-fill-mode: forwards;
        transform-origin: top;
    }

    @keyframes pop {
        0% {
            opacity: 0;
            transform: scaleY(0);
        }
        80% {
            opacity: 0.9;
            transform: scaleY(1.05);
        }
        100% {
            opacity: 1;
            transform: scaleY(1);
        }
    }

    .paragraph {
        margin-inline-start: 0;
        margin-block-start: 0em;
        margin-block-end: 1em;
        line-height: 1.5;
    }

    .note {
        font-size: var(--wordplay-small-font-size);
    }

    /* The primary prose plus its locale echoes form one block, separated by a single
       --wordplay-spacing gap (not the larger inter-prose-block margin). */
    .markup-block {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .markup-block:not(:last-child) {
        margin-block-end: 1em;
    }

    /* Inside a block the gap handles spacing, so the inner markups don't add their own. */
    .markup-block .markup {
        margin-block-end: 0;
    }

    /* Echoes of the same prose in additional chosen locales: dimmed, and (via inline
       font-size set per echo) successively smaller than the primary. */
    .markup.secondary {
        opacity: 0.7;
    }

    .secondary-inline {
        opacity: 0.7;
        margin-inline-start: 0.25em;
    }

    ul {
        margin-block-start: 0em;
        margin-block-end: 1em;
    }

    .paragraph:last-of-type {
        margin-block-end: 0;
    }

    .markup-localizing {
        display: block;
    }

    .edit-button :global(button) {
        display: block;
        width: 100%;
        text-align: start;
        font-weight: inherit;
        white-space: normal;
    }

    .edit-actions {
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        gap: var(--wordplay-spacing);
        margin-block-start: var(--wordplay-spacing);
    }

    .edit-actions :global(button) {
        width: fit-content;
    }

    .invalid-concept-links {
        font-family: var(--wordplay-code-font);
        margin-block-start: var(--wordplay-spacing-half);
    }
</style>
