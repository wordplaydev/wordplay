<script lang="ts">
    import { CharactersDB } from '@db/Database';
    import {
        characterToSVG,
        unknownCharacterSVG,
        type Character,
    } from '../../db/characters/Character';
    import { CharacterName } from '@nodes/ConceptLink';

    let { name }: { name: CharacterName } = $props();

    let character = $state<Character | 'loading' | null>('loading');
    /** When the character changes, load the character */
    $effect(() => {
        if (name) {
            character = 'loading';
            CharactersDB.getByName(`${name.username}/${name.name}`).then(
                (g) => {
                    character = g === undefined ? null : g;
                },
            );
        }
    });
</script>

{#if character === 'loading'}
    …
{:else}
    <div class="character">
        {#if character}
            {@html characterToSVG(character, '.9em')}
        {:else}
            {@html unknownCharacterSVG('.9em')}
        {/if}
    </div>
{/if}

<style>
    .character {
        display: inline-block;
        vertical-align: middle;
    }
</style>
