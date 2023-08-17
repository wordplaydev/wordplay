<script lang="ts">
    import Lead from '../../components/app/Lead.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import { locale } from '../../db/Database';
    import Markup from '../../nodes/Markup';
</script>

<Writing>
    <Lead>{$locale.ui.header.about}</Lead>

    <MarkupHtmlView
        markup={Markup.words($locale.ui.about.content.join('\n\n'))}
    />
</Writing>
