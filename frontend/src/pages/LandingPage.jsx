import { Link } from 'react-router-dom';

export default function LandingPage() {
  return <main className="public-v2">
    <header className="public-v2-nav"><Link to="/" className="public-v2-brand"><span>N+</span> SKILLTRACK</Link><nav><a href="#approach">The approach</a><a href="#workspaces">Workspaces</a></nav><div><Link to="/login?mode=signup" className="public-v2-register">Create profile</Link><Link to="/login" className="public-v2-login">Member sign in ↗</Link></div></header>
    <section className="public-v2-hero">
      <div className="public-v2-hero-copy"><span className="overline"><i/> LEARNING, MADE VISIBLE</span><h1>Make the work<br/>count. <em>See it grow.</em></h1><p>SkillTrack gives learners a clear path through their activities and gives coordinators a better way to guide the journey.</p><div className="public-v2-actions"><Link to="/login" className="button button-dark">Enter your workspace <span>↗</span></Link><Link to="/login?mode=signup" className="public-v2-text-link">I'm a new learner <span>→</span></Link></div><div className="public-v2-footnote"><span>01 / LEARN WITH INTENTION</span><span>02 / TRACK YOUR MOMENTUM</span></div></div>
      <div className="public-v2-visual"><div className="public-v2-orbit orbit-large"/><div className="public-v2-orbit orbit-small"/><div className="public-v2-number">N<span>+</span></div><div className="public-v2-note note-top"><small>THE PRACTICE</small><b>Learn. Apply. Repeat.</b></div><div className="public-v2-note note-bottom"><small>YOUR NEXT STEP</small><b>Make progress visible <span>↗</span></b></div><div className="public-v2-vertical">SKILLTRACK / LEARNING OPERATIONS</div></div>
    </section>
    <section className="public-v2-band" id="approach"><span>THE IDEA</span><h2>Less chasing updates.<br/><em>More meaningful progress.</em></h2><p>One connected place for programme activity, learner ownership and useful reporting.</p></section>
    <section className="public-v2-features" id="workspaces"><article><span>01</span><h3>For coordinators</h3><p>Bring your people, learning activities and completion reports into one working view.</p><Link to="/login">Open coordinator access ↗</Link></article><article><span>02</span><h3>For learners</h3><p>See your assignments, update your progress and keep a record of every milestone.</p><Link to="/login">Open learner access ↗</Link></article><article><span>03</span><h3>For the programme</h3><p>Turn scattered activity into a clear picture of what is moving and what needs attention.</p><Link to="/login?mode=signup">Create learner profile ↗</Link></article></section>
    <footer className="public-v2-footer"><span>SKILLTRACK <b>+</b> LEARNING OPERATIONS</span><span>STEADY PROGRESS. REAL MOMENTUM.</span></footer>
  </main>;
}
