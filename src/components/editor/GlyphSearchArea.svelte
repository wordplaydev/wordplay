<script lang="ts">
    import { getUnicodeNamed as getUnicodeWithNameText, type WordplayCategories } from '../../unicode/Unicode';
    import { IdleKind, getEditors, getProject } from '../project/Contexts';
    import concretize from '../../locale/concretize';
    import Button from '../widgets/Button.svelte';
    import TextField from '../widgets/TextField.svelte';
    import TokenView from './TokenView.svelte';
    import { tokenize } from '../../parser/Tokenizer';
    import { locales, Projects } from '@db/Database';
    import Label from '@components/widgets/Label.svelte';
    import VirtualList from 'svelte-tiny-virtual-list';

    export let sourceID: string;
    export let category: WordplayCategories | undefined;

    const editors = getEditors();
    const project = getProject();

    $: recentlyUsed = $project?.getRecentGlyphs() ?? [];

    const glyphSize = 32;

    let rowSize = 16; 
    let query = '';


    $: results = getUnicodeWithNameText(query, category, 500).map((hex) =>
        String.fromCodePoint(hex)
    );

    function getGlyphRow(row: number, category: WordplayCategories | undefined) {
        return results.slice(row * rowSize, (row + 1) * rowSize);
    }

    const RECENTLY_USED_SIZE = 10;

    function updateRecentGlyphs(glyph: string) {
        if (!$project) return;

        const recentGlyphs = $project.getRecentGlyphs();
        
        const glyphIndex = recentGlyphs.indexOf(glyph);
        let newGlyphs: string[] = [];
        // If the glyph is already in the list, move it to the front.
        // Otherwise, add it to the front and remove the last one.
        if (glyphIndex !== -1) {
            const front = recentGlyphs.splice(0, glyphIndex);            
            const back = recentGlyphs.splice(1);
            newGlyphs = [glyph].concat(front, back);
        } else {
            newGlyphs = [glyph].concat(recentGlyphs.splice(0, RECENTLY_USED_SIZE - 1));
        }
        console.log(newGlyphs);
        
        const newProj = $project.withRecentGlyphs(newGlyphs)
        Projects.reviseProject(
            newProj
        )
    }

    function insert(glyph: string) {
        const editor = $editors?.get(sourceID);
        if (editor) {
            editor.edit(editor.caret.insert(glyph), IdleKind.Typed, true);
            updateRecentGlyphs(glyph);
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
            <Button
                tip={"Unicode search and descriptions are only available in English"}
                action={() => {}}
            >
                <span class="disclaimer">⚠️</span>
            </Button>
            <div class="divider"/>
            <div class="label-wrapper">
                <Label>{$locales.get((l) => l.ui.label.recent)}</Label>
            </div>
            <div class="recents-row">
                {#each recentlyUsed as glyph}<div class="glyph-wrapper">
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
                </div>{/each}
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

    .divider {
        height: 35px;
        width: 1px;
        background-color: var(--wordplay-border-color);
        margin-right: var(--wordplay-spacing);
        margin-left: var(--wordplay-spacing);
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
        border-bottom: var(--wordplay-border-color) solid 1px;
        padding-bottom: var(--wordplay-spacing);
    }

    .recents-row {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        flex-grow: 1;
        height: 32px;
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

    .disclaimer {
        color: var(--wordplay-inactive-color);
    }
</style>