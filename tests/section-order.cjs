const assert = require('node:assert/strict');
const { readdir, readFile } = require('node:fs/promises');
const path = require('node:path');

module.exports = async function sectionOrder(browser) {
    const root = path.resolve(__dirname, '..');
    const sources = [];
    for (const directory of ['src/components', 'src/pages']) {
        for (const name of await readdir(path.join(root, directory), { recursive: true })) {
            if (!name.endsWith('.html')) continue;
            const filename = `${directory}/${name}`;
            sources.push({ filename, source: await readFile(path.join(root, filename), 'utf8') });
        }
    }

    const page = await browser.newPage();
    try {
        const failures = await page.evaluate(sources => {
            const failures = [];
            for (const { filename, source } of sources) {
                const template = document.createElement('template');
                template.innerHTML = source;
                let previous = 0;
                for (const node of template.content.childNodes) {
                    if (node.nodeType === Node.COMMENT_NODE ||
                        (node.nodeType === Node.TEXT_NODE && !node.textContent.trim())) continue;
                    const section = node.nodeName === 'SCRIPT' ? 1 : node.nodeName === 'STYLE' ? 2 : 0;
                    const labels = ['markup', 'script', 'style'];
                    if (section < previous) {
                        failures.push(`${filename}: misplaced ${labels[section]} (${node.nodeName}) after ${labels[previous]}`);
                    }
                    previous = Math.max(previous, section);
                }
            }
            return failures;
        }, sources);
        assert.deepEqual(failures, [], `Use HTML → JavaScript → CSS:\n${failures.join('\n')}`);
    } finally {
        await page.close();
    }
};
