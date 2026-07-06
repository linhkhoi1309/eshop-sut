# Critique of the AI Collaborator

The AI was very helpful during this assignment because it sped up testing and generated ideas quickly. However, it also made several mistakes that showed its limitations.

One major mistake was generating a test case called "admin cancels a shipping order" that actually performed a user cancellation. As a result, it reported a known bug instead of testing the intended scenario. This happened because the AI generated a plausible test without fully checking that it matched its own description.

The AI was also sometimes too eager to agree with my assumptions. In one case, when I suggested that a behavior might be a bug, it immediately created a GitHub issue claiming that admins should be able to cancel shipping orders. After checking the state diagram, I found that the system was actually behaving correctly and the issue had to be removed.

Another limitation was that the AI tended to be conservative when requirements were unclear. It classified several ambiguous cases as "not a bug" because they were not explicitly forbidden by the specification, rather than considering whether the behavior was inconsistent or confusing.

The AI's work was sometimes incomplete as well. It missed some admin-transition test coverage and generated a `.http` file that did not work correctly because it used a token setup that was never verified.

Overall, I learned that AI is a useful assistant but not a reliable authority. It can generate tests, tools, and bug reports quickly, but its outputs must be checked carefully. The human tester must remain responsible for verifying results, questioning assumptions, and making the final judgment when requirements are unclear.
