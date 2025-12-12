<script lang="ts">
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import Button, { type Action } from './Button.svelte';
    import LocalizedText from './LocalizedText.svelte';

    interface Props {
        tip: LocaleTextAccessor;
        action: Action;
        enabled?: boolean;
        prompt: LocaleTextAccessor;
        background?: boolean;
        icon?: string;
        label?: LocaleTextAccessor;
        children?: import('svelte').Snippet;
        testid?: string;
    }

    let {
        tip,
        action,
        enabled = true,
        prompt,
        background = false,
        icon,
        label,
        testid,
        children,
    }: Props = $props();

    let confirming = $state(false);
</script>

<div class="prompt" class:confirming class:background>
    <Button
        {background}
        icon={confirming ? undefined : icon}
        tip={confirming ? (l) => l.ui.widget.confirm.cancel : tip}
        action={() => (confirming = !confirming)}
        active={enabled}
        {label}
        {testid}
        >{#if confirming}{CANCEL_SYMBOL}{:else if children}{@render children()}{:else if label}<LocalizedText
                path={label}
            />{/if}</Button
    >
    {#if confirming}
        <Button
            {background}
            stretch
            {tip}
            testid={testid + '-confirm'}
            action={() => action()}
            label={prompt}
        />
    {/if}
</div>

<style>
    .prompt.confirming {
        display: inline-flex;
        flex-direction: row;
        width: max-content;
        gap: var(--wordplay-spacing);
        padding-left: var(--wordplay-spacing);
        padding-right: var(--wordplay-spacing);
        align-items: baseline;
        outline: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }

    .prompt.background {
        outline: none;
    }
</style>
