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
    import type {
        LocaleTextAccessor,
        LocaleTextsAccessor,
        TemplateInput,
    } from '@locale/Locales';
    import { isUnwritten, toLocaleString } from '@locale/LocaleText';
    import type { WritingDirection } from '@locale/Scripts';
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
        EDIT_SYMBOL,
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
        /** Text to show inside the edit button in localization mode when the
         *  markup is empty. Without it, an empty optional field renders an
         *  invisible button with nothing to click. */
        placeholder?: LocaleTextAccessor;
        /** Override the `lang`/`dir` stamped on the rendered block, for content that
         *  isn't in the active UI locale (e.g. a machine translation shown inline in a
         *  chat). Defaults to the active locale — the right choice for ordinary UI
         *  text, which is why every other caller omits this. */
        lang?: string | undefined;
        dir?: WritingDirection | undefined;
    }

    let {
        markup,
        inline = false,
        note = false,
        overrideKey,
        sourceText,
        placeholder,
        lang,
        dir,
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

    /** A locale template and the inputs to concretize it with. */
    function isTemplate(
        m: typeof markup,
    ): m is [LocaleTextsAccessor, Record<string, TemplateInput>] {
        return Array.isArray(m) && m[0] instanceof Function;
    }

    /** Expand `$term` word-list references (primary locale) before a locale
     *  string is parsed to Markup. The concretize pipeline resolves terms
     *  itself, but these branches build Markup directly via `Markup.words`, so
     *  they must resolve terms here. */
    const rt = (text: string) => $locales.resolveTerms(text);

    /* Convert the markup into a Markup node. */
    let parsed = $derived.by(() => {
        // If markup was given, just pass it back and render it.
        if (markup instanceof Markup) return markup;
        // A per-locale resolver: render the primary locale's Markup.
        else if (isPerLocale(markup))
            return markup.perLocale($locales) ?? Markup.words('?');
        // If markup was given as an accessor and inputs, concretize it with the inputs
        else if (isTemplate(markup)) {
            const [accessor, inputs] = markup;
            const words = $locales.getWithAnnotations(accessor);
            return (
                Markup.words(
                    rt(Array.isArray(words) ? words.join('\n\n') : words),
                ).concretize($locales, inputs) ?? Markup.words('?')
            );
        }
        // If an accessor function was given, get the corresponding locale text and render it as markup,
        // automatically adding newlines to create multiple paragraphs.
        else if (markup instanceof Function) {
            const text = $locales.getWithAnnotations(markup);
            return Markup.words(
                rt(Array.isArray(text) ? text.join('\n\n') : text),
            );
        }
        // If it's a list of strings, join them with newlines to create multiple paragraphs, and render that as markup.
        else if (Array.isArray(markup))
            return Markup.words(rt(markup.join('\n\n')));
        // Does it start with a docs symbol? Pull out the relevant markup matching
        // the preferred locale.
        else if (markup.startsWith(DOCS_SYMBOL)) {
            const docs = parseDocs(toTokens(rt(markup)));
            return (
                docs.getLanguage($locales.getLocale().language)?.markup ??
                docs.docs[0].markup ??
                undefined
            );
        }
        // Does it start with a formatted symbol? Pull out the relevant markup matching
        // the preferred locale.
        if (markup.startsWith(FORMATTED_SYMBOL)) {
            const formatted = parseFormattedLiteral(toTokens(rt(markup)));
            return (
                formatted.getLanguage($locales.getLocale().language)?.markup ??
                formatted.texts[0].markup ??
                undefined
            );
        }
        // Otherwise, just render the string as a single paragraph of markup.
        return Markup.words(rt(markup));
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

    /** Everything the localization editor needs about this markup, from whichever markup form
     *  produced it. Undefined means it isn't editable, which is what keeps an edit affordance
     *  that couldn't save from ever rendering. */
    type Localizable = {
        /** Dotted storage key in LocalizationDexie. */
        key: string;
        /** Annotation-free template text: the editor's seed, and the baseline that decides
         *  whether an edit is stored or the override deleted. */
        raw: string;
        /** The accessor, for the Localizer's English reference and input chips. Undefined for
         *  `overrideKey` callers, whose text has no place in the locale tree. */
        accessor: LocaleTextsAccessor | undefined;
        /** Inputs to re-concretize an override with, when the original had any. */
        inputs: Record<string, TemplateInput> | undefined;
    };

    let source = $derived.by<Localizable | undefined>(() => {
        // An explicit key wins: a glossary term's id is dynamic and tutorial dialog lives in
        // another file, so neither has a locale-tree accessor at all.
        if (overrideKey !== undefined)
            return {
                key: overrideKey,
                raw: sourceText ?? '',
                accessor: undefined,
                inputs: undefined,
            };

        let accessor: LocaleTextsAccessor | undefined;
        let inputs: Record<string, TemplateInput> | undefined;
        if (markup instanceof Function && !(markup instanceof Markup))
            accessor = markup;
        else if (isTemplate(markup)) [accessor, inputs] = markup;
        // A concretized markup reports the template it came from, which is how a conflict
        // explanation or an evaluation step becomes editable without its call site handing
        // anything up. Covers both the `Markup` and `{perLocale}` forms, since `parsed` is
        // already the resolved primary markup for each.
        else if (parsed.source !== undefined)
            ({ accessor, inputs } = parsed.source);
        if (accessor === undefined) return undefined;

        const key = accessorToLocalePath(accessor)?.toString();
        if (key === undefined) return undefined;

        const text = $locales.getWithAnnotations(accessor);
        return {
            key,
            raw: withoutAnnotations(
                Array.isArray(text) ? text.join('\n\n') : text,
            ),
            accessor,
            inputs,
        };
    });

    let isLocalizable = $derived(source !== undefined);
    let rawText = $derived(source?.raw ?? '');
    let storageKey = $derived(source?.key);
    const activeLocaleString = $derived(toLocaleString($locales.getLocale()));
    // An edit's value can be a whole list (a glossary term's forms, edited on
    // the localization workspace's Glossary tab); this editor only ever shows
    // one string, and no list-valued path reaches it.
    let override = $derived.by(() => {
        if (storageKey === undefined) return undefined;
        const value = $localeEdits.get(activeLocaleString)?.get(storageKey);
        return typeof value === 'string' ? value : undefined;
    });

    /** Parsed markup for display in localizing mode, using the override if one exists. An
     *  override goes through the same transformation `parsed` applied to the locale string —
     *  terms expanded, and concretized when the original had inputs — so an edited template
     *  still reads like the message it replaces rather than showing `$name`. */
    let displayParsed = $derived.by(() => {
        if (override === undefined) return parsed;
        const words = Markup.words(rt(override));
        // concretize returns undefined when an input has no value, which a mistyped `$name`
        // in a draft can cause; showing the raw words beats blanking the message.
        return source?.inputs === undefined
            ? words
            : (words.concretize($locales, source.inputs) ?? words);
    });
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
            // Expand `$term` in the secondary locale's own word list.
            const resolvedRaw = view.resolveTerms(raw);
            const built =
                inputs !== undefined
                    ? (Markup.words(resolvedRaw).concretize(view, inputs) ??
                      Markup.words(plain))
                    : Markup.words(resolvedRaw);
            result.push({
                markup: built,
                language: view.getLocale().language,
                direction: view.getDirection(),
            });
        }
        return result;
    });

    // `$derived` is lazy but `$effect` is not, so the gates are read *before* `source` —
    // otherwise every MarkupHTMLView on every page would reflect its accessor.
    $effect(() => {
        if (localizing === undefined || !localizing.on || !editing) return;
        const accessor = source?.accessor;
        localizing.focused = accessor;
        // Clear only our own, so a sibling re-rendering can't blank the open editor's.
        return () => {
            if (localizing.focused === accessor) localizing.focused = undefined;
        };
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
                    background>{CONFIRM_SYMBOL}</Button
                >
                <Button
                    tip={(l) => l.ui.localize.button.cancel}
                    action={cancelEditing}
                    background>{CANCEL_SYMBOL}</Button
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
                        background>{REVERT_SYMBOL}</Button
                    >{/if}
            </div>
        {:else}
            <!-- The markup renders exactly as it does outside localization mode, and the
                 edit affordance sits beside it rather than wrapping it. Markup can contain
                 concept links and rendered code, which are themselves interactive: nesting
                 those inside a button is invalid HTML, swallows their clicks, and fails axe's
                 nested-interactive rule. This is the shape a Link already uses for the same
                 reason. -->
            <span class="editable" class:block={!inline}
                >{#if placeholder && displayParsed
                        .toText()
                        .trim().length === 0}<LocalizedText
                        path={placeholder}
                    />{:else if displaySpaces}{#if inline}{#each displayParsed.asLine().paragraphs[0].segments as segment}<SegmentHTMLView
                                {segment}
                                spaces={displaySpaces}
                                alone={false}
                            />{/each}{:else}<div class="markup" class:note>
                            {@render paragraphsView(
                                displayParagraphsAndLists,
                                displaySpaces,
                            )}{#if displayParsed.isMachineTranslated() && !override}<MachineTranslatedAnnotation
                                />{/if}
                        </div>{/if}{:else}unable to render markup without spaces{/if}{#if override}<LocallyRevisedAnnotation
                    />{/if}<span class="edit-button"
                    ><Button
                        tip={(l) => l.ui.localize.button.edit}
                        action={startEditing}
                        background
                        size="inherit">{EDIT_SYMBOL}</Button
                    ></span
                ></span
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
                lang={lang ?? $locales.getLocale().language}
                dir={dir ?? $locales.getDirection()}
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
        /* Deliberately does NOT set a writing mode. Markup renders everywhere —
           settings rows, dialog explanations, notices, tooltips, chat — and a
           vertically-set settings dialog is not something any Japanese
           application does: vertical is for reading at length, not for
           operating an interface. The long-form reading surfaces set the mode
           on themselves instead and this inherits it. */
        display: flex;
        flex-direction: column;
        /* Authored prose opts out of the global `user-select: none`; lists and
           inline link buttons inherit, so a selection can't skip them. */
        user-select: text;
        -webkit-user-select: text;
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

    /* A paragraph wipes in across the text — down the page horizontally, across
       it vertically. Two keyframe sets and a swapped `animation-name` rather
       than one set driven by custom properties: a `var()` inside a keyframe's
       `transform` is resolvable but not obviously static to a compositor, and
       this animation runs once per paragraph on every documentation page and
       every lesson turn. Scaling the wrong axis reads as a squash, not a
       reveal. */
    .paragraph.animated {
        transform: scaleY(0);
        animation-name: pop-block;
        animation-duration: 200ms;
        animation-delay: var(--delay);
        animation-fill-mode: forwards;
        transform-origin: top left;
    }

    :global(:root[data-writing-layout^='vertical']) .paragraph.animated {
        transform: scaleX(0);
        animation-name: pop-inline;
    }

    :global(:root[data-writing-layout='vertical-rl']) .paragraph.animated {
        transform-origin: top right;
    }

    @keyframes pop-block {
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

    @keyframes pop-inline {
        0% {
            opacity: 0;
            transform: scaleX(0);
        }
        80% {
            opacity: 0.9;
            transform: scaleX(1.05);
        }
        100% {
            opacity: 1;
            transform: scaleX(1);
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

    /* The same rule as the one above, for the same reason: whatever contains
       this markup already spaces itself from what follows, so a trailing
       margin here is a second gap. A list that ended a block sat 1em further
       from the paragraph after it than from the one before it — visible
       wherever prose introduces a bulleted list, like the rules in the share
       dialog. */
    ul:last-child {
        margin-block-end: 0;
    }

    .markup-localizing {
        display: block;
    }

    /* Marks the markup as editable, carrying the elevated treatment the whole-text button
       used to. The ✎ trails the content so it reads as attached to it. */
    .editable {
        display: inline;
        padding: var(--wordplay-spacing-half);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
    }

    .editable.block {
        display: block;
    }

    .edit-button {
        margin-inline-start: var(--wordplay-spacing-half);
        white-space: nowrap;
    }

    /* Block prose puts the affordance on its own line, where it reads as an action on the
       box rather than a stray glyph in the text; pin it to the trailing edge. */
    .editable.block .edit-button {
        display: block;
        width: fit-content;
        margin-inline-start: auto;
        margin-block-start: var(--wordplay-spacing-half);
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
