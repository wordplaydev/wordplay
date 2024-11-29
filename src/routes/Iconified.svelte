<script lang="ts">
    import { locales } from '@db/Database';
    import { withMonoEmoji } from '../unicode/emoji';
    import type LocaleText from '@locale/LocaleText';

    interface Props {
        icon: string;
        text: (locale: LocaleText) => string;
    }

    let { icon, text }: Props = $props();
</script>

{withMonoEmoji(icon)}
{$locales.get(text)}
