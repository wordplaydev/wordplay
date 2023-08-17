<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { locale } from '../../db/Database';
    import Button from './Button.svelte';

    export let dialog: HTMLDialogElement | undefined = undefined;
    export let show: boolean;

    $: {
        if (dialog) {
            if (show) {
                dialog.showModal();
                tick().then(() => dialog?.focus());
            } else {
                dialog.close();
            }
        }
    }

    function outclick(event: PointerEvent) {
        if (dialog && event.target === dialog) show = false;
    }

    onMount(() => {
        document.addEventListener('pointerdown', outclick);
        return () => document.removeEventListener('pointerdown', outclick);
    });
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
    bind:this={dialog}
    tabindex="-1"
    on:keydown={(event) =>
        event.key === 'Escape' ? (show = false) : undefined}
>
    <div class="content">
        <slot />
        <div class="close">
            <Button
                tip={$locale.ui.description.close}
                action={() => (show = false)}>❌</Button
            >
        </div>
    </div>
</dialog>

<style>
    dialog {
        position: relative;
        border-radius: var(--wordplay-border-radius);
        padding: calc(2 * var(--wordplay-spacing));
        width: 80vw;
        height: 80vh;
    }

    .close {
        position: absolute;
        top: calc(2 * var(--wordplay-spacing));
        right: calc(2 * var(--wordplay-spacing));
    }
</style>
