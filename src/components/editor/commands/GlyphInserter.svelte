<script lang="ts">
    import GlyphChooser from '@components/widgets/GlyphChooser.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { type Character } from '../../../db/characters/Character';
    import { SEARCH_SYMBOL } from '../../../parser/Symbols';
    import { withColorEmoji } from '../../../unicode/emoji';
    import { IdleKind, getEditors } from '../../project/Contexts';
    import CommandButton from '../../widgets/CommandButton.svelte';
    import Commands, { Category } from './Commands';

    interface Props {
        sourceID: string;
    }

    let { sourceID }: Props = $props();

    const editors = getEditors();

    // Get all of the insertion commands for programming language symbols.
    const Defaults = Commands.filter(
        (command) => command.category === Category.Insert,
    );

    let expanded = $state(false);
    let query = $state('');

    // Auto-expand when the user starts typing a search query.
    $effect(() => {
        if (query.length > 0) expanded = true;
    });

    function toggle() {
        expanded = !expanded;
        // Clear the query when collapsing so it doesn't linger.
        if (!expanded) query = '';
    }

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
                false,
            );
        }
    }
</script>

<section class:expanded class="directory">
    <div class="matches">
        {#if expanded}
            <GlyphChooser
                externalQuery={query}
                pick={(glyph) => insert(glyph)}
            />
        {:else}
            {#each Defaults as command}<CommandButton
                    {sourceID}
                    {command}
                    token
                    focusAfter
                />{/each}
        {/if}
    </div>
    <div class="controls">
        <TextField
            id="glyph-search"
            max="5m"
            placeholder={SEARCH_SYMBOL}
            description={(l) => l.ui.source.cursor.search}
            bind:text={query}
        />
        <Toggle
            uiid="directory"
            tips={(l) => l.ui.source.toggle.characters}
            on={expanded}
            {toggle}>{withColorEmoji(expanded ? '😴' : '😊')}</Toggle
        >
    </div>
</section>

<style>
    section {
        display: flex;
        flex-direction: row;
        gap: 0;
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

    .controls {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        flex-shrink: 0;
    }

    section.expanded {
        min-height: 10em;
    }
</style>
