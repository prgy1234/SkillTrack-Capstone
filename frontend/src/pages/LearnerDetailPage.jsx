import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import {
  getLearners,
  getLearnerAssignments,
  getActivities,
  createAssignment,
  updateAssignmentStatus,
} from '../api/client.js';

export default function LearnerDetailPage() {
  const { id } = useParams();
  const [learner, setLearner] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [learnersData, assignmentsData, activitiesData] = await Promise.all([
        getLearners(),
        getLearnerAssignments(id),
        getActivities(),
      ]);
      const found = learnersData.find((l) => String(l.id) === String(id));
      setLearner(found || null);
      setAssignments(assignmentsData);
      setActivities(activitiesData);
    } catch (err) {
      setError(err.message || 'Failed to load learner details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const assignedActivityIds = new Set(assignments.map((a) => a.activityId));
  const unassignedActivities = activities.filter((a) => !assignedActivityIds.has(a.id));

  const handleAssign = async () => {
    if (!selectedActivityId) return;

    setAssigning(true);
    setAssignError('');
    try {
      await createAssignment(id, selectedActivityId);
      setSelectedActivityId('');
      showToast('Activity assigned successfully');
      // Refresh assignments
      const updatedAssignments = await getLearnerAssignments(id);
      setAssignments(updatedAssignments);
    } catch (err) {
      if (err.status === 409) {
        setAssignError('This activity is already assigned');
      } else {
        setAssignError(err.message || 'Failed to assign activity');
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusChange = async (assignmentId, newStatus) => {
    try {
      await updateAssignmentStatus(assignmentId, newStatus);
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, status: newStatus } : a))
      );
      showToast('Status updated');
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  return (
    <>
      <Navbar />
      <main className="page-container">
        <Link to="/candidates" className="back-link">
          ← Back to Candidates
        </Link>

        {loading && <LoadingSpinner message="Loading learner details..." />}
        {error && <ErrorMessage message={error} onRetry={fetchData} />}

        {!loading && !error && learner && (
          <>
            <div className="page-header">
              <h1>{learner.displayName}</h1>
            </div>

            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="learner-info">
                <div className="learner-info-item">
                  <span className="label">Email: </span>
                  <span className="value">{learner.email}</span>
                </div>
                <div className="learner-info-item">
                  <span className="label">Cohort: </span>
                  <span className="value">{learner.cohort}</span>
                </div>
              </div>
            </div>

            <div className="learner-detail-progress">
              <div><span>Assigned activities</span><strong>{assignments.length}</strong></div>
              <div><span>Completed</span><strong>{assignments.filter(a => a.status === 'Completed').length}</strong></div>
              <div><span>Pending</span><strong>{assignments.filter(a => a.status !== 'Completed').length}</strong></div>
              <div><span>Completion</span><strong>{assignments.length ? Math.round(assignments.filter(a => a.status === 'Completed').length / assignments.length * 100) : 0}%</strong></div>
            </div>

            {/* Assign Activity Section */}
            <section style={{ marginBottom: '32px' }}>
              <h2 className="section-title">Assign Activity</h2>
              <div className="assign-section">
                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                  <label htmlFor="assign-activity">Select Activity</label>
                  <select
                    id="assign-activity"
                    className="form-input"
                    value={selectedActivityId}
                    onChange={(e) => {
                      setSelectedActivityId(e.target.value);
                      setAssignError('');
                    }}
                    disabled={assigning || unassignedActivities.length === 0}
                  >
                    <option value="">
                      {unassignedActivities.length === 0
                        ? 'All activities assigned'
                        : '-- Select an activity --'}
                    </option>
                    {unassignedActivities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.title} ({activity.topic})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleAssign}
                  disabled={!selectedActivityId || assigning}
                  style={{ alignSelf: 'flex-end' }}
                >
                  {assigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
              {assignError && (
                <p className="form-error" role="alert">
                  {assignError}
                </p>
              )}
            </section>

            {/* Assigned Training Section */}
            <section>
              <h2 className="section-title">Assigned Training</h2>
              {assignments.length === 0 ? (
                <EmptyState message="No training assigned yet" icon="📋" />
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Topic</th>
                        <th>Planned Hours</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td>{assignment.activityTitle || assignment.title}</td>
                          <td>{assignment.activityTopic || assignment.topic}</td>
                          <td>{assignment.plannedHours}</td>
                          <td>
                            <select
                              className="form-input"
                              style={{ width: 'auto', minWidth: '140px' }}
                              value={assignment.status}
                              onChange={(e) =>
                                handleStatusChange(assignment.id, e.target.value)
                              }
                              aria-label={`Status for ${assignment.activityTitle || assignment.title}`}
                            >
                              <option value="Not Started">Not Started</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {!loading && !error && !learner && (
          <ErrorMessage message="Learner not found" />
        )}

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
