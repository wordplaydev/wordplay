<script lang="ts">
    import Centered from '@components/app/Centered.svelte';
    import Link from '@components/app/Link.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Title from '@components/widgets/Title.svelte';
    import { type Class } from '@db/teachers/TeacherDatabase.svelte';
    import MarkupHTMLView from '../../components/concepts/MarkupHTMLView.svelte';
    import { getTeachData } from './+layout.svelte';
    import TeachersOnly from './TeachersOnly.svelte';

    let teach = getTeachData();

    let classes = $derived(teach.getClasses());
</script>

<svelte:head>
    <Title text={(l) => l.ui.page.teach.header} />
</svelte:head>

{#snippet classDetails(group: Class)}
    <Link to="/teach/class/{group.id}"><Subheader>{group.name}</Subheader></Link
    >
    <p>{group.description}</p>
    <p
        >{#each { length: group.learners.length }}👤{/each}</p
    >
{/snippet}

<TeachersOnly>
    {#if classes === undefined}
        <Spinning></Spinning>
    {:else if classes === null}
        <MarkupHTMLView markup={(l) => l.ui.page.teach.error.offline} />
    {:else}
        {#if classes.length === 0}
            <MarkupHTMLView markup={(l) => l.ui.page.teach.prompt.none} />
        {:else}
            <MarkupHTMLView markup={(l) => l.ui.page.teach.prompt.some} />
        {/if}
        <Centered>
            <Link
                to="/teach/class/new"
                label={(l) => l.ui.page.teach.link.new}
            />
        </Centered>
        {#each classes as group}
            {@render classDetails(group)}
        {/each}
    {/if}
</TeachersOnly>
