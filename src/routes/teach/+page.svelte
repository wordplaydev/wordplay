<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { locales } from '@db/Database';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import TeachersOnly from '../TeachersOnly.svelte';
    import { getTeachersClasses, type Class } from '@db/TeacherDatabase.svelte';
    import Link from '@components/app/Link.svelte';
    import Centered from '@components/app/Centered.svelte';
    import Subheader from '@components/app/Subheader.svelte';

    let user = getUser();
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.teach.header)}</title>
</svelte:head>

{#snippet classDetails(group: Class)}
    <Link to="/class/{group.id}"><Subheader>{group.name}</Subheader></Link>
    <p>{group.description}</p>
    <p
        >{#each { length: group.learners.length }}👤{/each}</p
    >
{/snippet}

<Writing>
    <Header>{$locales.get((l) => l.ui.page.teach.header)}</Header>
    <TeachersOnly>
        {#if $user}
            {#await getTeachersClasses($user) then classes}
                {#if classes === undefined}
                    <MarkupHtmlView
                        markup={$locales.get(
                            (l) => l.ui.page.teach.error.offline,
                        )}
                    />
                {:else}
                    {#if classes.length === 0}
                        <MarkupHtmlView
                            markup={$locales.get(
                                (l) => l.ui.page.teach.prompt.none,
                            )}
                        />
                    {:else}
                        <MarkupHtmlView
                            markup={$locales.get(
                                (l) => l.ui.page.teach.prompt.some,
                            )}
                        />
                    {/if}
                    <Centered>
                        <Link to="/class/new">
                            {$locales.get((l) => l.ui.page.teach.link.new)}
                        </Link>
                    </Centered>
                    {#each classes as group}
                        {@render classDetails(group)}
                    {/each}
                {/if}
            {:catch}
                <MarkupHtmlView
                    markup={$locales.get((l) => l.ui.page.teach.error.offline)}
                />
            {/await}
        {/if}
    </TeachersOnly>
</Writing>
