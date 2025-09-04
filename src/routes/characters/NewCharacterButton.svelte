<script lang="ts">
    import { goto } from '$app/navigation';
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { CharactersDB } from '@db/Database';

    let { inline = false }: { inline?: boolean } = $props();

    let creating: boolean | undefined = $state(false);

    async function addCharacter() {
        creating = true;
        const id = await CharactersDB.createCharacter();
        if (id) {
            creating = false;
            goto(`/character/${id}`);
        } else creating = undefined;
    }
</script>

{#if creating}
    <Spinning></Spinning>
{:else if creating === undefined}
    <Notice text={(l) => l.ui.page.characters.error.create} />
{:else}
    <Button
        background={inline}
        tip={(l) => l.ui.page.characters.button.new}
        action={addCharacter}
        active={!creating}
        large={!inline}
        icon="+"
    ></Button>
{/if}
