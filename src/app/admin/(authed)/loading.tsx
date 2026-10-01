// Shown the instant an admin tab is clicked, while that page's data loads.
// Having this file also lets Next.js pre-load each tab's shell on hover, so
// navigation feels immediate.
export default function AdminLoading() {
  return (
    <div className="admin-skeleton" aria-busy="true" aria-label="Loading">
      <div className="admin-skel admin-skel-title" />
      <div className="admin-skel admin-skel-line" />
      <div className="admin-skel-grid">
        <div className="admin-skel admin-skel-card" />
        <div className="admin-skel admin-skel-card" />
        <div className="admin-skel admin-skel-card" />
        <div className="admin-skel admin-skel-card" />
      </div>
      <div className="admin-skel admin-skel-block" />
    </div>
  );
}
