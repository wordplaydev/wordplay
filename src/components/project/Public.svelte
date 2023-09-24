<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import { locale } from '@db/Database';

    export let isPublic: boolean;
    export let set: (choice: number) => void;
</script>

<Subheader>{$locale.ui.dialog.share.subheader.public.header}</Subheader>
<MarkupHtmlView markup={$locale.ui.dialog.share.subheader.public.explanation} />

<MarkupHtmlView
    markup={Object.values($locale.rules)
        .map((promise) => `• ${promise}`)
        .join('\n\n')}
/>
<p>
    <Mode
        descriptions={$locale.ui.dialog.share.mode.public}
        choice={isPublic ? 1 : 0}
        select={set}
        modes={[
            '🤫 ' + $locale.ui.dialog.share.mode.public.modes[0],
            '🌐 ' + $locale.ui.dialog.share.mode.public.modes[1],
        ]}
    /></p
>
<MarkupHtmlView markup={$locale.ui.page.rights.consequences} />

<style>
    p {
        margin-top: var(--wordplay-spacing);
    }
</style>
