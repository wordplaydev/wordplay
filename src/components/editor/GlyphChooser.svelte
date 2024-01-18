<script lang="ts">
    import { tokenize } from '../../parser/Tokenizer';
    import { getUnicodeNamed as getUnicodeWithNameText } from '../../unicode/Unicode';
    import { IdleKind, getEditors } from '../project/Contexts';
    import Button from '../widgets/Button.svelte';
    import TextField from '../widgets/TextField.svelte';
    import TokenView from './TokenView.svelte';
    import { locales } from '../../db/Database';
    import Commands, { Category } from './util/Commands';
    import CommandButton from '../widgets/CommandButton.svelte';
    import concretize from '../../locale/concretize';
    import Toggle from '../widgets/Toggle.svelte';
    import Label from '@components/widgets/Label.svelte';
    import DropdownButton from '@components/widgets/DropdownButton.svelte';

    export let sourceID: string;

    const Defaults = Commands.filter(
        (command) => command.category === Category.Insert
    );

    const categories = ["Emojis", "Arrows", "Shapes", "Other"];
    let dropdownLabel = 'Symbols';
    // [
    //     CHANGE_SYMBOL,
    //     DEGREE_SYMBOL,
    //     EXAMPLE_OPEN_SYMBOL,
    //     EXAMPLE_CLOSE_SYMBOL,
    // ];

    const editors = getEditors();

    let expanded = false;
    let query = '';
    $: results =
        query.length < 3
            ? []
            : getUnicodeWithNameText(query).map((entry) =>
                  String.fromCodePoint(entry.hex)
              );

    function insert(glyph: string) {
        const editor = $editors?.get(sourceID);
        if (editor) {
            editor.edit(editor.caret.insert(glyph), IdleKind.Typed, true);
        }
    }
</script>

<section class="directory" data-uiid="directory">
    <div class="topBar">
        <div class="leftBar">
            <div class="operators">
                <Label>Operators</Label>
                {#each Defaults as command}<CommandButton
                                {sourceID}
                                {command}
                                token
                                focusAfter
                            />{/each}
            </div>
            <DropdownButton
                menuItems={categories}
                direction="up"
                onSelect={(value) => {
                    dropdownLabel = value;
                    query = '';
                    expanded = true;
                }}
            > {dropdownLabel} </DropdownButton> 
        </div>
        <div class="toggleWrapper">
            <Toggle
                tips={$locales.get((l) => l.ui.source.toggle.glyphs)}
                on={expanded}
                toggle={() => {
                    expanded = !expanded;
                    dropdownLabel = 'Symbols';
                    }}>{expanded ? '–' : '+'}</Toggle
            >
        </div>
    </div>
    <div class:expanded class="searchArea">
        <TextField
            placeholder="🔍"
            description={$locales.get((l) => l.ui.source.cursor.search)}
            bind:text={query}
        />
        <div class="matches">
            {#if query !== ''}
                {#each results as glyph}<Button
                        tip={concretize(
                            $locales,
                            $locales.get((l) => l.ui.source.cursor.insertSymbol),
                            glyph
                        ).toText()}
                        action={() => insert(glyph)}
                        ><TokenView node={tokenize(glyph).getTokens()[0]} /></Button
                    >{:else}&mdash;{/each}
            {/if}
        </div>
    </div>
</section>

<style>
    section {
        padding: var(--wordplay-spacing);
        border-top: var(--wordplay-border-color) solid 1px;
    }

    .topBar {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        background-color: var(--wordplay-background);
        align-items: start;
        justify-content: space-between;
        width:100%;
        overflow: none;
    }

    .leftBar {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: center;
        justify-content: start;
        width: 95%;
    }

    .operators {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: center;
        overflow: hidden;
    }

    .matches {
        flex-grow: 1;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        overflow-x: auto;
        padding: var(--wordplay-spacing);
    }

    .searchArea {
        display: none;
    }

    .expanded {
        display: block;
    }

</style>
