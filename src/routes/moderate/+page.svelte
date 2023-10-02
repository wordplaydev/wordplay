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
        cloneFlags,
        getFlagDescription,
        isModerator,
        withFlag,
    } from '../../models/Moderation';
    import Project, { type SerializedProject } from '../../models/Project';
    import { Locales, Projects } from '../../db/Database';
    import { writable } from 'svelte/store';
    import { locale } from '../../db/Database';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import Button from '../../components/widgets/Button.svelte';
    import type { Flag, Moderation } from '../../models/Moderation';
    import Spinning from '../../components/app/Spinning.svelte';

    const user = getUser();

    /** Moderator if the user's "mod" custom claim is true */
    let moderator: boolean | undefined = undefined;
    $: if ($user) isModerator($user).then((mod) => (moderator = mod));
    else moderator = false;

    /** Null means haven't started, undefined means reached the end. */
    let lastBatch: QueryDocumentSnapshot<DocumentData> | null | undefined =
        null;
    let project: Project | undefined = undefined;

    let newFlags: Moderation;

    onMount(async () => {
        try {
            await nextBatch();
        } catch (_) {
            moderator = false;
        }
    });

    // Create a concept path for children
    setContext(ConceptPathSymbol, writable([]));

    async function nextBatch() {
        if (firestore === undefined) return firestore;
        const unmoderated = query(
            collection(firestore, 'projects'),
            // Construct a query for each flag to find any project that has a null flag.
            and(
                where('public', '==', true),
                or(
                    ...Array.from(Object.keys(Flags)).map((flag) =>
                        where(new FieldPath('flags', flag), '==', null)
                    )
                )
            ),
            orderBy('timestamp'),
            ...(lastBatch ? [startAfter(lastBatch)] : []),
            limit(1)
        );
        const documentSnapshots = await getDocs(unmoderated);

        // Remember the last document.
        lastBatch = documentSnapshots.docs[documentSnapshots.docs.length - 1];

        // Convert the docs to galleries
        project = await documentSnapshots.docs.map((snap) =>
            Project.deserializeProject(
                Locales,
                snap.data() as SerializedProject
            )
        )[0];
        if (project) newFlags = cloneFlags(project.flags);
    }

    function save() {
        for (const [flag, state] of Object.entries(newFlags))
            if (state === null) newFlags[flag as Flag] = false;

        // Save the project with the new flags.
        if (project) Projects.edit(project.withFlags(newFlags), false, true);

        skip();
    }

    function skip() {
        nextBatch();
    }
</script>

<Page>
    <div class="moderate">
        <div class="flags">
            <Header>{$locale.moderation.moderate.header}</Header>
            {#if lastBatch === null}
                <Spinning label="" />
            {:else if moderator === false}
                <p
                    >It looks like you're not a moderator. Do you want to become
                    one?</p
                >
            {:else if lastBatch === undefined}
                <p>Nothing else to moderate!</p>
            {:else if project === undefined}
                <Spinning label="" />
            {:else}
                <MarkupHtmlView
                    markup={$locale.moderation.moderate.explanation}
                />
                {#each Object.entries(project.flags) as [flag, state]}
                    <div class="flag">
                        <Checkbox
                            on={state === null ? undefined : state}
                            changed={(value) =>
                                (newFlags = withFlag(
                                    newFlags,
                                    flag,
                                    value === true
                                ))}
                        />
                        <MarkupHtmlView
                            markup={getFlagDescription(flag, $locale) ?? ''}
                        />
                    </div>
                {/each}
                <div class="controls">
                    <Button
                        background
                        tip={$locale.moderation.button.submit.tip}
                        action={save}
                        >{$locale.moderation.button.submit.label}</Button
                    >
                    <Button
                        background
                        tip={$locale.moderation.button.skip.tip}
                        action={skip}
                        >{$locale.moderation.button.skip.label}</Button
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
                playing={false}
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
        align-items: center;
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
