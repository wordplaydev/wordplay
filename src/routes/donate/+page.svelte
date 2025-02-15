<script lang="ts">
    import BigLink from '../../components/app/BigLink.svelte';
    import Header from '../../components/app/Header.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import { locales } from '../../db/Database';
</script>

<Writing>
    <Header>{$locales.get((l) => l.ui.page.donate.header)}</Header>

    <MarkupHtmlView markup={$locales.get((l) => l.ui.page.donate.content)} />

    <p class="donate">
        <BigLink
            external
            to="https://www.washington.edu/giving/make-a-gift/?page=make&code=GIDGET&amount=25"
            >{$locales.get((l) => l.ui.page.donate.header)}</BigLink
        ></p
    >
</Writing>

<style>
    .donate {
        text-align: center;
    }
</style>
