<script module lang="ts">
    type ParagraphOrList = Paragraph | { items: Paragraph[] };
    let idCounter = 0;
</script>

<script lang="ts">
    import MachineTranslatedAnnotation from '@components/app/MachineTranslatedAnnotation.svelte';
    import LocallyRevisedAnnotation from '@components/app/LocallyRevisedAnnotation.svelte';
    import Notice from '@components/app/Notice.svelte';
    import { accessorToLocalePath } from '@components/localization/accessorToLocalePath';
    import { getLocalizing } from '@components/project/Contexts';
    import { localeEdits, saveLocaleEdit, deleteLocaleEdit } from '@db/locales/LocalizationDexie';
    import Button from '@components/widgets/Button.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type { LocaleTextsAccessor, TemplateInput } from '@locale/Locales';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import ConceptLink from '@nodes/ConceptLink';
    import Markup from '@nodes/Markup';
    import Paragraph from '@nodes/Paragraph';
    import {
        CANCEL_SYMBOL,
        CONFIRM_SYMBOL,
        DOCS_SYMBOL,
        FORMATTED_SYMBOL,
        REVERT_SYMBOL,
    } from '@parser/Symbols';
    import { parseDocs, parseFormattedLiteral } from '@parser/parseExpression';
    import { toMarkup } from '@parser/toMarkup';
    import { toTokens } from '@parser/toTokens';
    import { tick } from 'svelte';
    import {
        animationDuration,
        animationFactor,
        locales,
    } from '@db/Database';
    import SegmentHTMLView from '@components/concepts/SegmentHTMLView.svelte';

    interface Props {
        markup:
            | Markup
            | string[]
            | string
            | LocaleTextsAccessor
            | [LocaleTextsAccessor, ...TemplateInput[]];
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

    /* Convert the markup into a Markup node. */
    let parsed = $derived.by(() => {
        // If markup was given, just pass it back and render it.
        if (markup instanceof Markup) return markup;
        // If markup was given as an accessor and inputs, concretize it with the inputs
        else if (Array.isArray(markup) && markup[0] instanceof Function) {
            const accessor = markup[0];
            const inputs = markup.slice(1) as TemplateInput[];
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
    let paragraphsAndLists = $derived(
        parsed.paragraphs.reduce(
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
        ),
    );

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
    let override = $derived(
        storageKey !== undefined ? $localeEdits.get(storageKey) : undefined,
    );

    /** Parsed markup for display in localizing mode, using the override if one exists. */
    let displayParsed = $derived(override ? Markup.words(override) : parsed);
    let displaySpaces = $derived(displayParsed.spaces);
    let displayParagraphsAndLists = $derived(
        displayParsed.paragraphs.reduce(
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
        ),
    );

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
            if (editedText === rawText) deleteLocaleEdit(storageKey);
            else saveLocaleEdit(storageKey, editedText);
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
                        >{invalidConceptLinks
                            .map((n) => `@${n}`)
                            .join(', ')}</p
                    >
                </Notice>
            {/if}
            <div class="edit-actions">
                <Button
                    tip={(l) => l.ui.localize.button.submit}
                    action={confirmEditing}
                    background
                    padding={true}>{CONFIRM_SYMBOL}</Button
                >
                <Button
                    tip={(l) => l.ui.localize.button.cancel}
                    action={cancelEditing}
                    background
                    padding={true}>{CANCEL_SYMBOL}</Button
                >
                {#if override}<Button
                    tip={(l) => l.ui.localize.button.revert}
                    action={() => {
                        if (storageKey !== undefined)
                            deleteLocaleEdit(storageKey);
                        cancelEditing();
                    }}
                    background
                    padding={true}>{REVERT_SYMBOL}</Button
                >{/if}
            </div>
        {:else}
            <span class="edit-button"
                ><Button
                    tip={(l) => l.ui.localize.button.edit}
                    action={startEditing}
                    padding={false}
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
                                {#each displayParagraphsAndLists as paragraphOrList, index}
                                    {#if paragraphOrList instanceof Paragraph}
                                        <p
                                            class="paragraph"
                                            class:animated={$animationFactor >
                                                0}
                                            style="--delay:{$animationDuration *
                                                index *
                                                0.1}ms"
                                            >{#each paragraphOrList.segments as segment, index}<SegmentHTMLView
                                                    {segment}
                                                    spaces={displaySpaces}
                                                    alone={paragraphOrList
                                                        .segments.length === 1}
                                                    first={index === 0}
                                                />{/each}</p
                                        >
                                    {:else}
                                        <ul
                                            class:animated={$animationFactor >
                                                0}
                                            style="--delay:{$animationDuration *
                                                index *
                                                0.1}ms"
                                            >{#each paragraphOrList.items as paragraph}<li
                                                    >{#each paragraph.segments as segment, index}<SegmentHTMLView
                                                            {segment}
                                                            spaces={displaySpaces}
                                                            alone={paragraph
                                                                .segments
                                                                .length === 1}
                                                            first={index === 0}
                                                        />{/each}</li
                                                >{/each}</ul
                                        >
                                    {/if}
                                {/each}{#if displayParsed.isMachineTranslated() && !override}<MachineTranslatedAnnotation
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
        {/each}
    {:else}<div class="markup" class:note
            >{#each paragraphsAndLists as paragraphOrList, index}{#if paragraphOrList instanceof Paragraph}
                    <p
                        class="paragraph"
                        class:animated={$animationFactor > 0}
                        style="--delay:{$animationDuration * index * 0.1}ms"
                        >{#each paragraphOrList.segments as segment, index}<SegmentHTMLView
                                {segment}
                                {spaces}
                                alone={paragraphOrList.segments.length === 1}
                                first={index === 0}
                            />{/each}</p
                    >{:else}<ul
                        class:animated={$animationFactor > 0}
                        style="--delay:{$animationDuration * index * 0.1}ms"
                        >{#each paragraphOrList.items as paragraph}<li
                                >{#each paragraph.segments as segment, index}<SegmentHTMLView
                                        {segment}
                                        {spaces}
                                        alone={paragraph.segments.length === 1}
                                        first={index === 0}
                                    />{/each}</li
                            >{/each}</ul
                    >{/if}{/each}{#if parsed.isMachineTranslated()}<MachineTranslatedAnnotation
                />{/if}
        </div>{/if}
{:else}unable to render markup without spaces{/if}

<style>
    .markup {
        display: flex;
        flex-direction: column;
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

    p {
        margin-inline-start: 0;
    }

    .note {
        font-size: var(--wordplay-small-font-size);
    }

    p {
        margin-block-start: 0em;
        margin-block-end: 1em;
    }

    ul {
        margin-block-start: 0em;
        margin-block-end: 1em;
    }

    p:last-of-type {
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
