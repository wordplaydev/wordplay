<script lang="ts">
    import Page from '../components/app/Page.svelte';
    import Header from '../components/app/Header.svelte';
    import { locale } from '../db/Database';
    import Link from '../components/app/Link.svelte';
    import Speech from '../components/lore/Speech.svelte';
    import Glyphs from '../lore/Glyphs';
</script>

<Page>
    <Header>{$locale.ui.error.notfound.header}</Header>
    <Speech glyph={Glyphs.Function}
        ><p slot="content">
            {$locale.ui.error.notfound.message}
            <Link to="/">🏠</Link></p
        ></Speech
    >
</Page>
