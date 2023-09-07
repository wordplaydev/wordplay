# Hi helper!

Welcome! You must be here to make programming accessible to everyone in the world, regardless of language or ability. We're excited to have your help!

This document is your guide for several types of contributions:

-   [Development](#development)
-   [Verification](#verification)
-   [Localization](#localization)

Others are to come.

## Principles

Before getting started, ther are several key principles we expect you to follow when contributing to the project:

-   **Be kind**. Not only to everyone else contributing, but to anyone who expresses interest in helping, and to everyone who uses the platform. This is not a place to gatekeep, shame, or criticize, its a place to learn, grow, and affirm. We want everyone who engages here to leave feeling smarter, more capable, more welcome, and more valued.
-   **Attend to the details**. Don't take shorcuts or ignore design details; work on them, or detail the work to be done for later. This is not only important in any engineering and design work, which demands attention to detail in both building and verification, but it also matters greatly for our projects goals of decolonization, justice, and equity in programming. Details of the mundane are where many are where injustice often lives, because it's easiest to ignore.
-   **Deviate consciously**. This project as a large number of established architectural and interaction design patterns. Most of them were very consciously chosen to support some design goal; some may have been accidents or not well thought through. Before you begin design or engineering work, study how things have been done, and do them like that. And if you find yourself wanting to deviates from other other things work, pause talk to others, and make sure that the deviation is a good idea. Don't deviate just because it's the shortest path.
-   **Learn from each other**. While Amy is leading, and is a teacher, everyone else in this community is a key source of knowledge too. Write questions in Slack, teach each other, challenge each other to do better. The project relies on everyone to be a source of knowledge and expertise to be successful.

## Getting Started

Regardless of what role you take on, there are a few things you should start with:

0.  Make sure you're on the #wordplay channel on [ComputingEd@UW Slack](https://computinged-uw.slack.com) so you can reach others and they can reach you.
1.  Start by going through the Wordplay tutorial to learn the language and get used to the interface. (Submit any defects you find as issues).
2.  Make a few Wordplay programs to get used to what's possible to create with it.
3.  Do the [setup](#setup) below
4.  Read the section in this document appropriate for the role you want to have.

This guide is always evolving, so [write Amy](mailto:ajko@uw.edu) if you have ideas for how to improve it.

## Setup

For setup, our goal is for you to install a code editor, clone the Wordplay repository, install all of the necessary parts of the Wordplay implementation.

1. **Install Node**. If you don't have `node` installed, [install it](https://nodejs.org/en/download). And if you don't know if you do, you probably don't. It won't hurt to install it again.
2. **Install VS Code**. If you don't have VS Code installed, [install it](https://code.visualstudio.com/). It's a popular code editor, and the one we most recommend for contributing.
3. **Clone the Wordplay repository**. Open VS Code, and then find the toolbar icon called "Source Control". Click it, and you'll a panel with a few buttons appears, one labeled "Clone Repository". Click it, then copy and paste `https://github.com/amyjko/wordplay` into the prompt. Once you enter it, it'll ask you where you want to clone the repository; choose a place on your computer where you want to store it.
4. **Open the repository in VS Code**. It'll work for a second to get the repository from the internet, then ask you if you want to open it. Say yes. It'll then ask you whether you whether you trust the authors. (Do you? I trust me, but that's me.)
5. **Open a terminal**. In the menu, choose `Terminal > New Terminal` to open up a command line so we can do some work with some commands. Keep this open; you'll be using it later.
6. **Install dependencies**. Type `npm install`. This will install all of the code that Wordplay needs to run. If you run into problems, it's likely an issue with how Node was installed, and quite often permissions issues. There are so many things that can go wrong here, so web search is your friend if you're seeing an error.

Also, and this is key, Wordplay's code and dependencies are always changing, so it's important to run these two commands every once in a while:

```
git pull
npm update
```

They will pull in new Wordplay code from GitHub and also new code that Wordplay depends on. Think of this like any other software update hygiene.

If you made it this far, you're all set up! Let's proceed to working on some localization.

## Development

Hello developer! If you're reading this, it's because you want to help fix bugs, build new features, and make Wordplay the best Wordplay it can be. We're excited to collaborate with you!

Assuming you've done the steps at the top of this guide first, you should have a sense of what Wordplay. The next step is to understand how it's built. For that, you should read [ARCHITECTURE.md](https://github.com/amyjko/wordplay/blob/main/ARCHITECTURE.md), which overviews all of the major components in the Wordplay implementation. and key dependencies. If you're working in a specific part of Wordplay's implementation, it's okay to just read the subsections that are relevant.

After you've learned the architecture, the rest is all process. Here's how we generally work:

First, When working, always have at least four terminals open, one with `npm run dev` (for interactive testing while you build), one with `npm run check` (to show any TypeScript errors), one with `npm run test` to (ensure you know when any tests fail), and one with `npm run locales` (to know when you've violated any localization rules).

We use the [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow) branching strategy on this project. Here's what it looks like in practice:

Once you have your environment set up:

1. Review [available issues](https://github.com/amyjko/wordplay/issues), searching for the ones you like. If you're just starting, filter by the `starter` label to find issues that might be easier for someone learning the implementation.
2. Ask Amy to assign it to you, so everyone knows that you're the point of contact for it.
3. Review the current behavior and the text of the issue. Does it need elaboration, minimal reproduction steps, design work? Make sure everything aligns with the issue templates, adding any information necessary in the main description of the issue. (Only use comments for discussion about the issue, treating the description as the latest summary of the conversation.)
4. When you're ready to work on the issue, create a branch from `main` in which to do your work. If you're a contributor on the repository, you can create the branch in our repository. If you're not, you can create a fork and make a branch in your fork for later merging through a pull request. Publish it if you like, so that others can work on it with you.
5. If there is no test that verifies the defect is repaired, write one (there probably isn't one, which is why there's a defect!). If it's a new feature, you may need to write multiple to express all of the feature's requirements. See the [verification](#verification) selection below on test writing for guidance.
6. Fix the defect, or build the feature. Talk to everyone who might have a stake in the decision, including Amy, other contributors, and make sure the design and implementation decisions you're making are aligned with the project's existing patterns.
7. Commit to your branch. It's okay to have multiple commits as long as the last one explicitly references the issue you worked on, so that GitHub automatically closes the issue when your fix is merged. The `main` branch is likely to change as you work. Regularly pull from `main`, then `git rebase main` in your feature branch, replaying your commits over any changes to main that have happened since you branched from it.
8. When you believe your work is done, submit a pull request, requesting your branch be merged into `main`. Write a detailed explanation of the issue, the work you did, and any issues or decisions you had to make that the reviewer might need to consider.
9. The reviewer may come back with feedback for you to address before your work is merged to `main`. This includes automated feedback, such as tests that have failed.
10. Once your pull request is accepted, delete your branch, so we have a tidy set of branches. (Your commits are saved, its just the branch that's gone).

Once you're done, go back to step 1 above pick another issue!

## Verification

Thanks for helping verify that Wordplay works as intended!

Wordplay uses [vitest](https://vitest.dev/) for testing. The basic concept behind vitest is that `.test.ts` contain tests, and it will find them wherever they are in our project, and run them. The `npm run test` command defined in `package.json` will watch for changes and re-run tests whose dependencies have changed, so testing is fast and incremental.

Writing good tests involves good coverage; contributing tests means writing tests that increase our coverage of untested aspects of the platform. Our footprint is relatively large, so we don't yet track coverage in a systematic way, so for now, here's the process you should follow for contributing tests:

1. Find components that do not have test files at all, especially ones that have a large number of dependencies, such as the core programming language and runtime.
2. Once you've found a good area of focus, create a branch off of `main` to represent the tests you want to write.
3. Create test files where they don't exist
4. Write tests that attempt to cover all possible ways the component might execute. Wordplay is generally written functionally with immutable data structures, so it should be relatively straightforward to write tests without having to worry about setting up any other state.
5. As you write tests, you may find defects. Congratulations, you're in the best position to fix them! If you see the issue, go ahead and commit fixes. But you may also need to coordinate with others on the right fix, and optionally submit an issue if it's a particularly hard defect.
6. Once you have a collection of tests you're happy with (and that all pass, obviously), submit a pull request for merging into `dev`. Iterate with the reviewer on your tests until they're satisfied.
7. Delete your branch (and fork, if you made one).

Once you're done, go back to step 1 and pick another area to test!

Along the way, you may wonder if your work is of value; after all, there are an infinite number of tests we could write, and not all will catch bugs. The best way to think about it is this: even if all the tests you write pass correctly, and you don't find any defects, the tests you're writing may _prevent_ defects in the future, when we change things. That's the value you're providing.

## Creating

We're so excited to have your help curating great examples! This role is all about writing Wordplay performances that illustrate how to use Wordplay, share useful design patterns, and illustrate the platforms principles (accessibility, localization, playfulness).

Creating performances entails:

1. Envisioning a performance that complements the performances in your curated galleries.
2. Implementing, documenting, and debugging it
3. Ensuring that names and it's fully localized into at least two languages
4. Ensuring that it's accessible
5. Choosing a gallery for it
6. Publishing it

You can talk to Amy to decide whether it should be a built in example or whether it should live in the database.
Built in exmaples are part of the verification infastructure, and help ensure Wordplay is working as intended.
Database examples aren't, but help enrich the collection of examples.

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

### Editing

Until we manage to build some better web-based tools for localization, contributing localizations currently requires using the tools that software developers use to build Wordplay.
This isn't ideal, so hopefully these instructions make it as easy as possible.

Wordplay localization files life in the folder `static/locales` -- with one exception, which is English. You'll find that in `src/locale/en-US.json`, because it's imported as a default locale, since it has several symbolic names for things.
Inside the `static/locales` folder are folders that are named using [ISO 639-1 language codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes).
And inside each of those folders are two files: a `[language].json` file that has all of the text and templates for the Wordplay user interface, and then separately, a `[language]-tutorial.json` file, which has the tutorial in that language.

These are separate files primarily for efficiency: because tutorial can be large, Wordplay only loads it when it needs to, even if it's loaded all of the other text for a localization.

You may not see a folder for the language code you want to work on.
That means you're the first to work on it!
You'll find a folder `static/locales/example` that contains templates to start from.

-   Copy that folder and rename it and its files to the language code that you want to work on, or copy an existing locale and start from it (being careful to keep track of which strings aren't yet translated).
-   Then find `Locale.ts` and find the `EventuallySupportedLocales` variable. Add the locale you're working on to that list; make sure it matches the name and region you give for the locale file. This will make it so that you can switch to the locale locally, even though the locale isn't supported yet.

Before you can test your edits in the interface, you need to add the locale you're editing to the "eventually" supported locales. These are stored in `Locale.ts`, in a constant near the top of the file. Add it there, and you'll be able to see that option in the language chooser.

The recommended editing setup is as follows:

-   Have VS Code open with the locale file you're editing
-   Open a terminal and run `npm run dev`; this will show a link like `http://localhost:5173`. Open that link in a web browser and you'll see the Wordplay application. Position the browser window side by side with VS Code.
-   Edit your locale file. Every time you save (`cmd/ctrl + s`), the browser tab will refresh. This will let you iteratively write, save, and check formatting and appearance.
-   Find the concept you're editing in the documentation panel by searching for it's name. That'll help you see live updates on each save. For conflict messages, you should be able to find code examples that produce the conflict in the tooltips of the message.

Now, let's talk about how these files are structured!

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

-   `basis` describes the basic data types in Wordplay, including `name` and `doc`, just as in the `node` section. They also include `name` and `doc` for any functions and conversions that they have.

-   `input` and `output` describes input streams available in Wordplay, including their `name`, `doc`, and any `name` and `doc` for inputs that they take.

-   `ui` are phrases that appear in tooltips, screen reader descriptions, and headers in the interface. These are the easiest to find.

All strings in the locale file support a **template** syntax, which allows for a few kinds of dynamic behavior.

-   **Unwritten**. To indicate that the string has not yet been written, write an `"$?"` at the beginning of it. This will help you keep track of what's not yet written.
-   **Out of date**. To indicate that the string might be out of date with respect to the primary English translation, write an `"$!"` at the beginning of it. Any time someone makes a change to the English translation, they should add these to every other translation so that others know to check them.
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

The tutorial is structured as a sequence of **Acts**, which are a sequence of **Scenes**, which are a sequence of **Lines**. Acts and scenes have a `name`, which appears on their introductory screens, as well as a `performance`, which is a Wordplay program to show on those introductory screens. Scenes also have an optional `concept`, which is one of the keys in the `node`, `input`, `output`, or `basis` sections in the locale file.

There are five kinds of performance commands, each of which are a list of strings, the first of which is the mode in which to show the program, and the remaining of which are lines of the program to show.

-   **Output (fit)** `["fit", "code", ... ]` Program output is shown and fit to the window. Code is hidden.
-   **Output (fixed)** `["fix", "code", ... ]` Program output is shown, but not fit to the window. Code is hidden.
-   **Edit** `["edit", "code", ... ]` Both program output and code are shown. Output is fit.
-   **Conflict** `["conflict", "code", ... ]` Both program output and code are shown, and any conflicts in the code are intentional. This is important to note, since as you'll see below, we check tutorial programs for unintentional conflicts.
-   **Use** `["use", "fit|fix|edit|edit|conflict", "name", "input1" ... "input-n" ]` This special performance refers to predefined performances in [Performances.ts](https://github.com/amyjko/wordplay/blob/main/src/tutorial/Performances.ts). You might find that you want to reuse programs written in other translations, rather than copying them into a translation. In that case, you can move them to `Performances.ts` and then everyone can reuse it. The programs in `Performances.ts` can all optionally take inputs, allowing them to be customized to a language, so when using one, be sure to check what inputs it requires.

Finally, a scenes `lines`: this is a list of one of three kinds of things:

-   **Pause** `null`, which represents a "pause" in a scene, which breaks up dialog into a separate screen.
-   **Dialog** (e.g., `["concept", "emotion", "dialog", ...]`).
    -   The first item in the list is the name of a `node`, `input`, `output`, or `basis` in the locale file.
    -   The second item is an emotion. VS Code will autocomplete the allowed emotions (though let us know if you want to create a new one!).
    -   All remaining items are individual paragraphs that appear in a character's speech bubble. So if you want a new paragraph, add a separate string in the list. **Note**: all dialog is treated the same as `doc` fields in the locale, so you can format text in all the same ways, including rich text formatting, web links, concept links, and code examples.
-   **Performance** Just like the performances in the `acts` and `scenes`. The key difference, however, is that these persist: whatever performance is included as a line will be shown until a new performance is reached in the play.

#### Rich text

All `doc` fields in the locale (and all dialog) can use the following formatting syntax:

| Format         | Example                                              |
| -------------- | ---------------------------------------------------- |
| **Bold**       | `*I am bold*`                                        |
| _Italic_       | `/I am italic/`                                      |
| **Extra bold** | `^I am extra bold^`                                  |
| Underline      | `_I am underlined_`                                  |
| Concept link   | `I am a concept link to @Text`                       |
| Web link       | `I am a web link to <wordplay@https://wordplay.dev>` |
| New paragraph  | `\n\n`                                               |
| Wordplay code  | `\1 + 1\`                                            |

In the locale and tutorial files, you can also separate paragraphs by using an array of strings, where, each string is a paragraph: `["Paragraph one", "Paragraph two"]`.

Code that is alone in a paragraph shows its output. Code that is inline in a paragraph just shows the code. Create multiline code either by using `\n` in a string, or for better readability, as an array of strings, where each string is on a line: `["a: 'line one'", "b: a + 'line two'"]`.

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

### Fonts

An important part of supporting a language is finding fonts that support the language. Unfortunately, there aren't many outside the Latin character set. Fortunately, there are Noto fonts for most scripts. Find multiple open and free fonts that are appropriate, including the Noto font that supports the script, and any others you can find. The best place for these is [Google Fonts](https://fonts.google.com).

If you're comfortable with it, download the font, add the metadata to `Fonts.ts`, and set the font as the default face for the locale.

-   Download the font files and rename them according to the schemes you see in other font folders. Font names can have spaces in the metadata, but not in the folder or file names. The basic syntax for files is `name-weight[-italic]`, and if the font is a variable with font, then just `name-all`.
-   Be sure to note in the metadata which font weights are supported and whether italics are supported.
-   Once you've updated the metadata and included the font files in the `/static` folder, test them to make sure they appear in the palette and render correctly once chosen.

If the above is outside your skillset, ask someone else to do it before submitting your locale for final revision. We don't want to launch a locale without proper font support!

### Submitting

It's best to submit your revisions in chunks, rather than all at once. After all, a lot can change in the `main` branch while you're editing. Here are a few tips:

-   Sync with main regularly by doing a `git pull` in the `main` branch, then in your localization branch, running `git rebase main`. That will replay your commits over all the changes that have happened in main since you branched.

-   Submit pull requests for chunks of work you finish, as described below.

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
