<script lang="ts">
    import { characterToSVG } from '@db/characters/Character';
    import { CharactersDB } from '@db/Database';
    import { withColorEmoji } from '../../unicode/emoji';
    import { getEmoji } from '../../unicode/Unicode';
    import Button from './Button.svelte';

    interface Props {
        pick: (emoij: string) => void;
        emoji: string;
        showCustom?: boolean;
    }

    let { pick, emoji, showCustom = true }: Props = $props();

    let publicCharacters = $derived(
        CharactersDB.getEditableCharacters().filter((c) => c.public),
    );
</script>

<div class="picker">
    {#if showCustom}
        <!-- Show the public custom characters -->
        {#each publicCharacters as character}
            <div class="emoji" class:selected={`@${character.name}` === emoji}>
                <Button
                    tip={() => character.description}
                    padding={false}
                    action={() => pick(`@${character.name}`)}
                >
                    {@html characterToSVG(character, '1.25em')}
                </Button>
            </div>
        {/each}
    {/if}
    <!-- Show standard emojis -->
    {#await getEmoji() then emojis}
        {#each emojis as code}
            <div
                class="emoji"
                class:selected={String.fromCodePoint(code.hex) === emoji}
                ><Button
                    padding={false}
                    tip={() => code.name}
                    action={() => pick(String.fromCodePoint(code.hex))}
                    ><span class="emoji"
                        >{withColorEmoji(String.fromCodePoint(code.hex))}</span
                    ></Button
                ></div
            >
        {/each}
    {/await}
</div>

<style>
    .picker {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
        width: 100%;
        max-height: 10em;
        overflow-y: auto;
    }

    .emoji {
        font-family: 'Noto Color Emoji', 'Noto Emoji';
        font-size: 1em;
    }

    .selected {
        background: var(--wordplay-highlight-color);
        border-radius: var(--wordplay-border-radius);
    }
</style>
