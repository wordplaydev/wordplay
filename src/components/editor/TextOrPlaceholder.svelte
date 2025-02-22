<script lang="ts">
    import Text from '@components/widgets/Text.svelte';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        placeholder: LocaleTextAccessor | undefined;
        text: string;
        rendered: string;
    }

    let { placeholder, text, rendered }: Props = $props();
</script>

{#if placeholder !== undefined}<span class="placeholder"
        ><Text path={placeholder}></Text></span
    >{:else if text.length === 0}&ZeroWidthSpace;{:else}{rendered}{/if}

<style>
    .placeholder {
        font-family: var(--wordplay-app-font);
        font-style: italic;
        font-size: var(--wordplay-font-size);
        text-decoration: underline;
    }
</style>
