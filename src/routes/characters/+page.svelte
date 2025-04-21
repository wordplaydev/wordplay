<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Title from '@components/widgets/Title.svelte';
    import { CharactersDB } from '@db/Database';
    import { firestore } from '@db/firebase';
    import { CANCEL_SYMBOL, COPY_SYMBOL } from '@parser/Symbols';
    import {
        characterToSVG,
        type Character,
    } from '../../db/characters/Character';
    import NewCharacterButton from './NewCharacterButton.svelte';

    const user = getUser();

    let characters = $derived(CharactersDB.getEditableCharacters());
    let owned: Character[] = $derived(
        $user === null
            ? []
            : Array.from(characters.values()).filter(
                  (c) => c.owner === $user.uid,
              ),
    );
    let shared: Character[] = $derived(
        $user === null
            ? []
            : Array.from(characters.values()).filter((c) =>
                  c.collaborators.includes($user.uid),
              ),
    );
</script>

<svelte:head>
    <Title text={(l) => l.ui.page.characters.header} />
</svelte:head>

{#snippet preview(character: Character)}
    {@const name = character.name.split('/').at(-1) ?? ''}
    <div class="preview">
        <Link to="/character/{character.id}">
            <div class="character">
                {@html characterToSVG(character, 64)}
            </div>
        </Link>
        <Link to="/character/{character.id}">
            <div class="name"
                >{#if character.name.length === 0}—{:else}{name.length === 0
                        ? '—'
                        : name}{/if}</div
            >
        </Link>
        <div class="tools">
            <Button
                tip={(l) => l.ui.page.characters.button.copy}
                icon={COPY_SYMBOL}
                action={async () => {
                    await CharactersDB.copy(character);
                }}
            ></Button>
            <ConfirmButton
                tip={(l) => l.ui.page.characters.button.remove.tip}
                prompt={(l) => l.ui.page.characters.button.remove.prompt}
                icon={CANCEL_SYMBOL}
                action={async () => {
                    await CharactersDB.deleteCharacter(character.id);
                }}
            ></ConfirmButton>
        </div>
    </div>
    <style>
        .preview {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .character {
            display: inline-block;
            width: 64px;
            height: 64px;
            border: var(--wordplay-border-color) solid
                var(--wordplay-border-width);
        }

        .tools {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: var(--wordplay-spacing);
        }
    </style>
{/snippet}

<Writing>
    <Header text={(l) => l.ui.page.characters.header} />
    <MarkupHTMLView markup={(l) => l.ui.page.characters.prompt} />

    {#if firestore === undefined}
        <Notice text={(l) => l.ui.page.characters.error.offline} />
    {:else if $user === null}
        <Notice text={(l) => l.ui.page.characters.error.noauth} />
    {:else}
        <NewCharacterButton></NewCharacterButton>

        <div class="characters">
            {#each owned as character (character.id)}
                {#if character !== null}
                    {@render preview(character)}
                {/if}
            {/each}
        </div>

        {#if shared.length > 0}
            <Subheader text={(l) => l.ui.page.characters.subheader.shared}
            ></Subheader>

            <div class="characters">
                {#each shared as character}
                    {#if character !== null}
                        {@render preview(character)}
                    {/if}
                {/each}
            </div>
        {/if}
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
