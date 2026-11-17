import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Modal from '../components/Modal.jsx';
import CredentialsDisplay from '../components/CredentialsDisplay.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { getLearners, createLearner, resetPassword, deleteLearner } from '../api/client.js';

const INITIAL_FORM = { name: '', email: '', cohort: '' };

export default function CandidatesPage() {
  const navigate = useNavigate();
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchLearners = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLearners();
      setLearners(data);
    } catch (err) {
      setError(err.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearners();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAddModal = () => {
    setForm(INITIAL_FORM);
    setFormErrors({});
    setSaveError('');
    setCredentials(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCredentials(null);
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';
    if (!form.cohort.trim()) errors.cohort = 'Cohort is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSaveError('');

    try {
      const result = await createLearner({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        cohort: form.cohort.trim(),
      });
      setCredentials({
        email: result.credentials.email,
        temporaryPassword: result.credentials.temporaryPassword,
      });
      fetchLearners();
    } catch (err) {
      if (err.status === 409 || (err.message && err.message.toLowerCase().includes('already exists'))) {
        setSaveError('A candidate with this email already exists');
      } else {
        setSaveError(err.message || 'Failed to create candidate');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (learner) => {
    setResetting(true);
    try {
      const result = await resetPassword(learner.id);
      setResetConfirm(null);
      setCredentials({
        email: learner.email,
        temporaryPassword: result.credentials.temporaryPassword,
      });
      setModalOpen(true);
      showToast('Password reset successfully');
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
      setResetConfirm(null);
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteLearner = async (learner) => {
    const confirmed = window.confirm(`Delete ${learner.displayName} and all of their assigned activity records? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await deleteLearner(learner.id);
      setLearners((prev) => prev.filter((item) => item.id !== learner.id));
      showToast('Candidate and their training records deleted');
    } catch (err) { showToast(err.message || 'Failed to delete candidate', 'error'); }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <>
      <Navbar />
      <main className="page-container">
        <div className="page-header">
          <div><span className="dashboard-kicker">PEOPLE & ACCESS</span><h1>Candidates</h1><p className="page-intro">Create learner accounts, organise cohorts and support each learner.</p></div>
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add Candidate
          </button>
        </div>

        {loading && <LoadingSpinner message="Loading candidates..." />}
        {error && <ErrorMessage message={error} onRetry={fetchLearners} />}

        {!loading && !error && learners.length === 0 && (
          <EmptyState message="No candidates yet. Add your first candidate!" icon="👥" />
        )}

        {!loading && !error && learners.length > 0 && (
          <section className="candidate-grid" aria-label="Candidates">
            {learners.map((learner) => (
              <article className="candidate-card" key={learner.id}>
                <button className="candidate-main" type="button" onClick={() => navigate(`/learners/${learner.id}`)}>
                  <span className="candidate-avatar">{(learner.displayName || 'L').trim().charAt(0).toUpperCase()}</span>
                  <span className="candidate-identity">
                    <strong>{learner.displayName}</strong>
                    <small>{learner.email}</small>
                  </span>
                  <span className="candidate-arrow" aria-hidden="true">↗</span>
                </button>
                <div className="candidate-card-bottom">
                  <span className="cohort-chip">{learner.cohort || 'Unassigned cohort'}</span>
                  <div className="candidate-actions"><button className="btn btn-secondary btn-sm" onClick={() => setResetConfirm(learner)}>Reset password</button><button className="btn btn-danger btn-sm" onClick={() => handleDeleteLearner(learner)}>Delete</button></div>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* Add Candidate Modal */}
        <Modal
          isOpen={modalOpen && !credentials}
          onClose={closeModal}
          title="Add Candidate"
        >
          <form onSubmit={handleSubmit}>
            {saveError && (
              <div className="login-error" role="alert" style={{ marginBottom: '16px' }}>
                {saveError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="candidate-name">Name</label>
              <input
                id="candidate-name"
                type="text"
                className={`form-input ${formErrors.name ? 'error' : ''}`}
                value={form.name}
                onChange={handleChange('name')}
                placeholder="e.g. Alex Morgan"
                autoComplete="name"
                disabled={saving}
              />
              {formErrors.name && <p className="form-error">{formErrors.name}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="candidate-email">Email</label>
              <input
                id="candidate-email"
                type="email"
                className={`form-input ${formErrors.email ? 'error' : ''}`}
                value={form.email}
                onChange={handleChange('email')}
                placeholder="alex@example.com"
                autoComplete="email"
                disabled={saving}
              />
              {formErrors.email && <p className="form-error">{formErrors.email}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="candidate-cohort">Cohort</label>
              <input
                id="candidate-cohort"
                type="text"
                className={`form-input ${formErrors.cohort ? 'error' : ''}`}
                value={form.cohort}
                onChange={handleChange('cohort')}
                placeholder="e.g. Frontend Development"
                disabled={saving}
              />
              {formErrors.cohort && <p className="form-error">{formErrors.cohort}</p>}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Credentials Display Modal */}
        <Modal
          isOpen={!!credentials}
          onClose={() => setCredentials(null)}
          title={credentials?.temporaryPassword ? "Candidate credentials" : "Account Created"}
        >
          {credentials && (
            <CredentialsDisplay
              email={credentials.email}
              temporaryPassword={credentials.temporaryPassword}
              onDismiss={() => {
                setCredentials(null);
                setModalOpen(false);
              }}
            />
          )}
        </Modal>

        {/* Reset Password Confirmation Modal */}
        <Modal
          isOpen={!!resetConfirm}
          onClose={() => setResetConfirm(null)}
          title="Reset Password"
        >
          {resetConfirm && (
            <>
              <p style={{ marginBottom: '16px' }}>
                Are you sure you want to reset the password for{' '}
                <strong>{resetConfirm.displayName}</strong> ({resetConfirm.email})?
              </p>
              <div className="form-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setResetConfirm(null)}
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleResetPassword(resetConfirm)}
                  disabled={resetting}
                >
                  {resetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </>
          )}
        </Modal>

        {toast && (
          <div className="toast-container">
            <div className={`toast toast--${toast.type}`} role="status" aria-live="polite">
              {toast.message}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
