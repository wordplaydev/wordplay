<script lang="ts">
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Note from '@components/widgets/Note.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales, Logs } from '@db/Database';
    import {
        createFeedback,
        deleteFeedback,
        getFeedback,
        updateFeedback,
        type Feedback,
    } from '@db/feedback/FeedbackDatabase';
    import { isModerator } from '@db/projects/Moderation';
    import { CANCEL_SYMBOL, DEFECT_SYMBOL, IDEA_SYMBOL } from '@parser/Symbols';
    import Link from './Link.svelte';
    import Notice from './Notice.svelte';
    import Spinning from './Spinning.svelte';
    import Subheader from './Subheader.svelte';

    let mode: 'defect' | 'idea' = $state('defect');
    let title = $state('');
    let description = $state('');
    let show = $state(false);
    let submitting = $state(false);
    let error = $state(false);

    let feedback = $state<Feedback[] | undefined | null>(undefined);
    let defects = $derived(feedback?.filter((f) => f.type === 'defect'));
    let ideas = $derived(feedback?.filter((f) => f.type === 'idea'));
    let currentFeedback = $derived(mode === 'defect' ? defects : ideas);
    let expanded: boolean[] = $state([]);
    let votes = $state<Set<string>>(new Set());
    let newComments = $state<Record<string, string>>({});
    let githubURLs = $state<Record<string, string>>({});

    const user = getUser();

    let moderator = $state(false);
    $effect(() => {
        if ($user) isModerator($user).then((mod) => (moderator = mod));
    });

    $effect(() => {
        if (show || !submitting) loadFeedback(true);
    });

    function loadFeedback(reset: boolean = false) {
        getFeedback().then((f: Feedback[] | null) => {
            if (f === null) return;
            feedback = f?.toSorted((a, b) => a.created - b.created);
            for (const feed of feedback) {
                if (!(feed.id in githubURLs))
                    githubURLs[feed.id] = feed.github ?? '';
                if (!(feed.id in newComments)) newComments[feed.id] = '';
            }
            if (reset)
                expanded = feedback
                    ? new Array(feedback.length).fill(false)
                    : [];
        });
    }

    async function submit() {
        if ($user === null) return;
        submitting = true;

        const newFeedback = await createFeedback(
            $user.uid,
            title,
            description,
            mode,
            window.navigator.userAgent,
            window.location.href,
            mode === 'defect' ? Logs.join('\n') : '',
        );
        if (newFeedback === null) {
            error = true;
            submitting = false;
            return;
        }
        if (feedback) feedback.push(newFeedback);

        submitting = false;
        title = '';
        description = '';
        error = false;
    }

    async function vote(feed: Feedback) {
        const newFeedback = { ...feed, votes: feed.votes + 1 };
        const success = await updateFeedback(newFeedback);
        if (success && feedback) {
            votes.add(feed.id);
            feedback = feedback.map((f) =>
                f.id === feed.id ? newFeedback : f,
            );
        } else error = true;
    }

    async function close(feed: Feedback) {
        const newFeedback: Feedback = { ...feed, status: 'resolved' };
        const success = await updateFeedback(newFeedback);
        if (success && feedback)
            feedback = feedback.filter((f) => f.id !== feed.id);
        else error = true;
    }
</script>

{#snippet feedbackView(feed: Feedback, index: number)}
    <div class="feedback" class:expanded={expanded[index]}>
        <div
            role="button"
            class="header"
            tabindex="0"
            onpointerup={(event) =>
                event.button === 0 && (expanded[index] = !expanded[index])}
            onkeydown={(event) =>
                event.key === 'Enter' && (expanded[index] = !expanded[index])}
        >
            <Subheader>
                {feed.type === 'defect' ? DEFECT_SYMBOL : IDEA_SYMBOL}
                {#if feed.creator === $user?.uid || moderator}
                    <TextField
                        editable={!submitting}
                        bind:text={feed.title}
                        description={(l) =>
                            l.ui.dialog.feedback.field.title.description}
                        placeholder={(l) =>
                            l.ui.dialog.feedback.field.title.placeholder}
                        id="feedback-title-{feed.id}"
                        done={(t) => {
                            updateFeedback({ ...feed, ...{ title: t } });
                        }}
                        max="20em"
                    />
                {:else}
                    {feed.title}
                {/if}
            </Subheader>
            <div class="tools">
                {#if feed.github}
                    <Link to={feed.github} external>GitHub</Link>
                {/if}
                <Button
                    tip={(l) => l.ui.dialog.feedback.button.like}
                    icon="⭐️"
                    active={!votes.has(feed.id)}
                    action={() => vote(feed)}>{feed.votes}</Button
                >
                {#if feed.creator === $user?.uid || moderator}
                    <Button
                        tip={(l) => l.ui.dialog.feedback.button.close.tip}
                        icon="✓"
                        label={(l) => l.ui.dialog.feedback.button.close.label}
                        action={() => close(feed)}
                    ></Button>
                    <ConfirmButton
                        icon={CANCEL_SYMBOL}
                        tip={(l) =>
                            l.ui.dialog.feedback.button.delete.description}
                        prompt={(l) =>
                            l.ui.dialog.feedback.button.delete.prompt}
                        action={async () => {
                            await deleteFeedback(feed.id);
                            loadFeedback();
                        }}
                    ></ConfirmButton>
                {/if}
            </div>
        </div>
        {#if expanded[index]}
            {#if moderator}
                <Note>
                    <table>
                        <tbody>
                            {#if feed.logs.trim().length > 0}
                                <tr>
                                    <td>Logs</td>
                                    <td>
                                        <ul>
                                            {#each feed.logs.split('\n') as log}
                                                <li>{log}</li>
                                            {/each}
                                        </ul>
                                    </td>
                                </tr>
                            {/if}
                            {#if feed.type === 'defect'}
                                <tr>
                                    <td>user agent</td>
                                    <td>{feed.browser}</td>
                                </tr>
                            {/if}
                            <tr>
                                <td>url</td>
                                <td>{feed.url}</td>
                            </tr>
                            <tr>
                                <td>github</td>
                                <td>
                                    <TextField
                                        bind:text={githubURLs[feed.id]}
                                        description={(l) =>
                                            l.ui.dialog.feedback.field.github
                                                .description}
                                        placeholder={(l) =>
                                            l.ui.dialog.feedback.field.github
                                                .placeholder}
                                        id="new-github-{feed.id}"
                                        validator={(t) => {
                                            return t === '' ||
                                                t.startsWith(
                                                    'https://github.com/wordplaydev/wordplay/issues/',
                                                )
                                                ? true
                                                : (l) =>
                                                      l.ui.dialog.feedback.error
                                                          .url;
                                        }}
                                        done={(t) => {
                                            if ($user === null) return;
                                            updateFeedback({
                                                ...feed,
                                                github:
                                                    t.length === 0 ? null : t,
                                            });
                                            loadFeedback();
                                        }}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </Note>
            {/if}
            {#if feed.creator === $user?.uid || moderator}
                {#if mode === 'defect'}
                    <TextBox
                        bind:text={feed.description}
                        description={(l) =>
                            l.ui.dialog.feedback.field.defect.description}
                        placeholder={(l) =>
                            l.ui.dialog.feedback.field.defect.placeholder}
                        id={'defect-description'}
                        done={(t) => {
                            updateFeedback({ ...feed, ...{ description: t } });
                        }}
                    />
                {:else}
                    <TextBox
                        active={!submitting}
                        bind:text={feed.description}
                        description={(l) =>
                            l.ui.dialog.feedback.field.idea.description}
                        placeholder={(l) =>
                            l.ui.dialog.feedback.field.idea.placeholder}
                        id={'idea-description'}
                        done={(t) => {
                            updateFeedback({ ...feed, ...{ description: t } });
                        }}
                    />
                {/if}
            {:else}
                {#each feed.description.split('\n') as paragraph}
                    <p>{paragraph}</p>
                {/each}
            {/if}

            {#each feed.comments.toSorted((a, b) => a.created - b.created) as comment, commentIndex}
                <div class="header">
                    <div class="comment" class:moderator={comment.moderator}>
                        <Note
                            >{#if comment.moderator}<LocalizedText
                                    path={(l) =>
                                        l.ui.dialog.feedback.subheader
                                            .moderator}
                                />{/if}
                        </Note>
                        {#if ($user && comment.creator === $user?.uid) || moderator}
                            <TextField
                                editable={!submitting}
                                bind:text={comment.text}
                                description={(l) =>
                                    l.ui.dialog.feedback.field.idea.description}
                                placeholder={(l) =>
                                    l.ui.dialog.feedback.field.idea.placeholder}
                                id="new-comment-{feed.id}-{commentIndex}"
                                done={(t) => {
                                    if ($user === null) return;
                                    updateFeedback({
                                        ...feed,
                                        comments: [
                                            ...feed.comments,
                                            {
                                                creator: $user.uid,
                                                text: t,
                                                created: Date.now(),
                                                moderator,
                                            },
                                        ],
                                    });
                                }}
                            />
                        {:else}
                            {#each comment.text.split('\n') as paragraph}
                                <p>{paragraph}</p>
                            {/each}
                        {/if}
                        <div class="tools">
                            {#if moderator || comment.creator === $user?.uid}
                                <ConfirmButton
                                    icon={CANCEL_SYMBOL}
                                    tip={(l) =>
                                        l.ui.dialog.feedback.button.delete
                                            .description}
                                    prompt={(l) =>
                                        l.ui.dialog.feedback.button.delete
                                            .prompt}
                                    action={async () => {
                                        await updateFeedback({
                                            ...feed,
                                            comments: feed.comments.filter(
                                                (_, index) =>
                                                    index !== commentIndex,
                                            ),
                                        });
                                        loadFeedback();
                                    }}
                                ></ConfirmButton>
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}
            {#if $user}
                <div class="comment">
                    <TextField
                        bind:text={newComments[feed.id]}
                        description={(l) =>
                            l.ui.dialog.feedback.field.comment.description}
                        placeholder={(l) =>
                            l.ui.dialog.feedback.field.comment.placeholder}
                        id="new-comment-{feed.id}"
                    />
                    <Button
                        tip={(l) => l.ui.dialog.feedback.button.comment.tip}
                        label={(l) => l.ui.dialog.feedback.button.comment.label}
                        background
                        action={async () => {
                            updateFeedback({
                                ...feed,
                                comments: [
                                    ...feed.comments,
                                    {
                                        creator: $user.uid,
                                        text: newComments[feed.id] ?? '',
                                        created: Date.now(),
                                        moderator,
                                    },
                                ],
                            });
                            loadFeedback();
                            newComments[feed.id] = '';
                        }}
                    ></Button>
                </div>
            {/if}
        {/if}
    </div>

    <style>
        .feedback {
            padding: var(--wordplay-spacing);
            border: var(--wordplay-border-color) solid
                var(--wordplay-border-width);
            background-color: var(--color-background);
            border-radius: var(--wordplay-border-radius);
            transition: max-height calc(var(--animation-factor) * 100ms);
            max-height: 5em;
            overflow: hidden;
        }

        .feedback.expanded {
            max-height: 100vh;
            overflow: auto;
        }

        .comment {
            width: 100%;
            padding: var(--wordplay-spacing);
            border-left: var(--wordplay-border-color) solid
                var(--wordplay-focus-width);
            background-color: var(--color-background);
            padding-inline-start: 1em;
            margin-inline-start: 1em;
            margin-block-start: 1em;
            display: flex;
            flex-direction: row;
            align-items: baseline;
            gap: var(--wordplay-spacing);
        }

        .comment.moderator {
            background-color: var(--wordplay-alternating-color);
        }

        .header {
            display: flex;
            align-items: baseline;
            gap: var(--wordplay-spacing);
            cursor: pointer;
            border-radius: var(--wordplay-border-radius);
        }
        .tools {
            display: flex;
            flex-direction: row;
            gap: var(--wordplay-spacing);
            margin-left: auto;
        }
    </style>
{/snippet}

<Dialog
    bind:show
    header={(l) => l.ui.dialog.feedback.header}
    explanation={(l) => l.ui.dialog.feedback.explanation}
    button={{
        tip: (l) => l.ui.dialog.feedback.button.show,
        icon: `${IDEA_SYMBOL}/${DEFECT_SYMBOL}`,
    }}
>
    <Mode
        choice={mode === 'defect' ? 0 : 1}
        modes={[
            `${DEFECT_SYMBOL} ${$locales.get((l) => l.ui.dialog.feedback.subheader.defect)}`,
            `${IDEA_SYMBOL} ${$locales.get((l) => l.ui.dialog.feedback.subheader.idea)}`,
        ]}
        descriptions={(l) => l.ui.dialog.feedback.mode}
        select={(num) => (mode = num === 0 ? 'defect' : 'idea')}
    />

    {#if currentFeedback === undefined}
        <Spinning />
    {:else if currentFeedback === null}
        <Notice text={(l) => l.ui.dialog.feedback.error.load}></Notice>
    {:else}
        <div class="feedback-list">
            {#if currentFeedback.length === 0}
                <Notice text={(l) => l.ui.dialog.feedback.error.empty}></Notice>
            {:else}
                {#each currentFeedback as f, index}{@render feedbackView(
                        f,
                        index,
                    )}{/each}
            {/if}
        </div>
    {/if}

    {#if $user === null}
        <Notice text={(l) => l.ui.dialog.feedback.error.login}></Notice>
    {:else}
        {#if currentFeedback !== undefined && currentFeedback !== null && currentFeedback.length > 0}
            {#if mode === 'defect'}
                <MarkupHtmlView
                    markup={(l) => l.ui.dialog.feedback.prompt.defect}
                />
            {:else}
                <MarkupHtmlView
                    markup={(l) => l.ui.dialog.feedback.prompt.idea}
                />
            {/if}
        {/if}

        <Subheader>
            <TextField
                editable={!submitting}
                bind:text={title}
                description={(l) =>
                    l.ui.dialog.feedback.field.title.description}
                placeholder={(l) =>
                    l.ui.dialog.feedback.field.title.placeholder}
                id={'feedback-title'}
                done={(t) => (title = t)}
                max="20em"
            />
        </Subheader>

        {#if mode === 'defect'}
            <TextBox
                active={!submitting}
                bind:text={description}
                description={(l) =>
                    l.ui.dialog.feedback.field.defect.description}
                placeholder={(l) =>
                    l.ui.dialog.feedback.field.defect.placeholder}
                id={'defect-description'}
                done={(t) => (description = t)}
            />
        {:else}
            <TextBox
                active={!submitting}
                bind:text={description}
                description={(l) => l.ui.dialog.feedback.field.idea.description}
                placeholder={(l) => l.ui.dialog.feedback.field.idea.placeholder}
                id={'idea-description'}
                done={(t) => (description = t)}
            />
        {/if}

        <Button
            background
            active={!submitting && title.length > 0 && description.length > 0}
            tip={(l) => l.ui.dialog.feedback.button.submit.tip}
            icon={mode === 'defect' ? DEFECT_SYMBOL : IDEA_SYMBOL}
            label={(l) => l.ui.dialog.feedback.button.submit.label}
            action={submit}
        ></Button>

        {#if error}
            <Notice text={(l) => l.ui.dialog.feedback.error.submit}></Notice>
        {/if}
    {/if}
</Dialog>

<style>
    .feedback-list {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-top: 1em;
        margin-bottom: 1em;
        max-width: 40em;
    }
</style>
