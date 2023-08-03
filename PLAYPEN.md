# Welcome to the Wordplaypen!

It's probably not obvious, but this is a _pun_. It's a portmanteau of "Wordplay" (this platform) and "playpen" the English word for a small enclosed area in which children can safely play. This is important to know for several reasons:

-   Wordplay is full of puns
-   I want this to be a space where you can safely learn to contribute to a large software project.

Hence, _Wordplaypen_!

# Expectations

Independent studies are _independent_: that generally means that much of this quarter will be you, working with others, with minimal guidance. Of course, I will provide much guidance. I am the lead on this project, after all. But my expectation is that you work independently from until you can't, and that you depend on others before you depend on me.

For example, if you don't understand some aspect of the system, first read the documentation, if there is any. If there isn't any, ask someone else in the #wordplay channel of ComputingEd@UW Slack. If they don't know, then you should probably tag me so I can answer. That's what I mean by "independent".

# Roles

Every software project has people that play different roles. In many software organizations, these roles are often aligned with _titles_ (e.g., software engineer, designer, project manager, tester). But in Wordplaypen, I don't want you to think of these as titles. (After all, this isn't a job, it's a class, and an open source project). Instead, I want you to think of them as different domains of work, where you might be taking on multiple roles.

Here are the roles I've brainstormed so far, and what responsibilites those roles have:

| Role                       | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Engineering**            | Choose an issue, work with designers and Amy to identify a good design, then implement it, following the design patterns established in the code base. Ensure there are no type errors, write unit tests to verify the behavior to prevent regressions in the future, and submit a pull request for code review.                                                                                                   |
| **Engineering leadership** | Review pull requests. Consult with Amy on design patterns and code quality. Resolve conflicts between people engaging in engineering roles. Teach others about Wordplay, answering questions and providing knowledge they need to do their role successfully. Generate new and revised localization.                                                                                                               |
| **Design**                 | Many issues identify problems but do not have designs, or only have design sketches, without sufficient detail for engineering. This role takes design problems and envisions a concrete design suitable for implementation, iterating through community feedback and guidance from Amy. Design specifications should be in the main issue description, providing clear guidance for what needs to be implemented. |
| **Project management**     | Triage new issues, improving their quality, closing duplicates, linking to relevant issues, labeling them appropriately, deciding which milestones they belong in in consulation with Amy. Coordinate the engineering and design work of multiple students so that they don't do duplicative work and make conflicting decisions.                                                                                  |
| **Localization**           | Improve existing locales and write new ones. Adadpt existing languages for new regions. Build communities of students working on the same language to divide up the localization work while maintaiing a shared voice. Manage out of date translations.                                                                                                                                                            |
| **Testing**                | Find ways in which Wordplay does not work as intended, particularly in non-English, non-mouse based ways. Look for duplicates before submitting, create new issues. Write new unit tests to improve test coverage.                                                                                                                                                                                                 |
| **Writing**                | Improve documentation, including documents like this, the contributors guide, as well as Wordplay's documentation. Coordinate with localization teams around updates.                                                                                                                                                                                                                                              |

Remember: you could do more than one of the above. Your quarter could be a bit of localization, some testing, or maybe one big design project plus some project management. There's no reason to limit yourself to a single role if you want to try multiple. Just make sure the work you commit to is feasible for the time you've committed.

# Schedule

Because this is structured as a quarterly independent study, there's a certain rhythm to our work:

| Week | Goals                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Onboarding**. If you're new to the project, learn and read everything you need to know to contribute. If you've already contributed in one quarter, you'll help train. By the end of the first week, everyone should have high level knowledge of everything in this document and of the platform's design and implementation.                                                                                                              |
| 2    | **Assignments**. By the end of this week, everyone should choose one or more roles, and begin their role (e.g., engineering and design roles should choose some issues to work on, project managers should choose a set of issues to improve and begin coordinating work on Slack). The goal is to pick enough work that it fills the five weeks, but not so much that you won't finish it. We'll create a milestone for all selected issues. |
| 3-7  | **Implementation**. By the end of this 5 week sprint, designs and implementations should be done, ready for evaluation. For designers, this means having a candidate design posted in issues. For engineers, this means having a branch submitted as a pull request. For smaller issues, this can happen before the end of the sprint, but the end of week seven is the last chance.                                                          |
| 8-9  | **Verification**. We merge all approved pull requests into the `dev` branch, release to our staging server, and everyone tests the changes. Engineering debugs and patches. Designers interate and refine, getting their design finalized in their issue. Project management updates `CHANGELOG` to reflect all completed work. We update the version number.                                                                                 |
| 10   | **Release**. We merge `dev` into `main` and release to production, then have a party.                                                                                                                                                                                                                                                                                                                                                         |

I'm not interested in grading your independent studies. Just DM me a list of the commitments you made and how they went this quarter, and that's sufficient for a 4.0.

After the quarter, maybe you'll do it all again the next quarter!

In summer, I'll recruit a couple students to work full time on bigger features that take more time.

# Knowledge

There's a lot you need to know to contribute to Wordplay. Here's a growing list of things you should do and/or read during the onboarding week:

-   Go through the Wordplay tutorial to learn the language and get used to the interface. (Submit any defects you find as issues, taking on the verification role).
-   Read the relevant part of `CONTRIBUTING.md`.
-   Make a few Wordplay programs to get used to what's possible to create with it.
-   Read `ARCHITECTURE.md`, even if you don't want an engineering role. It explains key concepts in the implementation.
