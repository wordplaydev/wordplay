<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
</script>

<Subheader>
    <LocalizedText path={(l) => l.ui.localize.header} />
</Subheader>
<MarkupHTMLView markup={(l) => l.ui.localize.description} />
