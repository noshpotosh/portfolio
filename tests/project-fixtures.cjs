const repository = (name, topics) => ({
    name, topics, default_branch: 'release/docs',
    html_url: `https://github.com/noshpotosh/${name}`,
    description: 'Project summary <b>plain text</b>', language: 'JavaScript',
    homepage: 'https://example.com/project',
});
const repositories = [
    repository('live-work', ['portfolio-work', 'portfolio-featured', 'typescript']),
    repository('live-play', ['portfolio-play', 'portfolio-work', 'webgl']),
    repository('missing', ['portfolio-work']),
    repository('unlisted', []),
    repository('cfjs', ['portfolio-work', 'javascript']),
];
const markdown = '# Project study\n\n## Results\n\n- First result\n- Second result\n\n| Metric | Result |\n| --- | --- |\n| Test | Passed |\n\n```js\nconst example = "<script>";\n```\n\n[Docs](docs/guide.md)\n\n![Screenshot](docs/screenshot.png)\n\n![Gallery one](docs/screenshot.png)\n![Gallery two](docs/screenshot.png)\n\n<script>window.caseStudyScript = true;</script>\n\n[Unsafe](javascript:alert(1))\n\n[Local](#results)\n\n' + 'Detailed results.\n\n'.repeat(12);
module.exports = { repository, repositories, markdown };
