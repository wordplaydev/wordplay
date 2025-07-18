<script lang="ts">
    import Toggle from '@components/widgets/Toggle.svelte';
    import { SEARCH_SYMBOL } from '@parser/Symbols';
    import { onMount } from 'svelte';
    import {
        characterToSVG,
        type Character,
    } from '../../db/characters/Character';
    import { CharactersDB, locales } from '../../db/Database';
    import { tokenize } from '../../parser/Tokenizer';
    import NewCharacterButton from '../../routes/characters/NewCharacterButton.svelte';
    import { isEmoji, withColorEmoji } from '../../unicode/emoji';
    import {
        getCodepoints,
        getEmoji,
        type Codepoint,
    } from '../../unicode/Unicode';
    import { IdleKind, getEditors } from '../project/Contexts';
    import Button from '../widgets/Button.svelte';
    import CommandButton from '../widgets/CommandButton.svelte';
    import TextField from '../widgets/TextField.svelte';
    import TokenView from './TokenView.svelte';
    import Commands, { Category } from './util/Commands';

    interface Props {
        sourceID: string;
    }

    let { sourceID }: Props = $props();

    const editors = getEditors();

    // Get all of the insertion commands for programming language symbols.
    const Defaults = Commands.filter(
        (command) => command.category === Category.Insert,
    );

    let customCharacters = $derived(CharactersDB.getAvailableCharacters());

    let codepoints: Codepoint[] = $state([]);
    onMount(() => {
        // Load the codepoints from the database.
        getCodepoints().then((cp) => {
            codepoints = cp;
        });
    });

    let query = $state('');
    let emoji = $state(false);
    let expanded = $derived(emoji || query.length > 0);
    let results = $derived(
        query.length < 3
            ? []
            : [
                  ...codepoints
                      .filter((c) => c.name.includes(query))
                      .map((entry) => String.fromCodePoint(entry.hex)),
                  ...customCharacters,
              ].toSorted((a, b) => {
                  if (typeof a !== 'string') {
                      if (typeof b !== 'string') {
                          return a.name.localeCompare(b.name);
                      } else return -1;
                  } else if (typeof b !== 'string') {
                      return 1;
                  } else
                      return isEmoji(a)
                          ? isEmoji(b)
                              ? a.localeCompare(b)
                              : -1
                          : isEmoji(b)
                            ? 1
                            : -1;
              }),
    );

    function insert(character: string | Character) {
        const editorState = $editors?.get(sourceID);
        if (editorState) {
            editorState.edit(
                editorState.caret.insert(
                    typeof character === 'string'
                        ? character
                        : `\`@${character.name}\``,
                    editorState.blocks,
                    editorState.project,
                ),
                IdleKind.Typed,
                true,
            );
        }
    }
</script>

{#snippet option(glyph: string, token = true)}
    <Button
        tip={() =>
            $locales
                .concretize((l) => l.ui.source.cursor.insertSymbol, glyph)
                .toText()}
        action={() => insert(glyph)}
        >{#if token}<TokenView
                node={tokenize(glyph).getTokens()[0]}
            />{:else}{glyph}{/if}</Button
    >
{/snippet}

{#snippet character(character: Character)}
    <Button
        tip={() =>
            $locales
                .concretize(
                    (l) => l.ui.source.cursor.insertSymbol,
                    character.description,
                )
                .toText()}
        action={() => insert(character)}
        >{@html characterToSVG(character, '1em')}</Button
    >
{/snippet}

<section class:expanded class="directory" data-uiid="directory">
    <TextField
        id="character-search"
        placeholder={SEARCH_SYMBOL}
        description={(l) => l.ui.source.cursor.search}
        bind:text={query}
    />
    <div class="matches">
        <!-- No query? Show emoji or defaults, depending on setting -->
        {#if query === ''}
            {#if emoji}
                <NewCharacterButton inline></NewCharacterButton>
                {#each customCharacters as glyph}
                    {@render character(glyph)}
                {/each}
                {#await getEmoji() then emojis}
                    {#each emojis as glyph}
                        {@render option(String.fromCodePoint(glyph.hex), false)}
                    {/each}
                {/await}
            {:else}
                {#each Defaults as command}<CommandButton
                        {sourceID}
                        {command}
                        token
                        focusAfter
                    />{/each}
            {/if}
            <!-- Show search results. -->
        {:else}
            {#each results as glyph}<Button
                    tip={() =>
                        $locales
                            .concretize(
                                (l) => l.ui.source.cursor.insertSymbol,
                                typeof glyph === 'string'
                                    ? glyph
                                    : glyph.description,
                            )
                            .toText()}
                    action={() => insert(glyph)}
                    >{#if typeof glyph === 'string'}
                        {glyph}
                    {:else}
                        {@html characterToSVG(glyph, '1em')}
                    {/if}
                </Button>{:else}&mdash;{/each}
        {/if}
    </div>
    {#if query.length === 0}
        <Toggle
            tips={(l) => l.ui.source.toggle.characters}
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
