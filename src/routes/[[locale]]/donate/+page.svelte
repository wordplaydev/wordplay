<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import BigLink from '@components/app/BigLink.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
    import Title from '@components/widgets/Title.svelte';
    import Writing from '@components/app/Writing.svelte';
</script>

<Title text={(l) => l.ui.page.donate.header} />

<Writing reading>
    <PageHeader
        header={(l) => l.ui.page.donate.header}
        description={(l) => l.ui.page.donate.content}
    />

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
