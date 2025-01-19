<script lang="ts">
    import { CharactersDB } from '@db/Database';
    import {
        characterToSVG,
        unknownCharacterSVG,
        type Character,
    } from '../../characters/character';

    let { name }: { name: string } = $props();

    let character = $state<Character | 'loading' | null>('loading');
    /** When the character changes, load the character */
    $effect(() => {
        if (name) {
            character = 'loading';
            CharactersDB.getByIDOrName(name).then((g) => {
                character = g === undefined ? null : g;
            });
        }
    });
</script>

{#if character === 'loading'}
    …
{:else}
    <div class="character">
        {#if character}
            {@html characterToSVG(character, '1em')}
        {:else}
            {@html unknownCharacterSVG('1em')}
        {/if}
    </div>
{/if}

<style>
    .character {
        display: inline-block;
        vertical-align: top;
    }
</style>
