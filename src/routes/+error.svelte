<script lang="ts">
    import Page from '../components/app/Page.svelte';
    import Lead from '../components/app/Lead.svelte';
    import { locale } from '../db/Database';
    import Link from '../components/app/Link.svelte';
    import Speech from '../components/lore/Speech.svelte';
    import Glyphs from '../lore/Glyphs';
</script>

<Page>
    <Lead>{$locale.ui.error.notfound.header}</Lead>
    <Speech glyph={Glyphs.Function}
        ><p slot="content">
            {$locale.ui.error.notfound.message}
            <Link to="/">🏠</Link></p
        ></Speech
    >
</Page>
