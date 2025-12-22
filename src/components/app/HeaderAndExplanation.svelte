<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import type LocaleText from '@locale/LocaleText';
    import { type HeaderAndExplanationText } from '@locale/UITexts';
    import Header from './Header.svelte';
    import Subheader from './Subheader.svelte';

    interface Props {
        text: (l: LocaleText) => HeaderAndExplanationText;
        sub: boolean;
    }

    let { text, sub }: Props = $props();
</script>

{#if sub}
    <Subheader text={(l) => text(l).header}></Subheader>
{:else}
    <Header text={(l) => text(l).header} />
{/if}
<MarkupHTMLView markup={(l) => text(l).explanation} />
