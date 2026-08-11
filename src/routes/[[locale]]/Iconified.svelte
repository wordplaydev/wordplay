<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type LocaleText from '@locale/LocaleText';
    import { withMonoEmoji } from '@unicode/emoji';

    interface Props {
        icon: string;
        text: (locale: LocaleText) => string;
    }

    let { icon, text }: Props = $props();
</script>

<!-- The icon goes through Emoji so it gets the mono font family. Rendered as a
     bare text node it inherited --wordplay-app-font, which leads with 'Noto
     Color Emoji' — and the FE0E selector doesn't stop unicode-range matching,
     so a monochrome icon still downloaded a color emoji slice. -->
<Emoji text={withMonoEmoji(icon)} />
<LocalizedText path={text} />
