<svelte:options immutable={true} />

<script lang="ts">
    import { locales } from '@db/Database';
    import Toggle from './Toggle.svelte';

	export let menuItems: string[] = [];
    export let direction: 'up' | 'down' = 'down';
    export let onSelect: (value: string) => void = () => {};

    export let classes: string | undefined = undefined;

    let openUp = direction === 'up';

	let menuOpen = false;

    let dropdown: HTMLElement | undefined;
    const handleClickOutside = (event: any) => {
        if (dropdown && !dropdown.contains(event.target)) {
            menuOpen = false;
        }
    };
</script>

<svelte:window on:click={handleClickOutside} />

<section class="dropdown">
  <Toggle tips={$locales.get((l) => l.ui.source.toggle.glyphs)} on={menuOpen} toggle={() => (menuOpen = !menuOpen)}>
    <slot />
    {menuOpen === openUp ? `▲` : `▼`}
    </Toggle>
	
  <div id="myDropdown" class:openUp bind:this={dropdown} class:show={menuOpen} class="dropdown-content"
  >		
    {#each menuItems as item}
        <div on:click={() => {
            onSelect(item);
            menuOpen = false;
        }} 
        class="item">{item}</div>
    {/each}	
  </div>	
</section>
	
	
<style>		
.dropdown {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
	
.dropdown-content {
  display: none;
  position: absolute;
  background-color: var(--wordplay-alternating-color);
  border-radius: var(--wordplay-border-radius);
  z-index: 1;
  padding: calc(var(--wordplay-spacing) / 2);
  background-color: var(--wordplay-alternating-color);
  color: var(--wordplay-foreground);
  stroke: var(--wordplay-background);
  fill: var(--wordplay-background);
  box-shadow: inset 0px 1px var(--wordplay-chrome);
  min-width: 5em;
  margin-bottom: calc(var(--wordplay-spacing)/2);
  margin-top: calc(var(--wordplay-spacing)/2);
}

.dropdown-content.openUp {
    bottom: 100%;
}

/* Show the dropdown menu */	
.show {display:block;}	

.item {
  color: var(--wordplay-foreground);
  padding: calc(var(--wordplay-spacing) / 2);
  text-decoration: none;
  display: block;
  cursor: pointer;
  border-radius: var(--wordplay-border-radius);
}

.item:hover {
    background-color: var(--wordplay-focus-color);
    color: var(--wordplay-alternating-color);
}
</style>
