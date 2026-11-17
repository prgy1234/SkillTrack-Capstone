export default function StatusBadge({ status }) {
  const statusMap = {
    'Not Started': 'not-started',
    'In Progress': 'in-progress',
    Completed: 'completed',
  };

  const modifier = statusMap[status] || 'not-started';

  return (
    <span className={`status-badge status-badge--${modifier}`}>
      {status}
    </span>
  );
}
