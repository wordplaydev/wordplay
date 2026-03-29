<script lang="ts">
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        text: LocaleTextAccessor;
        subtitle?: string | undefined;
    }

    let { text, subtitle }: Props = $props();
</script>

<title
    >{$locales.getPlainText(text)}{#if subtitle}
        - {subtitle}{/if}</title
>
