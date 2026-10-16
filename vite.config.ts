import { defineConfig, type Plugin } from 'vite';
import { getSite } from './src/data';
import { renderHead, renderBody } from './src/render';

// Pre-renders every section from resume.json into index.html, so the page is
// complete without JavaScript. main.ts only adds enhancements.
// Drafts ("draft": true) render in dev only, never in the production build.
function prerender(drafts: boolean): Plugin {
  return {
    name: 'prerender-resume',
    transformIndexHtml(html) {
      const site = getSite(drafts);
      return html.replace('<!--head-->', renderHead(site)).replace('<!--app-->', renderBody(site));
    },
  };
}

export default defineConfig(({ command }) => ({
  // Relative base works for GitHub Pages project sites (user.github.io/repo/) and custom domains.
  base: './',
  plugins: [prerender(command === 'serve')],
}));
