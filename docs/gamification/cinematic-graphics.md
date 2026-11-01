# World graphics

Every world now uses one high graphics profile. The graphics selector and stored `world-graphics` preference are no longer read. The settings panel retains the optional immersive camera-motion control, which respects the operating system reduced-motion preference.

The profile enables physically based surfaces, environment lighting, ACES filmic tone mapping, soft directional shadows at 2048 pixels, post-processing, colour grading, and up to four antialiasing samples. HDR bloom is enabled where the WebGL float-colour-buffer extension is supported. Pixel ratio is bounded between 1 and 1.5 to avoid multiplying render cost on very high-DPI displays. The same profile applies on mobile, with fourteen ambient residents, four cyclists and two local lights.

Renderer capability checks remain in place: unsupported HDR uses the standard render target; unsupported sample counts use the highest supported value up to four; a post-processing setup error falls back to the base Three.js renderer. These are compatibility fallbacks, not selectable quality tiers.

Validation: focused visual-profile and frame-budget tests plus local captures of the full London city and Microsoft workplace. This increases GPU cost relative to the former Balanced/Performance modes. Representative device frame rates have not been benchmarked for this change.
