import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { getCohortSummary, getActivities } from '../api/client.js';

export default function CoordinatorDashboard() {
  const [summary, setSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [learnerFilter, setLearnerFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async (filters = {}) => {
    setLoading(true); setError(null);
    try {
      const [summaryData, activityData] = await Promise.all([getCohortSummary(filters), getActivities()]);
      setSummary(summaryData); setActivities(activityData);
    } catch (err) { setError(err.message || 'Could not load programme data'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);
  const applyFilters = (e) => { e.preventDefault(); fetchData({ learnerId: learnerFilter, activityId: activityFilter }); };
  const clearFilters = () => { setLearnerFilter(''); setActivityFilter(''); fetchData(); };
  const learners = summary?.learners || [];
  const topLearners = [...learners].sort((a,b) => (b.completionPercentage || 0) - (a.completionPercentage || 0)).slice(0,4);

  return <>
    <Navbar />
    <main className="page-container">
      <section className="command-intro">
        <div>
          <div className="overline"><span className="overline-line" /> PROGRAMME CONTROL / OVERVIEW</div>
          <h1>Good work starts<br/><em>with a clear view.</em></h1>
          <p>Your programme at a glance. See who's moving forward, what needs attention, and where to focus next.</p>
        </div>
        <div className="intro-actions">
          <Link to="/candidates" className="button button-dark">Manage people <span>↗</span></Link>
          <Link to="/activities" className="button button-outline">Browse catalogue</Link>
        </div>
        <div className="intro-index">01 <span>/</span> 04</div>
      </section>

      {loading && <LoadingSpinner message="Gathering programme activity..." />}
      {error && <ErrorMessage message={error} onRetry={() => fetchData({ learnerId: learnerFilter, activityId: activityFilter })} />}
      {!loading && !error && summary && <>
        <section className="metric-ribbon" aria-label="Programme metrics">
          <article className="metric-block metric-primary"><span>LEARNERS ON PROGRAMME</span><strong>{summary.learnerCount}</strong><small>Registered people</small><i>↗</i></article>
          <article className="metric-block"><span>COURSE ACTIVITIES</span><strong>{summary.activityCount}</strong><small>In the catalogue</small><i>▤</i></article>
          <article className="metric-block"><span>ACTIVITIES COMPLETED</span><strong>{summary.completedCount}</strong><small>Marked as complete</small><i>✓</i></article>
          <article className="metric-block"><span>STILL TO COMPLETE</span><strong>{summary.pendingCount}</strong><small>Across all learners</small><i>◷</i></article>
        </section>

        <section className="programme-progress">
          <div className="programme-progress-copy"><span className="overline">THE BIG PICTURE</span><h2>Programme completion</h2><p>Progress across every assigned learning activity.</p></div>
          <div className="progress-number"><strong>{summary.overallCompletion || 0}<sup>%</sup></strong><span>OVERALL</span></div>
          <div className="progress-visual"><div className="progress-track"><span style={{width:`${summary.overallCompletion || 0}%`}} /></div><div className="progress-legend"><span><i className="legend-done"/> {summary.completedCount} completed</span><span><i className="legend-open"/> {summary.pendingCount} remaining</span><b>{summary.assignmentCount || 0} assigned in total</b></div></div>
        </section>

        <section className="report-section">
          <div className="section-heading-new"><div><span className="overline">PEOPLE INTELLIGENCE / 01</span><h2>Learner progress register</h2><p>A practical view of every learner and their current momentum.</p></div><Link to="/candidates" className="text-link">Open people directory ↗</Link></div>
          <form className="report-filters" onSubmit={applyFilters}>
            <div className="form-group"><label htmlFor="report-learner">PERSON</label><select id="report-learner" className="form-input" value={learnerFilter} onChange={e => setLearnerFilter(e.target.value)}><option value="">Every learner</option>{learners.map(l => <option key={l.id} value={l.id}>{l.displayName}</option>)}</select></div>
            <div className="form-group"><label htmlFor="report-activity">ACTIVITY</label><select id="report-activity" className="form-input" value={activityFilter} onChange={e => setActivityFilter(e.target.value)}><option value="">Every activity</option>{activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select></div>
            <div className="report-filter-actions"><button className="button button-dark" type="submit">Filter register ↗</button><button className="button button-quiet" type="button" onClick={clearFilters}>Reset</button></div>
          </form>
          {learners.length === 0 ? <EmptyState message="No learner records match this view yet." icon="◎" /> : <div className="table-container"><table className="table"><thead><tr><th>LEARNER</th><th>COHORT</th><th>ASSIGNED</th><th>DONE</th><th>OPEN</th><th>COMPLETION</th><th></th></tr></thead><tbody>{learners.map(learner => <tr key={learner.id}><td><div className="table-person"><span>{(learner.displayName || 'L').charAt(0).toUpperCase()}</span><div><strong>{learner.displayName || 'Unnamed learner'}</strong><small>{learner.email}</small></div></div></td><td><span className="table-tag">{learner.cohort || 'General'}</span></td><td>{learner.totalActivities || 0}</td><td>{learner.completedActivities || 0}</td><td>{learner.pendingActivities || 0}</td><td><div className="table-progress"><b>{learner.completionPercentage || 0}%</b><span><i style={{width:`${learner.completionPercentage || 0}%`}}/></span></div></td><td><Link className="table-open" to={`/learners/${learner.id}`}>Inspect ↗</Link></td></tr>)}</tbody></table></div>}
        </section>

        <section className="dashboard-lower-grid">
          <div className="insight-panel">
            <div className="section-heading-new compact"><div><span className="overline">LEARNER SPOTLIGHT / 02</span><h2>Momentum leaders</h2></div><span className="panel-count">TOP 04</span></div>
            {topLearners.length ? topLearners.map((learner,index) => <div className="leader-row" key={learner.id}><span className="leader-rank">0{index+1}</span><span className="leader-avatar">{(learner.displayName || 'L').charAt(0)}</span><span className="leader-name"><b>{learner.displayName}</b><small>{learner.cohort || 'Learner'}</small></span><strong>{learner.completionPercentage || 0}%</strong></div>) : <p className="muted-note">Learner activity will appear here once assignments are created.</p>}
          </div>
          <div className="next-step-panel"><span className="overline">YOUR NEXT MOVE / 03</span><div className="next-step-symbol">＋</div><h2>Build the next learning milestone.</h2><p>Add a new activity to your catalogue or bring another learner into the programme.</p><div className="next-step-links"><Link to="/activities">Create an activity <span>↗</span></Link><Link to="/candidates">Register a learner <span>↗</span></Link></div></div>
        </section>
      </>}
    </main>
  </>;
}
