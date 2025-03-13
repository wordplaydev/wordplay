<script lang="ts">
    import { characterToSVG, type Character } from '@db/characters/Character';
    import { CharactersDB } from '@db/Database';
    import { withColorEmoji } from '../../unicode/emoji';

    const { character }: { character: string | null } = $props();

    let customCharacter = $state<Character | null>();

    $effect(() => {
        if (character?.startsWith('@'))
            CharactersDB.getByName(character.slice(1)).then((c) => {
                customCharacter = c ?? null;
            });
        else customCharacter = null;
    });
</script>

<span class="name" style:animation-delay={`${Math.random() * 1000}ms`}
    >{#if customCharacter}
        {@html characterToSVG(customCharacter, '1em')}
    {:else}{withColorEmoji(
            character === '' || character === null ? '😃' : character,
        )}{/if}</span
>

<style>
    .name {
        display: inline-block;
        font-family: 'Noto Color Emoji', 'Noto Emoji', 'Noto Sans';
        animation: rotate infinite ease-in 5s;
    }
</style>
