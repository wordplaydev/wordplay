let context: CanvasRenderingContext2D | null = null;

function getRenderingContext() {
    // Make it if we don't have it.
    if(context === null) { 
        const canvas = document.createElement("canvas");
        canvas.id = "measurer";
        canvas.style.position = "fixed";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.display = "none";
        document.body.appendChild(canvas);
        context = canvas.getContext("2d");
    }
    return context;
}

// There are almost certainly faster ways to do this. I'm going to do this here for now
// and save this for a performance task later. Note that this assumes a font is loaded;
// it's up to callers to track whether the measurement is wrong.
export default function getTextMetrics(text: string, cssFont: string): TextMetrics | undefined {

    const context = getRenderingContext();
    if(context === null) return undefined;
    context.font = cssFont;
    return context.measureText(text);
 
}