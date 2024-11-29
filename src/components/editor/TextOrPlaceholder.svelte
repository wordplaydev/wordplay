<script lang="ts">
    interface Props {
        placeholder: string | undefined;
        text: string;
        rendered: string;
    }

    let { placeholder, text, rendered }: Props = $props();
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
