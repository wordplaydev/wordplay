<script lang="ts">
    import { tick } from 'svelte';
    import { locales } from '../../db/Database';
    import Button from './Button.svelte';
    import type { DialogText } from '../../locale/UITexts';
    import Header from '../app/Header.svelte';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import Emoji from '@components/app/Emoji.svelte';

    export let show = false;
    export let description: DialogText;
    export let closeable = true;
    export let button:
        | { tip: string; icon?: string; label: string }
        | undefined = undefined;

    let view: HTMLDialogElement | undefined = undefined;

    $: {
        if (view) {
            if (show) {
                view.showModal();
                tick().then(() => view?.focus());
            } else {
                view.close();
            }
        }
    }
</script>

{#if button}
    <Button tip={button.tip} action={() => (show = true)}
        >{#if button.icon}<Emoji>{button.icon}</Emoji>
        {/if}{button.label}</Button
    >
{/if}
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
    bind:this={view}
    tabindex="-1"
    on:keydown={closeable
        ? (event) => (event.key === 'Escape' ? (show = false) : undefined)
        : undefined}
>
    {#if closeable}
        <div class="close">
            <Button
                tip={$locales.get((l) => l.ui.widget.dialog.close)}
                action={() => (show = false)}>❌</Button
            >
        </div>
    {/if}

    <div class="content">
        <Header>{description.header}</Header>
        <MarkupHtmlView markup={description.explanation} />
        <slot />
    </div>
</dialog>

<style>
    dialog {
        position: relative;
        border-radius: var(--wordplay-border-radius);
        padding: 1em;
        margin-left: auto;
        margin-right: auto;
        max-width: 40em;
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
        position: sticky;
        top: 0;
        width: 100%;
        text-align: right;
    }

    .content {
        min-height: 100%;
        padding: 1em;
        padding-top: 0;
    }
</style>
