<script lang="ts">
    import {
        characterToSVG,
        unknownCharacterSVG,
        type Character,
    } from '@db/characters/Character';
    import { CharactersDB } from '@db/Database';

    const { character }: { character: string | null } = $props();

    let customCharacter = $state<Character | 'loading' | null>(null);

    $effect(() => {
        const name = character;
        if (name?.startsWith('@')) {
            customCharacter = 'loading';
            CharactersDB.getByName(name.slice(1)).then((c) => {
                // Ignore a resolution for a character we've since moved off of.
                if (name === character) customCharacter = c ?? null;
            });
        } else customCharacter = null;
    });
</script>

<!-- A `@` prefixed name refers to a custom character; if it doesn't resolve
     (deleted, unshared, or not checkable), show the same empty square the stage
     shows for a missing character rather than leaking the raw reference. -->
<span class="name" style:animation-delay={`${Math.random() * 1000}ms`}
    >{#if character?.startsWith('@')}{#if customCharacter === 'loading'}…{:else if customCharacter}{@html characterToSVG(
                customCharacter,
                '1em',
            )}{:else}{@html unknownCharacterSVG(
                '1em',
            )}{/if}{:else}{character === '' || character === null
            ? '😃'
            : character}{/if}</span
>

<style>
    .name {
        display: inline-block;
        font-family: 'Noto Color Emoji', 'Noto Emoji', 'Noto Sans';
        animation: rotate infinite ease-in 5s;
    }
</style>
