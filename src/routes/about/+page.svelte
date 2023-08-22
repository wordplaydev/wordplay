<script lang="ts">
    import Header from '../../components/app/Header.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import { locale } from '../../db/Database';
    import Markup from '../../nodes/Markup';
</script>

<Writing>
    <Header>{$locale.ui.header.about}</Header>

    <MarkupHtmlView
        markup={Markup.words($locale.ui.about.content.join('\n\n'))}
    />
</Writing>
