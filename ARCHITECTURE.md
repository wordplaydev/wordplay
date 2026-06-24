# Architecture

This document describes how Wordplay is built. It aspires to be a high-level document describing components, responsibilities, patterns, and dependencies. It should be a good first place for getting oriented with the overall implementation. Of course, reading the code will eventually be necessary; as you're reading this, it would be smart to read the code as you go, getting a sense of how the concepts here play out in the implementation.

## Key Dependencies

Wordplay has several major dependencies, each of which is crucial to understand in order to understand Wordplay's implementation:

- **[HTML](https://developer.mozilla.org/en-US/docs/Web/HTML) + [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) + [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)**. You really must know these before you can understand Wordplay's implementation. You don't have to have mastered them, but you're going to see them everywhere, as Wordplay is an inherently web-based application.

- **[TypeScript](https://www.typescriptlang.org/)**. TypeScript is a _superset_ of JavaScript that adds type information -- that means that it's JavaScript, plus other goodies. Most defects in programs are type errors, and TypeScript catches most type errors, so we use it to catch most defects. Read the [tutorial](https://www.typescriptlang.org/docs/handbook/intro.html) if unfamiliar. As a practice, we do not use `any`, unless TypeScript _really_ can't express the type we're trying to express.

- **[Svelte](https://svelte.dev/)**. Svelte is a front-end framework for building web applications. At the highest level, a Svelte application is a collection of `.svelte` files, each corresponding to some component, and each Svelte file has a script, markup, and style section, using JavaScript, HTML, and CSS standards. It also adds several other simple language features, however, that make building interactive web applications easier. We use Svelte because it's the fastest front-end framework and the easiest to learn (relative to React, Vue, Angular, and other frameworks). The [Svelte tutorial](https://learn.svelte.dev/) is a must-read.

- **[SvelteKit](https://kit.svelte.dev/)**. Builds upon Svelte, adding routing, server-side rendering, and other neat features for building web applications. We primarily use it to structure the Wordplay website, define consistent layout features, and interact with backend services, primarily Firebase. It's the obvious choice for a Svelte project.

- **[Firebase](https://firebase.google.com/)**. We use Firebase to persist the creator's projects and configuration settings, as well as for enabling project sharing. It uses a non-relational database structure for high scalability, which has some unfortunate tradeoffs on software evolution. The worst is that any schema design decisions we make place hard constraints on the views of data we create, since the schema design determines what kinds of queries are feasible. So any time we're doing schema design, we must simultaneously do user interface design, and be highly confident we won't change our minds about interface design.

There are several other more minor dependencies, especially in tooling ([Vite](https://vitejs.dev/), [Vitest](https://vitest.dev/), [Prettier](https://prettier.io/)).

The above dependencies, however, are the key ones, because if one were to disappear, we would have a huge amount of work to do to replace it. Make sure you're reasonably comfortable with all of the above before making changes to Wordplay's implementation.

## Key Components

Here are the major components of Svelte, and how they interact with each other.

### Database

[Database.ts](https://github.com/wordplaydev/wordplay/blob/main/src/db/Database.ts) is exactly what it's named: an interface to all data persistence. It keeps a snapshot of creator configuration settings, creator projects, and creator authentication information. It decides which state to persist in a browser's `localStorage` (because it's device specific) and which to keep in Firebase (because it's account specific).

The database also relies heavily on [Svelte stores](https://svelte.dev/docs/svelte-store), offering granular access to settings on the user interface. For example, it keeps a store for the current list of locales selected, and exposes it globally, so that user interfaces can access the current locale or locales, and change the interface based on them, automatically updating whenever the language is changed.

The database should generally be fairly opaque; it shouldn't matter to code using the Database's methods how or where data is stored. It's currently backed by Firebase, but that could change, and no other part of the application should have to care.

#### Local-first data layer

Account-specific data is **local-first**: a single IndexedDB store ([WordplayDexie.ts](https://github.com/wordplaydev/wordplay/blob/main/src/db/WordplayDexie.ts), DB name `wordplay`, one table per domain — projects, galleries, characters, how-tos, chats) is the durable local mirror of all Firebase data, and Firebase realtime queries are treated as a **sync mechanism into that mirror**, not as the place pages read from. Firestore itself is configured **memory-only** (no `persistentLocalCache`) so it doesn't duplicate the Dexie store or run a competing offline write queue; the Dexie store is the one local source of truth. The Dexie schema version (`WordplayDBVersion`) is deliberately decoupled from the project _document_ schema version (`ProjectSchemaLatestVersion`): the former versions table structure, the latter versions document content (handled at deserialize time).

Each domain database ([src/db/{projects,galleries,characters,howtos,chats}](https://github.com/wordplaydev/wordplay/tree/main/src/db)) follows the same pattern, with projects as the reference implementation:

- **Hydrate.** On construction, the domain reads its Dexie table (via a `liveQuery`) into its in-memory reactive surface (a `SvelteMap`/`$state`) and flips a `hydrated` flag. This is what makes cold start and offline work — the UI has data before any network call. (How-tos hydrate once rather than subscribing live, because their three realtime listeners garbage-collect the in-memory map and a live cache subscription would fight that GC.)
- **Dual-write.** The realtime listener writes each cloud snapshot into both the in-memory surface and the Dexie table; local edits do the same. The in-memory surface — not the raw Dexie rows — stays the authority for live behavior (it carries semantics rows don't: "confirmed-absent" sentinels, chat message merge, gallery role split), so writes go to it directly and Dexie is mirrored alongside.
- **Single-item reads are local-first.** `Projects.get`, `Galleries.get`, `Characters.getByID/getByName`, `HowTos.getHowTo`, `Chats.getChat` check the in-memory surface (i.e. the hydrated local cache) before any Firestore read; `Database.read()` wraps every fallback network read in an 8s timeout so an unreachable backend fails fast instead of hanging a page.
- **Clear on identity change.** `clearLocal()` wipes a domain's cache + in-memory surface on explicit sign-out and when a different account takes over the device (privacy), mirroring `Projects.deleteLocal()`.

#### Serial sync + the local↔cloud state machine

On login, `Database.startSync()` brings the domains online **serially in priority order** (projects → galleries → characters → how-tos → chats), advancing to the next once the current reports its first snapshot or a timeout elapses. Serializing the listener setup avoids the concurrent-subscription burst that churned the Firestore WebChannel session ("Unknown SID" 400s) on large accounts. Each domain reports a per-domain sync status — `initializing` → `syncing` → `updated` (with a synced count) or `failed` — exposed via the `syncState` store and surfaced in the save-status dialog ([Status.svelte](https://github.com/wordplaydev/wordplay/blob/main/src/components/app/Status.svelte)).

The write/connectivity state machine:

- **Read:** in-memory (hydrated cache) → Dexie → Firestore (timeout-guarded). Offline, the first two suffice for anything previously synced.
- **Write:** update the in-memory surface + Dexie immediately (the user sees the change at once), then attempt the Firestore write. Offline, Firestore queues the write in memory and flushes on reconnect; projects additionally survive a reload-while-offline because the Dexie cache keeps an `unsaved` flag that `persist()` backfills, and the browser `online` event nudges a flush.
- **Connectivity is never a page gate.** Pages gate only on **auth** and on each domain's `hydrated` flag, never on Firebase reachability. Losing the connection shows only in the connection banner / save-status UI ([ConnectionBanner.svelte](https://github.com/wordplaydev/wordplay/blob/main/src/components/app/ConnectionBanner.svelte)) — it never deactivates the site.

### Abstract Syntax Trees (ASTs)

All Wordplay code starts as strings and is converted to an _abstract syntax tree_ by [parseProgram](https://github.com/wordplaydev/wordplay/blob/main/src/parser/parseProgram.ts). Parser first tokenizes the strings using [Tokenizer.ts](https://github.com/wordplaydev/wordplay/blob/main/src/parser/Tokenizer.ts) to segment the text into a sequence of [Token](https://github.com/wordplaydev/wordplay/blob/main/src/nodes/Token.ts) nodes. Parser then translates the sequence of `Token` nodes into a tree. Root nodes of programs are [Source](https://github.com/wordplaydev/wordplay/blob/main/src/nodes/Source.ts) nodes, and then inside [/src/nodes](https://github.com/wordplaydev/wordplay/tree/main/src/nodes) are all of the different types of abstract syntax tree nodes that can appear in a Wordplay program.

For the full lexical grammar, syntactic grammar, and evaluation semantics of each construct, see [LANGUAGE.md](LANGUAGE.md) — it's the language specification companion to this architecture document.

Abstract syntax tree nodes follow a common interface defined by [Node.ts](https://github.com/wordplaydev/wordplay/blob/main/src/nodes/Node.ts). Some of the key concepts are that all nodes have a list of child nodes, and a grammar that defines their order, names, and whitespace rules, and other metadata. This metadata is used extensively in editing. `Node` also provides many interfaces for managing lexical scoping, edits to the tree, and localized descriptions of the node, connecting to the localization components.

Some nodes add additional interfaces, especially [Expression.ts](https://github.com/wordplaydev/wordplay/blob/main/src/nodes/Expression.ts) and [Type.ts](https://github.com/wordplaydev/wordplay/blob/main/src/nodes/Type.ts). Expression defines interfaces for compiling expressions to evaluable steps, for getting the type of the expression, and for providing localized descriptions of their evaluation. `Type` defines all of the different types of values that can exist and the rules for how they can be computed upon.

One important note about AST nodes: they are all **immutable**. This has a few implications:

- They should never have state that can be modified, so all of their fields are `readonly`, unless they are a temporary cache of some derived value (e.g., an expression's type).
- They do not know their parent. This is, the parser builds the tree from the bottom up; nodes have to be created before they can become part of other nodes, and so each node's parent doesn't exist until after it's created. However, this is also because immutable nodes can be reused, since they cannot change. One node might appear in many trees.

To work around the lack of a parent, we have [Root.ts](https://github.com/wordplaydev/wordplay/tree/main/src/nodes), which represents the root of an AST, and manages all of the parent information, offering facilities for figuring out the structure of an AST.

A Wordplay Project is a list of `Source`, with a name, ID, and other metadata.

Overall, it's best to think of the nodes as the center of everything: they define a program's structure, behavior, description, and more, and so most other things in Wordplay rely on nodes and trees to do their work.

### Type Checking

All nodes that are subclasses of [Expression.ts](https://github.com/wordplaydev/wordplay/blob/main/src/nodes/Expression.ts) have a _type_. If you're not familiar with types in programming languages, they represent what kinds of values some symbols might store. They're a central idea in TypeScript and also a central idea in Wordplay.

Wordplay allows for types to be declared explicitly, but also to be inferred from context. To enable this, each [Expression.ts](https://github.com/wordplaydev/wordplay/blob/main/src/nodes/Expression.ts) node has a `computeType()` function that computes what type the expression has, either from its declared type, or its implicit semantics (e.g., a Boolean literal has a Boolean type, by definition), or inferred from context. To see what kinds of types an expression has and what kinds of type inference it does, check its `computeType()`.

To enable type inference, and to prevent infinite cycles (e.g., a variable referencing itself), we have `Context.ts`, which is a place to cache information about an AST while it's being traversed and analyzed. This cache stores type information, remembers paths through trees during analysis to prevent cycles, gets roots of nodes, and remembers definitions in scope. It generally exists to make program analysis possible and efficient.

There are many types, each defined as a subclass of [Type.ts](https://github.com/wordplaydev/wordplay/blob/main/src/nodes/Type.ts). Many of these represent values, some represent unknown values. Each defines a function `acceptsAll()`, which takes a set of types and verifies that all of the types in the set are okay to assign to the type in question. These various implementations of `acceptsAll()` define the semantics of Wordplay's type system.

Note that all types are subclasses of `Node` and are therefore immutable. This is because nodes can be explicitly stated in code, and are therefore must be AST nodes. But we use the very same nodes to represent types that are inferred; they just happen to not live in an AST.

### Conflicts

There are many ways that an AST might be invalid. They can have type errors, caught by the type system, or they can violate some specific rule (e.g., a conditional should have a Boolean condition). Wordplay does error checking in a `computeConflicts()` function on each node.

Not every node can have conflicts (e.g., `BooleanLiteral`). Some can have many. Overall, there are more than 50 types of errors that can occur, only some of which are type errors.

Each conflict gathers a bunch of contextual information about the nodes involved and then defines node to represent the conflict.

Once an AST is built for a Wordplay program, it's not necessarily analyzed for conflicts. It's up to the front end when to call `Project.analyze()` to find defects. The analysis happens at the project level and many conflicts span multiple `Source` nodes in a project.

Some conflicts apply only to evaluations of a specific built-in (e.g. warning when a `Phrase` requests a font weight or style its face doesn't support). Rather than embed that knowledge in `Evaluate.computeConflicts()`, those checks register an `EvaluateAnalyzer` keyed by the relevant definition in [src/conflicts/evaluateAnalyzers.ts](src/conflicts/evaluateAnalyzers.ts). `Evaluate` dispatches to any registered analyzers at the end of its general conflict analysis.

### Evaluation

Wordplay programs are _evaluated_, in that they are purely functional. A Wordplay program is one big function, composed of smaller functions, and every Wordpaly program evaluates to a single [Value](https://github.com/wordplaydev/wordplay/blob/main/src/values/Value.ts). Values can be as simple as a [BoolValue](https://github.com/wordplaydev/wordplay/blob/main/src/values/BoolValue.ts) or a [Text](https://github.com/wordplaydev/wordplay/blob/main/src/values/TextValue.ts), or as complex as a [Structure](https://github.com/wordplaydev/wordplay/blob/main/src/values/StructureValue.ts) with 17 properties, one of which is a `List` of other `Structure` values. The most interesting values that a Wordplay program evaluates to are [Stage](https://github.com/wordplaydev/wordplay/blob/main/src/output/Stage.ts) structures, which define the arrangement and appearance of [Phrase](https://github.com/wordplaydev/wordplay/blob/main/src/output/Phrase.ts)es.

Only `Expression` nodes are evaluable. Each one defines a `compile()` function that converts the node and its children into a series of [Step](https://github.com/wordplaydev/wordplay/blob/main/src/runtime/Step.ts). There are fewer than a dozen types of steps; most do things like bind values to a name in scope, start a function evaluation, jump past some step based on some condition, or do some other low-level operation. Every Wordplay `Source` therefore compiles down to a sequence of `Step`s that are evaluated one at a time.

The component that evaluates steps is [Evaluator.ts](https://github.com/wordplaydev/wordplay/blob/main/src/runtime/Evaluator.ts). It takes a [Project](https://github.com/wordplaydev/wordplay/blob/main/src/db/projects/Project.ts), compiles its `Source`, and evaluates each sequence of steps according to the rules of each step. As it does this, it maintains a stack of function evaluations, and for each evaluation, a stack of values, and named scope of key/`Value` bindings. As each step evaluates, values are pushed and popped onto the value stack, bound to names in memory, and passed as inputs to function evaluations. If any expression ever evaluates to an [ExceptionValue](https://github.com/wordplaydev/wordplay/blob/main/src/values/ExceptionValue.ts) value, the `Evaluator` halts and evaluates to the exception.

A key aspect of Wordplay is that some of its values are [StreamValues](https://github.com/wordplaydev/wordplay/tree/main/src/values), which change over time. Streams are sequences of values that are input by the external world, including things like time, mouse buttons, keyboard presses, and other events. Every time a stream has a new value, `Evaluator` reevaluates the `Source` that references it. This is what creates interactivity; every time there is some input, the program gets a chance to respond to it by reevaluating.

### APIs

All APIs in Wordplay -- the input streams like `Key` and `Button` and output data structures like `Phrase` and `Stack` -- are defined as Wordplay type definitions. For example, consider [Grid](https://github.com/wordplaydev/wordplay/blob/main/src/output/Grid.ts), one of the `Layout` types. Inside that file, there's a function that takes a list of locales and constructs a Wordplay structure definition using those locales, defining its inputs, their documentation, and more. And then, there's a convenience wrapper class defined to store the inputs in a type-safe way for the rendering engine to use. There's also a function to convert the structure value generated by a program into an instance of that wrapper class. This basic pattern of 1) structure definition, 2) wrapper class, and 3) generator occurs for all built-in APIs in the implementation.

Creating new output APIs in the language means following that pattern, and doing a few other key things:

- Creating a similar file like [Grid](https://github.com/wordplaydev/wordplay/blob/main/src/output/Grid.ts)], defining its structure definition with locales, defining a wrapper class for use in the rendering, and writing a function that converts a `StructureValue` representing that type as an instance of that wrapper class.
- Updating [createDefaultShares](https://github.com/wordplaydev/wordplay/blob/main/src/runtime/createDefaultShares.ts) to call the structure definition creator function, and include the definition in the appropriate set of types.
- Creating placeholders for localization strings for all of the strings defined for the type and its documentation in [OutputTexts.ts](https://github.com/wordplaydev/wordplay/blob/main/src/locale/OutputTexts.ts), where the schema for the output API strings are defined.
- Using the new wrapper class in the output engine in the appropriate place to change rendering. The output engine is generally comprised of the Svelte components `PhraseView`, `GroupView`, `StageView`, `Scene`, `OutputAnimation`, `Physics`, and other helper classes.

Once these are done, the new API structure should appear in documentation and work in programs.

Other APIs, like streams, and value APIs on things like numbers and lists, are defined elsewhere (e.g., `NumberBasis.ts` is an example of a basic value structure definition, `Key.ts` is an example of a stream definition), but follow similar patterns for localization.

### Basis

[src/basis/](https://github.com/wordplaydev/wordplay/tree/main/src/basis) defines the standard-library methods and operators on built-in value types. Each primitive — `BoolBasis`, `NumberBasis`, `TextBasis`, `ListBasis`, `SetBasis`, `MapBasis`, `TableBasis`, `NoneBasis`, `StructureBasis` — exports a bootstrap function that builds a `StructureDefinition` containing that type's `FunctionDefinition`s and `ConversionDefinition`s (e.g., `+` on numbers, `length` on lists, `not` on booleans). [Basis.ts](https://github.com/wordplaydev/wordplay/blob/main/src/basis/Basis.ts) is the registry: it instantiates one `Basis` per active locale combination, caches the result, and exposes the structure definitions to the rest of the system.

The bodies of basis functions are not Wordplay code — they're TypeScript callbacks wrapped in [InternalExpression.ts](https://github.com/wordplaydev/wordplay/blob/main/src/basis/InternalExpression.ts), which `Evaluator` invokes when a basis function is called. Names and documentation come from `locale.basis.<TypeName>`, so the standard library is fully localized at construction time.

`BasisType.getScope()` is how the type system finds these definitions: when `5 + 3` is type-checked or evaluated, the lookup of `+` walks through the `NumberBasis` structure definition registered here. `createDefaultShares` is the sibling registry for _global_ definitions (output types, streams); basis is specifically for methods that belong to a type.

### Localization

Wordplay defines a locale schema in [Locale](https://github.com/wordplaydev/wordplay/blob/main/src/locale/Locale.ts), which is basically one big JSON data structure of named string values. Some of these strings are constant, others are templates that can be given inputs and rendered with concrete values. Wordplay's many nodes and user interfaces generally make deep links into this data structure to get a string or template and render appropriate text.

Localization is intimately connected to accessibility, as many of the localization strings are templated descriptions of nodes, values, and other content.

`Database` keeps track of which languages and regions are selected, loads the appropriate locale files with the strings and templates, and exposes them as a Svelte store for the user interface and language implementation to use to render localized descriptions of things. When the database receives a request to change languages and regions, these are propagated to all interfaces that depend on the selected locales. All projects are also revised to have the new locales as well.

#### Writing direction and layout

Each script in [Scripts.ts](https://github.com/wordplaydev/wordplay/blob/main/src/locale/Scripts.ts) carries a writing `direction` (`ltr`/`rtl`) and `layout` (`horizontal-tb`/`vertical-rl`/`vertical-lr`); a language derives both from its dominant (first) script. `Locales` exposes these via `getDirection()` and `getLayout()`. Two rules keep the platform direction-aware:

- **UI chrome and the editor** follow the viewer's UI locale: the document `dir` is set on `<html>`, and component CSS uses logical properties (`margin-inline-start`, `inset-inline-end`, `text-align: start`, …) rather than physical sides, so the interface mirrors automatically under RTL. `npm run rtl` ([scripts/check-logical-css.ts](https://github.com/wordplaydev/wordplay/blob/main/scripts/check-logical-css.ts)) guards against new physical properties.
- **Program output** follows the _project_ locale (carried by `RenderContext.locales`), which is stable per project regardless of who views it. Under RTL, the spatial arrangements (`Row`, `Grid`, `Stack`) mirror their children's order/alignment via `reflectX` while staying physical primitives — vertical writing is not an axis swap but a text-flow property applied per-phrase as a CSS `writing-mode`. Text `alignment` (`<`/`|`/`>`) maps to logical `start`/`center`/`end`. Caret/selection geometry in the editor consults `getDirection()`; vertical _editing_ (caret geometry for vertical writing modes) is not yet supported.

The **writing layout** for output is driven by the `writingLayout` setting (`auto` | `horizontal-tb` | `vertical-rl` | `vertical-lr`, default `auto`). `StageView` resolves the effective layout (`auto` → the project locale's `getLayout()`, else the explicit choice) into `RenderContext.layout`. A `Phrase`'s `direction` defaults to `ø` (inherit), so an un-specified phrase renders at the context's effective layout while an explicit `direction` wins; the choice is reactive (no re-evaluation). Prose rendered by [MarkupHTMLView](https://github.com/wordplaydev/wordplay/blob/main/src/components/concepts/MarkupHTMLView.svelte) carries the active locale's `lang`/`dir`. A coherent vertical _reading mode_ for UI prose (reorienting reading surfaces and the Speech tail) and vertical editing remain future work.

### Output

All output is rendered in the [OutputView](https://github.com/wordplaydev/wordplay/blob/main/src/components/output/OutputView.svelte) component. It renders `Exception`s, and other arbitrary values using all of the Svelte views defined in `valueToView.ts`, which maps `Value` instances onto views. If a Value corresponds to a `Phrase`, `Group`, or `Stage`, then it is rendered as typographic output. These typographic values are generally converted into classes that provide convenience functions for reasoning about the output without having to use the low level interface of `Structure` values.

The typographic output is defined by `Stage`. It's responsible for managing any typographic outputs that are animating, for tracking outputs that have entered the stage, existed, or moved, and for rendering the output in a way that respects various settings, such as the Stage's place (i.e., its zoom level, rotation, etc.). It's also responsible in monitoring for inputs from input devices and passing them to the `Evaluator`'s streams, causing reevaluation.

### Editor

The `Editor.svelte` is responsible for both rendering an AST and for modifying an AST.

Rendering is managed by all of the mappings defined in `nodeToView.ts`; every type of node has a corresponding view. Most views are just very straightforward mappings from its list of children to views of each child. But some have special behaviors. `RootView` is also very important for doing AST-wide hiding of nodes (e.g., nodes in non-selected locales).

Editing comes in three forms:

- Typing, which is primarily managed by `Caret.ts`, and involves inserting and removing symbols, and moving a caret to select a certain position or node. When edited as text, `Source` does its best to avoid reparsing the entire tree, reusing any nodes and tokens that it can.

- Drag and drop involves a global `ProjectView ` state that manages a selected node from an `Editor`, or `Documentation.svelte`. The editor uses Node facilities such as their grammar and types to decide what can be dropped where.

- Menu edits involve taking the caret's current position and asking `Menu` (in [src/edit/menu/Menu.ts](https://github.com/wordplaydev/wordplay/blob/main/src/edit/menu/Menu.ts)) to generate a set of `Revision` that are valid for the current selection. These appear as an autocomplete menu. Revisions perform an edit on the AST, usually replacing one node with another, or removing one, and then revising the project with the edited node.

The editor does many other things, including:

- Rendering conflicts based on the current caret position
- Highlighting based on the mouse, touch screen, drag interactions, and editor search matches, defined by `Highlights.ts`
- Providing descriptions for screen readers

### Edit operations

[src/edit/](https://github.com/wordplaydev/wordplay/tree/main/src/edit) groups all of the machinery that turns user intents — typing, dragging, choosing from a menu, tweaking an output property — into new ASTs. Like the rest of Wordplay, edits never mutate; each operation produces a new `Source` and `Project`.

The subdirectories:

- [caret/Caret.ts](https://github.com/wordplaydev/wordplay/blob/main/src/edit/caret/Caret.ts) — an immutable snapshot of the editor's cursor: source, position (a text offset, a selected `Node`, or a range), column, and entry direction. `Caret` methods compute neighboring tokens and the expression at the cursor.

- [menu/](https://github.com/wordplaydev/wordplay/tree/main/src/edit/menu) — the autocomplete menu shown at the caret. `PossibleEdits.ts` analyzes caret context and generates the candidate `Revision`s; `Menu.ts` is an immutable container that organizes them by `Purpose` (Outputs, Inputs, Decisions, Text, …) into a `MenuOrganization` and tracks the user's selection.

- [revision/](https://github.com/wordplaydev/wordplay/tree/main/src/edit/revision) — `Revision` is the base type for one AST transformation. Subclasses include `Replace`, `Remove`, `Append`, `Assign`, and `Refer`. Each exposes `getEditedNode()` (the new node and its revised parent) and `getEdit()` (an `Edit` for the command system to apply).

- [drag/Drag.ts](https://github.com/wordplaydev/wordplay/blob/main/src/edit/drag/Drag.ts) — drag-and-drop. `InsertionPoint` and `AssignmentPoint` describe where a dragged node would land; `isValidDropTarget()` and `dropNodeOnSource()` validate and produce the revised source. On a palette drop (from the Wellspring/Guide, where the dragged node isn't rooted in a source), `dropNodeOnSource()` also replaces each placeholder in the dropped subtree with its type's default expression (`Type.getDefaultExpression()`), so dropped concepts evaluate immediately instead of throwing a placeholder exception.

- [output/](https://github.com/wordplaydev/wordplay/tree/main/src/edit/output) — the palette's bridge to AST edits. `OutputExpression` wraps an `Evaluate` representing a `Stage`, `Phrase`, `Group`, `Shape`, etc., and exposes `OutputProperty` accessors that the palette uses to read and revise individual inputs (color, place, rotation, …).

When a user types, the editor builds a new `Caret`, asks `PossibleEdits` for the available `Revision`s, builds a `Menu`, and applies the selected revision back to the project. Dragging and palette edits skip the menu but follow the same immutable revision pattern.

### Blocks editor

Blocks mode is an alternative visual rendering of the same AST, toggled by the `$blocks` setting. It is not a separate editor: the same `Editor.svelte` and the same node views are reused, with a `Format.block` flag propagated through the view hierarchy. When `format.block` is true, node views render as nested visual blocks with rounded outlines; when false, they render the standard text syntax. Both modes share caret, menu, drag, and palette edits, so any transformation works in either mode.

The dedicated files in [src/components/editor/blocks/](https://github.com/wordplaydev/wordplay/tree/main/src/components/editor/blocks) are small: `Flow.svelte` is a flex-layout primitive for arranging block children, and `EmptyView.svelte` renders localized placeholders (via `FieldInfo.label()`) for empty optional fields, with menu triggers for inserting a child. Drag-and-drop is fully supported in blocks mode but disabled when the editor is read-only.

### Conflicts and resolutions

After every edit, a project is analyzed for _conflicts_ (in other languages, you might call these errors).
Subclasses of `Node` can compute conflicts based on their context.
For example, `Evaluate` can generate many types of conflicts, such as `IncompatibleInput`, which happens when an input being provided doesn't match the function being evaluated.
We call them conflicts partly because they are inconsistencies in a program, and not necessarily a mistake someone made, but also because we anthropomorphize language constructs, and so "conflict" is a pun: it is a disagreement between different characters in the Wordplay universe.

`Conflict.ts` is the base class of all conflicts, and all conflicts are required to define methods that describe conflicts, provide references to the nodes in a program that are involved in the conflict, and optionally offer a way to resolve a conflict.
Conflict resolutions are defined by the `Resolution` type, and generally need a way to describe the resolution, and a method that produces a revised project that resolves the conflict.

You can see an example of a conflict by creating a personally identifiable information conflict (`PossiblePII.ts`).
Try typing the program email: 'ajko@uw.edu'. It'll give a conflict that it seems to be personally identifiable information.
There's an option there to say "No, it's not", and then the warning goes away.
Clicking that button calls `PossiblePII`'s `getResolution` method to generate a revised project.

### Palette

The palette is a special kind of editor that offers user interfaces for transforming the `Evaluate` nodes that represent Phrases, Groups, and Stages. It constructs detailed models of the `Evaluate`, and defines many controls for modifying inputs to the `Evaluate`.

On each edit, the project is revised, reevaluated, and re-rendered. Making this interactive possible requires reevaluating the revised project on the previously provided inputs, to try to get the Evaluator back to the same state it was in previously. This is done by `Evaluator.mirror()`, which replays the same inputs the Evaluator received on the revised project.

### Documentation

The documentation component takes all of the default `FunctionDefinition`, `StructureDefinition`, `ConversionDefintion`, and `StreamDefinition` -- Wordplay's standard libraries -- and builds `Concept` data structures out of them. This creates a `ConceptIndex`, which contains all of the named things for which there is documentation.

Most documentation is written in `Locale`, as all of it needs to be localized. But documentation is also written in `Doc` nodes in programs. `ConceptIndex` gathers all of these documentations and provides an interactive way to navigate and search them.

### Project View

[ProjectView.svelte](https://github.com/wordplaydev/wordplay/blob/main/src/components/project/ProjectView.svelte) defines a set of [Tile](https://github.com/wordplaydev/wordplay/blob/main/src/components/project/Tile.ts) that represent source files, documentation windows, palettes, output, and other project-level settings. It's basically a window manager and global context store. It also reacts to project revisions, pushing the revised project down to its views to update its appearance. It relies heavily on Svelte to make these updates minimal and fast.

### Tutorial and Lore

Wordplay ships with an in-app tutorial that uses language constructs themselves as characters in a guided story.

The tutorial is structured as a small theatrical hierarchy in [Tutorial.ts](https://github.com/wordplaydev/wordplay/blob/main/src/tutorial/Tutorial.ts): a `Tutorial` contains `Act`s (a variable-length list), each act contains `Scene`s, and each scene contains `Line`s — a `Dialog` (a character speaking with an `Emotion`), a `Performance` (an embedded Wordplay snippet), or a pause. There are two tutorial **modes** ([TutorialMode.ts](https://github.com/wordplaydev/wordplay/blob/main/src/tutorial/TutorialMode.ts)): the original `complete` tutorial and a short `quick` tour for creators who already know another programming language. `/learn` shows a choice dialog ([TutorialChooser.svelte](https://github.com/wordplaydev/wordplay/blob/main/src/components/app/TutorialChooser.svelte)) when no mode has been chosen, and lets learners switch via a control by the breadcrumbs; the chosen mode and per-tutorial progress are consolidated under a single cloud-synced `tutorial` setting (`TutorialState`). The quick tutorial contrasts Wordplay with a prior language the learner picks (a device-level `ContrastLanguageSetting`); its dialog embeds `\<tag>| code\` blocks parsed as the [ExternalExample](https://github.com/wordplaydev/wordplay/blob/main/src/nodes/ExternalExample.ts) markup node and rendered with syntax highlighting. Lesson content lives in `static/locales/<locale>/<locale>-tutorial.json` (complete) and `<locale>-tutorial-quick.json` (quick). [Performances.ts](https://github.com/wordplaydev/wordplay/blob/main/src/tutorial/Performances.ts) is a library of canned Wordplay programs the scenes reference by name (e.g., `RainingEmoji`, `EvaluateDance*`). [Progress.ts](https://github.com/wordplaydev/wordplay/blob/main/src/tutorial/Progress.ts) models the learner's `(mode, act, scene, pause)` position and is persisted per mode in the settings database; URLs like `/learn?act=1&scene=2&pause=3&tutorial=quick` map back to a Progress (the `tutorial` parameter is omitted for the default `complete` mode). The UI is rendered by [TutorialView.svelte](https://github.com/wordplaydev/wordplay/blob/main/src/components/app/TutorialView.svelte).

The cast of characters is defined in [src/lore/](https://github.com/wordplaydev/wordplay/tree/main/src/lore). [BasisCharacters.ts](https://github.com/wordplaydev/wordplay/blob/main/src/lore/BasisCharacters.ts) maps language construct names (parentheses, keywords, operators, types, …) to `BasisCharacter` records, each with the symbol the character uses on stage. [Emotion.ts](https://github.com/wordplaydev/wordplay/blob/main/src/lore/Emotion.ts) enumerates the emotional states a character can be in. The components in [src/components/lore/](https://github.com/wordplaydev/wordplay/tree/main/src/components/lore) — chiefly `Speech.svelte` and `Eyes.svelte` — render a character speaking, animating the eyes to match the supplied `Emotion`. The "conflict" terminology used earlier is part of this same metaphor: language constructs are the cast, and disagreements between them are dramatic conflicts.

## Immutability

Wherever possible, Wordplay uses immutable data structures and pure functions. That means that we generally do not define state and mutate it in place, but rather take existing state, and make a clone with modified values. This drastically reduces the number of places where state lives, simplifying debugging, reducing defects, and making testing easier.

One major exception to this is Svelte components, which often have much internal state, and dependencies on global state. These external dependencies are explicitly defined in component initialization as Svelte `context`.

Another major exception is `Evaluator`, since it has to manage substantial state to evaluate programs.

Another exception is `Database`, which is in charge of persisting state.

Consequently, expect most defects to live in Svelte components, `Evaluator`, and `Database`.
