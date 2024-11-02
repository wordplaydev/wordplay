<script lang="ts">
    import { run } from 'svelte/legacy';

    import type Project from '@models/Project';
    import Evaluator from '@runtime/Evaluator';
    import { DB, locales } from '../../db/Database';
    import { isAudience, isFlagged } from '../../models/Moderation';
    import { getUser } from '../project/Contexts';
    import Link from './Link.svelte';
    import { navigating } from '$app/stores';
    import Spinning from './Spinning.svelte';
    import { toStage } from '@output/Stage';
    import { EXCEPTION_SYMBOL } from '@parser/Symbols';
    import Fonts from '@basis/Fonts';
    import { getFaceCSS } from '@output/outputToCSS';
    import UnicodeString from '@models/UnicodeString';
    import ExceptionValue from '@values/ExceptionValue';

    
    
    
    interface Props {
        project: Project;
        action?: (() => void) | undefined;
        /** Whether to show the project's name. */
        name?: boolean;
        /** How many rems the preview square should be. */
        size?: number;
        /** The link to go to when clicked. If none is provided, goes to the project. */
        link?: string | undefined;
        children?: import('svelte').Snippet;
    }

    let {
        project,
        action = undefined,
        name = true,
        size = 6,
        link = undefined,
        children
    }: Props = $props();

    // Clone the project and get its initial value, then stop the project's evaluator.
    let representativeForeground: string | null = $state(null);
    let representativeBackground: string | null = $state(null);
    let representativeFace: string | null = $state(null);
    let representativeText: string = $state("...");

    function updatePreview() {
        const evaluator = new Evaluator(
            project,
            DB,
            $locales.getLocales(),
            false,
        );
        const value = evaluator.getInitialValue();
        evaluator.stop();
        const stage = value ? toStage(evaluator, value) : undefined;
        if (stage && stage.face) Fonts.loadFace(stage.face);

        [
            representativeFace,
            representativeForeground,
            representativeBackground,
            representativeText,
        ] = [
            stage ? getFaceCSS(stage.face) : null,
            stage
                ? stage.pose.color?.toCSS() ?? null
                : 'var(--wordplay-evaluation-color)',
            stage
                ? stage.back.toCSS()
                : value instanceof ExceptionValue || value === undefined
                  ? 'var(--wordplay-error)'
                  : null,
            stage
                ? new UnicodeString(stage.getRepresentativeText($locales))
                      .substring(0, 1)
                      .toString()
                : value
                  ? value.getRepresentativeText($locales)
                  : EXCEPTION_SYMBOL,
        ];
    }

    const user = getUser();

    run(() => {
        if (project) updatePreview();
    });
    let path = $derived(link ?? project.getLink(true));
    /** See if this is a public project being viewed by someone who isn't a creator or collaborator */
    let audience = $derived(isAudience($user, project));
</script>

<div class="project" class:named={name}>
    <a
        class="preview"
        data-testid="preview"
        data-sveltekit-preload-data="tap"
        style:width={`${size}rem`}
        style:height={`${size}rem`}
        href={action ? undefined : path}
        onclick={(event) =>
            action && event.button === 0 ? action() : undefined}
        onkeydown={(event) =>
            action && (event.key === '' || event.key === 'Enter')
                ? action()
                : undefined}
    >
        <div
            class="output"
            role="presentation"
            style:background={representativeBackground}
            style:color={representativeForeground}
            style:font-family={representativeFace}
            style:font-size={`${Math.max(4, size - 3)}rem`}
            class:blurred={audience && isFlagged(project.getFlags())}
        >
            {representativeText}
        </div>
    </a>
    {#if name}
        <div class="name"
            >{#if action}{project.getName()}{:else}<Link to={path}
                    >{#if project.getName().length === 0}<em class="untitled"
                            >&mdash;</em
                        >{:else}
                        {project.getName()}{/if}</Link
                >{#if $navigating && `${$navigating.to?.url.pathname}${$navigating.to?.url.search}` === path}
                    <Spinning />{:else}{@render children?.()}{/if}{/if}</div
        >{/if}
</div>

<style>
    .project {
        border: var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .project.named {
        min-width: 12em;
    }

    .output {
        display: flex;
        /** For some reason this is necessary for keeping the glyph centered. */
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: var(--wordplay-background);
        text-decoration: none;
        color: var(--wordplay-foreground);
    }

    a {
        text-decoration: none;
    }

    .name {
        display: flex;
        flex-direction: column;
    }

    .untitled {
        color: var(--wordplay-inactive-color);
    }

    .preview {
        transition: transform ease-out;
        transition-duration: calc(var(--animation-factor) * 200ms);
        background: var(--wordplay-inactive-color);
    }

    .project .preview:hover,
    .project:focus .preview {
        transform: scale(1.05);
    }

    .preview {
        cursor: pointer;
        overflow: hidden;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }

    .preview:hover {
        border-color: var(--wordplay-highlight-color);
        border-width: var(--wordplay-focus-width);
    }

    .blurred {
        filter: blur(10px);
    }
</style>
