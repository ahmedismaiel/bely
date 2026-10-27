# BELY / Glass & Dust

A browser-first Egyptian street-marble visual and gameplay slice, built with Three.js, Cannon-es, and locally downloaded Poly Haven CC0 assets.

## Run

Requires Node.js 22.12 or newer. The checked setup uses Node 22 and npm.

```sh
npm install
npm run assets
npm run dev -- --host 127.0.0.1 --port 5177
```

Open http://127.0.0.1:5177/ for the game and http://127.0.0.1:5177/devlog.html for the photo dev log. The current dev server uses port 5177 because 5173 was occupied.

The local assets are already present in `public/assets`. `npm run assets` reproducibly downloads them again if necessary and verifies upstream checksums. The game does not fetch remote assets at runtime. It needs HTTP serving, not a direct `file:` URL.

## Play

- Pull the blue shooter backward and release, or use Aim/Power and Flick.
- Knock all seven targets completely beyond the chalk circle. Captured targets are removed when the turn settles.
- Solo practice has unlimited shots; Seven shots ends after seven flicks.
- Drag empty ground to orbit. Wheel or pinch zooms. Camera buttons select street, aim, overhead, and macro views.
- Space flicks, R starts a new round, H hides the interface, and Escape or double-click restores it.
- Settings contain match mode, resolution, sound, depth of field, and exposure.
- The camera button downloads a photograph of the actual canvas.

Rules are a proposed adaptation, awaiting the user's local-rule review. This is not presented as a universal Egyptian ruleset.

## Rendering

- The street uses rasterized PBR materials, HDR lighting, shadow maps, and deterministic spatial depth of field.
- Glass uses analytic ray/sphere intersections, bounded reflection/refraction paths, Fresnel weighting, absorption, and fixed-step internal ribbon sampling.
- The backdrop uses a static local HDR cubemap, refreshed on lighting changes. Other marbles and the ground are analytically intersected.
- No progressive accumulation, stochastic diffuse sampling, film grain, or temporal denoiser is used.
- This is shader ray tracing through WebGL 2, not direct hardware RTX ray-tracing access and not full-scene path tracing.
- Caustic pools and diffuse bounce light are approximations. Ground collision is flat; visual normal mapping is not terrain geometry. The downloaded displacement map is reserved for a later terrain pass.

## Verification

```sh
npm test
npm run build
npm run capture -- 03
```

The capture command expects the dev server on port 5177 and Microsoft Edge installed. It runs Playwright against the real WebGL canvas and saves:

- Desktop, macro, lighting, played-round, and portrait-mobile photographs.
- A live 4.5-second WebM orbit, not an offline render.
- Stationary/moving/returned-camera pixel hashes that test whether image convergence is required.
- Mouse and emulated-touch flick checks, scoring, turn completion, reset, and layout checks.
- An explicit JSON report including GPU identity, errors, and performance observations.

The verified checkpoint is `public/devlog/03-capture.json`. Its desktop capture reported approximately 127 fps with an 18.5 ms 95th-percentile frame time at 1920 x 1080 on an RTX 3080 Ti. This is a short observed sample, not a performance guarantee. Mobile screenshots and touch checks use desktop-GPU emulation; physical mobile hardware remains untested.

## Review Log

The log includes a before/after comparison, lighting variants, actual photographs, the motion recording, technical tradeoffs, and review fields. Approval and notes are stored in the browser's localStorage and can be exported as JSON. They are not uploaded or automatically written back into the repository.

## Sources

Poly Haven assets: `brown_mud_02`, `plastered_wall_02`, `aerial_asphalt_01`, `kloppenheim_06_puresky`, `potted_plant_02`, `painted_wooden_chair_02`, and `wooden_crate_01`. See `public/assets/manifest.json` for exact URLs and hashes. These are CC0 assets, not photographs of an actual Cairo street.

Technique references supplied by the user:

- https://erichlof.github.io/THREE.js-RayTracing-Renderer/Ray_Tracer_Challenge.html
- https://erichlof.github.io/THREE.js-PathTracing-Renderer/
- https://polyhaven.com/

The game shader is original. No source code or artwork from the linked ray-tracing demos was copied.

## Current Scope

One street, three lighting studies, two solo modes, four camera views, direct flicking, photo capture, and a reviewable photo journal. Animated hands, opponents, multiplayer, additional locations, and recorded street ambience remain unimplemented proposals. This is a visual slice, not a finished AAA production.