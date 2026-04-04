<script module lang="ts">
    type ParagraphOrList = Paragraph | { items: Paragraph[] };
    let idCounter = 0;
</script>

<script lang="ts">
    import MachineTranslatedAnnotation from '@components/app/MachineTranslatedAnnotation.svelte';
    import { getLocalizing } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import type { LocaleTextsAccessor, TemplateInput } from '@locale/Locales';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import Markup from '@nodes/Markup';
    import Paragraph from '@nodes/Paragraph';
    import {
        CANCEL_SYMBOL,
        CONFIRM_SYMBOL,
        DOCS_SYMBOL,
        FORMATTED_SYMBOL,
    } from '@parser/Symbols';
    import { parseDocs, parseFormattedLiteral } from '@parser/parseExpression';
    import { toTokens } from '@parser/toTokens';
    import { tick } from 'svelte';
    import {
        animationDuration,
        animationFactor,
        locales,
    } from '../../db/Database';
    import SegmentHTMLView from './SegmentHTMLView.svelte';

    interface Props {
        markup:
            | Markup
            | string[]
            | string
            | LocaleTextsAccessor
            | [LocaleTextsAccessor, ...TemplateInput[]];
        inline?: boolean;
        note?: boolean;
    }

    let { markup, inline = false, note = false }: Props = $props();

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

    /** True only when markup is a plain locale accessor (not a template array). */
    let isLocalizable = $derived(
        markup instanceof Function && !(markup instanceof Markup),
    );

    /** The raw annotated text from the locale, for use as the editor's initial value. */
    let rawText = $derived.by(() => {
        if (!isLocalizable || !(markup instanceof Function)) return '';
        const text = $locales.getWithAnnotations(markup);
        return withoutAnnotations(
            Array.isArray(text) ? text.join('\n\n') : text,
        );
    });

    async function startEditing() {
        editedText = rawText;
        editing = true;
        await tick();
        editorView?.focus();
    }

    function stopEditing() {
        editing = false;
    }
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
                description={(l) => l.ui.localize.field.description}
                placeholder={(l) => l.ui.localize.field.placeholder}
                bind:text={editedText}
                bind:view={editorView}
            />
            <div class="edit-actions">
                <Button
                    tip={(l) => l.ui.localize.button.submit}
                    action={stopEditing}
                    background
                    padding={true}>{CONFIRM_SYMBOL}</Button
                >
                <Button
                    tip={(l) => l.ui.localize.button.cancel}
                    action={stopEditing}
                    background
                    padding={true}>{CANCEL_SYMBOL}</Button
                >
            </div>
        {:else}
            <span class="edit-button"
                ><Button
                    tip={(l) => l.ui.localize.button.edit}
                    action={startEditing}
                    padding={false}
                    background
                    wrap={true}
                >
                    {#if spaces}
                        {#if inline}
                            {#each parsed.asLine().paragraphs[0].segments as segment}
                                <SegmentHTMLView
                                    {segment}
                                    {spaces}
                                    alone={false}
                                />
                            {/each}
                        {:else}
                            <div class="markup" class:note>
                                {#each paragraphsAndLists as paragraphOrList, index}
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
                                                    {spaces}
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
                                                            {spaces}
                                                            alone={paragraph
                                                                .segments
                                                                .length === 1}
                                                            first={index === 0}
                                                        />{/each}</li
                                                >{/each}</ul
                                        >
                                    {/if}
                                {/each}{#if parsed.isMachineTranslated()}<MachineTranslatedAnnotation
                                    />{/if}
                            </div>
                        {/if}
                    {:else}
                        unable to render markup without spaces
                    {/if}
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
</style>
