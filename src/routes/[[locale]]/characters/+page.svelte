<script lang="ts">
    import { browser } from '$app/environment';
    import Link from '@components/app/Link.svelte';
    import Notice from '@components/app/Notice.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Title from '@components/widgets/Title.svelte';
    import { characterToSVG, type Character } from '@db/characters/Character';
    import { CharactersDB, disconnected } from '@db/Database';
    import { firestore } from '@db/firebase';
    import { CANCEL_SYMBOL, COPY_SYMBOL } from '@parser/Symbols';
    import { localeGoto } from '@util/localeGoto';
    import NewCharacterButton from './NewCharacterButton.svelte';

    const user = getUser();

    let characters = $derived(CharactersDB.getEditableCharacters());
    let owned: Character[] = $derived(
        !isAuthenticated($user)
            ? []
            : Array.from(characters.values()).filter(
                  (c) => c.owner === $user.uid,
              ),
    );
    let shared: Character[] = $derived(
        !isAuthenticated($user)
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
                {@html characterToSVG(character, 128)}
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
                background
                action={async () => {
                    const id = await CharactersDB.copy(character);
                    if (id) localeGoto(`/character/${id}`);
                }}
            ></Button>
            <ConfirmButton
                tip={(l) => l.ui.page.characters.button.remove.tip}
                prompt={(l) => l.ui.page.characters.button.remove.prompt}
                icon={CANCEL_SYMBOL}
                enabled={!$disconnected}
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
            align-items: start;
            gap: var(--wordplay-spacing);
        }

        .character {
            /* Block (not inline-block) so the preview box doesn't sit on the
               link's text baseline — inline-block left ~5px of descender space
               below the 64px box from the line-height strut. */
            display: block;
            width: 128px;
            height: 128px;
            border: var(--wordplay-border-color) solid
                var(--wordplay-border-width);
        }

        .tools {
            display: flex;
            flex-direction: row;
            align-items: start;
            gap: var(--wordplay-spacing);
        }
    </style>
{/snippet}

<Writing>
    <PageHeader
        header={(l) => l.ui.page.characters.header}
        description={(l) => l.ui.page.characters.prompt}
    />

    {#if !browser || $user === undefined}
        <!-- Firebase only initializes in the browser, so `firestore` is
             undefined in the prerendered static shell and until hydration;
             `$user` is undefined until auth resolves. Show a spinner rather
             than baking the offline or "logged out" notice into the prerender
             before we actually know. -->
        <Spinning></Spinning>
    {:else if firestore === undefined}
        <Notice text={(l) => l.ui.page.characters.error.offline} />
    {:else if $user === null}
        <Notice markup text={(l) => l.ui.page.characters.error.noauth} />
    {:else if !CharactersDB.hydrated}
        <!-- Wait for the local cache to hydrate so we show the user's
             characters (available offline) rather than an empty list. -->
        <Spinning></Spinning>
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
        gap: calc(var(--wordplay-spacing) * 2);
        row-gap: calc(var(--wordplay-spacing) * 2);
        justify-content: start;
        /* Don't stretch each card to the row's tallest card (which a long,
           wrapping name would set) — that leaves blank space below shorter
           cards. Size each to its own content. */
        align-items: start;
    }
</style>
