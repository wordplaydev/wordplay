# Development

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
