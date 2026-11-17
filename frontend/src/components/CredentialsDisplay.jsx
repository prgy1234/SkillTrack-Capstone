import { useState } from 'react';

export default function CredentialsDisplay({ email, temporaryPassword, onDismiss }) {
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = async (value, field) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback: select text
    }
  };

  return (
    <div className="credentials-display" role="alert">
      <div className="credentials-warning">
        <span aria-hidden="true">⚠️</span>
        Save these credentials now. They will not be shown again.
      </div>

      <div className="credentials-field">
        <div>
          <div className="credentials-field-label">Email</div>
          <div className="credentials-field-value">{email}</div>
        </div>
        <button
          className="credentials-copy-btn"
          onClick={() => handleCopy(email, 'email')}
          aria-label="Copy email"
        >
          {copiedField === 'email' ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <div className="credentials-field">
        <div>
          <div className="credentials-field-label">Temporary Password</div>
          <div className="credentials-field-value">{temporaryPassword}</div>
        </div>
        <button
          className="credentials-copy-btn"
          onClick={() => handleCopy(temporaryPassword, 'password')}
          aria-label="Copy password"
        >
          {copiedField === 'password' ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <div className="form-actions" style={{ marginTop: '16px' }}>
        <button className="btn btn-primary" onClick={onDismiss}>
          I have saved these credentials
        </button>
      </div>
    </div>
  );
}
