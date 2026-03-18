<script module lang="ts">
    type ParagraphOrList = Paragraph | { items: Paragraph[] };
</script>

<script lang="ts">
    import type { LocaleTextsAccessor } from '@locale/Locales';
    import Markup from '@nodes/Markup';
    import Paragraph from '@nodes/Paragraph';
    import { DOCS_SYMBOL, FORMATTED_SYMBOL } from '@parser/Symbols';
    import { parseDocs, parseFormattedLiteral } from '@parser/parseExpression';
    import { toTokens } from '@parser/toTokens';
    import {
        animationDuration,
        animationFactor,
        locales,
    } from '../../db/Database';
    import SegmentHTMLView from './SegmentHTMLView.svelte';

    interface Props {
        markup: Markup | string[] | string | LocaleTextsAccessor;
        inline?: boolean;
        note?: boolean;
    }

    let { markup, inline = false, note = false }: Props = $props();

    /* Convert the markup into a Markup node. */
    let parsed = $derived.by(() => {
        // If markup was given, just pass it back and render it.
        if (markup instanceof Markup) return markup;
        // If an accessor function was given, get the corresponding locale text and render it as markup,
        // automatically adding newlines to create multiple paragraphs.
        if (markup instanceof Function) {
            const text = $locales.get(markup);
            return Markup.words(Array.isArray(text) ? text.join('\n\n') : text);
        }
        // If it's a list of strings, join them with newlines to create multiple paragraphs, and render that as markup.
        if (Array.isArray(markup)) return Markup.words(markup.join('\n\n'));
        // Does it start with a docs symbol? Pull out the relevant markup matching
        // the preferred locale.
        if (markup.startsWith(DOCS_SYMBOL)) {
            const docs = parseDocs(toTokens(markup));
            if (docs)
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
            if (formatted)
                return (
                    formatted.getLanguage($locales.getLocale().language)
                        ?.markup ??
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
</script>

{#if spaces}
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
                    >{/if}{/each}
        </div>{/if}
{:else}no spaces{/if}

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

    p:last-child {
        margin-block-end: 0;
    }
</style>
