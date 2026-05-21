export function DesklandNav() {
  return (
    <nav className="deskland-nav" aria-label="DESKLAND">
      <a className="deskland-nav__brand" href="/" aria-label="DESKLAND home">
        <img src="/deskland-wordmark.svg" alt="DESKLAND" />
      </a>
      <button className="deskland-nav__close" type="button" aria-label="Close menu">
        <img src="/deskland-close.svg" alt="" aria-hidden="true" />
      </button>
    </nav>
  );
}
