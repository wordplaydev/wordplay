const Mappings: Record<string,string> = {
    "/": "em",
    "_": "u",
    "*": "span class='light'",
    "**": "strong",
    "***": "span class='extra'"
};

export default function wordplayMarkupToHTML(text: string) {

    // This should be Unicode safe because we're only manipulating a fixed set of ASCIi characters.
    let html = "";
    let stack: string[] = [];
    for(let i = 0; i < text.length; i++) {
        let char = text.charAt(i);
        if(char === "*") {
            while(text.charAt(i + 1) === "*") {
                i++;
                char += "*";
            }
        }
        if(char in Mappings) {
            if(stack[0] === char) {
                stack.shift();
                html += `</${Mappings[char].split(" ")[0]}>`;
            }
            else {
                stack.push(char);
                html += `<${Mappings[char]}>`;
            }
        }
        else html += char;
    }
    return html;
}