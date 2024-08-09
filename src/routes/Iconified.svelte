<script lang="ts">
    import { locales } from '@db/Database';
    import { withVariationSelector } from '../unicode/emoji';
    import type LocaleText from '@locale/LocaleText';

    export let icon: string;
    export let text: (locale: LocaleText) => string;
</script>

{withVariationSelector(icon)}
{$locales.get(text)}
