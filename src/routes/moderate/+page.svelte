<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Page from '@components/app/Page.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import ProjectView from '@components/project/ProjectView.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Markup from '@nodes/Markup';
    import {
        FieldPath,
        and,
        collection,
        getDocs,
        limit,
        or,
        orderBy,
        query,
        startAfter,
        where,
        type DocumentData,
        type QueryDocumentSnapshot,
    } from 'firebase/firestore';
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import Spinning from '../../components/app/Spinning.svelte';
    import { getUser, setConceptPath } from '../../components/project/Contexts';
    import Button from '../../components/widgets/Button.svelte';
    import { Projects, locales } from '../../db/Database';
    import { firestore } from '../../db/firebase';
    import type { Flag, Moderation } from '../../db/projects/Moderation';
    import {
        Flags,
        getFlagDescription,
        isModerator,
        unknownFlags,
        withFlag,
    } from '../../db/projects/Moderation';
    import type Project from '../../db/projects/Project';
    import { ProjectsCollection } from '../../db/projects/ProjectsDatabase.svelte';

    const user = getUser();

    /** Moderator if the user's "mod" custom claim is true */
    let moderator: boolean | undefined = $state(undefined);
    $effect(() => {
        if ($user) {
            isModerator($user).then((mod) => {
                moderator = mod;
            });
        } else {
            moderator = false;
        }
    });

    /** Null means haven't started, undefined means reached the end. */
    let lastBatch: QueryDocumentSnapshot<DocumentData> | null | undefined =
        $state(null);
    let project: Project | undefined = $state(undefined);

    let newFlags: Moderation | undefined = $state();

    let moderatedCount = $state(0);
    let unmoderatedCount = $state(0);
    onMount(async () => {
        try {
            await nextBatch();
        } catch (error) {
            console.error(error);
            lastBatch = undefined;
        }
    });

    // Create a concept path for children
    setConceptPath(writable([]));

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
        if (newFlags === undefined) return;
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
            <Header text={(l) => l.moderation.moderate.header} />
            {#if lastBatch === null}
                <Spinning />
            {:else if moderator === false}
                <p><LocalizedText path={(l) => l.moderation.error.notmod} /></p>
            {:else if lastBatch === undefined}
                <p><LocalizedText path={(l) => l.moderation.done} /></p>
            {:else if project === undefined}
                <Spinning />
            {:else}
                <div class="progress-counter">
                    <MarkupHTMLView
                        markup={Markup.words(
                            $locales.get((l) => l.moderation.progress),
                        ).concretize($locales, [
                            moderatedCount,
                            unmoderatedCount,
                        ]) ?? '?'}
                    />
                </div>
                <MarkupHTMLView
                    markup={(l) => l.moderation.moderate.explanation}
                />
                {#each Object.entries(project.getFlags()) as [flag, state]}
                    <div class="flag">
                        <Checkbox
                            label={(l) => l.moderation.button.property}
                            on={state === null ? undefined : state}
                            id={flag}
                            changed={(value) =>
                                (newFlags = withFlag(
                                    newFlags ?? unknownFlags(),
                                    flag,
                                    value === true,
                                ))}
                        />
                        <label for={flag}>
                            <MarkupHTMLView
                                markup={getFlagDescription(flag, $locales) ??
                                    ''}
                            /></label
                        >
                    </div>
                {/each}
                <div class="controls">
                    <Button
                        background
                        tip={(l) => l.moderation.button.submit.tip}
                        action={save}
                        label={(l) => l.moderation.button.submit.label}
                    />
                    <Button
                        background
                        tip={(l) => l.moderation.button.skip.tip}
                        action={skip}
                        label={(l) => l.moderation.button.skip.label}
                    />
                </div>
            {/if}
        </div>
        {#if lastBatch === undefined}<div class="big">✔</div
            >{:else if project === undefined}
            <Spinning />
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
