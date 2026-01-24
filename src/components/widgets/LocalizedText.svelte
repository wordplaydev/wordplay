<!-- Represents some text defined in the locale. -->
<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { withoutAnnotations } from '@locale/withoutAnnotations';

    interface Props {
        path: LocaleTextAccessor;
        markup?: boolean;
    }

    let { path, markup = false }: Props = $props();
</script>

<span class="localized"
    >{#if markup}<MarkupHTMLView markup={$locales.get(path)}
        ></MarkupHTMLView>{:else}{withoutAnnotations(
            $locales.get(path),
        )}{/if}</span
>
