# Setup

All roles will likely require setting up an environment that lets you run Wordplay locally, on your device. That requires installing a bunch of stuff, including a code editor, the Wordplay repository, and the many dependencies that Wordplay has. Here is the current list of required installs:

1.  Make sure you're on the #wordplay channel on [ComputingEd@UW Slack](https://computinged-uw.slack.com) so you can reach others and they can reach you. Reach out to this channel for help on any of the steps below.
1.  If you don't have a GitHub account, create one.
1.  **Install Node**. If you don't have `node` installed, [install it](https://nodejs.org/en/download). And if you don't know if you do, you probably don't. It won't hurt to install it again. This allows you to install all of the packages that Wordplay depends on to run.
1.  **Install VS Code**. If you don't have VS Code installed, [install it](https://code.visualstudio.com/). It's a popular code editor, and the one we most recommend for contributing. It also has the best support for TypeScript and Svelte of any editor.
1.  **Install VS Code Extensions**. At a minimum, you'll want "Prettier" and "Svelte for VS Code".
1.  **Clone the Wordplay repository**. Open VS Code, and then find the toolbar icon called "Source Control". Click it, and you'll a panel with a few buttons appears, one labeled "Clone Repository". Click it, then copy and paste `https://github.com/amyjko/wordplay` into the prompt. Once you enter it, it'll ask you where you want to clone the repository; choose a place on your computer where you want to store it. Remember that this is just a local copy of the repository; any changes you make are local until you submit them as a pull request to GitHub.
1.  **Open the repository in VS Code**. It'll work for a second to get the repository from the internet, then ask you if you want to open it. Say yes. It'll then ask you whether you whether you trust the authors. (Do you? I trust me, but that's me!)
1.  **Open a terminal**. In the VS Code menu, choose `Terminal > New Terminal` to open up a command line so we can do some work with some commands. Keep this open; you'll be using it later. You may have many open at once.
1.  **Install dependencies**. Type `npm install`. This will install all of the code that Wordplay needs to run. If you run into problems, it's likely an issue with how Node was installed, and quite often permissions issues. There are so many things that can go wrong here, so web search on the error you're seeing, or write in #wordplay for help.

Once everything above is installed, try this command in a terminal:

`npm run dev`

That should start a local web server and give you a URL like `localhost:5173` for you to visit in your browser. You should now see the Wordplay website. If you don't, there's either a problem with your setup above or Wordplay. Don't worry, it's not your fault. We'll get through it together.

Finally -- and this is key -- Wordplay's code and dependencies are always changing, so it's important to run these two commands every once in a while:

```
git pull
npm update
```

They will pull in new Wordplay code from GitHub and also new code that Wordplay depends on. Think of this like any other software update hygiene.

If you made it this far, you're all set up! Go back to the page for your role to see next steps.
