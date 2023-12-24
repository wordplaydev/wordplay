<script lang="ts">
    import Page from '@components/app/Page.svelte';
    import Header from '@components/app/Header.svelte';
    import ProjectView from '@components/project/ProjectView.svelte';
    import {
        ConceptPathSymbol,
        getUser,
    } from '../../components/project/Contexts';
    import {
        query,
        type DocumentData,
        type QueryDocumentSnapshot,
        collection,
        limit,
        startAfter,
        orderBy,
        where,
        or,
        getDocs,
        FieldPath,
        and,
    } from 'firebase/firestore';
    import { onMount, setContext } from 'svelte';
    import { firestore } from '../../db/firebase';
    import {
        Flags,
        getFlagDescription,
        isModerator,
        withFlag,
    } from '../../models/Moderation';
    import type Project from '../../models/Project';
    import { Projects } from '../../db/Database';
    import { writable } from 'svelte/store';
    import { locales } from '../../db/Database';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import Button from '../../components/widgets/Button.svelte';
    import type { Flag, Moderation } from '../../models/Moderation';
    import Spinning from '../../components/app/Spinning.svelte';
    import { ProjectsCollection } from '../../db/ProjectsDatabase';
    import Markup from '@nodes/Markup';

    const user = getUser();

    /** Moderator if the user's "mod" custom claim is true */
    let moderator: boolean | undefined = undefined;
    $: if ($user) {
        isModerator($user).then((mod) => {
            moderator = mod;
        });
    } else {
        moderator = false;
    }

    /** Null means haven't started, undefined means reached the end. */
    let lastBatch: QueryDocumentSnapshot<DocumentData> | null | undefined =
        null;
    let project: Project | undefined = undefined;

    let newFlags: Moderation;

    let moderatedCount = 0;
    let unmoderatedCount = 0;
    onMount(async () => {
        try {
            await nextBatch();
        } catch (error) {
            console.error(error);
            lastBatch = undefined;
        }
    });

    // Create a concept path for children
    setContext(ConceptPathSymbol, writable([]));

    async function nextBatch() {
        if (firestore === undefined) {
            lastBatch = undefined;
            return firestore;
        }
        const unmoderated = query(
            collection(firestore, ProjectsCollection),
            // Construct a query for each flag to find any project that has a null flag.
            and(
                where('public', '==', true),
                or(
                    ...Array.from(Object.keys(Flags)).map((flag) =>
                        where(new FieldPath('flags', flag), '==', null),
                    ),
                ),
            ),
            orderBy('timestamp'),
            ...(lastBatch ? [startAfter(lastBatch)] : []),
            limit(1),
        );
        const documentSnapshots = await getDocs(unmoderated);

        if (!lastBatch) {
            //add to total projects if there was not a last batch detected
            unmoderatedCount += documentSnapshots.docs.length;
        }

        // Remember the last document.
        lastBatch = documentSnapshots.docs[documentSnapshots.docs.length - 1];

        // Convert the docs to galleries
        const doc = documentSnapshots.docs.map((snap) => snap.data())[0];

        project = await Projects.parseProject(doc);

        if (project) newFlags = project.getFlags();
    }

    function save() {
        for (const [flag, state] of Object.entries(newFlags))
            if (state === null) newFlags[flag as Flag] = false;

        // Save the project with the new flags.
        if (project) Projects.edit(project.withFlags(newFlags), false, true);

        moderatedCount += 1; //increment the moderated count when saved with new flags.
        skip();
    }

    function skip() {
        nextBatch();
    }
</script>

<Page>
    <div class="moderate">
        <div class="flags">
            <Header>{$locales.get((l) => l.moderation.moderate.header)}</Header>
            {#if lastBatch === null}
                <Spinning label="" />
            {:else if moderator === false}
                <p
                    >It looks like you're not a moderator. If you were recently
                    given moderator privileges, you may need to login again. If
                    not, see the wiki for how to request moderation privileges.</p
                >
            {:else if lastBatch === undefined}
                <p>Nothing else to moderate!</p>
            {:else if project === undefined}
                <Spinning label="" />
            {:else}
                <div class="progress-counter">
                    <MarkupHtmlView
                        markup={Markup.words(
                            $locales.get((l) => l.moderation.progress),
                        ).concretize($locales, [
                            moderatedCount,
                            unmoderatedCount,
                        ]) ?? '?'}
                    />
                </div>
                <MarkupHtmlView
                    markup={$locales.get(
                        (l) => l.moderation.moderate.explanation,
                    )}
                />
                {#each Object.entries(project.getFlags()) as [flag, state]}
                    <div class="flag">
                        <Checkbox
                            label="Whether the project has this property"
                            on={state === null ? undefined : state}
                            id={flag}
                            changed={(value) =>
                                (newFlags = withFlag(
                                    newFlags,
                                    flag,
                                    value === true,
                                ))}
                        />
                        <label for={flag}>
                            <MarkupHtmlView
                                markup={getFlagDescription(flag, $locales) ??
                                    ''}
                            /></label
                        >
                    </div>
                {/each}
                <div class="controls">
                    <Button
                        background
                        tip={$locales.get(
                            (l) => l.moderation.button.submit.tip,
                        )}
                        action={save}
                        >{$locales.get(
                            (l) => l.moderation.button.submit.label,
                        )}</Button
                    >
                    <Button
                        background
                        tip={$locales.get((l) => l.moderation.button.skip.tip)}
                        action={skip}
                        >{$locales.get(
                            (l) => l.moderation.button.skip.label,
                        )}</Button
                    >
                </div>
            {/if}
        </div>
        {#if lastBatch === undefined}<div class="big">✔</div
            >{:else if project === undefined}
            <Spinning label="" />
        {:else}
            <ProjectView
                {project}
                autofocus={false}
                editable={false}
                warn={false}
            />
        {/if}
    </div>
</Page>

<style>
    .moderate {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        width: 100%;
        height: 100%;
    }

    .flags {
        width: 25vw;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        border-right: var(--wordplay-focus-width) solid
            var(--wordplay-border-color);
        overflow-x: hidden;
        overflow-y: auto;
    }

    .flag {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: normal;
        font-size: medium;
    }

    .controls {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        margin-inline-start: auto;
    }

    .big {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        width: 100%;
        font-size: 120pt;
    }
</style>
