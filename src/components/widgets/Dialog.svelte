<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { locale } from '../../db/Database';
    import Button from './Button.svelte';
    import type { DialogText } from '../../locale/UITexts';
    import Header from '../app/Header.svelte';

    export let dialog: HTMLDialogElement | undefined = undefined;
    export let show: boolean;
    export let description: DialogText;
    export let width: string | undefined = undefined;
    export let closeable = true;

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
        if (closeable) {
            document.addEventListener('pointerdown', outclick);
            return () => document.removeEventListener('pointerdown', outclick);
        }
    });
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
    bind:this={dialog}
    style:width
    tabindex="-1"
    on:keydown={closeable
        ? (event) => (event.key === 'Escape' ? (show = false) : undefined)
        : undefined}
>
    <div class="content">
        <Header>{description.header}</Header>
        <p>{description.explanation}</p>
        <slot />
        {#if closeable}
            <div class="close">
                <Button
                    tip={$locale.ui.widget.dialog.close}
                    action={() => (show = false)}>❌</Button
                >
            </div>
        {/if}
    </div>
</dialog>

<style>
    dialog {
        position: relative;
        border-radius: var(--wordplay-border-radius);
        padding: 2em;
        width: 80vw;
        height: max-content;
        background-color: var(--wordplay-background);
        color: var(--wordplay-foreground);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    dialog::backdrop {
        transition: backdrop-filter;
        backdrop-filter: blur(10px);
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
