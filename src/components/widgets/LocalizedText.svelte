<!-- Represents some text defined in the locale. -->
<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { isMachineTranslated } from '@locale/LocaleText';
    import { withoutAnnotations } from '@locale/withoutAnnotations';

    interface Props {
        path: LocaleTextAccessor;
        markup?: boolean;
    }

    let { path, markup = false }: Props = $props();

    const text = $derived($locales.get(path));
    const isMT = $derived(isMachineTranslated(text));
</script>

<span class="localized"
    >{#if markup}<MarkupHTMLView markup={text}
        ></MarkupHTMLView>{:else}{withoutAnnotations(text)}{/if}{#if isMT}<span
            class="mt">✎</span
        >{/if}</span
>

<style>
    .mt {
        font-size: 7pt;
    }
</style>
