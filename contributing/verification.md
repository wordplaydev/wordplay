# Verification

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
