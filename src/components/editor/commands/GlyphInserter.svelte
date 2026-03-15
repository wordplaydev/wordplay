<script lang="ts">
    import EmojiChooser from '@components/widgets/GlyphChooser.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { type Character } from '../../../db/characters/Character';
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

<section class:expanded class="directory" data-uiid="directory">
    <div class="matches">
        {#if expanded}
            <EmojiChooser glyph="🙂" pick={(glyph) => insert(glyph)}
            ></EmojiChooser>
        {:else}
            {#each Defaults as command}<CommandButton
                    {sourceID}
                    {command}
                    token
                    focusAfter
                />{/each}
        {/if}
    </div>
    <Toggle
        tips={(l) => l.ui.source.toggle.characters}
        on={expanded}
        toggle={() => (expanded = !expanded)}
        >{withColorEmoji(expanded ? '😴' : '😊')}</Toggle
    >
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

    section.expanded {
        min-height: 10em;
        max-height: 15em;
    }
</style>
