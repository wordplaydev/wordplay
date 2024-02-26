<script lang="ts">
    import { getUnicodeNamed as getUnicodeWithNameText, type WordplayCategories } from '../../unicode/Unicode';
    import { IdleKind, getEditors } from '../project/Contexts';
    import concretize from '../../locale/concretize';
    import Button from '../widgets/Button.svelte';
    import TextField from '../widgets/TextField.svelte';
    import TokenView from './TokenView.svelte';
    import { tokenize } from '../../parser/Tokenizer';
    import { locales } from '@db/Database';
    import Label from '@components/widgets/Label.svelte';
    import VirtualList from 'svelte-tiny-virtual-list';

    export let sourceID: string;
    export let category: WordplayCategories | undefined;
    export let expanded: boolean;

    const editors = getEditors();

    const recentlyUsed: string[] = ['👍', '👎', '👌', '👀', '👁️', '👄', '👅', '👂', '👃', '👤', '👥'];

    const glyphSize = 32;

    let rowSize = 16; 
    let query = '';


    $: results = getUnicodeWithNameText(query, category, 500).map((hex) =>
        String.fromCodePoint(hex)
    );

    function getGlyphRow(row: number, category: WordplayCategories | undefined) {
        return results.slice(row * rowSize, (row + 1) * rowSize);
    }

    function insert(glyph: string) {
        const editor = $editors?.get(sourceID);
        if (editor) {
            editor.edit(editor.caret.insert(glyph), IdleKind.Typed, true);
        }
    }
</script>

<section>
    <div class="display">
        <div class="recents-bar">
            <div class="search-wrapper">
                <TextField
                    placeholder="🔍"
                    description={$locales.get((l) => l.ui.source.cursor.search)}
                    fill
                    bind:text={query}
                />
            </div>
            <div class="label-wrapper">
                <Label>{$locales.get((l) => l.ui.label.recent)}</Label>
            </div>
            <div class="recents-row">
                {#each recentlyUsed as glyph}<Button
                        tip={concretize(
                            $locales,
                            $locales.get((l) => l.ui.source.cursor.insertSymbol),
                            glyph
                        ).toText()}
                        action={() => insert(glyph)}
                        ><TokenView node={tokenize(glyph).getTokens()[0]} /></Button
                    >{/each}
            </div>
        </div>
        <VirtualList
            width="100%"
            height={400}
            itemCount={Math.max(Math.ceil(results.length / rowSize), 1)}
            itemSize={glyphSize}
        >
            <div slot="item" let:index let:style {style}>
                {#if results.length > 0}
                    <div class="glyph-row">
                        {#each getGlyphRow(index, category) as glyph}
                            <div class="glyph-wrapper">
                                <Button
                                    stretch
                                    tip={concretize(
                                        $locales,
                                        $locales.get((l) => l.ui.source.cursor.insertSymbol),
                                        glyph
                                    ).toText()}
                                    action={() => insert(glyph)}
                                    ><TokenView node={tokenize(glyph).getTokens()[0]} /></Button
                                >
                            </div>
                        {/each}
                    </div>
                {:else}
                    <span class="no-response-text"> No results found </span>
                {/if}
            </div>
        </VirtualList>
    </div>
</section>

<style>
    section {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: start;
        width: 100%;
    }

    .search-wrapper {
        width:12%;
        overflow: hidden;
        margin-right: var(--wordplay-spacing);
    }

    .label-wrapper {
        margin-right: var(--wordplay-spacing);
        flex-grow: 0;
    }

    .display {
        display:flex;
        flex-direction: column;
        flex-grow: 1;
        max-height: 190px;
    }

    .recents-bar {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: var(--wordplay-spacing);
        border-bottom: var(--wordplay-border-color) solid 1px;
    }

    .recents-row {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        flex-grow: 1;
    }

    .glyph-row {
        display: grid;
        grid-template-columns: repeat(16, 1fr);
        align-items: start;
        justify-content: start;
        width: 100%;
        height: 100%;
    }

    .glyph-wrapper {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
    }

    .no-response-text {
        color: var(--wordplay-inactive-color);
        font-style: italic;
        opacity: 1;
    }
</style>