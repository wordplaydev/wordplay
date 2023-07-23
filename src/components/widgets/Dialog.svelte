<script lang="ts">
    import { creator } from '../../db/Creator';
    import Button from './Button.svelte';

    export let dialog: HTMLDialogElement;
</script>

<dialog bind:this={dialog}>
    <slot />

    <div class="close">
        <Button
            tip={$creator.getLocale().ui.tooltip.close}
            action={() => dialog.close()}>❌</Button
        >
    </div>
</dialog>

<style>
    dialog {
        position: relative;
        border-radius: var(--wordplay-border-radius);
        padding: calc(2 * var(--wordplay-spacing));
    }

    .close {
        position: absolute;
        top: calc(2 * var(--wordplay-spacing));
        right: calc(2 * var(--wordplay-spacing));
    }
</style>
