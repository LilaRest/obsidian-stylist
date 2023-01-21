import { hasPseudoElements, parseRulesets, parseSelector, splitPseudoElements } from 'not-a-real-css-parser';
import { Plugin } from 'obsidian';

const CLASSNAME_TAG = 'classname:';

const makeScopedStyles = (rootSelector: string, source: string): string =>
    parseRulesets(source).map(({ selector, declarations }) => {
        if (hasPseudoElements(selector)) {
            return parseSelector(selector).map((selector) => {
                const [selectorHead, pseudoElement] = splitPseudoElements(selector);
                return `${rootSelector} :is(${selectorHead})${pseudoElement ?? ''} {${declarations}}`;
            })
            .join(',');
        }
        return `${rootSelector} :is(${selector}) {${declarations}}`;
    })
    .join('\n');

export default class extends Plugin {

    onload() {
        // Render the 'style' code blocks
        this.registerMarkdownCodeBlockProcessor('style', (source, element) => {
            element.createEl('style', {
                text: makeScopedStyles('.markdown-preview-view', source)
            });
        });

        // Render the custom block classes
        let nextBlockClass: string | null = null;
        this.registerMarkdownPostProcessor((element) => {

            // If the previous element was a custom class block
            if (nextBlockClass) {

                // Add the custom class to the current element
                element.classList.add(nextBlockClass);

                // Reset the nextBlockClass and return
                nextBlockClass = null;
                return;
            }

            // Else if the current block is a custom class block
            const classBlock = [...element.querySelectorAll('code')].find((codeEl) => codeEl.innerText.trim().startsWith(CLASSNAME_TAG));
            if (classBlock) {

                // Retrieve the custom class name for the next block
                nextBlockClass = classBlock.innerText.trim().replace(CLASSNAME_TAG, "").trim();
                
                // Remove the classBlock element from the render
                classBlock.parentElement?.remove()
            }
        });
    }
}
