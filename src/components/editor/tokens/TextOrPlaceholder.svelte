<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import type { Format } from '../nodes/NodeView.svelte';

    interface Props {
        placeholder: LocaleTextAccessor | undefined;
        text: string;
        rendered: string;
        format: Format;
    }

    let { placeholder, text, rendered, format }: Props = $props();
</script>

{#if placeholder !== undefined}<span class="placeholder"
        ><LocalizedText path={placeholder} /></span
    >{:else if text.length === 0}{#if !format.block}&ZeroWidthSpace;{/if}{:else}{rendered}{/if}

<style>
    .placeholder {
        font-family: var(--wordplay-app-font);
        font-style: italic;
        font-size: var(--wordplay-font-size);
        text-decoration: underline;
    }
</style>
