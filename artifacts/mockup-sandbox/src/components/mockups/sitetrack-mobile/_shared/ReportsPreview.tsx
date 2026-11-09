import {
  CalendarDays,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  MapPin,
  Package,
  Plus,
  Search,
  Users,
} from "lucide-react";

type ReportsPreviewProps = { variant: "current" | "refined" };

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Projects", icon: FolderKanban },
  { label: "Daily reports", icon: ClipboardList, active: true },
  { label: "Materials", icon: Package },
];

export function ReportsPreview({ variant }: ReportsPreviewProps) {
  const refined = variant === "refined";

  return (
    <div className={`site-track-preview ${refined ? "mobile-refresh" : "current-preview"}`}>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">S</div>
            <div>
              <div className="brand-name">SiteTrack</div>
              <div className="brand-sub">Kenya · Site operations</div>
            </div>
          </div>
          <div className="nav-label">Workspace</div>
          <nav className="nav-list" aria-label="Main navigation">
            {navigation.map(({ label, icon: Icon, active }) => (
              <a
                className={`nav-link ${active ? "active" : ""}`}
                href="#"
                key={label}
                onClick={(event) => event.preventDefault()}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
              </a>
            ))}
          </nav>
          <div className="sidebar-foot">
            Built for the people who
            <br />
            keep Kenya building.
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div className="crumb">Site operations / Daily reports</div>
            <div className="today">
              <span className="live-dot" />
              Site data connected
            </div>
          </div>

          <div className="page-heading">
            <div>
              <div className="eyebrow">Daily site diary</div>
              <h1>Daily reports</h1>
              <p className="subheading">
                A reliable end-of-day record for every active site.
              </p>
            </div>
            <button className="btn" type="button">
              <Plus size={16} />
              <span>New report</span>
            </button>
          </div>

          <div className="toolbar">
            <div className="search-wrap">
              <Search className="search-icon" size={16} />
              <input
                aria-label="Search reports"
                className="search-input"
                placeholder="Search work notes or project"
                readOnly
              />
            </div>
            <select aria-label="Filter reports by project" className="filter-select" defaultValue="all">
              <option value="all">All projects</option>
            </select>
          </div>

          <div className="record-grid">
            <article className="record-card">
              <div className="record-top">
                <div>
                  <h3>Sample project — Riverside Apartments</h3>
                  <p className="record-sub">
                    <CalendarDays size={12} style={{ verticalAlign: "middle" }} />{" "}
                    9 Nov 2026
                  </p>
                </div>
                <span className="status">24 workers</span>
              </div>
              <div className="report-copy">
                Sample record: Ground-floor slab formwork and reinforcement
                completed in Zone A.
              </div>
              <div className="record-data">
                <div>
                  <div className="data-label">
                    <MapPin size={11} style={{ verticalAlign: "middle" }} /> Weather
                  </div>
                  <div className="data-value">Sunny, dry</div>
                </div>
                <div>
                  <div className="data-label">
                    <Users size={11} style={{ verticalAlign: "middle" }} /> Next day
                  </div>
                  <div className="data-value">
                    Inspect reinforcement before the next concrete pour.
                  </div>
                </div>
              </div>
              <div className="issue-note">One concrete mixer arrived late.</div>
              {!refined && (
                <div className="record-actions">
                  <button className="icon-btn" aria-label="Edit report" type="button">
                    Edit
                  </button>
                  <button className="icon-btn" aria-label="Delete report" type="button">
                    Delete
                  </button>
                </div>
              )}
            </article>
          </div>
        </main>
      </div>
    </div>
  );
}
