export const examples: Record<string, string> = {
WhatWord:
`↓ ⌨️
\`This represents the game state\`/eng
•Game(guesses•[""] secret•"")
(
\tƒ guessesRemaining() (secret.length() · 2) - guesses.length()
\tƒ status()
\t\tsecret = "" ? "start"
\t\tguessesRemaining() ≤ 0 ? "lost"
\t\tsecret→[].all(ƒ(letter) guesses.has(letter)) ? "won"
\t\t"playing"
)

\`These are the secret words. Don't tell anyone\`/eng
words: ['kitty' 'house' 'heat' 'farm' 'townhouse' 'heatwave']
start: Game([] "")

\`The game depends on the keyboard state; each time it changes, the game state changes\`/eng
state•Game: start ∆ ⌨️
\t\t⌨️.key = "Escape" ? start
\t\t(state.status() ≠ "playing") ∧ (⌨️.key = " ") ∧ ⌨️.down ? Game([] words.random())
\t\t(state.status() = "playing") ∧ ⌨️.down ∧ (⌨️.key.length() = 1) ∧ ¬ state.guesses.has(⌨️.key) ? Game(state.guesses.add(⌨️.key) state.secret)
\t\tstate

\`We use this a lot below, so we just get it once\`/eng
status: state.status()

\`The board is a translation of the secret, accounting for guesses\`/eng
board: Phrase(state.secret→[].translate(ƒ(letter) ((status = "lost") ∨ state.guesses.has(letter)) ? letter "_").join(' ') 24pt)

\`The rest of the game screen depends on the game status\`/eng
content:
\tstatus = "start" ? Group(Vertical() Phrase("Welcome to WhatWord!" 30pt) Phrase("Press space to begin") Phrase("Type letters to guess"))
\tstatus = "lost" ? Group(Vertical() board Phrase("You lost. Press space to play again."))
\tstatus = "won" ? Group(Vertical() board Phrase("You won, nice job! Press space to play again."))
\t\tGroup(Vertical() board Phrase("Guesses: \\state.guesses.join(' ')\\" 16pt) Phrase("\\state.guessesRemaining()→''\\ remaining" 12pt))

Verse(content)
`,
AnimatedFace: 
`
↓⏱
🥹: {⊤: «😀» ⊥: «😂»}
∥: ⏱ % 2 = 0ms
Phrase(🥹{∥} 32pt «Noto Sans»)
`
};