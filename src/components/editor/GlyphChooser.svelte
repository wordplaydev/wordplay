<script lang="ts">
    import type Source from '../../nodes/Source';
    import {
        CONVERT_SYMBOL,
        ETC_SYMBOL,
        FALSE_SYMBOL,
        FUNCTION_SYMBOL,
        NONE_SYMBOL,
        PRODUCT_SYMBOL,
        QUOTIENT_SYMBOL,
        TRUE_SYMBOL,
        TYPE_SYMBOL,
    } from '../../parser/Symbols';
    import { tokenize } from '../../parser/Tokenizer';
    import { preferredTranslations } from '../../translation/translations';
    import { getUnicodeNamed as getUnicodeWithNameText } from '../../unicode/Unicode';
    import { getInsertions } from '../project/Contexts';
    import Button from '../widgets/Button.svelte';
    import TextField from '../widgets/TextField.svelte';
    import TokenView from './TokenView.svelte';

    export let source: Source;

    const defaults = [
        FUNCTION_SYMBOL,
        TYPE_SYMBOL,
        TRUE_SYMBOL,
        FALSE_SYMBOL,
        NONE_SYMBOL,
        PRODUCT_SYMBOL,
        QUOTIENT_SYMBOL,
        CONVERT_SYMBOL,
        ETC_SYMBOL,
    ];

    const insertions = getInsertions();

    let expanded = false;
    let query = '';
    $: results =
        query.length < 3
            ? []
            : getUnicodeWithNameText(query).map((entry) =>
                  String.fromCodePoint(entry.hex)
              );

    function insert(glyph: string) {
        const map = $insertions;
        if (map && insertions) {
            const newMap = new Map(map);
            newMap.set(source, glyph);
            insertions.set(newMap);
        }
    }
</script>

<section class:expanded>
    <TextField placeholder="🔍" bind:text={query} />
    <div class="matches">
        {#each query === '' ? defaults : results as glyph}<span
                class="glyph"
                tabIndex="0"
                on:keydown={(event) =>
                    event.key === ' ' || event.key === 'Enter'
                        ? insert(glyph)
                        : undefined}
                on:mousedown|preventDefault|stopPropagation={(event) =>
                    insert(glyph)}
                ><TokenView node={tokenize(glyph).getTokens()[0]} /></span
            >{:else}&mdash;{/each}
    </div>
    <Button
        tip={$preferredTranslations[0].ui.tooltip.chooserExpand}
        action={() => (expanded = !expanded)}>{expanded ? '–' : '+'}</Button
    >
</section>

<style>
    section {
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        background-color: var(--wordplay-background);
        align-items: baseline;
    }

    .matches {
        flex-grow: 1;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        overflow-x: scroll;
        align-content: baseline;
    }

    section.expanded {
        height: 10em;
    }

    .expanded .matches {
        overflow-x: none;
        overflow-y: scroll;
        flex-wrap: wrap;
        height: 100%;
    }

    .glyph {
        display: inline-block;
        cursor: pointer;
        height: 1.5em;
    }
</style>
