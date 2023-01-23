import { read } from 'fs';
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
        this.registerMarkdownPostProcessor(
            (element, context) => {

                // Retrieve the blocks' container element
                const blocksContainer = context.containerEl;
                
                // Listen for insertion of the element into the blocks' container
                const observer = new MutationObserver(() => {

                    // If the element has been inserted
                    if (blocksContainer.contains(element)) {

                        // And if the current block is a custom class block
                        const classBlock = [...element.querySelectorAll('code')].find((codeEl) => codeEl.innerText.trim().startsWith(CLASSNAME_TAG));
                        if (classBlock) {

                            // Retrieve the custom class name
                            const nextBlockClass = classBlock.innerText.trim().replace(CLASSNAME_TAG, "").trim();

                            // Set the 'data-next-block-class' attribute with the custom class name
                            element.setAttribute("data-next-block-class", nextBlockClass);
                            
                            // Remove the classBlock element from the render
                            element.innerHTML = "";
                        }

                        // Or if the current block is not a custom class block
                        else {

                            // If it is preceded by a custom class block
                            const previousElement = blocksContainer.children.item([...blocksContainer.children].indexOf(element) - 1)
                            if (previousElement && previousElement.getAttribute("data-next-block-class")) {
                                
                                // Set the custom class to the current element
                                element.classList.add(previousElement.getAttribute("data-next-block-class"))
                            }
                        }

                        // Finally, stop listening for element insertion.
                        observer.disconnect();
                    }
                });
                observer.observe(blocksContainer, { attributes: false, childList: true, characterData: false, subtree: true });
            }
        );
    }
}
