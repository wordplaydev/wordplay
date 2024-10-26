<script lang="ts">
    export let placeholder: string | undefined;
    export let text: string;
    export let rendered: string;
</script>

{#if placeholder !== undefined}<span class="placeholder">{placeholder}</span
    >{:else if text.length === 0}&ZeroWidthSpace;{:else}{rendered}{/if}

<style>
    .placeholder {
        font-family: var(--wordplay-app-font);
        font-style: italic;
        font-size: var(--wordplay-font-size);
        text-decoration: underline;
    }
</style>
