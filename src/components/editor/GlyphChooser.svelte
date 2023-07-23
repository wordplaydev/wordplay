<script lang="ts">
    import { tokenize } from '../../parser/Tokenizer';
    import { getUnicodeNamed as getUnicodeWithNameText } from '../../unicode/Unicode';
    import { IdleKind, getEditors } from '../project/Contexts';
    import Button from '../widgets/Button.svelte';
    import TextField from '../widgets/TextField.svelte';
    import TokenView from './TokenView.svelte';
    import { creator } from '../../db/Creator';
    import Commands, { Category } from './util/Commands';
    import CommandButton from '../widgets/CommandButton.svelte';
    import concretize from '../../locale/concretize';

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
            editor.edit(editor.caret.insert(glyph), IdleKind.Typing);
        }
    }
</script>

<section class:expanded class="directory" data-uiid="directory">
    <TextField placeholder="🔍" bind:text={query} />
    <div class="matches">
        {#if query === ''}
            {#each Defaults as command}<CommandButton
                    {sourceID}
                    {command}
                    token
                />{/each}
        {:else}
            {#each results as glyph}<Button
                    tip={concretize(
                        $creator.getLocale(),
                        $creator.getLocale().ui.tooltip.insertSymbol,
                        glyph
                    ).toText()}
                    action={() => insert(glyph)}
                    ><TokenView node={tokenize(glyph).getTokens()[0]} /></Button
                >{:else}&mdash;{/each}
        {/if}
    </div>
    <Button
        tip={$creator.getLocale().ui.tooltip.chooserExpand}
        action={() => (expanded = !expanded)}>{expanded ? '–' : '+'}</Button
    >
</section>

<style>
    section {
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        background-color: var(--wordplay-background);
        align-items: baseline;
        border-top: var(--wordplay-border-color) solid 1px;
        border-bottom: var(--wordplay-border-color) solid 1px;
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
</style>
