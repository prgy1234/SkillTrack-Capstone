export default function LoadingSpinner({ message }) {
  return (
    <div className="spinner-container" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true"></div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );
}
