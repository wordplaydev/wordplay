<script lang="ts">
    import { locale } from '../../db/Database';
    import Button from './Button.svelte';

    export let tip: string;
    export let action: () => void;
    export let enabled = true;
    export let prompt: string;

    let confirming = false;
</script>

<div class="prompt" class:confirming>
    <Button
        tip={confirming ? $locale.ui.widget.confirm.cancel : tip}
        action={() => (confirming = !confirming)}
        active={enabled}
        >{#if confirming}⨉{:else}<slot />{/if}</Button
    >
    {#if confirming}
        <Button stretch {tip} action={() => action()}>{prompt}</Button>
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
</style>
