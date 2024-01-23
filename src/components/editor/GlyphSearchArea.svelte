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
    <TextField
        placeholder="🔍"
        description={$locales.get((l) => l.ui.source.cursor.search)}
        bind:text={query}
    />
    <div class="display">
        <VirtualList
            width="100%"
            height={600}
            itemCount={Math.ceil(results.length / rowSize) + 2}
            itemSize={glyphSize}
        >
            <div slot="item" let:index let:style {style}>
                {#if index == 0}
                <div class="recents-bar">
                    <div class="label-wrapper">
                        <Label>Recently Used</Label>
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
                {:else}
                <div class="glyph-row">
                    {#each getGlyphRow(index - 2, category) as glyph}
                        <div class="glyph-wrapper">
                            <Button
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

    .label-wrapper {
        margin-right: var(--wordplay-spacing);
        flex-grow: 0;
    }

    .display {
        display:flex;
        flex-direction: column;
        flex-grow: 1;
        max-height: 180px;
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
        padding-bottom: var(--wordplay-spacing);
        width: 100%;
    }

    .glyph-wrapper {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
    }
</style>