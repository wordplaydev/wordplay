<script lang="ts">
    import { clickOutside } from '@components/app/clickOutside';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { locales } from '@db/Database';
    import type {
        LocaleTextAccessor,
        LocaleTextsAccessor,
    } from '@locale/Locales';
    import { tick } from 'svelte';
    import Header from '../app/Header.svelte';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import Button from './Button.svelte';

    interface Props {
        show?: boolean;
        header: LocaleTextAccessor;
        explanation: LocaleTextsAccessor;
        closeable?: boolean;
        button?:
            | {
                  tip: LocaleTextAccessor;
                  icon?: string;
                  label?: string | LocaleTextAccessor;
              }
            | undefined;
        children?: import('svelte').Snippet;
    }

    let {
        show = $bindable(false),
        header,
        explanation,
        closeable = true,
        button = undefined,
        children,
    }: Props = $props();

    let view: HTMLDialogElement | undefined = $state(undefined);

    /** Show and focus dialog when shown, hide when not. */
    $effect(() => {
        if (view) {
            if (show) {
                view.showModal();
                tick().then(() =>
                    view
                        ? setKeyboardFocus(view, 'Focusing dialog')
                        : undefined,
                );
            } else {
                view.close();
            }
        }
    });
</script>

{#if button}
    <Button tip={button.tip} action={() => (show = true)} icon={button.icon}>
        {#if button.label}{typeof button.label === 'string'
                ? button.label
                : $locales.get(button.label)}{/if}</Button
    >
{/if}
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
    bind:this={view}
    use:clickOutside={() => (show = false)}
    tabindex="-1"
    onkeydown={closeable
        ? (event) => (event.key === 'Escape' ? (show = false) : undefined)
        : undefined}
>
    <div class="container">
        {#if closeable}
            <div class="close">
                <Button
                    tip={(l) => l.ui.widget.dialog.close}
                    action={() => (show = false)}
                    icon="❌"
                ></Button>
            </div>
        {/if}

        <div class="content">
            <Header text={header} />
            <MarkupHTMLView markup={explanation} />
            {@render children?.()}
        </div>
    </div>
</dialog>

<style>
    dialog {
        position: relative;
        border-radius: var(--wordplay-border-radius);
        padding: 0;
        margin-left: auto;
        margin-right: auto;
        max-width: 95vw;
        height: max-content;
        background-color: var(--wordplay-background);
        color: var(--wordplay-foreground);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    dialog::backdrop {
        transition: backdrop-filter;
        backdrop-filter: blur(2px);
    }

    .container {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        padding: 1em;
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
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
</style>
