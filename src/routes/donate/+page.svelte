<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import BigLink from '../../components/app/BigLink.svelte';
    import Header from '../../components/app/Header.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import MarkupHTMLView from '../../components/concepts/MarkupHTMLView.svelte';
</script>

<Writing>
    <Header text={(l) => l.ui.page.donate.header} />

    <MarkupHTMLView markup={(l) => l.ui.page.donate.content} />

    <p class="donate">
        <BigLink
            external
            to="https://www.washington.edu/giving/make-a-gift/?page=make&code=GIDGET&amount=25"
            ><LocalizedText path={(l) => l.ui.page.donate.header} /></BigLink
        ></p
    >
</Writing>

<style>
    .donate {
        text-align: center;
    }
</style>
