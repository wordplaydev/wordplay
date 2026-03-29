<!-- Represents some text defined in the locale. -->
<script lang="ts">
    import MachineTranslatedAnnotation from '@components/app/MachineTranslatedAnnotation.svelte';
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

    const text = $derived($locales.getWithAnnotations(path));
    const isMT = $derived(isMachineTranslated(text));
    const withoutAnnotationsText = $derived(withoutAnnotations(text));
</script>

<span class="localized"
    >{#if markup}<MarkupHTMLView markup={text}
        ></MarkupHTMLView>{:else}{withoutAnnotationsText}{/if}{#if isMT}<MachineTranslatedAnnotation
        />{/if}</span
>
