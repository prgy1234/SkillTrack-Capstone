import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { getMyAssignments, updateAssignmentStatus } from '../api/client.js';

export default function MyTrainingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('All');
  const completedCount = assignments.filter(a => a.status === 'Completed').length;
  const inProgressCount = assignments.filter(a => a.status === 'In Progress').length;
  const progressPercent = assignments.length ? Math.round(completedCount / assignments.length * 100) : 0;

  const showToast = (message, type = 'success') => { setToast({message,type}); setTimeout(() => setToast(null),3000); };
  const fetchAssignments = async () => {
    setLoading(true); setError(null);
    try { setAssignments(await getMyAssignments()); }
    catch (err) { if (err.status === 401) { navigate('/', {replace:true}); return; } setError(err.message || 'Could not load your activities'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchAssignments(); }, []);
  const handleStatusChange = async (id,status) => {
    try { await updateAssignmentStatus(id,status); setAssignments(prev => prev.map(a => a.id === id ? {...a,status} : a)); showToast('Your activity status has been updated.'); }
    catch(err) { showToast(err.message || 'Could not update status','error'); }
  };
  const visible = filter === 'All' ? assignments : assignments.filter(a => a.status === filter);

  return <>
    <Navbar />
    <main className="page-container learner-page">
      <section className="learner-cover">
        <div className="learner-cover-copy"><span className="overline">YOUR PERSONAL LEARNING RECORD</span><h1>Make room<br/>for <em>what's next.</em></h1><p>Welcome back, {user?.displayName || 'Learner'}. Every finished activity is another skill you can carry forward.</p><span className="learner-cohort-label">{user?.cohort || 'Your learning programme'}</span></div>
        <div className="learner-cover-art"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="cover-monogram">N<span>+</span></div><div className="cover-caption">LEARN / APPLY / GROW</div></div>
      </section>

      {!loading && !error && <section className="learner-summary-grid">
        <article className="learner-summary-card summary-progress"><span>YOUR COMPLETION</span><strong>{progressPercent}<sup>%</sup></strong><div className="progress-track"><i style={{width:`${progressPercent}%`}}/></div><small>{completedCount} of {assignments.length} activities finished</small></article>
        <article className="learner-summary-card"><span>ON YOUR LIST</span><strong>{assignments.length.toString().padStart(2,'0')}</strong><small>Assigned activities</small><i>▤</i></article>
        <article className="learner-summary-card"><span>IN MOTION</span><strong>{inProgressCount.toString().padStart(2,'0')}</strong><small>Currently underway</small><i>↗</i></article>
        <article className="learner-summary-card"><span>COMPLETED</span><strong>{completedCount.toString().padStart(2,'0')}</strong><small>Milestones reached</small><i>✓</i></article>
      </section>}

      <section className="learning-list-section">
        <div className="section-heading-new"><div><span className="overline">YOUR ASSIGNMENTS / 01</span><h2>Learning itinerary</h2><p>Choose an activity, update its status and keep your record current.</p></div></div>
        <div className="learning-filter-tabs" role="group" aria-label="Filter activities">
          {['All','Not Started','In Progress','Completed'].map(status => <button key={status} className={filter === status ? 'selected' : ''} onClick={() => setFilter(status)}>{status}<span>{status === 'All' ? assignments.length : assignments.filter(a => a.status === status).length}</span></button>)}
        </div>
        {loading && <LoadingSpinner message="Preparing your learning itinerary..." />}
        {error && <ErrorMessage message={error} onRetry={fetchAssignments} />}
        {!loading && !error && assignments.length === 0 && <EmptyState message="Your coordinator has not assigned any activities yet. Check back soon." icon="✳" />}
        {!loading && !error && assignments.length > 0 && visible.length === 0 && <EmptyState message={`There are no ${filter.toLowerCase()} activities right now.`} icon="⌁" />}
        {!loading && !error && visible.length > 0 && <div className="learning-itinerary">
          {visible.map((activity,index) => {
            const done = activity.status === 'Completed';
            const active = activity.status === 'In Progress';
            return <article className={`itinerary-card ${done ? 'is-done' : active ? 'is-active' : ''}`} key={activity.id}>
              <div className="itinerary-index">{String(index+1).padStart(2,'0')}</div>
              <div className="itinerary-main"><div className="itinerary-meta"><span>{activity.activityTopic || activity.topic || 'Learning activity'}</span><i/> <span>{activity.plannedHours} HOURS</span></div><h3>{activity.activityTitle || activity.title}</h3><p>{done ? 'A milestone reached. Nice work.' : active ? 'You are making progress on this activity.' : 'Ready when you are. Start this activity to track your progress.'}</p></div>
              <div className="itinerary-state"><span className={`status-pill ${done ? 'done' : active ? 'active' : 'pending'}`}>{activity.status}</span><label className="sr-only" htmlFor={`status-${activity.id}`}>Update status for {activity.activityTitle || activity.title}</label><select id={`status-${activity.id}`} value={activity.status} onChange={e => handleStatusChange(activity.id,e.target.value)} aria-label={`Status for ${activity.activityTitle || activity.title}`}><option value="Not Started">Not Started</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option></select></div>
            </article>;
          })}
        </div>}
      </section>
      {toast && <div className={`toast-message ${toast.type === 'error' ? 'error' : ''}`} role="status">{toast.message}</div>}
    </main>
  </>;
}
