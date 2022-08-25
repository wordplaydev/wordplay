export const examples: Record<string, string> = {
WhatWord:
`
↓ ⌨️

•Game(guesses•[""] secret•"")
(
    ƒ guessesRemaining() (secret.length() · 2) - guesses.length()
    ƒ status()  secret = "" ? "start"
                guessesRemaining() ≤ 0 ? "lost"
                secret→[].all(ƒ(letter) guesses.has(letter)) ? "won"
                "playing"
)

words: ['kitty' 'house' 'heat' 'farm' 'townhouse' 'heatwave']
start: Game([] "")

state•Game: start
    ∆ ⌨️ 
        ⌨️.key = "Escape" ?
            start
        (state.status() ≠ "playing") ∧ (⌨️.key = " ") ∧ ⌨️.down ? 
            Game([] words.random())
        (state.status() = "playing") ∧ ⌨️.down ∧ (⌨️.key.length() = 1) ∧ ¬ state.guesses.has(⌨️.key) ? 
            Game(state.guesses.add(⌨️.key) state.secret)
            state

status: state.status()
board: Letters(state.secret→[].translate(ƒ(letter) ((status = "lost") ∨ state.guesses.has(letter)) ? letter "_").join(' ') 24pt)
content: status = "start"   ?   Group(Vertical() Letters("Welcome to WhatWord!" 30pt) Letters("Press space to begin") Letters("Type letters to guess"))
         status = "lost"    ?   Group(Vertical() board Letters("You lost. Press space to play again."))
         status = "won"     ?   Group(Vertical() board Letters("You won, nice job! Press space to play again."))
                                Group(Vertical() board Letters("Guesses: \\state.guesses.join(' ')\\" 16pt) Letters("\\state.guessesRemaining()→''\\ remaining" 12pt))

Verse(content)
`,
AnimatedFace: 
`
↓⏱
🥹: {⊤: «😀» ⊥: «😂»}
∥: ⏱ % 2 = 0ms
Letters(🥹{∥} 32pt «Noto Sans»)
`
};