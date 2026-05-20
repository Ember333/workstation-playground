import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Workstation Playground" },
    {
      name: "description",
      content: "A compact React Router v7 playground for small web experiments.",
    },
  ];
}

const projects = [
  {
    title: "Route Lab",
    text: "File-based routes, loaders, and transitions for small ideas.",
    accent: "bg-teal-500",
  },
  {
    title: "UI Bench",
    text: "Tiny interface sketches with responsive layout rules.",
    accent: "bg-coral",
  },
  {
    title: "Deploy Notes",
    text: "Build once, ship static assets to Cloudflare Pages.",
    accent: "bg-ink",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <a href="#top" className="flex items-center gap-3 font-semibold">
          <span className="grid size-9 place-items-center rounded-lg bg-ink text-sm text-white">
            WP
          </span>
          <span>Workstation Playground</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#top" className="transition hover:text-ink">
            Home
          </a>
          <a href="#projects" className="transition hover:text-ink">
            Projects
          </a>
          <a href="#about" className="transition hover:text-ink">
            About
          </a>
        </nav>
      </header>

      <section
        id="top"
        className="mx-auto grid min-h-[calc(100vh-76px)] w-full max-w-6xl items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-[1fr_0.92fr]"
      >
        <div className="max-w-2xl">
          <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-normal text-ink sm:text-6xl lg:text-7xl">
            Workstation Playground
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            工位游乐场是一组轻量的网页实验：用 React Router v7 组织路由，
            用清晰的组件和静态构建把想法快速发布到线上。
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#projects"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-ink px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black"
            >
              View projects
            </a>
            <a
              href="#about"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-line px-5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-ink"
            >
              About the site
            </a>
          </div>
        </div>

        <div className="rounded-[18px] border border-line bg-paper p-3 shadow-[0_24px_80px_rgba(21,31,39,0.13)]">
          <div className="rounded-xl border border-line bg-white">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span className="size-3 rounded-full bg-[#ff725e]" />
              <span className="size-3 rounded-full bg-[#ffc857]" />
              <span className="size-3 rounded-full bg-[#24b47e]" />
              <span className="ml-3 text-xs text-muted">
                workstation-playground.pages.dev
              </span>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              {projects.map((project, index) => (
                <article
                  key={project.title}
                  className={
                    index === 0
                      ? "rounded-lg border border-line bg-white p-5 sm:col-span-2"
                      : "rounded-lg border border-line bg-white p-5"
                  }
                >
                  <span className={`mb-8 block h-2 w-14 rounded-full ${project.accent}`} />
                  <h2 className="text-xl font-semibold text-ink">{project.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted">{project.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="projects" className="border-y border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-5 px-6 py-16 md:grid-cols-3">
          {projects.map((project) => (
            <article key={project.title} className="rounded-lg bg-white p-6 shadow-sm">
              <span className={`mb-7 block h-2 w-12 rounded-full ${project.accent}`} />
              <h2 className="text-2xl font-semibold">{project.title}</h2>
              <p className="mt-4 leading-7 text-muted">{project.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-[0.72fr_1fr] md:items-start">
          <h2 className="text-3xl font-semibold text-ink">Built for quick experiments.</h2>
          <p className="text-lg leading-8 text-muted">
            这个站点使用 React Router v7、React 19、Tailwind CSS v4 和 Vite。
            它以静态 SPA 方式构建，适合直接部署到 Cloudflare Pages。
          </p>
        </div>
      </section>
    </main>
  );
}
