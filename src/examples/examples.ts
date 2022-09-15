export const examples: Record<string, string> = {
WhatWord:
`↓ ⌨️
\`The game state is a list of guesses and a secret word.\`/eng
\`El estado del juego es una lista de conjeturas y una palabra secreta.\`/spa
•Game(guesses•[""] secret•"")
(
\tƒ guessesRemaining() (secret.length() · 2) - guesses.length()
\tƒ status()
\t\tsecret = "" ? "start"
\t\tguessesRemaining() ≤ 0 ? "lost"
\t\tsecret→[].all(ƒ(letter•"") guesses.has(letter)) ? "won"
\t\t"playing"
)

\`These are the secret words. Don't tell anyone!\`/eng
\`Estas son las palabras secretas. ¡No se lo digas a nadie!\`/spa
words: ['kitty' 'house' 'heat' 'farm' 'townhouse' 'heatwave']
start: Game([] "")

\`When the keyboard state changes, the game state changes.\`/eng
\`Cuando cambia el estado del teclado, cambia el estado del juego.\`/spa
state•Game: start ∆ ⌨️
\t\t⌨️.key = "Escape" ? start
\t\t(state.status() ≠ "playing") ∧ (⌨️.key = " ") ∧ ⌨️.down ? Game([] words.random())
\t\t(state.status() = "playing") ∧ ⌨️.down ∧ (⌨️.key.length() = 1) ∧ ¬ state.guesses.has(⌨️.key) ? Game(state.guesses.add(⌨️.key) state.secret)
\t\tstate

\`The board is a translation of the secret, accounting for guesses\`/eng
\`El tablero es una traducción del secreto, teniendo en cuenta las conjeturas.\`/spa
board: Phrase(state.secret→[].translate(ƒ(letter•"") ((state.status() = "lost") ∨ state.guesses.has(letter)) ? letter "_").join(' ') 24pt)

\`The rest of the game screen depends on the game status\`/eng
\`El resto de la pantalla del juego depende del estado del juego.\`/spa
screen:
\tstate.status() = "start" ? Group(Vertical() Phrase("Welcome to WhatWord!" 30pt) Phrase("Press space to begin") Phrase("Type letters to guess"))
\tstate.status() = "lost" ?  Group(Vertical() board Phrase("You lost. Press space to play again."))
\tstate.status() = "won" ?   Group(Vertical() board Phrase("You won, nice job! Press space to play again."))
\t\t\t\t\t\t\t\t\t\t\t\t\t\t Group(Vertical() board Phrase("Guesses: \\state.guesses.join(' ')\\" 16pt) Phrase("\\state.guessesRemaining()→''\\ remaining" 12pt))

Verse(screen)
`,
AnimatedFace: 
`
↓⏱
🥹: {⊤: «😀» ⊥: «😂»}
∥: ⏱ % 2 = 0ms
Phrase(🥹{∥} 32pt «Noto Sans»)
`
};