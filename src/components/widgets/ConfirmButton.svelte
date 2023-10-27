<script lang="ts">
    import { locales } from '@db/Database';
    import Button, { type Action } from './Button.svelte';

    export let tip: string;
    export let action: Action;
    export let enabled = true;
    export let prompt: string;
    export let background = false;

    let confirming = false;
</script>

<div class="prompt" class:confirming class:background>
    <Button
        {background}
        tip={confirming ? $locales.get((l) => l.ui.widget.confirm.cancel) : tip}
        action={() => (confirming = !confirming)}
        active={enabled}
        >{#if confirming}⨉{:else}<slot />{/if}</Button
    >
    {#if confirming}
        <Button {background} stretch {tip} action={() => action()}
            >{prompt}</Button
        >
    {/if}
</div>

<style>
    .prompt.confirming {
        display: flex;
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
