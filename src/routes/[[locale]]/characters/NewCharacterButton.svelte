<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { CharactersDB, Galleries } from '@db/Database';
    import { localeGoto } from '@util/localeGoto';

    let {
        inline = false,
        /** When given, the new character is shared in this gallery straight
         *  away (#822), the way AddProject drops a new project into one. */
        gallery = undefined,
    }: { inline?: boolean; gallery?: string | undefined } = $props();

    let creating: boolean | undefined = $state(false);

    async function addCharacter() {
        creating = true;
        const id = await CharactersDB.createCharacter();
        if (id) {
            if (gallery !== undefined) {
                // Routed through the gallery database rather than written
                // here, so membership lands on both documents in one batch.
                const created = CharactersDB.byID.get(id);
                if (created) await Galleries.addCharacter(created, gallery);
            }
            creating = false;
            localeGoto(`/character/${id}`);
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
        testid="newcharacter"
        active={!creating}
        large={!inline}
        icon="+"
    ></Button>
{/if}
