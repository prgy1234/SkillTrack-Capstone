export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-container" role="alert">
      <span className="error-icon" aria-hidden="true">⚠️</span>
      <p className="error-text">{message || 'Something went wrong.'}</p>
      {onRetry && (
        <button className="btn btn-primary btn-sm" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
