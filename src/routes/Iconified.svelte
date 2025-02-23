<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type LocaleText from '@locale/LocaleText';
    import { withMonoEmoji } from '../unicode/emoji';

    interface Props {
        icon: string;
        text: (locale: LocaleText) => string;
    }

    let { icon, text }: Props = $props();
</script>

{withMonoEmoji(icon)}
<LocalizedText path={text} />
