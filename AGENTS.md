# Agent Instructions

- Do not run build, upload, deploy, publish, or release commands unless the user explicitly asks for them.
- For routine edits, make the requested code changes only. Use lightweight checks only when necessary, and avoid expensive validation unless requested.
- Keep route files focused on routing and page composition. When a page grows, split reusable or domain-specific code into clearly named modules.
- Use `app/component/ui` for shared interface primitives and controls. Use `app/component/canvas` for canvas, drawing, hit-testing, or visual workspace components.
- Create other top-level app folders such as `app/utils`, `app/hooks`, `app/lib`, or feature-specific folders when logic, data transforms, state helpers, or domain code do not belong in components.
- Continue subdividing by feature, domain, or responsibility when a category becomes crowded, and prefer clear module ownership over large single-file editors.
