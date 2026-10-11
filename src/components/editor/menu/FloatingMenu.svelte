<!--
    The edit menu for an editor that isn't in a ProjectView, which is what
    otherwise shows it. Without a host, every menu trigger — autocomplete, and
    nearly every control in blocks mode — opens nothing.

    Laid over the viewport rather than inside the editor's box, so a menu opened in
    a small example is clamped to the window instead of clipped by the example.
    Moved to <body>, because an example's `container-type` makes it the containing
    block of anything fixed inside it, which put the menu off screen.
-->
<script lang="ts">
    import Menu from '#components/editor/menu/Menu.svelte';
    import { anchorMenu } from '#components/editor/menu/menuAnchor.ts';
    import type { MenuPosition } from '#components/editor/menu/menuPlacement.ts';
    import type MenuInfo from '#edit/menu/Menu.ts';

    interface Props {
        /** The editor's menu, bound to its `menu` */
        menu: MenuInfo | undefined;
        /** The element containing the editor the menu belongs to */
        scope: HTMLElement | undefined;
    }

    let { menu = $bindable(), scope }: Props = $props();

    let position = $state<MenuPosition | undefined>(undefined);

    function place() {
        const editor = scope?.querySelector('.editor');
        position =
            menu === undefined || editor === null || editor === undefined
                ? undefined
                : anchorMenu(
                      menu,
                      editor,
                      { left: 0, top: 0 },
                      { width: window.innerWidth, height: window.innerHeight },
                  );
    }

    $effect(() => {
        menu;
        place();
    });

    function portalToBody(node: HTMLElement) {
        document.body.appendChild(node);
        return {
            destroy() {
                node.remove();
            },
        };
    }
</script>

<!-- Capture scrolls anywhere, since the page and any scroller around the editor both move the anchor. -->
<svelte:window
    onresize={menu ? place : undefined}
    onscrollcapture={menu ? place : undefined}
/>

{#if menu && position}
    <div class="floating" use:portalToBody>
        <Menu bind:menu hide={() => (menu = undefined)} {position} />
    </div>
{/if}

<style>
    .floating {
        position: fixed;
        inset: 0;
        pointer-events: none;
        /* Above the page's own floating chrome, as the menu is in a project. */
        z-index: 10;
    }

    .floating > :global(*) {
        pointer-events: auto;
    }
</style>
