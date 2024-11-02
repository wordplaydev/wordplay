<script lang="ts">
    import { locales } from '@db/Database';
    import { withVariationSelector } from '../unicode/emoji';
    import type LocaleText from '@locale/LocaleText';

    interface Props {
        icon: string;
        text: (locale: LocaleText) => string;
    }

    let { icon, text }: Props = $props();
</script>

{withVariationSelector(icon)}
{$locales.get(text)}
