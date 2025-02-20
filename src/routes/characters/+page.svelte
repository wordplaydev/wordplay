<script lang="ts">
    import Feedback from '@components/app/Feedback.svelte';
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import { CharactersDB, locales } from '@db/Database';
    import { firestore } from '@db/firebase';
    import {
        characterToSVG,
        type Character,
    } from '../../db/characters/Character';
    import NewCharacterButton from './NewCharacterButton.svelte';

    const user = getUser();

    let characters = $derived(CharactersDB.getEditableCharacters());
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.characters.header)}</title>
</svelte:head>

{#snippet preview(character: Character)}
    {@const name = character.name.split('/').at(-1) ?? ''}
    <Link to="/character/{character.id}">
        <div class="preview">
            <div class="character">
                {@html characterToSVG(character, 64)}
            </div>
            <div class="name"
                >{#if character.name.length === 0}—{:else}{name.length === 0
                        ? '—'
                        : name}{/if}</div
            >
        </div>
    </Link>
    <style>
        .preview {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--wordplay-spacing);
        }

        .character {
            display: inline-block;
            width: 64px;
            height: 64px;
            border: var(--wordplay-border-color) solid
                var(--wordplay-border-width);
        }
    </style>
{/snippet}

<Writing>
    <Header>{$locales.get((l) => l.ui.page.characters.header)}</Header>
    <MarkupHtmlView markup={$locales.get((l) => l.ui.page.characters.prompt)} />

    {#if firestore === undefined}
        <Feedback
            >{$locales.get((l) => l.ui.page.characters.error.offline)}</Feedback
        >
    {:else if $user === null}
        <Feedback
            >{$locales.get((l) => l.ui.page.characters.error.noauth)}</Feedback
        >
    {:else}
        <NewCharacterButton></NewCharacterButton>

        <div class="characters">
            {#each characters.values() as character}
                {#if character !== null}
                    {@render preview(character)}
                {/if}
            {/each}
        </div>
    {/if}
</Writing>

<style>
    .characters {
        display: flex;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
        justify-content: start;
    }
</style>
