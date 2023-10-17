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

    export let sourceID: string;

    const Defaults = Commands.filter(
        (command) => command.category === Category.Insert
    );
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

<section class:expanded class="directory" data-uiid="directory">
    <TextField
        placeholder="🔍"
        description={$locales.get((l) => l.ui.source.cursor.search)}
        bind:text={query}
    />
    <div class="matches">
        {#if query === ''}
            {#each Defaults as command}<CommandButton
                    {sourceID}
                    {command}
                    token
                    focusAfter
                />{/each}
        {:else}
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
    <Toggle
        tips={$locales.get((l) => l.ui.source.toggle.glyphs)}
        on={expanded}
        toggle={() => (expanded = !expanded)}>{expanded ? '–' : '+'}</Toggle
    >
</section>

<style>
    section {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        padding-left: var(--wordplay-spacing);
        padding-right: var(--wordplay-spacing);
        background-color: var(--wordplay-background);
        align-items: center;
        border-top: var(--wordplay-border-color) solid 1px;
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

    section.expanded {
        height: 10em;
    }

    .expanded .matches {
        overflow-x: none;
        overflow-y: auto;
        flex-wrap: wrap;
        height: 100%;
    }
</style>
