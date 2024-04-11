<svelte:options immutable={true} />

<script context="module" lang="ts">
    enum SelectActions {
      Close = 0,
      CloseSelect = 1,
      First = 2,
      Last = 3,
      Next = 4,
      Open = 5,
      PageDown = 6,
      PageUp = 7,
      Previous = 8,
      Select = 9,
      Type = 10,
    }
</script>

<script lang="ts">
  import { locales } from '@db/Database';
  import Toggle from './Toggle.svelte';

  export let direction: 'up' | 'down' = 'down';
  export let onSelect: (option: string) => void = () => {};
  export let options:string[] = [];
  export let value: string = options[0];
  export let fill: boolean = false;

  let optionRefs: HTMLElement[] = [];

  let openUp = direction === 'up';
  let activeIndex = 0;
  let menuOpen = false;
  let searchString = '';
  let searchTimeout: number | undefined = undefined;

  let listBox: HTMLElement | undefined;
  let comboBox: HTMLElement | undefined;
  const handleClickOutside = (event: any) => {
      if (listBox && !listBox.contains(event.target)) {
          menuOpen = false;
      }
  };

  // filter an array of menuItems against an input string
  // returns an array of menuItems that begin with the filter string, case-independent
  const filtermenuItems = (menuItems: string[], filter: string, exclude?: string[]) => {
    
    return menuItems.filter((option) => {
      
      const matches = option.toLowerCase().indexOf(filter.toLowerCase()) === 0;
      return exclude ? (matches && exclude.indexOf(option) < 0) : matches;
    });
  }

  // map a key press to an action
  const getActionFromKey = (event: KeyboardEvent, menuOpen: boolean): SelectActions | undefined => {
    const { key, altKey, ctrlKey, metaKey } = event;
    const openKeys = ['ArrowDown', 'ArrowUp', 'Enter', ' ']; // all keys that will do the default open action
    // handle opening when closed
    if (!menuOpen && openKeys.includes(key)) {
      return SelectActions.Open;
    }

    // home and end move the selected option when open or closed
    if (key === 'Home') {
      return SelectActions.First;
    }
    if (key === 'End') {
      return SelectActions.Last;
    }

    // handle typing characters when open or closed
    if (
      key === 'Backspace' ||
      key === 'Clear' ||
      (key.length === 1 && key !== ' ' && !altKey && !ctrlKey && !metaKey)
    ) {
      return SelectActions.Type;
    }

    // handle keys when open
    if (menuOpen) {
      if (key === 'ArrowUp' && altKey) {
        return SelectActions.CloseSelect;
      } else if (key === 'ArrowDown' && !altKey) {
        return SelectActions.Next;
      } else if (key === 'ArrowUp') {
        return SelectActions.Previous;
      } else if (key === 'PageUp') {
        return SelectActions.PageUp;
      } else if (key === 'PageDown') {
        return SelectActions.PageDown;
      } else if (key === 'Escape') {
        return SelectActions.Close;
      } else if (key === 'Enter' || key === ' ') {
        return SelectActions.CloseSelect;
      }
    }
  }

  // return the index of an option from an array of menuItems, based on a search string
  // if the filter is multiple iterations of the same letter (e.g "aaa"), then cycle through first-letter matches
  const getIndexByLetter = (menuItems: string[], filter: string, startIndex: number = 0): number => {
    const orderedmenuItems = [
      ...menuItems.slice(startIndex),
      ...menuItems.slice(0, startIndex),
    ];
    console.log(filter);
    
    const firstMatch = filtermenuItems(orderedmenuItems, filter)[0];
    const allSameLetter = (array: string[]) => array.every((letter) => letter === array[0]);

    // first check if there is an exact match for the typed string
    if (firstMatch) {
      return menuItems.indexOf(firstMatch);
    }

    // if the same letter is being repeated, cycle through first-letter matches
    else if (allSameLetter(filter.split(''))) {
      const matches = filtermenuItems(orderedmenuItems, filter[0]);
      return menuItems.indexOf(matches[0]);
    }

    // if no matches, return -1
    else {
      return -1;
    }
  }
  // get an updated option index after performing an action
  const getUpdatedIndex = (currentIndex: number, maxIndex: number, action: SelectActions): number => {
    const pageSize = 10; // used for pageup/pagedown

    switch (action) {
      case SelectActions.First:
        return 0;
      case SelectActions.Last:
        return maxIndex;
      case SelectActions.Previous:
        return Math.max(0, currentIndex - 1);
      case SelectActions.Next:
        return Math.min(maxIndex, currentIndex + 1);
      case SelectActions.PageUp:
        return Math.max(0, currentIndex - pageSize);
      case SelectActions.PageDown:
        return Math.min(maxIndex, currentIndex + pageSize);
      default:
        return currentIndex;
    }
  }

  // check if element is visible in browser view port
  const isElementInView = (element: HTMLElement): boolean => {
    const bounding = element.getBoundingClientRect();

    return (
      bounding.top >= 0 &&
      bounding.left >= 0 &&
      bounding.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      bounding.right <=
        (window.innerWidth || document.documentElement.clientWidth)
    );
  };

  // check if an element is currently scrollable
  const isScrollable = (element: HTMLElement) => {
    return element && element.clientHeight < element.scrollHeight;
  }

  const maintainScrollVisibility = (activeElement: HTMLElement, scrollParent: HTMLElement): void => {
    const { offsetHeight, offsetTop } = activeElement;
    const { offsetHeight: parentOffsetHeight, scrollTop } = scrollParent;

    const isAbove = offsetTop < scrollTop;
    const isBelow = offsetTop + offsetHeight > scrollTop + parentOffsetHeight;

    if (isAbove) {
      scrollParent.scrollTo(0, offsetTop);
    } else if (isBelow) {
      scrollParent.scrollTo(0, offsetTop - parentOffsetHeight + offsetHeight);
    }
  };

  const getSearchString = (char: string): string => {
    // reset typing timeout and start new timeout
    // this allows us to make multiple-letter matches, like a native select
    window.clearTimeout(searchTimeout);

    searchTimeout = window.setTimeout(() => {
      searchString = '';
    }, 500);

    // add most recent letter to saved search string
    searchString += char;
    return searchString;
  };

  const onComboBlur = (event: FocusEvent) => {
    // select current option and close
    if (menuOpen) {
      selectOption(activeIndex);
      updateMenuState(false, false);
    }
  };

  const onComboKeyDown = (event: KeyboardEvent) => {
    const { key } = event;
    const max = options.length - 1;

    const action = getActionFromKey(event, menuOpen);

    switch (action) {
      case SelectActions.Last:
      case SelectActions.First:
        updateMenuState(true);
      // intentional fallthrough
      case SelectActions.Next:
      case SelectActions.Previous:
      case SelectActions.PageUp:
      case SelectActions.PageDown:
        event.preventDefault();
        return onOptionChange(
          getUpdatedIndex(activeIndex, max, action)
        );
      case SelectActions.CloseSelect:
        event.preventDefault();
        selectOption(activeIndex);
      // intentional fallthrough
      case SelectActions.Close:
        event.preventDefault();
        return updateMenuState(false);
      case SelectActions.Type:
        return onComboType(key);
      case SelectActions.Open:
        event.preventDefault();
        return updateMenuState(true);
    }
  };

  const onComboType = (letter: string) => {
    // open the listbox if it is closed
    updateMenuState(true);

    // find the index of the first matching option
    searchString = getSearchString(letter);
    
    const searchIndex = getIndexByLetter(
      options,
      searchString,
      activeIndex + 1
    );

    // console.log(searchIndex, searchString, options, activeIndex + 1);
    

    // if a match was found, go to it
    if (searchIndex >= 0) {
      onOptionChange(searchIndex);
    }
    // if no matches, clear the timeout and search string
    else {
      window.clearTimeout(searchTimeout);
      searchString = '';
    }
  };

  const onOptionChange = (index: number) => {
    // update state
    activeIndex = index;

    // ensure the new option is in view
    if (listBox && isScrollable(listBox)) {
      maintainScrollVisibility(optionRefs[index], listBox);
    }

    // ensure the new option is visible on screen
    // ensure the new option is in view
    if (!isElementInView(optionRefs[index])) {
      optionRefs[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const onOptionClick = (index: number) => {
    onOptionChange(index);
    selectOption(index);
    updateMenuState(false);
  };

  const selectOption = (index: number) => {
    // update state
    activeIndex = index;

    // update displayed value
    const selected = options[index];
    value = selected;

    // update aria-selected
    optionRefs.forEach((optionEl) => {
      optionEl.setAttribute('aria-selected', 'false');
    });
    optionRefs[index].setAttribute('aria-selected', 'true');
  };

  const updateMenuState = (open: boolean, callFocus = true) => {
    if (menuOpen === open) {
      return;
    }

    // update state
    menuOpen = open;

    if (comboBox && !isElementInView(comboBox)) {
      comboBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // move focus back to the combobox, if needed
    callFocus && focus();
  };
</script>

<svelte:window on:click={handleClickOutside} />

<section class="dropdown" class:fill>
  <div bind:this={comboBox} class:fill>
    <Toggle 
      tips={$locales.get((l) => l.ui.source.toggle.glyphs)} 
      on={menuOpen} 
      fill={fill}
      toggle={() => (menuOpen = !menuOpen)}
      onBlur={onComboBlur}
      onKeyDown={onComboKeyDown}
      >
      <div class="toggleInner">
        <span>{options[activeIndex]}</span>
        <span>{menuOpen === openUp ? `▲` : `▼`}</span>
      </div>
    </Toggle>
  </div>
	
  <div id="myDropdown" class:openUp bind:this={listBox} class:show={menuOpen} class="dropdown-content"
  >		
    {#each options as item, i}
        <button 
          bind:this={optionRefs[i]}
          on:click={() => {
            onOptionClick(i);
            menuOpen = false;
            value = item;
          }}
          class="item"
          class:active={i === activeIndex}
          >
          {item}
        </button>
    {/each}	
  </div>	
</section>
	
	
<style>		
.fill {
  width: 100%;
}

.toggleInner {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

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

button {
  background: none;
	color: inherit;
	border: none;
	padding: 0;
	font: inherit;
	cursor: pointer;
	outline: inherit;
}

/* Show the dropdown menu */	
.show {
  display:block;
  overflow-y: scroll;
  max-height: 200px;
}	

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

.active {
    background-color: var(--wordplay-focus-color);
    color: var(--wordplay-alternating-color);
}
</style>
