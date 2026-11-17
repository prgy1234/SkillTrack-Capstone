export default function EmptyState({ message, icon = '📭' }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">{icon}</span>
      <p className="empty-state-message">{message}</p>
    </div>
  );
}
