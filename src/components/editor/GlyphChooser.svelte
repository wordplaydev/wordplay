<script lang="ts">
    import { locales } from '../../db/Database';
    import Commands, { Category } from './util/Commands';
    import CommandButton from '../widgets/CommandButton.svelte';
    import Toggle from '../widgets/Toggle.svelte';
    import Label from '@components/widgets/Label.svelte';
    import DropdownButton from '@components/widgets/DropdownButton.svelte';
    import GlyphSearchArea from './GlyphSearchArea.svelte';
    import type { WordplayCategories } from '../../unicode/Unicode';

    export let sourceID: string;

    const Defaults = Commands.filter(
        (command) => command.category === Category.Insert
    );

    const categories: (WordplayCategories | "symbols")[] =  [
        "symbols",
        "emojis",
        "arrows",
        "shapes",
        "other",
    ]
    let dropdownValue: WordplayCategories | undefined = undefined;

    let expanded = false;
</script>

<section class="directory" data-uiid="directory">
    <div class="top-bar">
        <div class="left-bar">
            <div class="operators">
                <Label>{$locales.get((l) => l.ui.label.operator)}</Label>
                {#each Defaults as command}<CommandButton
                                {sourceID}
                                {command}
                                token
                                focusAfter
                            />{/each}
            </div>
            <div class="combo-wrapper">
                <DropdownButton
                    options={categories}
                    direction="up"
                    fill
                    onSelect={(item) => {
                        expanded = true;
                    }}
                    bind:value={dropdownValue}
                />
            </div>
        </div>
        <div class="toggleWrapper">
            <Toggle
                tips={$locales.get((l) => l.ui.source.toggle.glyphs)}
                on={expanded}
                toggle={() => {
                    expanded = !expanded;
                    }}>{expanded ? '–' : '+'}</Toggle
            >
        </div>
    </div>
    <div class:expanded class="search-area">
        <GlyphSearchArea {sourceID} category={dropdownValue}/>
    </div>
</section>

<style>
    
    .top-bar {
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        background-color: var(--wordplay-background);
        align-items: start;
        justify-content: space-between;
        width:100%;
        overflow: none;
        border-top: var(--wordplay-border-color) solid 1px;
        border-bottom: var(--wordplay-border-color) solid 1px;
    }

    .left-bar {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: center;
        justify-content: start;
        min-width: 95%;
    }

    .operators {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: center;
        overflow: hidden;
    }
    
    .search-area {
        display: none;
        padding: var(--wordplay-spacing);
        padding-bottom: 0;
    }

    .expanded {
        display: block;
    }

    .combo-wrapper {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: center;
        justify-content: start;
        width: 120px;
    }

</style>
