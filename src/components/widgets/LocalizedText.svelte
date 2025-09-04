<!-- Represents some text defined in the locale. -->
<script lang="ts">
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        path: LocaleTextAccessor;
    }

    let { path }: Props = $props();
</script>

<span class="localized">{$locales.get(path)}</span>
