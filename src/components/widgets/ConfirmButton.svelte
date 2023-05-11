<script lang="ts">
    import { preferredLocales } from '../../locale/locales';
    import Button from './Button.svelte';

    export let tip: string;
    export let action: () => void;
    export let enabled: boolean = true;
    export let prompt: string;

    let confirming = false;
</script>

<div class="prompt" class:confirming>
    <Button {tip} action={() => (confirming = !confirming)} {enabled}
        ><slot /></Button
    >
    {#if confirming}
        <Button
            stretch
            tip={$preferredLocales[0].ui.tooltip.yes}
            action={() => action()}>{prompt}</Button
        >
    {/if}
</div>

<style>
    .prompt.confirming {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        padding-left: var(--wordplay-spacing);
        padding-right: var(--wordplay-spacing);
        align-items: baseline;
        outline: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }
</style>
