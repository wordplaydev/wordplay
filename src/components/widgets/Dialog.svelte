<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { locale } from '../../db/Database';
    import Button from './Button.svelte';
    import type { DialogText } from '../../locale/UITexts';

    export let dialog: HTMLDialogElement | undefined = undefined;
    export let show: boolean;
    export let description: DialogText;
    export let width: string | undefined = undefined;

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
    style:width
    tabindex="-1"
    on:keydown={(event) =>
        event.key === 'Escape' ? (show = false) : undefined}
>
    <div class="content">
        <h1>{description.header}</h1>
        <p>{description.explanation}</p>
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
        background-color: var(--wordplay-background);
        color: var(--wordplay-foreground);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .close {
        position: absolute;
        top: calc(2 * var(--wordplay-spacing));
        right: calc(2 * var(--wordplay-spacing));
    }

    .content {
        min-height: 100%;
    }
</style>
