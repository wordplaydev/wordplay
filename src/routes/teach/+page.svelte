<script module lang="ts">
    export type TeachPageText = {
        /** The header for the teach page. */
        header: string;
        prompt: {
            /** No classes */
            none: string;
            /** One or more classes */
            some: string;
        };
        error: {
            /** When unable to check teacher status or classes */
            offline: string;
            /** When not logged in */
            login: string;
            /** When logged in, but not a teacher */
            teacher: string;
        };
        link: {
            /** The prompt to request teacher privileges */
            request: string;
            /** The prompt to create a new class */
            new: string;
        };
    };
</script>

<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import { locales } from '@db/Database';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import { type Class } from '@db/TeacherDatabase.svelte';
    import Link from '@components/app/Link.svelte';
    import Centered from '@components/app/Centered.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import { getTeachData } from './+layout.svelte';
    import Spinning from '@components/app/Spinning.svelte';

    let teach = getTeachData();

    let classes = $derived(teach.getClasses());
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.teach.header)}</title>
</svelte:head>

{#snippet classDetails(group: Class)}
    <Link to="/teach/class/{group.id}"><Subheader>{group.name}</Subheader></Link
    >
    <p>{group.description}</p>
    <p
        >{#each { length: group.learners.length }}👤{/each}</p
    >
{/snippet}

<Header>{$locales.get((l) => l.ui.page.teach.header)}</Header>
{#if classes === undefined}
    <Spinning></Spinning>
{:else if classes === null}
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.teach.error.offline)}
    />
{:else}
    {#if classes.length === 0}
        <MarkupHtmlView
            markup={$locales.get((l) => l.ui.page.teach.prompt.none)}
        />
    {:else}
        <MarkupHtmlView
            markup={$locales.get((l) => l.ui.page.teach.prompt.some)}
        />
    {/if}
    <Centered>
        <Link to="/teach/class/new">
            {$locales.get((l) => l.ui.page.teach.link.new)}
        </Link>
    </Centered>
    {#each classes as group}
        {@render classDetails(group)}
    {/each}
{/if}
