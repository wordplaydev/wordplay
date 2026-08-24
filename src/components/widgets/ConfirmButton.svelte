<script lang="ts">
    import Button, { type Action } from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { CANCEL_SYMBOL } from '@parser/Symbols';

    interface Props {
        tip: LocaleTextAccessor;
        action: Action;
        enabled?: boolean;
        prompt: LocaleTextAccessor;
        background?: boolean | 'salient' | 'circular';
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
        background = true,
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
        >{#if confirming}{CANCEL_SYMBOL}{:else}{#if children}{@render children()}{:else if label}<LocalizedText
                    path={label}
                />{/if}…{/if}</Button
    >
    {#if confirming}
        <Button
            background="salient"
            stretch
            {tip}
            testid={testid + '-confirm'}
            action={() => {
                // Collapse back to the unarmed button once the action is
                // taken. Everywhere this is used on a list item the button
                // unmounts and the leftover state is invisible, but a control
                // that outlives what it acted on — deleting a folder from the
                // projects page — would otherwise stay armed, so the next
                // press cancels instead of confirming.
                confirming = false;
                return action();
            }}
            label={prompt}
        />
    {/if}
</div>

<style>
    .prompt.confirming {
        display: inline-flex;
        flex-direction: row;
        width: max-content;
        gap: 0;
        align-items: stretch;
        outline: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }

    /* Square off the inner corners of each button when sitting in the
       confirming prompt, so the cancel + confirm pair reads as a single
       segmented control (like the Mode widget). */
    .prompt.confirming :global(button:first-of-type) {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
    }

    .prompt.confirming :global(button:last-of-type) {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
    }

    .prompt.background {
        outline: none;
    }
</style>
