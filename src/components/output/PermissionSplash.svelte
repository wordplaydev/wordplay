<script lang="ts">
    import { locales } from '@db/Database';
    import {
        AllPermissions,
        Permission,
        type PermissionName,
    } from '@input/permissions';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { withMonoEmoji } from '@unicode/emoji';

    interface Props {
        permissions: Set<PermissionName>;
        onstart: () => void;
        mini?: boolean;
    }

    let { permissions, onstart, mini = false }: Props = $props();

    const ordered = $derived(AllPermissions.filter((p) => permissions.has(p)));

    function emojiFor(p: PermissionName) {
        return withMonoEmoji(p === Permission.Microphone ? '🎤' : '📷');
    }
</script>

<div class="permission-splash" class:mini data-uiid="permission-splash">
    <div class="card">
        <h2>
            <LocalizedText path={(l) => l.ui.output.permission.title} />
        </h2>
        <ul>
            {#each ordered as permission (permission)}
                <li>
                    <span class="emoji" aria-hidden="true"
                        >{emojiFor(permission)}</span
                    >
                    <span>
                        <LocalizedText
                            path={(l) => l.ui.output.permission[permission]}
                        />
                    </span>
                </li>
            {/each}
        </ul>
        <Button
            tip={(l) => l.ui.output.permission.start}
            action={() => onstart()}
            background
            testid="permission-start"
        >
            {$locales.getPlainText((l) => l.ui.output.permission.start)}
        </Button>
        <p class="note">
            <LocalizedText path={(l) => l.ui.output.permission.note} />
        </p>
    </div>
</div>

<style>
    .permission-splash {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--wordplay-background);
        z-index: 2;
        padding: 1em;
    }

    .card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1em;
        max-width: 24em;
        text-align: center;
    }

    h2 {
        margin: 0;
        font-size: 1.2em;
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5em;
    }

    li {
        display: flex;
        align-items: center;
        gap: 0.5em;
        font-size: 1em;
    }

    .emoji {
        font-size: 1.4em;
    }

    .note {
        font-size: 0.85em;
        opacity: 0.7;
        margin: 0;
    }

    .mini h2 {
        font-size: 1em;
    }

    .mini .card {
        gap: 0.5em;
    }

    .mini .note {
        display: none;
    }
</style>
