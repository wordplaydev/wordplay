<script lang="ts">
    import { tokenize } from '../../parser/Tokenizer';
    import {
        getEmoji,
        getUnicodeNamed as getUnicodeWithNameText,
    } from '../../unicode/Unicode';
    import { IdleKind, getEditors } from '../project/Contexts';
    import Button from '../widgets/Button.svelte';
    import TextField from '../widgets/TextField.svelte';
    import TokenView from './TokenView.svelte';
    import { locales } from '../../db/Database';
    import Commands, { Category } from './util/Commands';
    import CommandButton from '../widgets/CommandButton.svelte';
    import { isEmoji, withColorEmoji } from '../../unicode/emoji';
    import Toggle from '@components/widgets/Toggle.svelte';

    interface Props {
        sourceID: string;
    }

    let { sourceID }: Props = $props();

    const Defaults = Commands.filter(
        (command) => command.category === Category.Insert,
    );
    // [
    //     CHANGE_SYMBOL,
    //     DEGREE_SYMBOL,
    //     EXAMPLE_OPEN_SYMBOL,
    //     EXAMPLE_CLOSE_SYMBOL,
    // ];

    const editors = getEditors();

    let query = $state('');
    let emoji = $state(false);
    let expanded = $derived(emoji || query.length > 0);
    let results = $derived(
        query.length < 3
            ? []
            : getUnicodeWithNameText(query)
                  .map((entry) => String.fromCodePoint(entry.hex))
                  .toSorted((a, b) =>
                      isEmoji(a)
                          ? isEmoji(b)
                              ? a.localeCompare(b)
                              : -1
                          : isEmoji(b)
                            ? 1
                            : -1,
                  ),
    );

    function insert(character: string) {
        const editorState = $editors?.get(sourceID);
        if (editorState) {
            editorState.edit(
                editorState.caret.insert(
                    character,
                    editorState.blocks,
                    editorState.project,
                ),
                IdleKind.Typed,
                true,
            );
        }
    }
</script>

{#snippet option(glyph: string)}
    <Button
        tip={$locales
            .concretize((l) => l.ui.source.cursor.insertSymbol, glyph)
            .toText()}
        action={() => insert(glyph)}
        ><TokenView node={tokenize(glyph).getTokens()[0]} /></Button
    >
{/snippet}

<section class:expanded class="directory" data-uiid="directory">
    <TextField
        id="character-search"
        placeholder="🔍"
        description={$locales.get((l) => l.ui.source.cursor.search)}
        bind:text={query}
    />
    <div class="matches">
        {#if query === ''}
            {#if emoji}
                {#each getEmoji() as glyph}
                    {@render option(String.fromCodePoint(glyph.hex))}
                {/each}
            {:else}
                {#each Defaults as command}<CommandButton
                        {sourceID}
                        {command}
                        token
                        focusAfter
                    />{/each}
            {/if}
        {:else}
            {#each results as glyph}<Button
                    tip={$locales
                        .concretize(
                            (l) => l.ui.source.cursor.insertSymbol,
                            glyph,
                        )
                        .toText()}
                    action={() => insert(glyph)}
                    ><TokenView node={tokenize(glyph).getTokens()[0]} /></Button
                >{:else}&mdash;{/each}
        {/if}
    </div>
    {#if query.length === 0}
        <Toggle
            tips={$locales.get((l) => l.ui.source.toggle.characters)}
            on={emoji}
            toggle={() => (emoji = !emoji)}
            >{withColorEmoji(emoji ? '😴' : '😊')}</Toggle
        >
    {/if}
</section>

<style>
    section {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        padding-left: var(--wordplay-spacing);
        padding-right: var(--wordplay-spacing);
        background-color: var(--wordplay-background);
        align-items: baseline;
        border-top: var(--wordplay-border-color) solid 1px;
    }

    .matches {
        flex-grow: 1;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        overflow-x: auto;
        padding: var(--wordplay-spacing);
        align-content: baseline;
    }

    section.expanded {
        max-height: 10em;
    }

    .expanded .matches {
        overflow: auto;
        flex-wrap: wrap;
        row-gap: var(--wordplay-spacing);
        max-height: 10em;
    }
</style>
