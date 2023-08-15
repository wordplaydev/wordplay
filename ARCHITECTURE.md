# Architecture

This document describes how Wordplay is built. It aspires to be a high level document, describing components, responsibilities, patterns, and dependencies. It should be a good first place for getting oriented with the overall implementation. Of course, reading the code will eventually be necessary; as you're reading this, it would be smart to read the code as you go, getting a sense of how the concepts here play out in the implemention.

## Key Dependencies

Wordplay has several major dependencies, each of which is crucial to understand in order to understand Wordplay's implementation:

-   **[HTML](https://developer.mozilla.org/en-US/docs/Web/HTML) + [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) + [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)**. You really must know these before you can understand Wordplay's implementation. You don't have to have mastered them, but you're going to see them everywhere, as Wordplay is an inherently web-based application.

-   **[TypeScript](https://www.typescriptlang.org/)**. TypeScript is a _superset_ of JavaScript that adds type information -- that means that it's JavaScript, plus other goodies. Most defects in programs are type errors, and TypeScript catches most type errors, so we use it to catch most defects. Read the [tutorial](https://www.typescriptlang.org/docs/handbook/intro.html) if unfamiliar. As a practice, we do not use `any`, unless TypeScript _really_ can't express the type we're trying to express.

-   **[Svelte](https://svelte.dev/)**. Svelte is a front-end framework for building web applications. At the highest level, a Svelte application is a collection of `.svelte` files, each corresponding to some component, and each Svelte file has a script, markup, and style section, using JavazScript, HTML, and CSS standards. It also adds several other simple language features, however, that make building interactive web applications easier. We use Svelte because it's the fastest font end framework and the easiest to learn (relative to React, Vue, Angular, and other frameworks). The [Svelte tutorial](https://learn.svelte.dev/) is a must read.

-   **[SvelteKit](https://kit.svelte.dev/)**. Builds upon Svelte, adding routing, server-side rendering, and other neat features for building web applications. We primarily use it to structure the Wordplay website, define consistent layout features, and interact with backend services, primarily Firebase. It's the obvious choice for a Svelte project.

-   **[Firebase](https://firebase.google.com/)**. We use Firebase to persist creator's projects and configuration settings, as well as for enabling project sharing. It uses a non-relational database structure for high scalability, which has some unfortunate tradeoffs on software evolution. The worst is that any schema design decisions we make place hard constraints on the views of data we create, since the schema design determines what kinds of queries are feasible. So any time we're doing schema design, we must simultaneously do user interface design, and be highly confident we won't change our minds about interface design.

There are several other more minor dependencies, especially in tooling ([Vite](https://vitejs.dev/), [Vitest](https://vitest.dev/), [Prettier](https://prettier.io/)).

The above dependencies, however, are the key ones, because if one were to disappear, we would have a huge amount of work to do to replace it. Make sure you're reasonably comfortable with all of the above before making changes to Wordplay's implementation.

## Key Components

Here are the major components of Svelte, and how they interact with each other.

### Database

`Database.ts` is exactly what it's named: an interface to all data persistence. It keeps a snapshot of creator configuration settings, creator projects, and creator authentication information. It decides which state to persist in a browser's `localStorage` (because it's device specific) and which to keep in Firebase (because it's account specific).

The database also relies heavily on [Svelte stores](https://svelte.dev/docs/svelte-store), offering granular access to settings to the user interface. For example, it keeps a store for the current list of locales selected, and exposes it globally, so that user interfaces can access the current locale or locales, and change the interface based on them, automatically updating whenever the language is changed.

The database should generally be fairly opaque; it shouldn't matter to code using the Database's methods how or where data is stored. It's currently backed by Firebase, but that could change, and no other part of the application should have to care.

### Abstract Syntax Trees (ASTs)

All Wordplay code starts as strings and is converted to an _abstract syntax tree_ by `Parser.ts`. Parser first tokenizes the strings using `Tokenizer.ts` to segment the text into a sequence of `Token` nodes. Parser then translates the sequence of `Token` nodes into a tree. Root nodes of programs are `Source` nodes, and then inside `/src/nodes` are all of the different types of abstract syntax tree nodes that can appear in a Wordplay program.

Abstract syntax tree nodes follow a common interface defined by `Node.ts`. Some of the key concepts are that all nodes have a list of child nodes, and a grammar that defines their order, names, and whitespace rules, and other metadata. This metadata is used extensively in editing. `Node` also provides many interfaces for managing lexical scoping, edits to the tree, and localized descriptions of the node, connecting to the localization components.

Some nodes add additional interfaces, especially `Expression.ts` and `Type.ts`. Expression defines interfaces for compiling expressions to evaluable steps, for getting the type of the expression, and for providing localized descriptions of their evaluation. `Type` defines all of the different types of values that can exist and the rules for how they can be computed upon.

One important note about AST nodes: they are all **immutable**. This has a few implications:

-   They should never have state can can be modified, so all of their fields are `readonly`, unless they are a temporary cache of some derived value (e.g., an expression's type).
-   They do not know their parent. This is the parser builds the tree from the bottom up; nodes have to be created before they can become part of other nodes, and so each node's parent doesn't exist until after it's created. However, this is also because immutable nodes can be reused, since they cannot change. One node might appear in many trees.

To work around the lack of a parent, we have `Root.ts`, which represents the root of an AST, and manages all of the parent information, offering facilities for figuring out the structure of an AST.

A Wordplay Project is a list of `Source`, with a name, ID, and other metadata.

Overall, it's best to think of the nodes as the center of everything: they define a program's structure, behavior, description, and more, and so most other things in Wordplay rely on nodes and trees to do their work.

### Type Checking

All nodes that are subclasses of `Expression` have a _type_. If you're not familiar with types in programming languags, they represent what kinds of values some symbol might store. They're a central idea in TypeScript and also a central idea in Wordplay.

Wordplay allows for types to be declared explicitly, but also to be inferred from context. To enable this, each `Expression` node has a `computeType()` function that computes what type the expression has, either from its declared type, or its implicit semantics (e.g., a Boolean literal has a Boolean type, by definition), or inferred from context. To see what kinds of types an expression has and what kinds of type inference it does, check it's `computeType()`.

To enable type inference, and to prevent infinite cycles (e.g., a variable referencing itself), we have `Context.ts`, which is a place to cache information about an AST while it's being traversed and analyzed. This cache stores type information, remembers paths through trees during analysis to prevent cycles, gets roots of nodes, and remembers definitions in scope. It generally exists to make program analysis possible and efficient.

There are many types, each defined as a subclass of `Type.ts`. Many of these represent values, some represent unknown values. Each defines a function `acceptsAll()`, which takes a set of types and verifies that all of the types in the set are okay to assign to the type in question. These various implementations of `acceptsAll()` defines the semantics of Wordplay's type system.

Note that all types are subclasses of `Node` and are therefore immutable. This is because nodes can be explicitly stated in code, and are therefore must be AST nodes. But we use the very same nodes to represent types that are inferred; they just happen to not live in an AST.

### Conflicts

There are many ways that an AST might be invalid. They can have type errors, caught by the type system, or they can violate some specific rule (e.g., a conditional should have a Boolean condition). Wordplay does error checking in a `computeConflicts()` function on each node.

Not every node can have conflicts (e.g., `BooleanLiteral`). Some can have many. Overall, there are more than 50 types of errors that can occur, only some of which are type errors.

Each conflict gathers a bunch of contextual information about the nodes involved and then defines a _primary_ and _secondary_ node. The primary one is the node on which the error happened, and the secondary, which is optional, is the node for which there is disagreement. This follows a concept of errors as not a mistake that someone made, but a disagreement between two parts of a Wordplay program.

Once an AST is built for a Wordplay program, it's not necessarily analyzed for conflicts. It's up to the front end when to call `Project.analyze()` to find defects. The analysis happens at the project level an many conflicts span multiple `Source` nodes in a project.

### Evaluation

Wordplay programs are _evaluated_, in that they are purely functional. A Wordplay program is one big function, composed of smaller functions, and every Wordpaly program evaluates to a single `Value`. Values can be as simple as a `Bool` or a `Text`, or as complex as a `Structure` with 17 properties, one of which is a `List` of other `Structure` values. The most interesting values that a Wordplay program evaluates to are `Stage` structures, which define the arrangement and appearance of `Phrase`es.

Only `Expression` nodes are evaluable. Each one defines a `compile()` function that converts the node and its children into a series of `Step`. There are fewer than a dozen types of steps; most do things like bind values to a name in scope, start a function evaluation, jump past some step based on some condition, or do some other low level operation. Every Wordplay `Source` therefore compiles down to a sequence of `Step`s that are evaluated one at a time.

The component that evaluates steps is `Evaluator.ts`. It takes a `Project`, and compiles its `Source`, and evaluates each sequence of steps according to the rules of each step. As it does this, it maintains a stack of function evaluations, and for each evaluation, a stack of values, and named scope of key/`Value` bindings. As each step evaluates, values are pushed and popped onto the value stack, bound to names in memory, and passed as inputs to function evaluations. If any expression every evaluates to an `Exception` value, the `Evaluator` halts and evaluates to the exception.

A key aspect of Wordplay is that some of it's values are `Stream`s, which change over time. Streams are sequences of values that are input by the external world, including things like time, mouse buttons, keyboard presses, and other events. Every time a stream has a new value, `Evaluator` reevaluates the `Source` that references it. This is what creates interactivity; every time there is some input, the program gets a chance to respond to it be reevaluating.

### Localization

Wordplay defines a locale schema in `Locale`, which is basically one big JSON data structure of named string values. Some of these strings are constant, others are templates which can be given inputs and rendered with concrete values. Wordplays many nodes and user interfaces generally make deep links into this data structure to get a string or tempate, and render appropriate text.

Localization is intimately connected to accessibility, as many of the localization strings are templated descriptions of nodes, values, and other content.

`Database` keeps track of which languages and regions are selected, loads the appropriate locale files with the strings and templates, and exposes them as a Svelte store for the user interface and language implementation to use to render localized descriptions of things. When the database receives a request to change languages and regions, these are propagated to all interfaces that depend on the selected locales. All projects are also revised to have the new locales as well.

### Output

All output is rendered in the `OutputView` component. It renders `Exception`s, and other arbitrary values using all of the Svelte views defined in `valueToView.ts`, which maps `Value` instances onto views. If a Value corresponds to a `Phrase`, `Group`, or `Stage`, then it is rendered as typographic output. These typographic values are generally converted into classes that provide convenience functions for reasoning about the output without having to use the low level interface of `Structure` values.

The typographic output is defined by `Stage`. It's responsible for managing any typographic outputs that are animating, for tracking outputs that have entered stage, or existed, or moved, and for rendering the output in a way that respects various settings, such as the Stage's place (i.e., it's zoom level, rotation, etc.). It's also responsible for monitoring for inputs from input devices and passing them to the `Evaluator`'s streams, causing reevaluation.

### Editor

The `Editor.svelte` is responsible for both rendering an AST and for modifying an AST.

Rendering is managed by all of the mappings defined in `nodeToView.ts`; every type of node has a corresponding view. Most views are just very straightforward mappings from it's list of children to views of each child. But some have special behaviors. `RootView` is also very important for doing AST-wide hiding of nodes (e.g., nodes in non-selected locales).

Editing comes in three forms:

-   Typing, which is primarily managed by `Caret.ts`, and involves inserting and removing symbols, moving a caret to select a certain position or node. When edited as text, `Source` does its best to avoid reparsing the entire tree, reusing any nodes and tokens that it can.

-   Drag and drop involves a global `ProjectView ` state that manages a selected node from an `Editor`, or `Documentation.svelte`. The editor uses Node facilities such as their grammar and types to decide what can be dropped where.

-   Menu edits involve taking the caret's current position and asking `Autocomplete` to generate a set of `Revision` that are valid for the current selection. These appear as an autocomplete menu. Revisions perform an edit on the AST, usually replacing one node with another, or removing one, and then revising the project with the edited node.

The editor does many other things, including:

-   Rendering conflicts based on the current caret position
-   Highlighting based on mouse, touch screen, and drag interactions, defined by `Highlights.ts`
-   Providing descriptions for screen readers

### Palette

The palette is a special kind of editor that offers user interfaces for transforming the `Evaluate` nodes that represent Phrases, Groups, and Stages. It constructs detailed models of the `Evaluate`, and defines many controls for modifying inputs to the `Evaluate`.

On each edit, the project is revised, reevaluated, and re-rendered. Making this interactive possible requires reevluating the revised project on the previously provided inputs, to try to get the Evaluator back to the same state it was in previously. This is done by `Evaluator.mirror()`, which replays the same inputs the Evaluator received on the revised project.

### Documentation

The documentation component takes all of the default `FunctionDefinition`, `StructureDefinition`, `ConversionDefintion`, and `StreamDefinition` -- Wordplay's standard libraries -- and builds `Concept` data structures out of them. This creates a `ConceptIndex`, which contains all of the named things for which there is documentation.

Most documentation is written in `Locale`, as all of it needs to be localized. But documentation is also written in `Doc` nodes in programs. `ConceptIndex` gathers all of these documentations and provides an interactive way to navigate and search them.

### Project View

`ProjectView.svelte` defines a set of `Tile` that represent source files, documentation windows, palettes, output, and other project level settings. It's basically a window manager and global context store. It also reacts to project revisions, pushing the revised project down to its views to update its appearance. It relies heavily on Svelte to make these updates minimal and fast.

## Immutability

Wherever possible, Wordplay uses immutable data structures and pure functions. That means that we generally do not define state and mutate it in place, but rather take existing state, and clone and modify it. This drastically reduces the number of places where state lives, simplifying debugging, reducing defects, and making testing easier.

One major exception to this is Svelete components, which often have much internal state, and dependencies on global state. These external dependencies are explicitly defined in component initialization as Svelte `context`.

Another major exception is `Evaluator`, since it has to manage substantial state to evaluate programs.

Another exception is `Database`, which is in charge of persisting state.

Consequently, expect most defects to live in Svelte components, `Evaluator`, and `Database`.
