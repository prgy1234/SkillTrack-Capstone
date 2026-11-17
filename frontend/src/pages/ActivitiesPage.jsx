import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar.jsx';
import Modal from '../components/Modal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { getActivities, createActivity, updateActivity } from '../api/client.js';

const INITIAL_FORM = { title: '', topic: '', plannedHours: '' };

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState(null);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActivities();
      setActivities(data);
    } catch (err) {
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAddModal = () => {
    setEditingActivity(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setSaveError('');
    setModalOpen(true);
  };

  const openEditModal = (activity) => {
    setEditingActivity(activity);
    setForm({
      title: activity.title,
      topic: activity.topic,
      plannedHours: String(activity.plannedHours),
    });
    setFormErrors({});
    setSaveError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingActivity(null);
  };

  const validate = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.topic.trim()) errors.topic = 'Topic is required';
    const hours = parseFloat(form.plannedHours);
    if (!form.plannedHours || isNaN(hours) || hours < 0.1) {
      errors.plannedHours = 'Planned hours must be at least 0.1';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSaveError('');

    const payload = {
      title: form.title.trim(),
      topic: form.topic.trim(),
      plannedHours: parseFloat(form.plannedHours),
    };

    try {
      if (editingActivity) {
        await updateActivity(editingActivity.id, payload);
        showToast('Activity updated successfully');
      } else {
        await createActivity(payload);
        showToast('Activity created successfully');
      }
      closeModal();
      fetchActivities();
    } catch (err) {
      setSaveError(err.message || 'Failed to save activity');
    } finally {
      setSaving(false);
    }
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
          <div><span className="dashboard-kicker">LEARNING LIBRARY</span><h1>Learning activities</h1><p className="page-intro">Build and maintain the activities that move your learners forward.</p></div>
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add Activity
          </button>
        </div>

        {loading && <LoadingSpinner message="Loading activities..." />}
        {error && <ErrorMessage message={error} onRetry={fetchActivities} />}

        {!loading && !error && activities.length === 0 && (
          <EmptyState message="No activities yet. Add your first learning activity!" icon="📚" />
        )}

        {!loading && !error && activities.length > 0 && (
          <div className="activity-card-grid">
            {activities.map((activity, index) => (
              <article className="activity-card" key={activity.id}>
                <div className="activity-card-foot">
                  <span className="activity-card-mark">{String(index + 1).padStart(2, '0')}</span>
                  <span className="table-tag">CATALOGUE ITEM</span>
                </div>
                <h3>{activity.title}</h3>
                <p>{activity.topic}</p>
                <div className="activity-card-foot">
                  <span>{activity.plannedHours} planned hours</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(activity)}>Edit activity ↗</button>
                </div>
              </article>
            ))}
          </div>
        )}

        <Modal
          isOpen={modalOpen}
          onClose={closeModal}
          title={editingActivity ? 'Edit Activity' : 'Add Activity'}
        >
          <form onSubmit={handleSubmit}>
            {saveError && (
              <div className="login-error" role="alert" style={{ marginBottom: '16px' }}>
                {saveError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="activity-title">Title</label>
              <input
                id="activity-title"
                type="text"
                className={`form-input ${formErrors.title ? 'error' : ''}`}
                value={form.title}
                onChange={handleChange('title')}
                disabled={saving}
              />
              {formErrors.title && <p className="form-error">{formErrors.title}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="activity-topic">Topic</label>
              <input
                id="activity-topic"
                type="text"
                className={`form-input ${formErrors.topic ? 'error' : ''}`}
                value={form.topic}
                onChange={handleChange('topic')}
                disabled={saving}
              />
              {formErrors.topic && <p className="form-error">{formErrors.topic}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="activity-hours">Planned Hours</label>
              <input
                id="activity-hours"
                type="number"
                step="0.1"
                min="0.1"
                className={`form-input ${formErrors.plannedHours ? 'error' : ''}`}
                value={form.plannedHours}
                onChange={handleChange('plannedHours')}
                disabled={saving}
              />
              {formErrors.plannedHours && (
                <p className="form-error">{formErrors.plannedHours}</p>
              )}
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
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
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
