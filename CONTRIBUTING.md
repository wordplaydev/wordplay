# Hi helper!

Welcome! For now, contributions are limited to localization.

This guide is always evolving, so [write Amy](mailto:ajko@uw.edu) if you have ideas for how to improve it.

## Localization

Yay!
Our goal is to support **all of the world's written languages**, and that definitely isn't going to happen without your help.

Let's start with some key principles and then we'll get into the technical details for how to contribute.

-   **We expect redesign** as part of localization.
    Every new language is going to surface new defects and new requirements for the platform, which might mean bug fixes, and changes to the interface, interaction design, even to the programming language.
    So if you're working on something and something seems off for the particular language that you're working on, that's a great time to [submit an issue](https://github.com/amyjko/wordplay/issues) so we can decide if something about the design or implementation needs to change.

-   **Localization is an art**.
    Contributing isn't just about translating sentences from other languages.
    It's about moving between cultural ideas, reinterpreting humor, connecting to concepts, and in many cases, rewriting text to reflect different values.
    That means that you're doing more than just punching words into Google Translate &mdash; you're taking on the role of writer, teacher, and sometimes comedian, as this project is full of puns that _frequently_ don't translate between cultures.

-   **Localization and accessibility are inseparable**.
    For example, there are going to be cases where it might be easy to write something that refers to something on screen, but in a way that assumes someone can see it.
    That's not accessible: there has to be a way for someone who can't see to find what you're talking about.
    Another example is the need for [plain language](https://www.plainlanguage.gov/about/definitions/), which can be essential for people with cognitive or intellectual disabilities, or low reading literacy.
    That means keeping writing clear, concise, and organized, even when you're writing in the voice of a character (as is often the case in Wordplay).

If all of those sound right to you, and you're still excited to contribute, let's get started!

### Setup

Until we manage to build some better web-based tools for localization, contributing localizations currently requires using the tools that software developers use to build Wordplay.
This isn't ideal, so hopefully these instructions make it as easy as possible.

For setup, our goal is for you to install a code editor, clone the Wordplay repository, install all of the necessary parts of the Wordplay implementation.

1. **Install Node**. If you don't have `node` installed, [install it](https://nodejs.org/en/download). And if you don't know if you do, you probably don't. It won't hurt to install it again.
2. **Install VS Code**. If you don't have VS Code installed, [install it](https://code.visualstudio.com/). It's a popular code editor, and the one we most recommend for contributing.
3. **Clone the Wordplay repository**. Open VS Code, and then find the toolbar icon called "Source Control". Click it, and you'll a panel with a few buttons appears, one labeled "Clone Repository". Click it, then copy and paste `https://github.com/amyjko/wordplay` into the prompt. Once you enter it, it'll ask you where you want to clone the repository; choose a place on your computer where you want to store it.
4. **Open the repository in VS Code**. It'll work for a second to get the repository from the internet, then ask you if you want to open it. Say yes. It'll then ask you whether you whether you trust the authors. (Do you? I trust me, but that's me.)
5. **Open a terminal**. In the menu, choose `Terminal > New Terminal` to open up a command line so we can do some work with some commands. Keep this open; you'll be using it later.
6. **Install dependencies**. Type `npm install`. This will install all of the code that Wordplay needs to run. If you run into problems, it's likely an issue with how Node was installed, and quite often permissions issues. There are so many things that can go wrong here, so web search is your friend if you're seeing an error.

If you made it this far, you're all set up! Let's proceed to working on some localization.

### Editing

Wordplay localization files life in the folder `static/locales`.
Inside that folder are folders that are named using [ISO 639-1 language codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes).
And inside each of those folders are two files: a `[language].json` file that has all of the text and templates for the Wordplay user interface, and then separately, a `[language]-tutorial.json` file, which has the tutorial in that language.

These are separate files primarily for efficiency: because tutorial can be large, Wordplay only loads it when it needs to, even if it's loaded all of the other text for a localization.

You may not see a folder for the language code you want to work on.
That means you're the first to work on it!
You'll find a folder `static/locales/example` that contains templates to start from.
Copy that folder and rename it and its files to the language code that you want to work on, or copy an existing locale and start from it (being careful to keep track of which strings aren't yet translated).

Once you have a folder with the locale files for your language, there are a few things to know about how each is structured.

#### Locale files

The `[language].json` file mostly refers to text that appears in the Wordplay interface.
If you (can) hover over any of the terms in this file, you may see some description of what the text should contain. If you don't, it means we're still working on writing those descriptions.

You'll see different sections of this file:

-   `term` includes terminology that's frequently used. Wordplay will use these as headers, but you can also reuse them in other text in this file with the format `$[term]`. For example, suppose you want wanted to reuse the same word "código" everywhere. Rather than writing "código" in some other text, you can just type "$code" and it will be replaced with "código" in the interfaces. This helps ensure consistency everywhere, and makes it easy to change your mind later about what word to use, rather than having to search and replace it.

-   `token` includes descriptions of every kind of symbol in a Wordplay program. These appear when selecting a token in the Wordplay editor, and are also given to screen readers to read when selected.

-   `node` includes many things about all of the parts of a Wordplay program that exist.

    -   `name` appears in the documentation and in the editor and describes what kind of content it is, like `token` descriptions.
    -   `description` may be the same text, or if there's some way of describing an instance of content in more specific way, this is better. (For example, rather than describing a function as just "function", the description might be the name of the function).
    -   `emotion` is the default emotion that nodes are given when they appear in the interface to speak. This determines their animation and the screen reader description of their emotion.
    -   `doc` is the documentation that appears for the node. It should thoroughly explain how to use the node, in a consistent voice for the node's emotion and personality.
    -   Nodes that can be evaluated have a `start` and `finish`, which appear in the interface during step by step evaluation, and describe what the node is doing to start evaluation and finish it. Some nodes only have a `start`, because `finish` would be redundant. Some nodes also have additional phrases for intermediate steps, which appear when the node is evaluating those intermediate steps while stepping.
    -   Some nodes have additional descriptions for details they contain, like a list's "item". These appear in placeholders and autocomplete.
    -   Some nodes have a set of `conflict` phrases. These are essentially error messages that appear when there is an inconsistency on that particular kind of program content. Each conflict's `primary` text is written in the voice of the node on which the conflict occurs. If there is a `secondary`` phrase, it should be written in a generic voice, and generally be the opposite of the primary statement. This allows for the portrayal of a conflict between the two nodes.
    -   Some nodes have a set of `exception` phrases. These are shown when the node halts a program unexpectedly, usually due to a conflict. They are shown inside of program output. They should be phrased consistently with conflicts that create them, and in the voice of the node.

-   `native` describes the basic data types in Wordplay, including `name` and `doc`, just as in the `node` section. They also include `name` and `doc` for any functions and conversions that they have.

-   `input` and `output` describes input streams available in Wordplay, including their `name`, `doc`, and any `name` and `doc` for inputs that they take.

-   `ui` are phrases that appear in tooltips, screen reader descriptions, and headers in the interface. These are the easiest to find.

All strings in the locale file support a **template** syntax, which allows for a few kinds of dynamic behavior.

-   **Unwritten**. To indicate that the string has not yet been written, write an `""` or `"$?"`. This will help you keep track of what's not yet written.
-   **Inputs**. Some strings take inputs, as noted in their documentation. To refer to an input value, use a $, followed by the number of the input desired, starting from 1. For example, if a string took one input, and that input happened to be `Amy` you could say `"Hello, my name is $1"` and that would generate the text `"Hello, my name is Amy"` at runtime.
-   **Terminology** Remember the `term` field above? To refer to a term, `$` followed by any number of word characters (in regex, `/\$\w/`). `"To create a new $program, click here."`
-   **Conditions** To conditionally select a string, use `??`, followed by an input that is either a boolean or possibly undefined value, and true and false cases:
    -   `"I received $1 ?? [$1 | nothing]"` Would check the value of $1 and if its true or not undefined, show the value of `$1`, and show the text `nothing` otherwise
    -   `"I received $1 ?? [$2 ?? [$1 | $2] | nothing]"` Does the same, but also does a check on the value of $2 inside.
-   **Escapes** To use a reserved symbol, just use two of them. Hopefully these aren't too common in your writing...
    -   `"$$"`
    -   `"[["`
    -   `"]]"`
    -   `"||"`

#### Tutorial files

The `[language]-tutorial.json` file refers exclusively to the structure of the tutorial. There is no template for this, as tutorials will likely reflect the structure of the English tutorial, which is about 20,000 words of English. Therefore, it's best to copy and paste it or another translation and start from it. You could write an entirely different play, and for some languages and cultures, that might make sense! That said, the structure, content, and sequence of the play was carefully constructed to teach the Wordplay programming language, so it's best to think carefully about how to deviate from its structure.

The tutorial is structured as a sequence of **Acts**, which are a sequence of **Scenes**, which are a sequence of **Lines**. Acts and scenes have a `name`, which appears on their introductory screens, as well as a `performance`, which is a Wordplay program to show on those introductory screens. Scenes also have an optional `concept`, which is one of the keys in the `node`, `input`, `output`, or `native` sections in the locale file.

There are five kinds of performance commands, each of which are a list of strings, the first of which is the mode in which to show the program, and the remaining of which are lines of the program to show.

-   **Output (fit)** `["fit", "code", ... ]` Program output is shown and fit to the window. Code is hidden.
-   **Output (fixed)** `["fix", "code", ... ]` Program output is shown, but not fit to the window. Code is hidden.
-   **Edit** `["edit", "code", ... ]` Both program output and code are shown. Output is fit.
-   **Conflict** `["conflict", "code", ... ]` Both program output and code are shown, and any conflicts in the code are intentional. This is important to note, since as you'll see below, we check tutorial programs for unintentional conflicts.
-   **Use** `["use", "name", "input1" ... "inputn" ]` This special performance refers to predefined performances in [Performances.ts](https://github.com/amyjko/wordplay/blob/main/src/tutorial/Performances.ts). You might find that you want to reuse programs written in other translations, rather than copying them into a translation. In that case, you can move them to `Performances.ts` and then everyone can reuse it. The programs in `Performances.ts` can all optionally take inputs, allowing them to be customized to a language, so when using one, be sure to check what inputs it requires.

Finally, a scenes `lines`: this is a list of one of three kinds of things:

-   **Pause** `null`, which represents a "pause" in a scene, which breaks up dialog into a separate screen.
-   **Dialog** (e.g., `["concept", "emotion", "dialog", ...]`).
    -   The first item in the list is the name of a `node`, `input`, `output`, or `native` in the locale file.
    -   The second item is an emotion. VS Code will autocomplete the allowed emotions (though let us know if you want to create a new one!).
    -   All remaining items are individual paragraphs that appear in a character's speech bubble. So if you want a new paragraph, add a separate string in the list. **Note**: all dialog is treated the same as `doc` fields in the locale, so you can format text in all the same ways, including rich text formatting, web links, concept links, and code examples.
-   **Performance** Just like the performances in the `acts` and `scenes`. The key difference, however, is that these persist: whatever performance is included as a line will be shown until a new performance is reached in the play.

### Verifying

So you've written a bit of translation and want to make sure you followed all the rules above?

First, you can rely on VS Code to catch some things.
For example, it will do autocomplete and highlight any errors with your file's structure, using a schema that we wrote to specify what makes a valid locale or tutorial file.
That should help with editing.

But VS Code can't check everything, so we wrote a little tool to help you find more subtle problems.
In the terminal, just type

`npm run locales`

And a little program will run (and re-run) every time you save your locale or tutorial files, and tell you about any problems, including unwritten strings, code with errors, invalid formatting, invalid concept links, and more.
Keep chipping away at your translation until there are no more problems.

### Submitting

Ready to submit your localization for review?
We prefer you use a GitHub pull request.
You can set up [an extension in VS Code](https://github.blog/2019-01-07-create-pull-requests-in-vscode/) that makes this a bit easier.

When you write your request, hopefully you've already been in contact with Amy, and so it isn't a surprise (though surprise locales are welcome).
The team will review the localization for any technical problems and chat with you about how you want to be credited.

Because the team isn't likely to be able to review your translation, we do expect you to show it to someone else fluent in your language for feedback.
Have them read it for any clarity issues before you submit, just as you would for any writing that was going to be widely read.

If everything looks good, we'll incorporate your draft, update [SupportedLanguages](https://github.com/amyjko/wordplay/blob/main/src/locale/SupportedLanguages.ts) so that the world can see your writing, and then hopefully release it soon.

### Maintaining

Wait, don't go!
We really appreciate your contribution, but we're likely going to need ongoing maintenance.
For example, suppose we add a new language feature, and so there's new documentation to write.
Or say we change the behavior of some aspect of the language, and so documentation has to change.

When this happens, we'll take all past contributors to localization and ask them to review the changes and update locales accordingly, so text is up to date with any changes.

If you can't contribute anymore, consider seeing if you can recruit someone who can.
