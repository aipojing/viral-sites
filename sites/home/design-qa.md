# Design QA — 怪好玩主站重做

## Comparison Target

- Source visual truth: `/Users/ahs/Documents/vibe-coding/viral-sites/output/playwright/style-comparison/concept-hybrid.png`
- Final implementation screenshot: `/Users/ahs/Documents/vibe-coding/viral-sites/output/playwright/rebuild-current/final-all-art.png`
- Full side-by-side evidence: `/Users/ahs/Documents/vibe-coding/viral-sites/output/playwright/rebuild-current/design-qa-final-art.png`
- Focused region evidence: `/Users/ahs/Documents/vibe-coding/viral-sites/output/playwright/rebuild-current/design-qa-focus-art.png`
- Interaction evidence: `/Users/ahs/Documents/vibe-coding/viral-sites/output/playwright/rebuild-current/interaction-mental-2.jpg`
- Library evidence: `/Users/ahs/Documents/vibe-coding/viral-sites/output/playwright/rebuild-current/all-projects-generated.png`
- Integrated route evidence: `/Users/ahs/Documents/vibe-coding/viral-sites/output/playwright/rebuild-current/route-check-cyber.jpg`
- H5 before evidence: `/Users/ahs/Documents/vibe-coding/viral-sites/output/playwright/rebuild-current/h5-before.png`
- H5 final evidence: `/Users/ahs/Documents/vibe-coding/viral-sites/output/playwright/rebuild-current/h5-final-390.png`
- H5 multi-viewport evidence: `/Users/ahs/Documents/vibe-coding/viral-sites/output/playwright/rebuild-current/h5-responsive-qa.png`
- H5 library evidence: `/Users/ahs/Documents/vibe-coding/viral-sites/output/playwright/rebuild-current/h5-library.png`
- State compared: desktop homepage, `赛博求签` selected, all six cartridges and bottom actions visible.
- Source pixels: 1487 × 1058.
- Browser viewport: 1920 × 873 CSS px at devicePixelRatio 1.
- Implementation document height: 873 CSS px; scroll position 0.
- Comparison normalization: both artifacts are shown uncropped in the full comparison. The focused comparison separately enlarges the hero and cartridge-deck regions while preserving source/implementation pairing.

## Findings

- No actionable P0/P1/P2 issues remain.
- [P3] The source has a slightly denser field of hanging charms and sticker-like decorations. The implementation prioritizes the six generated product illustrations and keeps the surrounding chrome stage cleaner so all covers remain legible at the live viewport.
- [P3] The source headline has slightly deeper baked-in chrome extrusion. The implementation uses live text with multi-layer shadow and stroke so the heading stays responsive and accessible.
- [P3] The source concept displays `12 个玩法`; the implementation displays the truthful current count of six. The horizontally scrollable rail and complete library dialog still support future 10+ additions.

## Required Fidelity Surfaces

- Typography: large stacked Chinese display type, compressed tracking, black outlines, neon color bands, monospace microcopy, and compact functional labels preserve the young arcade/Y2K hierarchy.
- Layout rhythm: header, graphic headline, hero stage, full cartridge deck, selection state, arrows, random action, and complete-library action all fit in one 1920 × 873 viewport.
- Color and materials: dark navy chrome, electric blue outlines, silver-white panels, acid-lime actions, pink/purple/red/lime cartridges, gloss, bloom, and translucent acrylic match the selected art direction.
- Assets: all six gameplay covers, the acrylic cartridge shell, arcade deck, and animated selection-energy path are generated raster assets stored in `sites/home/public/assets`; they are not CSS illustrations or placeholders. The six covers share a 1672 × 941 composition and are optimized as high-quality JPEGs for the live site.
- Interaction feedback: selected cards lift and scale over 480 ms, the hero stage crossfades/slides over 480 ms, and the cyber selection emits a 1.8 s pulsing energy path into the chamber. Reduced-motion fallbacks are present.
- Accessibility: semantic links/buttons, `aria-pressed` selection state, labeled dialog, focus-visible rings, keyboard-close behavior, reduced-motion handling, and readable contrast are present.

## Primary Interactions Tested

- Selecting each of the six cartridges updates the pressed state, stage title, copy, generated hero, matching energy hue, and destination without scrolling the document.
- At 360 × 800, 390 × 844, and 430 × 932, the compact H5 layout keeps the title, full-width artwork, primary action, three-card rail, and bottom actions in the initial task viewport. The active cartridge automatically centers on load and after selection.
- Random selection cycles through the rail and lands on an enabled final experience.
- `全部玩法` opens a labeled modal with all six routes and closes correctly.
- Starting `赛博求签` navigates to `/cyber-fortune/`, renders its title, and its shared `返回怪好玩首页` link returns to the launcher.
- Final DOM check found no Vite error overlay, no common runtime error text, and no unexpected document overflow. Direct console-message capture was unavailable in the current Chrome binding; interaction checks and the production build completed without a visible runtime failure.

## Comparison History

1. Audit of the prior implementation
   - Finding: [P1] the page read like a standard portfolio/landing page, with a tall generic preview panel and partially hidden selector instead of the chosen physical arcade console composition.
   - Fix: rebuilt the homepage around a one-screen chrome hero, a physical cartridge deck, a default `赛博求签` state, and bottom task controls.
2. Asset and motion pass
   - Finding: [P1] flat cards and generic icon art could not reproduce the reference's acrylic hardware and portal action.
   - Fix: added generated raster assets for all six gameplay covers, the cartridge shell, arcade deck, and transparent energy path; connected them to the selected state, accent-specific energy hue, and 480 ms transitions.
3. Layout and copy pass
   - Finding: [P2] long project titles could wrap awkwardly and the selected card could compete with the bottom controls.
   - Fix: added title-size variants, constrained stage/card dimensions, and tuned the deck to keep all controls above the fold.
4. Final verification
   - Evidence: `design-qa-final-art.png` and `design-qa-focus-art.png` compare the exact source and final browser capture in the same `赛博求签` state. No remaining P0/P1/P2 mismatch blocks handoff.
5. H5 correction
   - Finding: [P1] the 390 × 844 layout stacked a 250 px poster, 430 px split stage, and 420 px selector. The active cartridge and both bottom actions fell outside the first screen, while the stage art was squeezed into a narrow desktop split.
   - Fix: rebuilt the `< 620px` composition as a 104 px compact poster, 342 px full-bleed artwork stage with a bottom information panel, and a 314 px three-card swipe rail. Added a 360 px compact breakpoint and automatic active-card centering.
   - Evidence: `h5-before.png`, `h5-final-390.png`, and `h5-responsive-qa.png` show the before state and final 360/390/430 layouts.

## Implementation Checklist

- [x] Selected desktop visual hierarchy matches the chosen concept.
- [x] Six project-specific raster illustrations replace flat icon/preview stand-ins in the stage, cartridges, and complete library.
- [x] Selection, random, library, internal route, and return-route interactions work.
- [x] The data-driven rail can grow beyond the current six projects.
- [x] Main launcher and all experiences build as one Vite project and one output directory.
- [x] Eight tests, TypeScript validation, production build, browser interaction checks, and visual comparisons pass.
- [x] H5 primary flow, card centering, long titles, random selection layout, and complete-library panel work at common mobile widths.

## Follow-up Polish

- Run one final physical-device check in iOS Safari or a WeChat WebView before production release if those environments are launch-critical.

final result: passed

## 下一问（/next-question/）接入 QA

- 视觉方向：米白纸张底 + 朱红/钴蓝印章路线，符合 docs/00a-style-map.md 对下一问的「传话纸条、接力票、六枚盖章」定义；与主站街机风首页风格独立、互不干扰。
- 移动端：320/390/768/1440 四档视口无横向滚动；最小触控区域 ≥ 44px；键盘可完成创建、接棒、收尾与删除；focus-visible 环可见；prefers-reduced-motion 下无动画。
- 状态覆盖：landing、接棒、传棒、守环、结果、expired/cancelled/deleted/404 均有独立文案与可读层级。
- 证据截图：output/acc-landing-mobile.png、output/acc-result-mobile.png；预览与主图：sites/home/public/previews/next-question.avif、sites/home/public/assets/next-question-hero-v1.jpg。
- 结论：无 P0/P1 问题。
