type DesklandNavProps = {
  completedCount: number;
  mode: "showcase" | "select" | "play";
  onClose: () => void;
  onHome: () => void;
  totalCount: number;
};

export function DesklandNav({ completedCount, mode, onClose, onHome, totalCount }: DesklandNavProps) {
  return (
    <nav className="deskland-nav" aria-label="DESKLAND">
      <button className="deskland-nav__brand" type="button" aria-label="DESKLAND home" onClick={onHome}>
        <img src="/deskland-wordmark.svg" alt="DESKLAND" />
      </button>
      {mode === "play" ? (
        <button className="deskland-nav__close" type="button" aria-label="Close toy" onClick={onClose}>
          <img src="/deskland-close.svg" alt="" aria-hidden="true" />
        </button>
      ) : (
        <span className="deskland-nav__progress" aria-label={`${completedCount} of ${totalCount} toys completed`}>
          {completedCount}/{totalCount}
        </span>
      )}
    </nav>
  );
}
