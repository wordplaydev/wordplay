<script lang="ts">
    import { locales } from '@db/Database';
    import type LocaleText from '@locale/LocaleText';
    import { withMonoEmoji } from '../unicode/emoji';

    interface Props {
        icon: string;
        text: (locale: LocaleText) => string;
    }

    let { icon, text }: Props = $props();
</script>

{withMonoEmoji(icon)}
{$locales.get(text)}
