# BELY / Kings of the Hara

A browser-first Egyptian marble game and experimental playground, built with Three.js, Cannon-es, i18next, Poly Haven scans, and MIT-licensed Rocketbox character/animation assets. Baseline prototype commit: `3b62847`.

## Public Project

- Game: https://ahmedismaiel.github.io/bely/
- Arabic game: https://ahmedismaiel.github.io/bely/?lang=ar&debug=1
- Photo dev log: https://ahmedismaiel.github.io/bely/devlog.html
- Repository: https://github.com/ahmedismaiel/bely

GitHub Actions publishes the game, marble studio, and bilingual dev log to Pages on updates to `master` or `main`.

## Latest Review Build

- Marble Studio is a lightweight renderer opened in a same-page modal. Closing preserves the live match, URL, shot count, and nested menu state. Five camera poses, automatic showcase, touch orbit, filters, and photo capture are included.
- The dev log supports Arabic/English and RTL, including technical content and feedback controls. Language switching preserves typed notes.
- The previous stylized cast has been replaced by Microsoft Rocketbox avatars with actual clothing textures and native idle/walk/conversation clips. Source notice and hashes are in `public/assets/realistic-cast`.
- Touch devices use 1024px terrain textures, 1x pixel ratio, reduced shadow/reflection sizes, and no depth of field by default. Automatic character intros are off on mobile and can be enabled in settings.
- GitHub Pages uses repository-relative paths and `.github/workflows/pages.yml`. The public repository belongs to the personal account `ahmedismaiel`, not the work or enterprise accounts.

Focused checks: `node scripts/showroom-embed-check.mjs`, `node scripts/showroom-mobile-check.mjs`, `node scripts/blog-arabic-check.mjs`, and `node scripts/realistic-cast-check.mjs`. Phone checks are emulation, not a physical-device performance certification.

## Run

Requires Node.js 22.12 or newer. The checked setup uses Node 22 and npm.

```sh
npm install
npm run assets
npm run dev -- --host 127.0.0.1 --port 5177
```

Open http://127.0.0.1:5177/ for the game and http://127.0.0.1:5177/devlog.html for the photo dev log. The current dev server uses port 5177 because 5173 was occupied.

Review links:

- Arabic, all campaign events unlocked: http://127.0.0.1:5177/?scoutTheme=dark&lang=ar&debug=1
- English, all events unlocked: http://127.0.0.1:5177/?scoutTheme=dark&lang=en&debug=1
- Add `&cinematics=0` to skip introductions. Language and unlock settings are also in the UI.

Debug mode does not award medals or overwrite earned campaign progress. Experimental courses have a separate result/review store.

The local assets are already present in `public/assets`. `npm run assets` reproducibly downloads them again if necessary and verifies upstream checksums. The game does not fetch remote assets at runtime. It needs HTTP serving, not a direct `file:` URL.

## Play

- Pull the blue shooter backward and release, or use Aim/Power and Flick.
- Journey contains twelve authored events across six destinations, with knockout, pocket, bank, and rival rules.
- Earn medals to open destinations and a 100-marble collection. Ten finish families have ten variants each. Classic marble weights remain equal.
- Drag empty ground to orbit. Wheel or pinch zooms. Camera buttons select street, aim, overhead, and macro views.
- Space flicks, R starts a new round, H hides the interface, and Escape or double-click restores it.
- Settings contain language, debug unlock, narration, cinematic skipping, resolution, sound, depth of field, and exposure.
- The camera button downloads a photograph of the actual canvas.

Rules are a proposed adaptation, awaiting the user's local-rule review. This is not presented as a universal Egyptian ruleset.

## Play Lab

Six playable experimental mode families: Marble Odyssey, Pulse Arena, Sky Ribbons, Moon Marble, Last Light, and The Lost Tin. Each has forty seeded courses across five difficulty tiers, for 240 generated scenarios, not 240 hand-authored chapters.

- WASD/arrows roll; Space jumps; E triggers a kinetic pulse; F toggles glide.
- On-screen movement and power controls support touch.
- Courses use heightfield physics matched to terrain geometry, gates, checkpoints, variable gravity, wind, and moving barriers.
- The feedback button is available during a run. Results and notes persist locally and are included in the dev-log review export.
- `public/devlog/05-ideas.json` lists all scenarios and their bilingual pitches.

## Rendering

- The street uses rasterized PBR materials, HDR lighting, shadow maps, and deterministic spatial depth of field.
- Glass uses analytic ray/sphere intersections, bounded reflection/refraction paths, Fresnel weighting, absorption, and fixed-step internal ribbon sampling.
- The backdrop uses a static local HDR cubemap, refreshed on lighting changes. Other marbles and the ground are analytically intersected.
- No progressive accumulation, stochastic diffuse sampling, film grain, or temporal denoiser is used.
- This is shader ray tracing through WebGL 2, not direct hardware RTX ray-tracing access and not full-scene path tracing.
- Caustic pools and diffuse bounce light are approximations. Classic boards are mostly flat. Play Lab uses actual generated heightfield geometry/collision and samples its height texture in the glass shader.

## Story and Places

You play Nour, bringing the old circle of friends together before Mariam leaves for college. Destination introductions now use realistically proportioned, clothed Microsoft Rocketbox avatars with native idle/walk/conversation animation, bilingual subtitles, camera sequencing, skip, advance, and replay. These replace the old stylized Quaternius bases. Optional narration uses browser speech synthesis, not studio voices or lip sync.

Giza rooftop/pyramids/Sphinx, a Cairo Citadel terrace, Alexandria beach/Qaitbay silhouette, and a lantern-lit final are authored approximations. They are not scanned landmarks or accurate geographic reconstructions. Some Al-Muizz and Khan el-Khalili architecture still shares the neighborhood kit.

## Verification

```sh
npm test
npm run build
npm run capture:campaign
node scripts/presentation-check.mjs
node --experimental-strip-types scripts/playground-check.mjs
node scripts/review-log.mjs
```

The capture command expects the dev server on port 5177 and Microsoft Edge installed. It runs Playwright against the real WebGL canvas and saves:

- Desktop, macro, lighting, played-round, and portrait-mobile photographs.
- A live 4.5-second WebM orbit, not an offline render.
- Stationary/moving/returned-camera pixel hashes that test whether image convergence is required.
- Mouse and emulated-touch flick checks, scoring, turn completion, reset, and layout checks.
- An explicit JSON report including GPU identity, errors, and performance observations.

Current visual reports include `public/devlog/07-realistic-cast-check.json`, `public/devlog/06-showroom-state-check.json`, and `public/devlog/06-showroom-mobile-checks.json`. Earlier checkpoint reports are retained as history, not current-device performance claims. Mobile testing uses desktop-GPU emulation; physical mobile hardware remains untested.

Known test failure: the authored bank-shot assist's legal-win regression still fails. Static rail collision was fixed by using pairwise broad phase, but the suggested angle needs further tuning. The user explicitly chose to defer that work and finish this visual/mode review build. The failing test is retained, and bank assist is labeled experimental. Not all 240 courses have been completed end to end; balance is open for review.

## Review Log

The log includes a before/after comparison, lighting variants, actual photographs, the motion recording, technical tradeoffs, and review fields. Approval and notes are stored in the browser's localStorage and can be exported as JSON. They are not uploaded or automatically written back into the repository.

## Sources

Poly Haven assets include soil, concrete, tile, sand, plaster, sky, plant, chair, and crate scans. See `public/assets/manifest.json` for exact URLs and hashes. These are CC0 assets, not photographs of an actual Cairo street. The current cast uses Microsoft Rocketbox under MIT; its notice and provenance are in `public/assets/realistic-cast`. `node scripts/realistic-cast.mjs` downloads the chosen models and converts large TGA maps to 1024px WebP. The old Quaternius assets/provenance remain only for the historical prototype.

Technique references supplied by the user:

- https://erichlof.github.io/THREE.js-RayTracing-Renderer/Ray_Tracer_Challenge.html
- https://erichlof.github.io/THREE.js-PathTracing-Renderer/
- https://polyhaven.com/

The game shader is original. No source code or artwork from the linked ray-tracing demos was copied.

## Current Scope

100 material variants, twelve campaign events, six generated-mode families, 240 scenario seeds, Arabic/English and RTL, debug unlock, animated chapter introductions, landmark-inspired locations, replay, photo capture, and local feedback. It remains a browser prototype: not a finished AAA production, not hardware-RTX rendering, and not a game with 240 bespoke story levels. High-fidelity hand animation, studio voice acting, multiplayer, and extensive balance testing remain future work.