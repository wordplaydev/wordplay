<script lang="ts">
    import Page from '../components/app/Page.svelte';
    import Lead from '../components/app/Lead.svelte';
    import { config } from '../db/Database';
    import Link from '../components/app/Link.svelte';
    import Speech from '../components/lore/Speech.svelte';
    import Glyphs from '../lore/Glyphs';
</script>

<Page>
    <Lead>{$config.getLocale().ui.error.notfound.header}</Lead>
    <Speech glyph={Glyphs.Function}
        ><p slot="content">
            {$config.getLocale().ui.error.notfound.message}
            <Link to="/">🏠</Link></p
        ></Speech
    >
</Page>
