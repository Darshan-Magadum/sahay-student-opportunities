import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Briefcase,
  Bookmark,
  FileText,
  User,
  Search,
  Bell,
  Clock,
  Building2,
  ChevronRight,
  X,
  Menu,
  AlertCircle,
  MapPin,
  IndianRupee,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Edit3,
  Plus,
  Trash2,
  Code,
  Award,
  Globe,
  Compass,
  BookOpen,
  Calendar,
  Check,
} from 'lucide-react';
import { evaluateMatch, getOpportunityApplyAction } from './utils/matching.js';
import './App.css';

// ─── Static demo fallback / initial state ───────────────────────────────────

const defaultApplications = [
  { id: 1, title: 'Global Leaders Scholarship', org: 'GlobalEd',  status: 'In Review',  statusClass: 'status-review',     date: 'Applied Oct 1' },
  { id: 2, title: 'Software Dev Intern',         org: 'TechCorp',  status: 'Submitted',  statusClass: 'status-submitted',  date: 'Applied Oct 5' },
];

const defaultProfile = {
  // Basic Details & Education
  name: 'Jay Doe',
  email: 'jay.doe@example.com',
  course: 'Computer Science',
  year: 'Junior (3rd Year)',
  location: 'Bangalore, India',
  college: 'National Institute of Technology',
  degree: 'B.Tech',
  bio: 'Aspiring software engineer interested in full-stack development and open source.',
  
  // Internship Profile Fields
  skills: ['React', 'JavaScript', 'Node.js', 'CSS'],
  languages: ['JavaScript', 'Python', 'C++'],
  frameworks: ['React', 'Express', 'Tailwind', 'Git'],
  projects: [
    {
      name: 'Sahay Student Portal',
      description: 'Comprehensive portal matching students with verified scholarships and internships.',
      url: 'https://github.com/example/sahay',
    },
  ],
  internshipRoles: ['Full Stack Developer', 'Frontend Engineer'],
  workMode: 'hybrid', // 'remote' | 'hybrid' | 'onsite'
  availability: 'Immediate (Within 2 weeks)',
  preferredDuration: '3-6 months',
  experience: 'Built 3 production web apps; campus coding club mentor.',
  githubUrl: 'https://github.com',
  portfolioUrl: 'https://portfolio.dev',

  // Scholarship Profile Fields
  cgpa: '8.8',
  academicMarks: '88% in 12th Standard (CBSE)',
  incomeRange: '<2.5L',
  domicileState: 'Karnataka',
  category: 'General',
  scholarshipEligibilityInfo: 'First-generation college student, active in open source community programs.',
};

const demoNotifications = [
  { id: 1, title: 'Application Status Updated', message: 'Your application for Global Leaders Scholarship is now In Review.', read: false, time: '2 hours ago' },
  { id: 2, title: 'Upcoming Deadline Alert',   message: 'Women in Tech Scholarship deadline is approaching (Oct 30).', read: false, time: '1 day ago' },
  { id: 3, title: 'New Opportunities Available', message: 'Explore 3 new engineering internships matched with your profile.', read: true, time: '3 days ago' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseDeadlineDate = (str) => {
  if (!str || typeof str !== 'string') return null;
  const cleaned = str.trim();
  const match = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  if (match) {
    const mStr = match[1].toLowerCase().slice(0, 3);
    if (months[mStr] !== undefined) {
      return new Date(parseInt(match[3], 10), months[mStr], parseInt(match[2], 10));
    }
  }
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  }
  return null;
};

const getDaysUntilDeadline = (targetDate, today = new Date()) => {
  if (!targetDate) return null;
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = targetMidnight.getTime() - todayMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const getDeadlineStatus = (days) => {
  if (days === null) {
    return { status: 'none', label: 'Rolling Admissions', className: 'deadline-open' };
  }
  if (days < 0) {
    return { status: 'expired', label: 'Expired', className: 'deadline-expired' };
  }
  if (days === 0) {
    return { status: 'today', label: 'Due today', className: 'deadline-urgent' };
  }
  if (days === 1) {
    return { status: 'tomorrow', label: 'Due tomorrow', className: 'deadline-urgent' };
  }
  if (days <= 3) {
    return { status: 'closing-soon', label: `${days} days left`, className: 'deadline-urgent' };
  }
  if (days <= 7) {
    return { status: 'closing-soon', label: `${days} days left`, className: 'deadline-warning' };
  }
  return { status: 'upcoming', label: `${days} days left`, className: 'deadline-normal' };
};

function OrgLogo({ opp, size = 36 }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = opp.logo || opp.orgLogo || opp.companyLogo;

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={`${opp.org || opp.title} logo`}
        className="opp-org-logo"
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: '6px' }}
        onError={() => setImgError(true)}
      />
    );
  }

  const isScholarship = (opp.type || '').toLowerCase() === 'scholarship';
  return (
    <div
      className={`opp-logo-fallback ${isScholarship ? 'scholarship-fallback' : 'internship-fallback'}`}
      style={{ width: size, height: size }}
      title={opp.org || 'Opportunity Authority'}
      aria-hidden="true"
    >
      {isScholarship ? <GraduationCap size={Math.round(size * 0.52)} /> : <Briefcase size={Math.round(size * 0.52)} />}
    </div>
  );
}

const sortOpportunities = (list, sortKey) => {
  const arr = [...list];
  if (sortKey === 'match-desc') {
    // rank strongest profile matches first without hiding any listings
    arr.sort((a, b) => (b._matchScore || 0) - (a._matchScore || 0));
  } else if (sortKey === 'title-asc') {
    arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (sortKey === 'deadline-desc') {
    // latest deadline first (nulls/rolling at the start)
    arr.sort((a, b) => {
      const da = parseDeadlineDate(a.deadline);
      const db = parseDeadlineDate(b.deadline);
      if (!da && !db) return 0;
      if (!da) return -1;
      if (!db) return 1;
      return db.getTime() - da.getTime();
    });
  } else {
    // deadline-asc: soonest first (nulls/rolling at end)
    arr.sort((a, b) => {
      const da = parseDeadlineDate(a.deadline);
      const db = parseDeadlineDate(b.deadline);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.getTime() - db.getTime();
    });
  }
  return arr;
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.substring(0, 2) || 'JD').toUpperCase();
};

// ─── Skeleton Loading Cards ───────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-header">
        <div className="skeleton-line short" />
        <div className="skeleton-circle" />
      </div>
      <div className="skeleton-title-row">
        <div className="skeleton-square" />
        <div className="skeleton-title-lines">
          <div className="skeleton-line title" />
          <div className="skeleton-line medium" />
        </div>
      </div>
      <div className="skeleton-box" />
      <div className="skeleton-info-grid">
        <div className="skeleton-grid-item" />
        <div className="skeleton-grid-item" />
        <div className="skeleton-grid-item" />
        <div className="skeleton-grid-item" />
      </div>
      <div className="skeleton-footer">
        <div className="skeleton-line short" />
        <div className="skeleton-btn-group">
          <div className="skeleton-btn sm" />
          <div className="skeleton-btn" />
        </div>
      </div>
    </div>
  );
}

// ─── Scholarship Card ─────────────────────────────────────────────────────────

function ScholarshipCard({ opp, isSaved, onToggleSave, onViewDetails, onApply }) {
  const shortSource = opp.source
    ? (opp.source.includes('National') ? 'NSP Portal' : opp.source.includes('AICTE') ? 'AICTE Portal' : opp.source)
    : null;

  const match = opp._match || evaluateMatch(opp, null);
  const applyAction = getOpportunityApplyAction(opp);
  const isSparse = match.labelTier === 'sparse';

  const handleApply = (e) => {
    e.stopPropagation();
    if (onApply) {
      onApply(opp, e);
    } else {
      if (applyAction.type === 'unavailable' || !applyAction.url) {
        alert('Application link unavailable — verify the official source.');
        return;
      }
      window.open(applyAction.url, '_blank', 'noopener,noreferrer');
    }
  };

  const targetDate = parseDeadlineDate(opp.deadline);
  const days = getDaysUntilDeadline(targetDate);
  const status = getDeadlineStatus(days);

  return (
    <div
      className="opp-card scholarship-card"
      onClick={() => onViewDetails(opp)}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onViewDetails(opp); }}
    >
      {/* ── Card Header: Badges & Bookmark ── */}
      <div className="opp-header">
        <div className="badge-group">
          <span className="opp-type-badge scholarship">
            <GraduationCap size={13} />
            Scholarship
          </span>
          {shortSource && (
            <span className="opp-meta-pill source-pill" title={opp.source}>
              <Globe size={11} />
              {shortSource}
            </span>
          )}
          {opp.isVerified && (
            <span className="opp-meta-pill verified-pill" title="Verified by official educational authority">
              <CheckCircle2 size={11} />
              Verified
            </span>
          )}
          {opp.location && (
            <span className="opp-meta-pill location-pill" title={opp.location}>
              <MapPin size={11} />
              {opp.location}
            </span>
          )}
        </div>
        <button
          className={`btn-icon bookmark-btn${isSaved ? ' active' : ''}`}
          aria-label={isSaved ? 'Remove from saved' : 'Save scholarship'}
          title={isSaved ? 'Saved in bookmarks' : 'Save scholarship'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(opp.id);
          }}
        >
          <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* ── Title & Organization ── */}
      <div className="opp-title-row">
        <OrgLogo opp={opp} size={46} />
        <div className="opp-title-wrap">
          <h3 className="opp-title" title={opp.title}>{opp.title}</h3>
          <div className="opp-org" title={opp.org || 'Government / Educational Body'}>
            <Building2 size={14} className="meta-icon" />
            <span>{opp.org || 'Government / Educational Body'}</span>
          </div>
        </div>
      </div>

      {/* ── Profile Match Section ── */}
      <div className={`opp-match-block tier-${match.labelTier}`}>
        <div className="opp-match-header">
          <span className="opp-match-label">
            <Sparkles size={12} /> {isSparse ? 'Profile Incomplete' : match.label}
          </span>
          <span className="opp-match-score">
            {isSparse ? 'No score available' : `${match.score}% Match`}
          </span>
        </div>
        <div className="opp-match-reason">{match.reason}</div>
        {!isSparse && match.missingCriteria && match.missingCriteria.length > 0 && (
          <div className="opp-match-missing">
            <AlertCircle size={12} />
            <span>Missing: {match.missingCriteria.slice(0, 2).join(' • ')}</span>
          </div>
        )}
        {!isSparse && match.labelTier === 'strong' && match.highlights && match.highlights.length > 0 && (
          <div className="opp-match-highlight">
            <CheckCircle2 size={12} />
            <span>{match.highlights[0]}</span>
          </div>
        )}
      </div>

      {/* ── Key Information Grid (2 Columns) ── */}
      <div className="card-info-grid">
        <div className="info-item">
          <span className="info-label">Award Value</span>
          <span className="info-value award-highlight" title={opp.amount || 'Check official source'}>
            {opp.amount || 'Check official source'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Eligible Degree</span>
          <span className="info-value" title={opp.academicRequirements || 'All qualified students'}>
            {opp.academicRequirements || 'All qualified students'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Applicable Scope</span>
          <span className="info-value" title={opp.location || 'Pan-India'}>
            {opp.location || 'Pan-India'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Eligibility Criteria</span>
          <span className="info-value criteria-text" title={opp.eligibility || 'Check official guidelines'}>
            {opp.eligibility || 'Check official guidelines'}
          </span>
        </div>
      </div>

      {/* ── Card Footer: Deadline & Action Buttons ── */}
      <div className="opp-footer">
        <div className="opp-deadline-col">
          <span className="opp-deadline-label">Deadline</span>
          {opp.deadline ? (
            <div className="opp-deadline-row">
              <div className="opp-deadline">
                <Clock size={13} className="meta-icon" />
                <span>{opp.deadline}</span>
              </div>
              <span className={`deadline-tag ${status.className}`}>
                {status.label}
              </span>
            </div>
          ) : (
            <div className="opp-deadline-row">
              <span className="opp-deadline-open">
                <Clock size={13} className="meta-icon" />
                Rolling Admissions
              </span>
              <span className="deadline-tag deadline-open">Open</span>
            </div>
          )}
        </div>

        <div className="opp-actions-group">
          <button
            className="card-view-btn"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(opp);
            }}
          >
            Details
          </button>
          <button
            className={`card-apply-btn${applyAction.type === 'official_site' ? ' official-site-btn' : ''}${applyAction.type === 'unavailable' ? ' disabled' : ''}`}
            onClick={handleApply}
            title={applyAction.label}
            disabled={applyAction.type === 'unavailable'}
          >
            {applyAction.type === 'official_site' ? 'Visit Official Site' : applyAction.shortLabel} <ExternalLink size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Internship Card ─────────────────────────────────────────────────────────

function InternshipCard({ opp, isSaved, onToggleSave, onViewDetails, onApply }) {
  const shortSource = opp.source
    ? (opp.source.includes('AICTE') ? 'AICTE Portal' : opp.source)
    : null;

  const match = opp._match || evaluateMatch(opp, null);
  const applyAction = getOpportunityApplyAction(opp);
  const isSparse = match.labelTier === 'sparse';

  const handleApply = (e) => {
    e.stopPropagation();
    if (onApply) {
      onApply(opp, e);
    } else {
      if (applyAction.type === 'unavailable' || !applyAction.url) {
        alert('Application link unavailable — verify the official source.');
        return;
      }
      window.open(applyAction.url, '_blank', 'noopener,noreferrer');
    }
  };

  const targetDate = parseDeadlineDate(opp.deadline);
  const days = getDaysUntilDeadline(targetDate);
  const status = getDeadlineStatus(days);

  return (
    <div
      className="opp-card internship-card"
      onClick={() => onViewDetails(opp)}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onViewDetails(opp); }}
    >
      {/* ── Card Header: Badges & Bookmark ── */}
      <div className="opp-header">
        <div className="badge-group">
          <span className="opp-type-badge internship">
            <Briefcase size={13} />
            Internship
          </span>
          {shortSource && (
            <span className="opp-meta-pill source-pill" title={opp.source}>
              <Building2 size={11} />
              {shortSource}
            </span>
          )}
          {opp.isVerified && (
            <span className="opp-meta-pill verified-pill" title="Verified by AICTE authorized portal">
              <CheckCircle2 size={11} />
              Verified
            </span>
          )}
          {opp.location && (
            <span className="opp-meta-pill location-pill" title={opp.location}>
              <MapPin size={11} />
              {opp.location}
            </span>
          )}
        </div>
        <button
          className={`btn-icon bookmark-btn${isSaved ? ' active' : ''}`}
          aria-label={isSaved ? 'Remove from saved' : 'Save internship'}
          title={isSaved ? 'Saved in bookmarks' : 'Save internship'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(opp.id);
          }}
        >
          <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* ── Title & Organization ── */}
      <div className="opp-title-row">
        <OrgLogo opp={opp} size={46} />
        <div className="opp-title-wrap">
          <h3 className="opp-title" title={opp.title}>{opp.title}</h3>
          <div className="opp-org" title={opp.org || 'Internship Organization'}>
            <Building2 size={14} className="meta-icon" />
            <span>{opp.org || 'Internship Organization'}</span>
          </div>
        </div>
      </div>

      {/* ── Profile Match Section ── */}
      <div className={`opp-match-block tier-${match.labelTier}`}>
        <div className="opp-match-header">
          <span className="opp-match-label">
            <Sparkles size={12} /> {isSparse ? 'Profile Incomplete' : match.label}
          </span>
          <span className="opp-match-score">
            {isSparse ? 'No score available' : `${match.score}% Match`}
          </span>
        </div>
        <div className="opp-match-reason">{match.reason}</div>
        {!isSparse && match.missingCriteria && match.missingCriteria.length > 0 && (
          <div className="opp-match-missing">
            <AlertCircle size={12} />
            <span>Missing: {match.missingCriteria.slice(0, 2).join(' • ')}</span>
          </div>
        )}
        {!isSparse && match.labelTier === 'strong' && match.highlights && match.highlights.length > 0 && (
          <div className="opp-match-highlight">
            <CheckCircle2 size={12} />
            <span>{match.highlights[0]}</span>
          </div>
        )}
      </div>

      {/* ── Key Information Grid (2 Columns) ── */}
      <div className="card-info-grid">
        <div className="info-item">
          <span className="info-label">Monthly Stipend</span>
          <span className="info-value stipend-highlight" title={opp.stipend || 'Unpaid / College Credit'}>
            {opp.stipend || 'Unpaid / College Credit'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Work Mode & Duration</span>
          <span className="info-value">
            {opp.duration ? `${opp.duration} • ` : ''}
            {opp.workMode ? (opp.workMode.charAt(0).toUpperCase() + opp.workMode.slice(1)) : 'On-Site'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Location</span>
          <span className="info-value" title={opp.location || 'Pan-India'}>
            {opp.location || 'Pan-India'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Required Skills</span>
          {Array.isArray(opp.skills) && opp.skills.length > 0 ? (
            <div className="card-skills-list">
              {opp.skills.slice(0, 3).map((sk, idx) => (
                <span key={idx} className="skill-chip">{sk}</span>
              ))}
              {opp.skills.length > 3 && (
                <span className="skill-more-badge">+{opp.skills.length - 3}</span>
              )}
            </div>
          ) : (
            <span className="info-value text-muted-fallback">
              {opp.eligibility ? opp.eligibility.slice(0, 40) + (opp.eligibility.length > 40 ? '…' : '') : 'Open to all students'}
            </span>
          )}
        </div>
      </div>

      {/* ── Card Footer: Deadline & Action Buttons ── */}
      <div className="opp-footer">
        <div className="opp-deadline-col">
          <span className="opp-deadline-label">Deadline</span>
          {opp.deadline ? (
            <div className="opp-deadline-row">
              <div className="opp-deadline">
                <Clock size={13} className="meta-icon" />
                <span>{opp.deadline}</span>
              </div>
              <span className={`deadline-tag ${status.className}`}>
                {status.label}
              </span>
            </div>
          ) : (
            <div className="opp-deadline-row">
              <span className="opp-deadline-open">
                <Clock size={13} className="meta-icon" />
                Immediate Joining
              </span>
              <span className="deadline-tag deadline-open">Open</span>
            </div>
          )}
        </div>

        <div className="opp-actions-group">
          <button
            className="card-view-btn"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(opp);
            }}
          >
            Details
          </button>
          <button
            className={`card-apply-btn${applyAction.type === 'unavailable' ? ' disabled' : ''}`}
            onClick={handleApply}
            title={applyAction.label}
            disabled={applyAction.type === 'unavailable'}
          >
            {applyAction.shortLabel} <ExternalLink size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Application Component ───────────────────────────────────────────────

export default function App() {
  // Navigation: 'dashboard' | 'scholarships' | 'internships' | 'saved' | 'applications' | 'profile'
  const [activeView, setActiveView]           = useState('dashboard');
  const [searchQuery, setSearchQuery]         = useState('');
  const [selectedOpportunity, setSelected]    = useState(null);
  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [showNotifications, setShowNotifs]    = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileSaving, setProfileSaving]     = useState(false);

  // Filters for Scholarships Page
  const [scholarshipFilters, setScholarshipFilters] = useState({
    location: 'all',
    minAmount: 'all',
    sort: 'match-desc',
  });

  // Filters for Internships Page
  const [internshipFilters, setInternshipFilters] = useState({
    workMode: 'all',
    stipendType: 'all',
    sort: 'match-desc',
  });

  // Filters for Upcoming Deadlines Page
  const [deadlinesFilterType, setDeadlinesFilterType] = useState('all'); // 'all' | 'scholarships' | 'internships'
  const [deadlinesSort, setDeadlinesSort] = useState('deadline-asc');
  const [showExpiredDeadlines, setShowExpiredDeadlines] = useState(false);

  // Saved Opportunities Tab: 'all' | 'scholarships' | 'internships'
  const [savedFilterType, setSavedFilterType] = useState('all');

  // API State
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);

  // Local Storage State
  const [savedOpps, setSavedOpps] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sahay_saved_opps')) || []; }
    catch { return []; }
  });
  const [applications, setApplications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sahay_apps')) || defaultApplications; }
    catch { return defaultApplications; }
  });
  const [profile, setProfile] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sahay_profile'));
      if (!saved || typeof saved !== 'object') return defaultProfile;
      // Normalize projects array if it was stored as an array of strings in older versions
      const normalizedProjects = Array.isArray(saved.projects)
        ? saved.projects.map(p => (typeof p === 'string' ? { name: p, description: '', url: '' } : p))
        : defaultProfile.projects;
      return {
        ...defaultProfile,
        ...saved,
        skills: Array.isArray(saved.skills) ? saved.skills : defaultProfile.skills,
        languages: Array.isArray(saved.languages) ? saved.languages : defaultProfile.languages,
        frameworks: Array.isArray(saved.frameworks) ? saved.frameworks : defaultProfile.frameworks,
        internshipRoles: Array.isArray(saved.internshipRoles) ? saved.internshipRoles : defaultProfile.internshipRoles,
        projects: normalizedProjects,
      };
    } catch {
      return defaultProfile;
    }
  });
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sahay_notifications')) || demoNotifications; }
    catch { return demoNotifications; }
  });

  // Form state for profile editing
  const [editFormData, setEditFormData]       = useState(profile);
  const [formErrors, setFormErrors]           = useState({});
  const [activeProfileTab, setActiveProfileTab] = useState('basic'); // 'basic' | 'internship' | 'scholarship'
  const [newSkillInput, setNewSkillInput]     = useState('');
  const [newLangInput, setNewLangInput]       = useState('');
  const [newFwInput, setNewFwInput]           = useState('');
  const [newRoleInput, setNewRoleInput]       = useState('');
  const [newProject, setNewProject]           = useState({ name: '', description: '', url: '' });

  // Sync to localStorage
  useEffect(() => localStorage.setItem('sahay_saved_opps',    JSON.stringify(savedOpps)),    [savedOpps]);
  useEffect(() => localStorage.setItem('sahay_apps',          JSON.stringify(applications)), [applications]);
  useEffect(() => localStorage.setItem('sahay_profile',       JSON.stringify(profile)),      [profile]);
  useEffect(() => localStorage.setItem('sahay_notifications', JSON.stringify(notifications)),[notifications]);

  // Handle ESC key for modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isEditingProfile) setIsEditingProfile(false);
        if (selectedOpportunity) setSelected(null);
        if (showNotifications) setShowNotifs(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingProfile, selectedOpportunity, showNotifications]);

  // Fetch opportunities from API
  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/opportunities');
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setOpportunities(Array.isArray(data) ? data : []);
    } catch {
      setError('Could not connect to the Sahay API. Please make sure the backend server on port 5000 is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // ── Separation: Pure Scholarships and Internships ────────────────────────────

  const allScholarships = useMemo(() => {
    return opportunities
      .filter(opp => (opp.type || '').toLowerCase() === 'scholarship')
      .map(opp => {
        const match = evaluateMatch(opp, profile);
        return {
          ...opp,
          _match: match,
          _matchScore: match.score,
        };
      })
      .sort((a, b) => (b._matchScore || 0) - (a._matchScore || 0));
  }, [opportunities, profile]);

  const allInternships = useMemo(() => {
    return opportunities
      .filter(opp => (opp.type || '').toLowerCase() === 'internship')
      .map(opp => {
        const match = evaluateMatch(opp, profile);
        return {
          ...opp,
          _match: match,
          _matchScore: match.score,
        };
      })
      .sort((a, b) => (b._matchScore || 0) - (a._matchScore || 0));
  }, [opportunities, profile]);

  const selectedMatch = useMemo(() => {
    if (!selectedOpportunity) return null;
    return evaluateMatch(selectedOpportunity, profile);
  }, [selectedOpportunity, profile]);

  // Filtered Scholarships
  const filteredScholarships = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let results = allScholarships.filter(opp => {
      const matchesSearch = !q ||
        (opp.title && opp.title.toLowerCase().includes(q)) ||
        (opp.org && opp.org.toLowerCase().includes(q)) ||
        (opp.eligibility && opp.eligibility.toLowerCase().includes(q)) ||
        (opp.location && opp.location.toLowerCase().includes(q)) ||
        (opp.description && opp.description.toLowerCase().includes(q));

      const matchesLocation = scholarshipFilters.location === 'all' ||
        (opp.location && opp.location.toLowerCase().includes(scholarshipFilters.location.toLowerCase()));

      let matchesAmount = true;
      if (scholarshipFilters.minAmount !== 'all') {
        const numVal = parseInt((opp.amount || '').replace(/[^0-9]/g, ''), 10) || 0;
        const targetMin = parseInt(scholarshipFilters.minAmount, 10);
        matchesAmount = numVal >= targetMin;
      }

      return matchesSearch && matchesLocation && matchesAmount;
    });

    // Sort
    const sort = scholarshipFilters.sort || 'match-desc';
    results = sortOpportunities(results, sort);
    return results;
  }, [allScholarships, searchQuery, scholarshipFilters]);

  // Filtered Internships
  const filteredInternships = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let results = allInternships.filter(opp => {
      const matchesSearch = !q ||
        (opp.title && opp.title.toLowerCase().includes(q)) ||
        (opp.org && opp.org.toLowerCase().includes(q)) ||
        (opp.eligibility && opp.eligibility.toLowerCase().includes(q)) ||
        (opp.location && opp.location.toLowerCase().includes(q)) ||
        (opp.description && opp.description.toLowerCase().includes(q));

      const matchesWorkMode = internshipFilters.workMode === 'all' ||
        (internshipFilters.workMode === 'remote' && opp.location && opp.location.toLowerCase().includes('remote')) ||
        (internshipFilters.workMode === 'onsite' && opp.location && !opp.location.toLowerCase().includes('remote'));

      const matchesStipend = internshipFilters.stipendType === 'all' ||
        (internshipFilters.stipendType === 'paid' && Boolean(opp.stipend)) ||
        (internshipFilters.stipendType === 'unpaid' && !opp.stipend);

      return matchesSearch && matchesWorkMode && matchesStipend;
    });

    // Sort
    const sort = internshipFilters.sort || 'match-desc';
    results = sortOpportunities(results, sort);
    return results;
  }, [allInternships, searchQuery, internshipFilters]);

  // Combined list with evaluated profile matching
  const allOpportunitiesWithMatch = useMemo(() => {
    return [...allScholarships, ...allInternships];
  }, [allScholarships, allInternships]);

  // Saved Opportunities list
  const savedOppsList = useMemo(() => {
    const oppMap = new Map(allOpportunitiesWithMatch.map(o => [o.id, o]));
    const saved = savedOpps.map(id => oppMap.get(id)).filter(Boolean);
    if (savedFilterType === 'scholarships') {
      return saved.filter(o => o.type?.toLowerCase() === 'scholarship');
    }
    if (savedFilterType === 'internships') {
      return saved.filter(o => o.type?.toLowerCase() === 'internship');
    }
    return saved;
  }, [allOpportunitiesWithMatch, savedOpps, savedFilterType]);

  // ── Upcoming Deadlines Data & Chronological Sorting ─────────────────────────
  // Non-expired opportunities with valid deadlines or rolling admissions, sorted nearest first
  const upcomingOpportunities = useMemo(() => {
    const validWithDates = [];
    const rollingAdmissions = [];

    allOpportunitiesWithMatch.forEach(opp => {
      const targetDate = parseDeadlineDate(opp.deadline);
      const days = getDaysUntilDeadline(targetDate);

      // Exclude expired opportunities (days < 0) from the default upcoming list
      if (days !== null && days < 0) {
        return;
      }

      const itemWithMeta = {
        ...opp,
        _deadlineDate: targetDate,
        _daysRemaining: days,
      };

      if (targetDate !== null) {
        validWithDates.push(itemWithMeta);
      } else {
        rollingAdmissions.push(itemWithMeta);
      }
    });

    // Sort nearest deadline first (ascending order of timestamp / days remaining)
    validWithDates.sort((a, b) => a._daysRemaining - b._daysRemaining);

    // Append rolling admissions at the end
    return [...validWithDates, ...rollingAdmissions];
  }, [allOpportunitiesWithMatch]);

  // Expired opportunities list (deadline has passed)
  const expiredOpportunities = useMemo(() => {
    const expired = [];
    allOpportunitiesWithMatch.forEach(opp => {
      const targetDate = parseDeadlineDate(opp.deadline);
      const days = getDaysUntilDeadline(targetDate);
      if (days !== null && days < 0) {
        expired.push({
          ...opp,
          _deadlineDate: targetDate,
          _daysRemaining: days,
        });
      }
    });

    // Sort most recently expired first
    expired.sort((a, b) => b._daysRemaining - a._daysRemaining);
    return expired;
  }, [allOpportunitiesWithMatch]);

  // Two separate deadline sections: Scholarships and Internships
  const displayedDeadlinesScholarships = useMemo(() => {
    const baseList = showExpiredDeadlines ? expiredOpportunities : upcomingOpportunities;
    const q = searchQuery.toLowerCase().trim();
    const filtered = baseList.filter(opp => {
      if ((opp.type || '').toLowerCase() !== 'scholarship') return false;
      return !q ||
        (opp.title && opp.title.toLowerCase().includes(q)) ||
        (opp.org && opp.org.toLowerCase().includes(q)) ||
        (opp.eligibility && opp.eligibility.toLowerCase().includes(q)) ||
        (opp.location && opp.location.toLowerCase().includes(q)) ||
        (opp.description && opp.description.toLowerCase().includes(q));
    });
    if (!showExpiredDeadlines) {
      return sortOpportunities(filtered, deadlinesSort);
    }
    return filtered;
  }, [showExpiredDeadlines, expiredOpportunities, upcomingOpportunities, searchQuery, deadlinesSort]);

  const displayedDeadlinesInternships = useMemo(() => {
    const baseList = showExpiredDeadlines ? expiredOpportunities : upcomingOpportunities;
    const q = searchQuery.toLowerCase().trim();
    const filtered = baseList.filter(opp => {
      if ((opp.type || '').toLowerCase() !== 'internship') return false;
      return !q ||
        (opp.title && opp.title.toLowerCase().includes(q)) ||
        (opp.org && opp.org.toLowerCase().includes(q)) ||
        (opp.eligibility && opp.eligibility.toLowerCase().includes(q)) ||
        (opp.location && opp.location.toLowerCase().includes(q)) ||
        (opp.description && opp.description.toLowerCase().includes(q));
    });
    if (!showExpiredDeadlines) {
      return sortOpportunities(filtered, deadlinesSort);
    }
    return filtered;
  }, [showExpiredDeadlines, expiredOpportunities, upcomingOpportunities, searchQuery, deadlinesSort]);

  // Opportunities due within next 7 days (days >= 0 and days <= 7), excluding expired and rolling
  const dueNext7DaysCount = useMemo(() => {
    return upcomingOpportunities.filter(
      opp => opp._daysRemaining !== null && opp._daysRemaining >= 0 && opp._daysRemaining <= 7
    ).length;
  }, [upcomingOpportunities]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Actions ──────────────────────────────────────────────────────────────────

  const toggleSave = (id) => {
    setSavedOpps(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleStatusChange = (appId, newStatus) => {
    const classMap = {
      'In Review': 'status-review',
      'Accepted':  'status-accepted',
      'Rejected':  'status-rejected',
      'Submitted': 'status-submitted',
    };
    setApplications(prev =>
      prev.map(app =>
        app.id === appId
          ? { ...app, status: newStatus, statusClass: classMap[newStatus] || 'status-submitted' }
          : app
      )
    );
  };

  const openProfileEditor = (section = 'basic') => {
    // Deep clone profile into editFormData
    setEditFormData({
      ...profile,
      skills: Array.isArray(profile.skills) ? [...profile.skills] : [],
      languages: Array.isArray(profile.languages) ? [...profile.languages] : [],
      frameworks: Array.isArray(profile.frameworks) ? [...profile.frameworks] : [],
      internshipRoles: Array.isArray(profile.internshipRoles) ? [...profile.internshipRoles] : [],
      projects: Array.isArray(profile.projects) ? profile.projects.map(p => ({ ...p })) : [],
    });
    setActiveProfileTab(section);
    setFormErrors({});
    setNewSkillInput('');
    setNewLangInput('');
    setNewFwInput('');
    setNewRoleInput('');
    setNewProject({ name: '', description: '', url: '' });
    setProfileSaveSuccess(false);
    setIsEditingProfile(true);
  };

  // Helper functions for dynamic array chips in edit modal
  const handleAddSkill = () => {
    const val = newSkillInput.trim();
    if (val && !editFormData.skills.includes(val)) {
      setEditFormData(prev => ({ ...prev, skills: [...prev.skills, val] }));
      setNewSkillInput('');
    }
  };
  const handleRemoveSkill = (skillToRemove) => {
    setEditFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skillToRemove) }));
  };

  const handleAddLang = () => {
    const val = newLangInput.trim();
    if (val && !editFormData.languages.includes(val)) {
      setEditFormData(prev => ({ ...prev, languages: [...prev.languages, val] }));
      setNewLangInput('');
    }
  };
  const handleRemoveLang = (langToRemove) => {
    setEditFormData(prev => ({ ...prev, languages: prev.languages.filter(l => l !== langToRemove) }));
  };

  const handleAddFw = () => {
    const val = newFwInput.trim();
    if (val && !editFormData.frameworks.includes(val)) {
      setEditFormData(prev => ({ ...prev, frameworks: [...prev.frameworks, val] }));
      setNewFwInput('');
    }
  };
  const handleRemoveFw = (fwToRemove) => {
    setEditFormData(prev => ({ ...prev, frameworks: prev.frameworks.filter(f => f !== fwToRemove) }));
  };

  const handleAddRole = () => {
    const val = newRoleInput.trim();
    if (val && !editFormData.internshipRoles.includes(val)) {
      setEditFormData(prev => ({ ...prev, internshipRoles: [...prev.internshipRoles, val] }));
      setNewRoleInput('');
    }
  };
  const handleRemoveRole = (roleToRemove) => {
    setEditFormData(prev => ({ ...prev, internshipRoles: prev.internshipRoles.filter(r => r !== roleToRemove) }));
  };

  const handleAddProject = () => {
    if (!newProject.name.trim()) return;
    setEditFormData(prev => ({
      ...prev,
      projects: [...prev.projects, { ...newProject }],
    }));
    setNewProject({ name: '', description: '', url: '' });
  };
  const handleRemoveProject = (indexToRemove) => {
    setEditFormData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Calculate profile completion metrics
  const profileCompletion = useMemo(() => {
    const checks = [
      Boolean(profile.name?.trim()),
      Boolean(profile.email?.trim()),
      Boolean(profile.course?.trim()),
      Boolean(profile.college?.trim() || profile.degree?.trim()),
      Boolean(profile.location?.trim()),
      Boolean(profile.bio?.trim()),
      Boolean(profile.skills?.length > 0),
      Boolean(profile.languages?.length > 0 || profile.frameworks?.length > 0),
      Boolean(profile.projects?.length > 0),
      Boolean(profile.internshipRoles?.length > 0),
      Boolean(profile.cgpa?.trim()),
      Boolean(profile.incomeRange?.trim()),
      Boolean(profile.domicileState?.trim()),
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [profile]);

  const validateProfileForm = () => {
    const errors = {};
    if (!editFormData.name?.trim()) {
      errors.name = 'Full name is required.';
    }
    if (!editFormData.email?.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    if (!validateProfileForm()) return;

    setProfileSaving(true);
    // Simulate smooth save feedback to ensure clear UI state
    setTimeout(() => {
      setProfile(editFormData);
      setProfileSaving(false);
      setProfileSaveSuccess(true);
      setTimeout(() => {
        setIsEditingProfile(false);
        setProfileSaveSuccess(false);
      }, 700);
    }, 350);
  };

  const navigate = (view) => {
    setActiveView(view);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Navigation Configuration ─────────────────────────────────────────────────

  const navItems = [
    { view: 'dashboard',     icon: <LayoutDashboard size={19} />, label: 'Dashboard' },
    { view: 'scholarships',  icon: <GraduationCap size={19} />,   label: 'Scholarships',  badge: allScholarships.length },
    { view: 'internships',   icon: <Briefcase size={19} />,       label: 'Internships',   badge: allInternships.length },
    { view: 'deadlines',     icon: <Clock size={19} />,           label: 'Upcoming Deadlines', badge: upcomingOpportunities.length },
    { view: 'saved',         icon: <Bookmark size={19} />,        label: 'My Saved Opportunities', badge: savedOpps.length },
    { view: 'applications',  icon: <FileText size={19} />,        label: 'My Applications', badge: applications.length },
    { view: 'profile',       icon: <User size={19} />,            label: 'My Profile' },
  ];

  // ── Render Helpers ───────────────────────────────────────────────────────────

  const renderEmptyState = (title, message, actionText, onAction) => (
    <div className="empty-state-box">
      <div className="empty-state-icon">
        <Sparkles size={32} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{message}</p>
      {actionText && (
        <button className="btn-secondary empty-state-btn" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );

  return (
    <div className="app-container">

      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand" onClick={() => navigate('dashboard')} role="button" tabIndex={0}>
            <div className="brand-logo-wrap">
              <GraduationCap size={22} className="brand-logo" />
            </div>
            <div className="brand-meta">
              <span className="brand-name">Sahay</span>
              <span className="brand-tag">Student Opportunities</span>
            </div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="nav-links" aria-label="Main Navigation">
          <div className="nav-section-label">Main Menu</div>
          {navItems.slice(0, 4).map(({ view, icon, label, badge }) => (
            <button
              key={view}
              type="button"
              className={`nav-item${activeView === view ? ' active' : ''}`}
              onClick={() => navigate(view)}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="nav-count-badge">{badge}</span>
              )}
            </button>
          ))}

          <div className="nav-section-label" style={{ marginTop: '1.25rem' }}>Personal</div>
          {navItems.slice(4).map(({ view, icon, label, badge }) => (
            <button
              key={view}
              type="button"
              className={`nav-item${activeView === view ? ' active' : ''}`}
              onClick={() => navigate(view)}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="nav-count-badge">{badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* User Card in Sidebar Bottom */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => navigate('profile')} role="button" tabIndex={0}>
            <div className="avatar-sm">{getInitials(profile.name)}</div>
            <div className="sidebar-user-info">
              <span className="user-name">{profile.name}</span>
              <span className="user-role">{profile.course || 'Student'}</span>
            </div>
            <ChevronRight size={15} className="sidebar-user-chevron" />
          </div>
        </div>
      </aside>

      {/* ── Main Layout ── */}
      <main className="main-content">

        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-btn"
              aria-label="Toggle Navigation Menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="search-bar">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search scholarships, internships, providers, eligibility..."
                value={searchQuery}
                aria-label="Search opportunities"
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="search-clear-btn"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="topbar-right">
            {/* Notifications */}
            <div className="notification-container">
              <button
                className="btn-icon topbar-action-btn"
                aria-label="Notifications"
                onClick={() => setShowNotifs(v => !v)}
              >
                <Bell size={19} />
                {unreadCount > 0 && <span className="notification-badge" />}
              </button>

              {showNotifications && (
                <div className="notification-popover" role="dialog" aria-label="Notifications">
                  <div className="notification-header">
                    <div className="notif-header-title">
                      <h3>Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="unread-counter-pill">{unreadCount} new</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        className="notification-mark-all"
                        onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="notification-list">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div
                        key={n.id}
                        className={`notification-item${!n.read ? ' unread' : ''}`}
                        onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                      >
                        <div className="notif-indicator" />
                        <div className="notif-content">
                          <h4>{n.title}</h4>
                          <p className="notif-message">{n.message}</p>
                          <span className="notif-time">{n.time}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="notification-empty">You're all caught up! 🎉</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar trigger */}
            <div
              className="avatar"
              onClick={() => navigate('profile')}
              title={`View ${profile.name}'s profile`}
              role="button"
              tabIndex={0}
            >
              {getInitials(profile.name)}
            </div>
          </div>
        </header>

        {/* ── Content Viewport ── */}
        <div className="dashboard-content">

          {/* Global API Error Banner */}
          {error && (
            <div className="error-banner">
              <AlertCircle size={20} className="error-icon" />
              <div className="error-body">
                <h4>Connection Issue</h4>
                <p>{error}</p>
                <button className="btn-secondary error-retry-btn" onClick={fetchOpportunities}>
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              VIEW 1: DASHBOARD
              ═══════════════════════════════════════════════════════════════════ */}
          {activeView === 'dashboard' && (
            <>
              {/* Dashboard Greeting Header */}
              <div className="page-header dashboard-header">
                <div className="page-header-text">
                  <h1>Welcome back, {profile.name.split(' ')[0]}! 👋</h1>
                  <p>Discover personalized financial aid, national grants, and skill-building internships.</p>
                </div>
                <div className="dashboard-quick-actions">
                  <button className="btn-secondary pill-btn" onClick={() => navigate('scholarships')}>
                    <GraduationCap size={15} /> Browse Scholarships
                  </button>
                  <button className="btn-secondary pill-btn" onClick={() => navigate('internships')}>
                    <Briefcase size={15} /> Explore Internships
                  </button>
                  <button className="btn-secondary pill-btn" onClick={() => navigate('deadlines')}>
                    <Clock size={15} /> Upcoming Deadlines
                  </button>
                </div>
              </div>

              {/* Stat Summary Cards */}
              <div className="summary-cards">
                <div className="summary-card" onClick={() => navigate('deadlines')}>
                  <div className="summary-icon deadline-icon">
                    <Clock size={22} />
                  </div>
                  <div className="summary-info">
                    <h3>{dueNext7DaysCount}</h3>
                    <p>Due in Next 7 Days</p>
                  </div>
                  <span className="summary-link-hint">View deadlines <ChevronRight size={14} /></span>
                </div>

                <div className="summary-card" onClick={() => navigate('scholarships')}>
                  <div className="summary-icon scholarship-icon">
                    <GraduationCap size={22} />
                  </div>
                  <div className="summary-info">
                    <h3>{allScholarships.length}</h3>
                    <p>Available Scholarships</p>
                  </div>
                  <span className="summary-link-hint">Browse <ChevronRight size={14} /></span>
                </div>

                <div className="summary-card" onClick={() => navigate('internships')}>
                  <div className="summary-icon internship-icon">
                    <Briefcase size={22} />
                  </div>
                  <div className="summary-info">
                    <h3>{allInternships.length}</h3>
                    <p>Open Internships</p>
                  </div>
                  <span className="summary-link-hint">Explore <ChevronRight size={14} /></span>
                </div>

                <div className="summary-card" onClick={() => navigate('saved')}>
                  <div className="summary-icon saved-icon">
                    <Bookmark size={22} />
                  </div>
                  <div className="summary-info">
                    <h3>{savedOpps.length}</h3>
                    <p>Saved Opportunities</p>
                  </div>
                  <span className="summary-link-hint">View saved <ChevronRight size={14} /></span>
                </div>

                <div className="summary-card" onClick={() => navigate('applications')}>
                  <div className="summary-icon app-icon">
                    <FileText size={22} />
                  </div>
                  <div className="summary-info">
                    <h3>{applications.length}</h3>
                    <p>Active Applications</p>
                  </div>
                  <span className="summary-link-hint">Track status <ChevronRight size={14} /></span>
                </div>
              </div>

              {/* ── Separate Entry Point Section: Scholarships Preview ── */}
              <div className="dashboard-section-block">
                <div className="section-header">
                  <div className="section-title-wrap">
                    <div className="section-badge scholarship-badge-pill">
                      <GraduationCap size={14} /> Financial Aid & Grants
                    </div>
                    <h2>Featured Scholarships</h2>
                    <p className="section-desc">Merit and need-based education funding opportunities.</p>
                  </div>
                  <button className="btn-link" onClick={() => navigate('scholarships')}>
                    View All Scholarships ({allScholarships.length}) <ArrowRight size={15} />
                  </button>
                </div>

                {loading ? (
                  <div className="opportunities-grid">
                    {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                  </div>
                ) : allScholarships.length === 0 ? (
                  renderEmptyState('No scholarships available', 'Check back later for new scholarship announcements.')
                ) : (
                  <div className="opportunities-grid">
                    {allScholarships.slice(0, 4).map(opp => (
                      <ScholarshipCard
                        key={opp._id || opp.id}
                        opp={opp}
                        isSaved={savedOpps.includes(opp.id)}
                        onToggleSave={toggleSave}
                        onViewDetails={setSelected}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Separate Entry Point Section: Internships Preview ── */}
              <div className="dashboard-section-block">
                <div className="section-header">
                  <div className="section-title-wrap">
                    <div className="section-badge internship-badge-pill">
                      <Briefcase size={14} /> Career & Experience
                    </div>
                    <h2>Featured Internships</h2>
                    <p className="section-desc">Build real-world experience at leading startups and technology teams.</p>
                  </div>
                  <button className="btn-link" onClick={() => navigate('internships')}>
                    Explore All Internships ({allInternships.length}) <ArrowRight size={15} />
                  </button>
                </div>

                {loading ? (
                  <div className="opportunities-grid">
                    {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                  </div>
                ) : allInternships.length === 0 ? (
                  renderEmptyState('No internships available', 'Check back later for newly posted roles.')
                ) : (
                  <div className="opportunities-grid">
                    {allInternships.slice(0, 4).map(opp => (
                      <InternshipCard
                        key={opp._id || opp.id}
                        opp={opp}
                        isSaved={savedOpps.includes(opp.id)}
                        onToggleSave={toggleSave}
                        onViewDetails={setSelected}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Applications Tracker */}
              <div className="dashboard-section-block">
                <div className="section-header">
                  <div className="section-title-wrap">
                    <h2>Recent Application Activity</h2>
                    <p className="section-desc">Keep track of updates on your submitted applications.</p>
                  </div>
                  <button className="btn-link" onClick={() => navigate('applications')}>
                    Manage Applications <ChevronRight size={15} />
                  </button>
                </div>

                <div className="progress-section">
                  <div className="progress-list">
                    {applications.slice(0, 3).map(app => (
                      <div className="progress-item" key={app.id}>
                        <div className="progress-info">
                          <h4>{app.title}</h4>
                          <p>{app.org} · {app.date}</p>
                        </div>
                        <div className="status-badge-wrap">
                          <span className={`status-badge ${app.statusClass}`}>{app.status}</span>
                        </div>
                      </div>
                    ))}
                    {applications.length === 0 && (
                      <p className="no-data-hint">No active applications currently recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              VIEW 2: DEDICATED SCHOLARSHIPS PAGE
              ═══════════════════════════════════════════════════════════════════ */}
          {activeView === 'scholarships' && (
            <div className="dedicated-page">
              <div className="page-header">
                <div className="page-header-text">
                  <div className="page-kicker scholarship-kicker">
                    <GraduationCap size={16} /> Education Grants & Financial Aid
                  </div>
                  <h1>Find Scholarships</h1>
                  <p>Discover financial aid, merit scholarships, and education grants tailored for Indian undergraduate and postgraduate students.</p>
                </div>
              </div>

              {/* Scholarship Filters Bar */}
              <div className="filter-toolbar">
                <div className="filter-group">
                  <label htmlFor="scholarship-loc" className="filter-label">
                    <MapPin size={15} /> Location:
                  </label>
                  <select
                    id="scholarship-loc"
                    className="filter-select"
                    value={scholarshipFilters.location}
                    onChange={e => setScholarshipFilters(f => ({ ...f, location: e.target.value }))}
                  >
                    <option value="all">All Locations</option>
                    <option value="Remote">Remote</option>
                    <option value="Pan India">Pan India</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="scholarship-amount" className="filter-label">
                    <IndianRupee size={15} /> Min Award:
                  </label>
                  <select
                    id="scholarship-amount"
                    className="filter-select"
                    value={scholarshipFilters.minAmount}
                    onChange={e => setScholarshipFilters(f => ({ ...f, minAmount: e.target.value }))}
                  >
                    <option value="all">Any Amount</option>
                    <option value="25000">₹25,000+</option>
                    <option value="40000">₹40,000+</option>
                    <option value="50000">₹50,000+</option>
                  </select>
                </div>

                <div className="filter-divider" />

                <div className="filter-group">
                  <label htmlFor="scholarship-sort" className="filter-label">Sort:</label>
                  <select
                    id="scholarship-sort"
                    className="filter-select"
                    value={scholarshipFilters.sort}
                    onChange={e => setScholarshipFilters(f => ({ ...f, sort: e.target.value }))}
                  >
                    <option value="match-desc">Best Match (Recommended)</option>
                    <option value="deadline-asc">Deadline: Soonest first</option>
                    <option value="deadline-desc">Deadline: Latest first</option>
                    <option value="title-asc">Title: A–Z</option>
                  </select>
                </div>

                {(scholarshipFilters.location !== 'all' || scholarshipFilters.minAmount !== 'all' || scholarshipFilters.sort !== 'match-desc' || searchQuery) && (
                  <button
                    className="filter-reset-btn"
                    onClick={() => {
                      setScholarshipFilters({ location: 'all', minAmount: 'all', sort: 'match-desc' });
                      setSearchQuery('');
                    }}
                  >
                    <X size={13} /> Reset
                  </button>
                )}

                <div className="filter-count-label">
                  <strong>{filteredScholarships.length}</strong> scholarship{filteredScholarships.length === 1 ? '' : 's'}
                </div>
              </div>

              {/* Live Ingestion Status Banner */}
              <div className="api-sync-status-bar">
                <span className="sync-status-indicator">
                  <span className="sync-dot" /> Live national scholarships synced from the official National Scholarship Portal (NSP).
                </span>
                <span className="source-time">Database-backed &amp; verified</span>
              </div>

              {/* Honest Profile Match Notice if no strong matches exist */}
              {filteredScholarships.length > 0 && !filteredScholarships.some(opp => (opp._matchScore || 0) >= 70) && (
                <div className="no-strong-matches-banner">
                  <div className="banner-icon-wrap">
                    <Sparkles size={20} />
                  </div>
                  <div className="banner-content">
                    <strong>No strong matches yet — here are all available opportunities</strong>
                    <p>All active scholarships remain fully accessible. Opportunities with the closest known criteria are ranked first. Update your profile to unlock closer matches.</p>
                  </div>
                  <button className="banner-profile-btn" onClick={() => openProfileEditor('scholarship')}>
                    <Edit3 size={14} /> Complete Profile
                  </button>
                </div>
              )}

              {/* Scholarships Grid */}
              {loading ? (
                <div className="opportunities-grid">
                  {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                </div>
              ) : filteredScholarships.length === 0 ? (
                renderEmptyState(
                  'No scholarships matched your criteria',
                  searchQuery || scholarshipFilters.location !== 'all' || scholarshipFilters.minAmount !== 'all'
                    ? 'Try resetting the award filters or clearing the search query.'
                    : 'Check back soon for newly listed scholarships.',
                  'Clear All Filters',
                  () => {
                    setScholarshipFilters({ location: 'all', minAmount: 'all' });
                    setSearchQuery('');
                  }
                )
              ) : (
                <div className="opportunities-grid">
                  {filteredScholarships.map(opp => (
                    <ScholarshipCard
                      key={opp._id || opp.id}
                      opp={opp}
                      isSaved={savedOpps.includes(opp.id)}
                      onToggleSave={toggleSave}
                      onViewDetails={setSelected}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              VIEW 3: DEDICATED INTERNSHIPS PAGE
              ═══════════════════════════════════════════════════════════════════ */}
          {activeView === 'internships' && (
            <div className="dedicated-page">
              <div className="page-header">
                <div className="page-header-text">
                  <div className="page-kicker internship-kicker">
                    <Briefcase size={16} /> Hands-On Industry Experience
                  </div>
                  <h1>Explore Internships</h1>
                  <p>Discover internships to build experience, work on industry projects, and sharpen your professional career skills.</p>
                </div>
              </div>

              {/* Internship Filters Bar */}
              <div className="filter-toolbar">
                <div className="filter-group">
                  <label htmlFor="internship-mode" className="filter-label">
                    <MapPin size={15} /> Work Mode:
                  </label>
                  <select
                    id="internship-mode"
                    className="filter-select"
                    value={internshipFilters.workMode}
                    onChange={e => setInternshipFilters(f => ({ ...f, workMode: e.target.value }))}
                  >
                    <option value="all">All Modes</option>
                    <option value="remote">Remote Only</option>
                    <option value="onsite">On-Site / Hybrid</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="internship-stipend" className="filter-label">
                    <IndianRupee size={15} /> Compensation:
                  </label>
                  <select
                    id="internship-stipend"
                    className="filter-select"
                    value={internshipFilters.stipendType}
                    onChange={e => setInternshipFilters(f => ({ ...f, stipendType: e.target.value }))}
                  >
                    <option value="all">Paid &amp; Unpaid</option>
                    <option value="paid">Paid (Stipend provided)</option>
                    <option value="unpaid">Unpaid / College Credit</option>
                  </select>
                </div>

                <div className="filter-divider" />

                <div className="filter-group">
                  <label htmlFor="internship-sort" className="filter-label">Sort:</label>
                  <select
                    id="internship-sort"
                    className="filter-select"
                    value={internshipFilters.sort}
                    onChange={e => setInternshipFilters(f => ({ ...f, sort: e.target.value }))}
                  >
                    <option value="match-desc">Best Match (Recommended)</option>
                    <option value="deadline-asc">Deadline: Soonest first</option>
                    <option value="deadline-desc">Deadline: Latest first</option>
                    <option value="title-asc">Title: A–Z</option>
                  </select>
                </div>

                {(internshipFilters.workMode !== 'all' || internshipFilters.stipendType !== 'all' || internshipFilters.sort !== 'match-desc' || searchQuery) && (
                  <button
                    className="filter-reset-btn"
                    onClick={() => {
                      setInternshipFilters({ workMode: 'all', stipendType: 'all', sort: 'match-desc' });
                      setSearchQuery('');
                    }}
                  >
                    <X size={13} /> Reset
                  </button>
                )}

                <div className="filter-count-label">
                  <strong>{filteredInternships.length}</strong> internship{filteredInternships.length === 1 ? '' : 's'}
                </div>
              </div>

              {/* Live Ingestion Status Banner */}
              <div className="api-sync-status-bar">
                <span className="sync-status-indicator">
                  <span className="sync-dot" /> Live internships synchronized from AICTE Internship Enterprise Portal.
                </span>
                <span className="source-time">Database-backed &amp; verified</span>
              </div>

              {/* Honest Profile Match Notice if no strong matches exist */}
              {filteredInternships.length > 0 && !filteredInternships.some(opp => (opp._matchScore || 0) >= 70) && (
                <div className="no-strong-matches-banner">
                  <div className="banner-icon-wrap">
                    <Sparkles size={20} />
                  </div>
                  <div className="banner-content">
                    <strong>No strong matches yet — here are all available opportunities</strong>
                    <p>All active internships remain fully accessible. Roles with the closest alignment are ranked first. Update your skills and preferred roles to unlock closer matches.</p>
                  </div>
                  <button className="banner-profile-btn" onClick={() => openProfileEditor('internship')}>
                    <Edit3 size={14} /> Complete Profile
                  </button>
                </div>
              )}

              {/* Internships Grid */}
              {loading ? (
                <div className="opportunities-grid">
                  {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                </div>
              ) : filteredInternships.length === 0 ? (
                renderEmptyState(
                  'No internships matched your criteria',
                  searchQuery || internshipFilters.workMode !== 'all' || internshipFilters.stipendType !== 'all'
                    ? 'Try broadening your role, work mode, or compensation filters.'
                    : 'Check back soon for newly listed internship openings.',
                  'Clear All Filters',
                  () => {
                    setInternshipFilters({ workMode: 'all', stipendType: 'all' });
                    setSearchQuery('');
                  }
                )
              ) : (
                <div className="opportunities-grid">
                  {filteredInternships.map(opp => (
                    <InternshipCard
                      key={opp._id || opp.id}
                      opp={opp}
                      isSaved={savedOpps.includes(opp.id)}
                      onToggleSave={toggleSave}
                      onViewDetails={setSelected}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              VIEW: UPCOMING DEADLINES (Two-Section Layout)
              ═══════════════════════════════════════════════════════════════════ */}
          {activeView === 'deadlines' && (
            <div className="dedicated-page">
              <div className="page-header">
                <div className="page-header-text">
                  <div className="page-kicker deadline-kicker">
                    <Clock size={16} /> Chronological Timeline
                  </div>
                  <h1>Upcoming Deadlines</h1>
                  <p>
                    Track critical application closing dates. Scholarships and internships are grouped separately, sorted with the nearest deadline first.
                  </p>
                </div>
              </div>

              {/* Deadlines Filter Toolbar */}
              <div className="filter-toolbar deadlines-toolbar">
                {/* Category Pill Tabs */}
                <div className="filter-group">
                  <div className="saved-filter-tabs" style={{ margin: 0 }}>
                    <button
                      className={`saved-tab${deadlinesFilterType === 'all' ? ' active' : ''}`}
                      onClick={() => setDeadlinesFilterType('all')}
                    >
                      All ({(showExpiredDeadlines ? expiredOpportunities : upcomingOpportunities).length})
                    </button>
                    <button
                      className={`saved-tab${deadlinesFilterType === 'scholarships' ? ' active' : ''}`}
                      onClick={() => setDeadlinesFilterType('scholarships')}
                    >
                      <GraduationCap size={15} /> Scholarships ({(showExpiredDeadlines ? expiredOpportunities : upcomingOpportunities).filter(o => o.type?.toLowerCase() === 'scholarship').length})
                    </button>
                    <button
                      className={`saved-tab${deadlinesFilterType === 'internships' ? ' active' : ''}`}
                      onClick={() => setDeadlinesFilterType('internships')}
                    >
                      <Briefcase size={15} /> Internships ({(showExpiredDeadlines ? expiredOpportunities : upcomingOpportunities).filter(o => o.type?.toLowerCase() === 'internship').length})
                    </button>
                  </div>
                </div>

                <div className="filter-divider" />

                {/* Sort control (only in upcoming mode) */}
                {!showExpiredDeadlines && (
                  <div className="filter-group">
                    <label htmlFor="deadlines-sort" className="filter-label">Sort:</label>
                    <select
                      id="deadlines-sort"
                      className="filter-select"
                      value={deadlinesSort}
                      onChange={e => setDeadlinesSort(e.target.value)}
                    >
                      <option value="deadline-asc">Deadline: Soonest first</option>
                      <option value="deadline-desc">Deadline: Latest first</option>
                      <option value="title-asc">Title: A–Z</option>
                    </select>
                  </div>
                )}

                {/* Expired Toggle */}
                <div className="deadline-expired-toggle-wrap">
                  <button
                    className={`btn-secondary deadline-toggle-btn${showExpiredDeadlines ? ' active-expired' : ''}`}
                    onClick={() => setShowExpiredDeadlines(prev => !prev)}
                    title={showExpiredDeadlines ? 'Switch to active upcoming deadlines' : 'View expired opportunities'}
                  >
                    {showExpiredDeadlines ? (
                      <><Clock size={15} /> Switch to Upcoming</>
                    ) : (
                      <><Clock size={15} /> View Expired ({expiredOpportunities.length})</>
                    )}
                  </button>
                </div>

                {(searchQuery || deadlinesSort !== 'deadline-asc') && !showExpiredDeadlines && (
                  <button
                    className="filter-reset-btn"
                    onClick={() => {
                      setSearchQuery('');
                      setDeadlinesSort('deadline-asc');
                      setDeadlinesFilterType('all');
                    }}
                  >
                    <X size={13} /> Reset
                  </button>
                )}

                <div className="filter-count-label">
                  <strong>{displayedDeadlinesScholarships.length + displayedDeadlinesInternships.length}</strong> {showExpiredDeadlines ? 'expired' : 'upcoming'}
                </div>
              </div>

              {/* Notice banner when viewing expired */}
              {showExpiredDeadlines && (
                <div className="expired-notice-banner">
                  <Clock size={18} className="expired-notice-icon" />
                  <div className="expired-notice-text">
                    <strong>Viewing Past Deadlines:</strong> These opportunities have already reached their deadline dates. To return to current opportunities, click &ldquo;Switch to Upcoming&rdquo;.
                  </div>
                </div>
              )}

              {/* Two-section layout */}
              {loading ? (
                <div className="opportunities-grid">
                  {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <div className="deadlines-sections-wrap">

                  {/* ── Section A: Scholarships ── */}
                  {(deadlinesFilterType === 'all' || deadlinesFilterType === 'scholarships') && (
                    <div className="deadline-section-block">
                      <div className="deadline-section-header">
                        <div className="deadline-section-icon scholarship-icon-wrap">
                          <GraduationCap size={20} />
                        </div>
                        <div className="deadline-section-title-wrap">
                          <div className="deadline-section-title">
                            {showExpiredDeadlines ? 'Past Scholarships' : 'Upcoming Scholarships'}
                          </div>
                          <div className="deadline-section-subtitle">
                            {showExpiredDeadlines ? 'Scholarships whose deadlines have passed' : 'Sorted by nearest deadline first'}
                          </div>
                        </div>
                        <span className="deadline-count-pill scholarship-pill">
                          {displayedDeadlinesScholarships.length} {displayedDeadlinesScholarships.length === 1 ? 'scholarship' : 'scholarships'}
                        </span>
                      </div>

                      {displayedDeadlinesScholarships.length === 0 ? (
                        <div className="deadline-section-empty">
                          <strong>{showExpiredDeadlines ? 'No expired scholarships' : 'No upcoming scholarship deadlines'}</strong>
                          <p>{searchQuery ? 'No scholarships match your search.' : showExpiredDeadlines ? 'No scholarships have expired yet.' : 'All scholarship deadlines are up to date.'}</p>
                        </div>
                      ) : (
                        <div className="opportunities-grid">
                          {displayedDeadlinesScholarships.map(opp => (
                            <ScholarshipCard
                              key={opp._id || opp.id}
                              opp={opp}
                              isSaved={savedOpps.includes(opp.id)}
                              onToggleSave={toggleSave}
                              onViewDetails={setSelected}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Section B: Internships ── */}
                  {(deadlinesFilterType === 'all' || deadlinesFilterType === 'internships') && (
                    <div className="deadline-section-block">
                      <div className="deadline-section-header">
                        <div className="deadline-section-icon internship-icon-wrap">
                          <Briefcase size={20} />
                        </div>
                        <div className="deadline-section-title-wrap">
                          <div className="deadline-section-title">
                            {showExpiredDeadlines ? 'Past Internships' : 'Upcoming Internships'}
                          </div>
                          <div className="deadline-section-subtitle">
                            {showExpiredDeadlines ? 'Internships whose deadlines have passed' : 'Sorted by nearest deadline first'}
                          </div>
                        </div>
                        <span className="deadline-count-pill internship-pill">
                          {displayedDeadlinesInternships.length} {displayedDeadlinesInternships.length === 1 ? 'internship' : 'internships'}
                        </span>
                      </div>

                      {displayedDeadlinesInternships.length === 0 ? (
                        <div className="deadline-section-empty">
                          <strong>{showExpiredDeadlines ? 'No expired internships' : 'No upcoming internship deadlines'}</strong>
                          <p>{searchQuery ? 'No internships match your search.' : showExpiredDeadlines ? 'No internships have expired yet.' : 'All internship deadlines are up to date.'}</p>
                        </div>
                      ) : (
                        <div className="opportunities-grid">
                          {displayedDeadlinesInternships.map(opp => (
                            <InternshipCard
                              key={opp._id || opp.id}
                              opp={opp}
                              isSaved={savedOpps.includes(opp.id)}
                              onToggleSave={toggleSave}
                              onViewDetails={setSelected}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Both sections completely empty */}
                  {displayedDeadlinesScholarships.length === 0 && displayedDeadlinesInternships.length === 0 && deadlinesFilterType === 'all' && (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                      {showExpiredDeadlines
                        ? 'No expired opportunities found.'
                        : searchQuery
                          ? 'No opportunities match your search.'
                          : 'No upcoming deadlines available at this time.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              VIEW 4: MY SAVED OPPORTUNITIES
              ═══════════════════════════════════════════════════════════════════ */}
          {activeView === 'saved' && (
            <div className="dedicated-page">
              <div className="page-header">
                <div className="page-header-text">
                  <h1>My Saved Opportunities</h1>
                  <p>Bookmarked scholarships and internships you've saved to apply or review later.</p>
                </div>
              </div>

              {/* Type Switcher tabs */}
              <div className="saved-filter-tabs">
                <button
                  className={`saved-tab${savedFilterType === 'all' ? ' active' : ''}`}
                  onClick={() => setSavedFilterType('all')}
                >
                  All Saved ({savedOpps.length})
                </button>
                <button
                  className={`saved-tab${savedFilterType === 'scholarships' ? ' active' : ''}`}
                  onClick={() => setSavedFilterType('scholarships')}
                >
                  <GraduationCap size={15} /> Scholarships ({opportunities.filter(o => savedOpps.includes(o.id) && o.type?.toLowerCase() === 'scholarship').length})
                </button>
                <button
                  className={`saved-tab${savedFilterType === 'internships' ? ' active' : ''}`}
                  onClick={() => setSavedFilterType('internships')}
                >
                  <Briefcase size={15} /> Internships ({opportunities.filter(o => savedOpps.includes(o.id) && o.type?.toLowerCase() === 'internship').length})
                </button>
              </div>

              {savedOppsList.length === 0 ? (
                renderEmptyState(
                  'No saved opportunities yet',
                  'Save scholarships or internships that match your goals using the bookmark button on any card.',
                  'Explore Opportunities',
                  () => navigate('scholarships')
                )
              ) : (
                <div className="opportunities-grid">
                  {savedOppsList.map(opp => {
                    const isScholarship = opp.type?.toLowerCase() === 'scholarship';
                    return isScholarship ? (
                      <ScholarshipCard
                        key={opp._id || opp.id}
                        opp={opp}
                        isSaved={true}
                        onToggleSave={toggleSave}
                        onViewDetails={setSelected}
                      />
                    ) : (
                      <InternshipCard
                        key={opp._id || opp.id}
                        opp={opp}
                        isSaved={true}
                        onToggleSave={toggleSave}
                        onViewDetails={setSelected}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              VIEW 5: MY APPLICATIONS
              ═══════════════════════════════════════════════════════════════════ */}
          {activeView === 'applications' && (
            <div className="dedicated-page">
              <div className="page-header">
                <div className="page-header-text">
                  <h1>My Applications</h1>
                  <p>Track your submitted applications, update admission statuses, and manage deadlines.</p>
                </div>
              </div>

              <div className="progress-section">
                <div className="progress-list">
                  {applications.map(app => (
                    <div className="progress-item" key={app.id}>
                      <div className="progress-info">
                        <h4>{app.title}</h4>
                        <p>{app.org} · {app.date}</p>
                      </div>
                      <div className="progress-controls">
                        <label htmlFor={`status-sel-${app.id}`} className="sr-only">Update Status</label>
                        <select
                          id={`status-sel-${app.id}`}
                          className="status-select"
                          value={app.status}
                          onChange={e => handleStatusChange(app.id, e.target.value)}
                        >
                          <option>Submitted</option>
                          <option>In Review</option>
                          <option>Accepted</option>
                          <option>Rejected</option>
                        </select>
                        <span className={`status-badge ${app.statusClass}`}>{app.status}</span>
                      </div>
                    </div>
                  ))}
                  {applications.length === 0 && (
                    renderEmptyState(
                      'No applications recorded yet',
                      'When you apply to opportunities, you can track their status right here.',
                      'Find Scholarships to Apply',
                      () => navigate('scholarships')
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              VIEW 6: MY PROFILE
              ═══════════════════════════════════════════════════════════════════ */}
          {activeView === 'profile' && (
            <div className="dedicated-page">
              <div className="page-header profile-page-header">
                <div className="page-header-text">
                  <div className="page-kicker profile-kicker">
                    <Sparkles size={16} /> Verified Student Profile
                  </div>
                  <h1>Student Profile &amp; Preferences</h1>
                  <p>Keep your academic record and internship skills updated to unlock personalized opportunity recommendations.</p>
                </div>
                <div className="profile-header-actions">
                  <button className="btn-primary edit-profile-main-btn" onClick={() => openProfileEditor('basic')}>
                    <Edit3 size={15} /> Edit Entire Profile
                  </button>
                </div>
              </div>

              {/* Profile Completion & Quick Stats Banner */}
              <div className="profile-hero-card">
                <div className="profile-hero-banner">
                  <div className="profile-hero-avatar-wrap">
                    <div className="profile-avatar-lg">{getInitials(profile.name)}</div>
                    <div className="profile-hero-titles">
                      <div className="profile-hero-name-row">
                        <h2>{profile.name}</h2>
                        <span className="profile-status-pill">
                          <CheckCircle2 size={13} /> Active Student
                        </span>
                      </div>
                      <p className="profile-hero-subtitle">
                        {profile.degree ? `${profile.degree} in ` : ''}{profile.course || 'Undergraduate'} · {profile.college || 'Indian University'}
                      </p>
                      <div className="profile-hero-badges">
                        <span className="hero-badge"><MapPin size={12} /> {profile.location || 'India'}</span>
                        <span className="hero-badge"><Bookmark size={12} /> {savedOpps.length} Saved Opportunities</span>
                        <span className="hero-badge"><FileText size={12} /> {applications.length} Applications</span>
                      </div>
                    </div>
                  </div>

                  <div className="profile-completion-box">
                    <div className="completion-meta">
                      <span className="completion-label">Profile Strength</span>
                      <strong className="completion-percentage">{profileCompletion}%</strong>
                    </div>
                    <div className="completion-bar-track">
                      <div
                        className="completion-bar-fill"
                        style={{
                          width: `${profileCompletion}%`,
                          backgroundColor: profileCompletion > 75 ? '#10b981' : profileCompletion > 45 ? '#4f46e5' : '#f59e0b',
                        }}
                      />
                    </div>
                    <span className="completion-tip">
                      {profileCompletion >= 85
                        ? 'Great job! Your profile has excellent match readiness.'
                        : 'Add more skills, projects, and CGPA to improve matches.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Three Distinct Coordinated Profile Sections */}
              <div className="profile-sections-stack">
                
                {/* ── SECTION 1: BASIC DETAILS & EDUCATION (Blue Accent) ── */}
                <div className="profile-section-card basic-section-card">
                  <div className="profile-section-header">
                    <div className="section-title-wrap">
                      <div className="section-icon-badge basic-icon-badge">
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <h3>Basic Details &amp; Education</h3>
                        <p>Core contact details, academic background, and personal bio</p>
                      </div>
                    </div>
                    <button
                      className="btn-secondary section-edit-btn basic-edit-btn"
                      onClick={() => openProfileEditor('basic')}
                    >
                      <Edit3 size={14} /> Edit Section
                    </button>
                  </div>

                  <div className="profile-grid-3">
                    <div className="profile-info-pill">
                      <span className="pill-sub">Full Name</span>
                      <strong className="pill-val">{profile.name}</strong>
                    </div>
                    <div className="profile-info-pill">
                      <span className="pill-sub">Email Address</span>
                      <strong className="pill-val">{profile.email}</strong>
                    </div>
                    <div className="profile-info-pill">
                      <span className="pill-sub">City / Location</span>
                      <strong className="pill-val">{profile.location || 'Not specified'}</strong>
                    </div>
                    <div className="profile-info-pill">
                      <span className="pill-sub">College / University</span>
                      <strong className="pill-val">{profile.college || 'Not specified'}</strong>
                    </div>
                    <div className="profile-info-pill">
                      <span className="pill-sub">Course / Degree</span>
                      <strong className="pill-val">{profile.degree ? `${profile.degree} - ` : ''}{profile.course || 'Not specified'}</strong>
                    </div>
                    <div className="profile-info-pill">
                      <span className="pill-sub">Year of Study</span>
                      <strong className="pill-val">{profile.year || 'Not specified'}</strong>
                    </div>
                  </div>

                  <div className="profile-bio-box">
                    <span className="pill-sub">About &amp; Career Objective</span>
                    <p>{profile.bio || 'No bio provided yet. Add a short summary to stand out to internship recruiters and scholarship panels.'}</p>
                  </div>
                </div>

                {/* ── SECTION 2: INTERNSHIP PROFILE (Teal/Emerald Accent) ── */}
                <div className="profile-section-card internship-section-card">
                  <div className="profile-section-header">
                    <div className="section-title-wrap">
                      <div className="section-icon-badge internship-icon-badge">
                        <Code size={18} />
                      </div>
                      <div>
                        <h3>Internship Profile</h3>
                        <p>Technical abilities, project portfolio, preferred work modes, and availability</p>
                      </div>
                    </div>
                    <button
                      className="btn-secondary section-edit-btn internship-edit-btn"
                      onClick={() => openProfileEditor('internship')}
                    >
                      <Edit3 size={14} /> Edit Section
                    </button>
                  </div>

                  {/* Skills, Languages, Frameworks Chips */}
                  <div className="skills-overview-grid">
                    <div className="skills-group-block">
                      <span className="skills-group-title">Technical Skills</span>
                      <div className="chips-wrap">
                        {profile.skills && profile.skills.length > 0 ? (
                          profile.skills.map(s => <span className="custom-skill-chip" key={s}>{s}</span>)
                        ) : (
                          <span className="empty-state-tag">No skills listed yet</span>
                        )}
                      </div>
                    </div>

                    <div className="skills-group-block">
                      <span className="skills-group-title">Programming Languages</span>
                      <div className="chips-wrap">
                        {profile.languages && profile.languages.length > 0 ? (
                          profile.languages.map(l => <span className="custom-lang-chip" key={l}>{l}</span>)
                        ) : (
                          <span className="empty-state-tag">No languages listed</span>
                        )}
                      </div>
                    </div>

                    <div className="skills-group-block">
                      <span className="skills-group-title">Frameworks &amp; Tools</span>
                      <div className="chips-wrap">
                        {profile.frameworks && profile.frameworks.length > 0 ? (
                          profile.frameworks.map(f => <span className="custom-fw-chip" key={f}>{f}</span>)
                        ) : (
                          <span className="empty-state-tag">No frameworks listed</span>
                        )}
                      </div>
                    </div>

                    <div className="skills-group-block">
                      <span className="skills-group-title">Target Internship Roles</span>
                      <div className="chips-wrap">
                        {profile.internshipRoles && profile.internshipRoles.length > 0 ? (
                          profile.internshipRoles.map(r => <span className="custom-role-chip" key={r}>{r}</span>)
                        ) : (
                          <span className="empty-state-tag">No preferred roles selected</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Work Preferences Grid */}
                  <div className="internship-preferences-grid">
                    <div className="pref-item">
                      <span className="pref-label">Preferred Work Mode</span>
                      <span className="pref-val mode-val">
                        <Compass size={13} /> {profile.workMode ? profile.workMode.toUpperCase() : 'Remote / Hybrid'}
                      </span>
                    </div>
                    <div className="pref-item">
                      <span className="pref-label">Availability / Start Date</span>
                      <span className="pref-val">
                        <Calendar size={13} /> {profile.availability || 'Immediate'}
                      </span>
                    </div>
                    <div className="pref-item">
                      <span className="pref-label">Preferred Duration</span>
                      <span className="pref-val">
                        <Clock size={13} /> {profile.preferredDuration || '2-6 months'}
                      </span>
                    </div>
                    <div className="pref-item">
                      <span className="pref-label">Code &amp; Portfolio Links</span>
                      <div className="social-links-row">
                        {profile.githubUrl ? (
                          <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="social-link-btn">
                            <ExternalLink size={13} /> GitHub Profile
                          </a>
                        ) : (
                          <span className="text-muted-link">No GitHub link</span>
                        )}
                        {profile.portfolioUrl && (
                          <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="social-link-btn">
                            <Globe size={13} /> Portfolio Site
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Previous Experience */}
                  {profile.experience && (
                    <div className="experience-summary-box">
                      <span className="pill-sub">Previous Experience &amp; Leadership</span>
                      <p>{profile.experience}</p>
                    </div>
                  )}

                  {/* Projects Showcase Cards */}
                  <div className="projects-showcase-section">
                    <span className="skills-group-title">Featured Projects ({profile.projects ? profile.projects.length : 0})</span>
                    {profile.projects && profile.projects.length > 0 ? (
                      <div className="projects-cards-grid">
                        {profile.projects.map((proj, idx) => (
                          <div className="project-card" key={idx}>
                            <div className="project-card-header">
                              <h4>{proj.name}</h4>
                              {proj.url && (
                                <a href={proj.url} target="_blank" rel="noopener noreferrer" className="project-link" title="Open Project Link">
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                            <p className="project-card-desc">{proj.description || 'Hands-on project built with modern technologies.'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="projects-empty-card">
                        <p>No projects showcased yet. Adding your side projects significantly improves internship match rates.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── SECTION 3: SCHOLARSHIP PROFILE (Violet/Purple Accent) ── */}
                <div className="profile-section-card scholarship-section-card">
                  <div className="profile-section-header">
                    <div className="section-title-wrap">
                      <div className="section-icon-badge scholarship-icon-badge">
                        <Award size={18} />
                      </div>
                      <div>
                        <h3>Scholarship Profile</h3>
                        <p>Academic merit scores, financial criteria, domicile state, and eligibility criteria</p>
                      </div>
                    </div>
                    <button
                      className="btn-secondary section-edit-btn scholarship-edit-btn"
                      onClick={() => openProfileEditor('scholarship')}
                    >
                      <Edit3 size={14} /> Edit Section
                    </button>
                  </div>

                  <div className="profile-grid-3">
                    <div className="profile-info-pill scholarship-pill">
                      <span className="pill-sub">CGPA / Percentage</span>
                      <strong className="pill-val award-text">{profile.cgpa || 'Not specified'}</strong>
                    </div>
                    <div className="profile-info-pill scholarship-pill">
                      <span className="pill-sub">Academic Marks (10th / 12th)</span>
                      <strong className="pill-val">{profile.academicMarks || 'Not specified'}</strong>
                    </div>
                    <div className="profile-info-pill scholarship-pill">
                      <span className="pill-sub">Annual Family Income</span>
                      <strong className="pill-val">{profile.incomeRange || 'Not specified'}</strong>
                    </div>
                    <div className="profile-info-pill scholarship-pill">
                      <span className="pill-sub">State of Domicile</span>
                      <strong className="pill-val">{profile.domicileState || 'Not specified'}</strong>
                    </div>
                    <div className="profile-info-pill scholarship-pill">
                      <span className="pill-sub">Reservation Category</span>
                      <strong className="pill-val">{profile.category || 'General / Unreserved'}</strong>
                    </div>
                    <div className="profile-info-pill scholarship-pill">
                      <span className="pill-sub">Eligibility Status</span>
                      <strong className="pill-val verified-text">
                        <Check size={14} /> Ready for Grants
                      </strong>
                    </div>
                  </div>

                  <div className="scholarship-note-box">
                    <div className="note-icon-wrap">
                      <GraduationCap size={16} />
                    </div>
                    <div className="note-text">
                      <strong>Why we ask for this information:</strong>
                      <p>
                        Indian state and national government education scholarships, corporate CSR trusts, and NGO merit grants require verified criteria (income brackets, domicile state, reservation category, and minimum CGPA). We keep this confidential and only use it to match you with opportunities you are eligible to win.
                      </p>
                      {profile.scholarshipEligibilityInfo && (
                        <p className="extra-eligibility-snippet">
                          <strong>Additional details:</strong> {profile.scholarshipEligibilityInfo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Mobile Bottom Navigation Bar (Hidden on Desktop) ── */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`mobile-nav-btn${activeView === 'dashboard' ? ' active' : ''}`}
          onClick={() => navigate('dashboard')}
          aria-label="Dashboard"
        >
          <LayoutDashboard size={20} />
          <span>Home</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-btn${activeView === 'scholarships' ? ' active' : ''}`}
          onClick={() => navigate('scholarships')}
          aria-label="Scholarships"
        >
          <GraduationCap size={20} />
          <span>Scholarships</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-btn${activeView === 'internships' ? ' active' : ''}`}
          onClick={() => navigate('internships')}
          aria-label="Internships"
        >
          <Briefcase size={20} />
          <span>Internships</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-btn${activeView === 'deadlines' ? ' active' : ''}`}
          onClick={() => navigate('deadlines')}
          aria-label="Upcoming Deadlines"
        >
          <Clock size={20} />
          <span>Deadlines</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-btn${activeView === 'profile' ? ' active' : ''}`}
          onClick={() => navigate('profile')}
          aria-label="Student Profile"
        >
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: OPPORTUNITY DETAILS (Scholarship or Internship)
          ═══════════════════════════════════════════════════════════════════════ */}
      {selectedOpportunity && (
        <div className="modal-overlay" onClick={() => setSelected(null)} role="dialog" aria-modal="true">
          <div className="modal-content opp-modal-content" onClick={e => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelected(null)}
              aria-label="Close opportunity details"
            >
              <X size={19} />
            </button>

            <div className="modal-header-badge">
              <span className={`opp-type-badge ${selectedOpportunity.type?.toLowerCase() === 'scholarship' ? 'scholarship' : 'internship'}`}>
                {selectedOpportunity.type?.toLowerCase() === 'scholarship' ? <GraduationCap size={13} /> : <Briefcase size={13} />}
                {selectedOpportunity.type}
              </span>
              {selectedOpportunity.isVerified && (
                <span className="opp-meta-pill verified-pill" style={{ marginLeft: '0.4rem' }}>
                  <CheckCircle2 size={11} /> Verified Authority
                </span>
              )}
            </div>

            <div className="modal-title-with-logo">
              <OrgLogo opp={selectedOpportunity} size={46} />
              <div>
                <h2 className="modal-opp-title">{selectedOpportunity.title}</h2>
                <div className="modal-opp-org">
                  <Building2 size={16} /> <span>{selectedOpportunity.org || 'Official Authority'}</span>
                </div>
              </div>
            </div>

            {/* Profile Match Diagnostic */}
            {selectedMatch && (
              <div className={`modal-match-diagnostic tier-${selectedMatch.labelTier}`}>
                <div className="diagnostic-header">
                  <span className="diagnostic-badge">
                    <Sparkles size={14} /> {selectedMatch.label} ({selectedMatch.score}% Readiness)
                  </span>
                </div>
                <p className="diagnostic-reason">{selectedMatch.reason}</p>
                {selectedMatch.highlights?.length > 0 && (
                  <div className="diagnostic-bullets">
                    <strong>Alignment Highlights:</strong>
                    <ul>
                      {selectedMatch.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedMatch.missingCriteria?.length > 0 && (
                  <div className="diagnostic-missing">
                    <strong>Criteria to Note / Verify:</strong>
                    <ul>
                      {selectedMatch.missingCriteria.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="modal-info-panel">
              {selectedOpportunity.amount && (
                <div className="modal-detail-row highlight-row">
                  <strong>Grant / Award:</strong>
                  <span className="modal-highlight-text award">{selectedOpportunity.amount}</span>
                </div>
              )}
              {selectedOpportunity.stipend && (
                <div className="modal-detail-row highlight-row">
                  <strong>Monthly Stipend:</strong>
                  <span className="modal-highlight-text stipend">{selectedOpportunity.stipend}</span>
                </div>
              )}
              {selectedOpportunity.duration && (
                <div className="modal-detail-row">
                  <strong>Internship Duration:</strong>
                  <span>{selectedOpportunity.duration}</span>
                </div>
              )}
              {selectedOpportunity.workMode && selectedOpportunity.workMode !== 'unspecified' && (
                <div className="modal-detail-row">
                  <strong>Work Mode:</strong>
                  <span>{selectedOpportunity.workMode.charAt(0).toUpperCase() + selectedOpportunity.workMode.slice(1)}</span>
                </div>
              )}
              {selectedOpportunity.deadline && (
                <div className="modal-detail-row">
                  <strong>Application Deadline:</strong>
                  <span>{selectedOpportunity.deadline}</span>
                </div>
              )}
              {selectedOpportunity.location && (
                <div className="modal-detail-row">
                  <strong>Location:</strong>
                  <span>{selectedOpportunity.location}</span>
                </div>
              )}
              {selectedOpportunity.academicRequirements && (
                <div className="modal-detail-row">
                  <strong>Academic Requirements:</strong>
                  <span>{selectedOpportunity.academicRequirements}</span>
                </div>
              )}
              {selectedOpportunity.eligibility && (
                <div className="modal-detail-row">
                  <strong>Eligibility Requirements:</strong>
                  <span>{selectedOpportunity.eligibility}</span>
                </div>
              )}
              {Array.isArray(selectedOpportunity.skills) && selectedOpportunity.skills.length > 0 && (
                <div className="modal-detail-row">
                  <strong>Relevant Skills:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                    {selectedOpportunity.skills.map((s, idx) => (
                      <span key={idx} className="skill-chip-sm">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-desc-box">
              <h4>Overview & Description</h4>
              <p>{selectedOpportunity.description || 'Details published on official portal.'}</p>
            </div>

            {/* Official Source Attribution */}
            {selectedOpportunity.source && (
              <div className="modal-source-attribution">
                <div>
                  <strong>Official Source:</strong> {selectedOpportunity.source}
                </div>
                {selectedOpportunity.sourceUrl && (
                  <div>
                    <strong>Source Portal:</strong>{' '}
                    <a href={selectedOpportunity.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', textDecoration: 'underline' }}>
                      {selectedOpportunity.sourceUrl} <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    </a>
                  </div>
                )}
                {selectedOpportunity.lastVerifiedAt && (
                  <div style={{ marginTop: '0.25rem', color: '#64748b', fontSize: '0.75rem' }}>
                    Last Verified: {new Date(selectedOpportunity.lastVerifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            )}

            {/* Official Guidelines PDF Document (Explicit supporting document, never default apply destination) */}
            {selectedOpportunity.guidelinesUrl && (
              <div className="modal-guidelines-box">
                <span className="guidelines-label">Official Notice &amp; Scheme Guidelines:</span>
                <a
                  href={selectedOpportunity.guidelinesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-guidelines-btn"
                >
                  <FileText size={15} /> View Official Guidelines / Notice (PDF) <ExternalLink size={13} />
                </a>
              </div>
            )}

            <div className="modal-footer-actions">
              <button
                className={`btn-icon bookmark-btn-modal${savedOpps.includes(selectedOpportunity.id) ? ' active' : ''}`}
                onClick={() => toggleSave(selectedOpportunity.id)}
                aria-label={savedOpps.includes(selectedOpportunity.id) ? 'Remove bookmark' : 'Bookmark this opportunity'}
                title={savedOpps.includes(selectedOpportunity.id) ? 'Saved' : 'Save opportunity'}
              >
                <Bookmark size={20} fill={savedOpps.includes(selectedOpportunity.id) ? 'currentColor' : 'none'} />
              </button>
              <button className="btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
              {(() => {
                const action = getOpportunityApplyAction(selectedOpportunity);
                if (action.type === 'unavailable' || !action.url) {
                  return (
                    <button
                      className="btn-secondary modal-apply-btn disabled"
                      disabled
                      title="Application link unavailable — verify the official source"
                    >
                      Application Link Unavailable
                    </button>
                  );
                }
                return (
                  <button
                    className="btn-primary modal-apply-btn"
                    onClick={() => window.open(action.url, '_blank', 'noopener,noreferrer')}
                  >
                    {action.label} <ExternalLink size={15} />
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: REDESIGNED PROFILE EDIT MODAL
          ═══════════════════════════════════════════════════════════════════════ */}
      {isEditingProfile && (
        <div className="modal-overlay" onClick={() => setIsEditingProfile(false)} role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
          <div className="modal-content profile-edit-modal" onClick={e => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setIsEditingProfile(false)}
              aria-label="Cancel and close edit modal"
            >
              <X size={19} />
            </button>

            <div className="profile-edit-header">
              <div className="modal-title-kicker">
                <Sparkles size={14} /> Profile Settings
              </div>
              <h2 id="edit-profile-title">Edit Student Profile</h2>
              <p className="profile-edit-subtitle">
                Customize your academic information, tech stack, project portfolio, and scholarship criteria.
              </p>
            </div>

            {profileSaveSuccess && (
              <div className="form-feedback-banner success" role="alert">
                <CheckCircle2 size={16} /> Changes saved successfully to your profile!
              </div>
            )}

            {/* Navigation Tabs in Edit Modal */}
            <div className="edit-modal-tabs">
              <button
                type="button"
                className={`edit-tab-btn tab-basic${activeProfileTab === 'basic' ? ' active' : ''}`}
                onClick={() => setActiveProfileTab('basic')}
              >
                <BookOpen size={15} /> 1. Basic Details
              </button>
              <button
                type="button"
                className={`edit-tab-btn tab-internship${activeProfileTab === 'internship' ? ' active' : ''}`}
                onClick={() => setActiveProfileTab('internship')}
              >
                <Code size={15} /> 2. Internship Profile
              </button>
              <button
                type="button"
                className={`edit-tab-btn tab-scholarship${activeProfileTab === 'scholarship' ? ' active' : ''}`}
                onClick={() => setActiveProfileTab('scholarship')}
              >
                <Award size={15} /> 3. Scholarship Profile
              </button>
            </div>

            <form onSubmit={handleProfileSave} noValidate>
              {/* ── TAB 1: BASIC DETAILS & EDUCATION ── */}
              {activeProfileTab === 'basic' && (
                <div className="edit-tab-content">
                  <div className="tab-intro-banner basic-intro">
                    <BookOpen size={16} />
                    <span>Personal information and university education background.</span>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="input-name">
                        Full Name <span className="req-star">*</span>
                      </label>
                      <input
                        id="input-name"
                        type="text"
                        className={`form-input${formErrors.name ? ' error' : ''}`}
                        value={editFormData.name || ''}
                        placeholder="e.g. Jay Doe"
                        onChange={e => {
                          setEditFormData(prev => ({ ...prev, name: e.target.value }));
                          if (formErrors.name) setFormErrors(err => ({ ...err, name: null }));
                        }}
                      />
                      {formErrors.name && <span className="field-error-msg">{formErrors.name}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="input-email">
                        Email Address <span className="req-star">*</span>
                      </label>
                      <input
                        id="input-email"
                        type="email"
                        className={`form-input${formErrors.email ? ' error' : ''}`}
                        value={editFormData.email || ''}
                        placeholder="e.g. student@college.edu"
                        onChange={e => {
                          setEditFormData(prev => ({ ...prev, email: e.target.value }));
                          if (formErrors.email) setFormErrors(err => ({ ...err, email: null }));
                        }}
                      />
                      {formErrors.email && <span className="field-error-msg">{formErrors.email}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="input-college">College / University</label>
                      <input
                        id="input-college"
                        type="text"
                        className="form-input"
                        value={editFormData.college || ''}
                        placeholder="e.g. Indian Institute of Technology Bombay"
                        onChange={e => setEditFormData(prev => ({ ...prev, college: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="input-degree">Degree Level</label>
                      <select
                        id="input-degree"
                        className="form-input form-select"
                        value={editFormData.degree || 'B.Tech'}
                        onChange={e => setEditFormData(prev => ({ ...prev, degree: e.target.value }))}
                      >
                        <option value="B.Tech">B.Tech / B.E.</option>
                        <option value="B.Sc">B.Sc</option>
                        <option value="B.Com">B.Com</option>
                        <option value="B.A.">B.A.</option>
                        <option value="BCA">BCA / MCA</option>
                        <option value="M.Tech">M.Tech / M.E.</option>
                        <option value="Diploma">Polytechnic Diploma</option>
                        <option value="Other">Other Degree</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="input-course">Course / Department</label>
                      <input
                        id="input-course"
                        type="text"
                        className="form-input"
                        value={editFormData.course || ''}
                        placeholder="e.g. Computer Science & Engineering"
                        onChange={e => setEditFormData(prev => ({ ...prev, course: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="input-year">Year of Study</label>
                      <select
                        id="input-year"
                        className="form-input form-select"
                        value={editFormData.year || '3rd Year'}
                        onChange={e => setEditFormData(prev => ({ ...prev, year: e.target.value }))}
                      >
                        <option value="1st Year">1st Year (Freshman)</option>
                        <option value="2nd Year">2nd Year (Sophomore)</option>
                        <option value="3rd Year">3rd Year (Junior)</option>
                        <option value="4th Year">4th Year (Senior)</option>
                        <option value="Graduated">Recent Graduate (Within 1 year)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="input-location">Current City / State</label>
                    <input
                      id="input-location"
                      type="text"
                      className="form-input"
                      value={editFormData.location || ''}
                      placeholder="e.g. Bangalore, Karnataka"
                      onChange={e => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="input-bio">About &amp; Career Objective</label>
                    <textarea
                      id="input-bio"
                      rows={3}
                      className="form-input form-textarea"
                      value={editFormData.bio || ''}
                      placeholder="Describe your passions, career goals, and what internships or scholarships you seek..."
                      onChange={e => setEditFormData(prev => ({ ...prev, bio: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* ── TAB 2: INTERNSHIP PROFILE ── */}
              {activeProfileTab === 'internship' && (
                <div className="edit-tab-content">
                  <div className="tab-intro-banner internship-intro">
                    <Code size={16} />
                    <span>Manage your tech skills, portfolio projects, preferred roles, and availability.</span>
                  </div>

                  {/* Skills Tag Input */}
                  <div className="form-group chip-editor-group">
                    <label>
                      Technical Skills <span className="chip-counter">({editFormData.skills?.length || 0})</span>
                    </label>
                    <div className="chip-input-row">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Add a skill (e.g. React, Python, Machine Learning)..."
                        value={newSkillInput}
                        onChange={e => setNewSkillInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill();
                          }
                        }}
                      />
                      <button type="button" className="btn-secondary add-chip-btn" onClick={handleAddSkill}>
                        <Plus size={15} /> Add
                      </button>
                    </div>
                    <div className="editable-chips-wrap">
                      {editFormData.skills?.map(skill => (
                        <span className="editable-chip skill-chip" key={skill}>
                          {skill}
                          <button
                            type="button"
                            className="remove-chip-btn"
                            onClick={() => handleRemoveSkill(skill)}
                            title={`Remove ${skill}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      {(!editFormData.skills || editFormData.skills.length === 0) && (
                        <span className="empty-chips-hint">No technical skills added yet. Type a skill and click Add.</span>
                      )}
                    </div>
                  </div>

                  {/* Programming Languages Tag Input */}
                  <div className="form-group chip-editor-group">
                    <label>
                      Programming Languages <span className="chip-counter">({editFormData.languages?.length || 0})</span>
                    </label>
                    <div className="chip-input-row">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Add a language (e.g. JavaScript, C++, Java, Rust)..."
                        value={newLangInput}
                        onChange={e => setNewLangInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddLang();
                          }
                        }}
                      />
                      <button type="button" className="btn-secondary add-chip-btn" onClick={handleAddLang}>
                        <Plus size={15} /> Add
                      </button>
                    </div>
                    <div className="editable-chips-wrap">
                      {editFormData.languages?.map(lang => (
                        <span className="editable-chip lang-chip" key={lang}>
                          {lang}
                          <button
                            type="button"
                            className="remove-chip-btn"
                            onClick={() => handleRemoveLang(lang)}
                            title={`Remove ${lang}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Frameworks & Tools Tag Input */}
                  <div className="form-group chip-editor-group">
                    <label>
                      Frameworks &amp; Tools <span className="chip-counter">({editFormData.frameworks?.length || 0})</span>
                    </label>
                    <div className="chip-input-row">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Add a framework/tool (e.g. Node.js, Express, Docker, Figma)..."
                        value={newFwInput}
                        onChange={e => setNewFwInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddFw();
                          }
                        }}
                      />
                      <button type="button" className="btn-secondary add-chip-btn" onClick={handleAddFw}>
                        <Plus size={15} /> Add
                      </button>
                    </div>
                    <div className="editable-chips-wrap">
                      {editFormData.frameworks?.map(fw => (
                        <span className="editable-chip fw-chip" key={fw}>
                          {fw}
                          <button
                            type="button"
                            className="remove-chip-btn"
                            onClick={() => handleRemoveFw(fw)}
                            title={`Remove ${fw}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Roles Tag Input */}
                  <div className="form-group chip-editor-group">
                    <label>
                      Preferred Internship Roles <span className="chip-counter">({editFormData.internshipRoles?.length || 0})</span>
                    </label>
                    <div className="chip-input-row">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Add a role (e.g. Frontend Developer, Data Analyst, Product Intern)..."
                        value={newRoleInput}
                        onChange={e => setNewRoleInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddRole();
                          }
                        }}
                      />
                      <button type="button" className="btn-secondary add-chip-btn" onClick={handleAddRole}>
                        <Plus size={15} /> Add
                      </button>
                    </div>
                    <div className="editable-chips-wrap">
                      {editFormData.internshipRoles?.map(role => (
                        <span className="editable-chip role-chip" key={role}>
                          {role}
                          <button
                            type="button"
                            className="remove-chip-btn"
                            onClick={() => handleRemoveRole(role)}
                            title={`Remove ${role}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Work Preferences Row */}
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="pref-workmode">Preferred Work Mode</label>
                      <select
                        id="pref-workmode"
                        className="form-input form-select"
                        value={editFormData.workMode || 'hybrid'}
                        onChange={e => setEditFormData(prev => ({ ...prev, workMode: e.target.value }))}
                      >
                        <option value="remote">Remote (Work from home)</option>
                        <option value="hybrid">Hybrid (Flexible)</option>
                        <option value="onsite">On-Site (Office location)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="pref-duration">Preferred Duration</label>
                      <select
                        id="pref-duration"
                        className="form-input form-select"
                        value={editFormData.preferredDuration || '3-6 months'}
                        onChange={e => setEditFormData(prev => ({ ...prev, preferredDuration: e.target.value }))}
                      >
                        <option value="1-2 months">Short-term (1–2 Months)</option>
                        <option value="3-6 months">Standard (3–6 Months)</option>
                        <option value="6+ months">Long-term (6+ Months)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="pref-avail">Availability / Start Date</label>
                      <input
                        id="pref-avail"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Immediate / Next Month / Summer 2026"
                        value={editFormData.availability || ''}
                        onChange={e => setEditFormData(prev => ({ ...prev, availability: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="input-github">GitHub Profile URL</label>
                      <input
                        id="input-github"
                        type="url"
                        className="form-input"
                        placeholder="https://github.com/username"
                        value={editFormData.githubUrl || ''}
                        onChange={e => setEditFormData(prev => ({ ...prev, githubUrl: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="input-portfolio">Portfolio / Live Website</label>
                      <input
                        id="input-portfolio"
                        type="url"
                        className="form-input"
                        placeholder="https://myportfolio.dev"
                        value={editFormData.portfolioUrl || ''}
                        onChange={e => setEditFormData(prev => ({ ...prev, portfolioUrl: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="input-exp">Prior Experience / Leadership</label>
                      <input
                        id="input-exp"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Ex-intern at StartupX; GDSC Lead"
                        value={editFormData.experience || ''}
                        onChange={e => setEditFormData(prev => ({ ...prev, experience: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Multi-Project Builder */}
                  <div className="projects-builder-box">
                    <div className="builder-title-row">
                      <label>Projects Portfolio ({editFormData.projects?.length || 0})</label>
                      <span className="builder-subtext">Add projects you built to demonstrate practical skill</span>
                    </div>

                    {/* New Project Input Card */}
                    <div className="add-project-card">
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="new-proj-name">Project Title</label>
                          <input
                            id="new-proj-name"
                            type="text"
                            className="form-input"
                            placeholder="e.g. AI Career Matcher"
                            value={newProject.name}
                            onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="new-proj-url">Project / Demo Link</label>
                          <input
                            id="new-proj-url"
                            type="url"
                            className="form-input"
                            placeholder="https://github.com/user/project"
                            value={newProject.url}
                            onChange={e => setNewProject(p => ({ ...p, url: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="new-proj-desc">Project Description</label>
                        <input
                          id="new-proj-desc"
                          type="text"
                          className="form-input"
                          placeholder="Short summary of technologies used and key features delivered..."
                          value={newProject.description}
                          onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))}
                        />
                      </div>
                      <div className="add-project-btn-row">
                        <button
                          type="button"
                          className="btn-primary add-project-btn"
                          disabled={!newProject.name.trim()}
                          onClick={handleAddProject}
                        >
                          <Plus size={14} /> Add Project Card
                        </button>
                      </div>
                    </div>

                    {/* Render Existing Draft Projects */}
                    <div className="draft-projects-list">
                      {editFormData.projects?.map((proj, idx) => (
                        <div className="draft-project-item" key={idx}>
                          <div className="draft-proj-info">
                            <strong>{proj.name}</strong>
                            {proj.url && <span className="draft-proj-url">{proj.url}</span>}
                            <p>{proj.description || 'No description added'}</p>
                          </div>
                          <button
                            type="button"
                            className="btn-icon delete-proj-btn"
                            onClick={() => handleRemoveProject(idx)}
                            title="Delete project"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: SCHOLARSHIP PROFILE ── */}
              {activeProfileTab === 'scholarship' && (
                <div className="edit-tab-content">
                  <div className="tab-intro-banner scholarship-intro">
                    <Award size={16} />
                    <span>Academic scores and eligibility details used for government, trust, and CSR scholarships.</span>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="input-cgpa">
                        CGPA or Percentage <span className="hint-label">(Out of 10 or 100%)</span>
                      </label>
                      <input
                        id="input-cgpa"
                        type="text"
                        className="form-input"
                        placeholder="e.g. 8.8 CGPA or 85%"
                        value={editFormData.cgpa || ''}
                        onChange={e => setEditFormData(prev => ({ ...prev, cgpa: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="input-marks">10th / 12th Academic Marks</label>
                      <input
                        id="input-marks"
                        type="text"
                        className="form-input"
                        placeholder="e.g. 92% in 12th (State Board)"
                        value={editFormData.academicMarks || ''}
                        onChange={e => setEditFormData(prev => ({ ...prev, academicMarks: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="input-income">Annual Family Income Bracket</label>
                      <select
                        id="input-income"
                        className="form-input form-select"
                        value={editFormData.incomeRange || '<2.5L'}
                        onChange={e => setEditFormData(prev => ({ ...prev, incomeRange: e.target.value }))}
                      >
                        <option value="<2.5L">Below ₹2.5 Lakhs (BPL / High Need)</option>
                        <option value="2.5L-5L">₹2.5 Lakhs – ₹5.0 Lakhs</option>
                        <option value="5L-8L">₹5.0 Lakhs – ₹8.0 Lakhs (EWS limit)</option>
                        <option value="8L-12L">₹8.0 Lakhs – ₹12.0 Lakhs</option>
                        <option value=">12L">Above ₹12.0 Lakhs</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="input-domicile">State of Domicile (Permanent Residence)</label>
                      <select
                        id="input-domicile"
                        className="form-input form-select"
                        value={editFormData.domicileState || 'Karnataka'}
                        onChange={e => setEditFormData(prev => ({ ...prev, domicileState: e.target.value }))}
                      >
                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                        <option value="Assam">Assam</option>
                        <option value="Bihar">Bihar</option>
                        <option value="Delhi">Delhi NCR</option>
                        <option value="Gujarat">Gujarat</option>
                        <option value="Haryana">Haryana</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Kerala">Kerala</option>
                        <option value="Madhya Pradesh">Madhya Pradesh</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Odisha">Odisha</option>
                        <option value="Punjab">Punjab</option>
                        <option value="Rajasthan">Rajasthan</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Telangana">Telangana</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="West Bengal">West Bengal</option>
                        <option value="Other State / UT">Other State / UT</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="input-category">Social / Reservation Category (Optional)</label>
                      <select
                        id="input-category"
                        className="form-input form-select"
                        value={editFormData.category || 'General'}
                        onChange={e => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                      >
                        <option value="General">General / Open Merit</option>
                        <option value="OBC">OBC (Non-Creamy Layer)</option>
                        <option value="SC">SC (Scheduled Caste)</option>
                        <option value="ST">ST (Scheduled Tribe)</option>
                        <option value="EWS">Economically Weaker Section (EWS)</option>
                        <option value="Minority">Religious Minority Community</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="input-scholarship-info">Special Eligibility Factors</label>
                      <input
                        id="input-scholarship-info"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Single Girl Child, First-Generation Learner, Sports quota"
                        value={editFormData.scholarshipEligibilityInfo || ''}
                        onChange={e => setEditFormData(prev => ({ ...prev, scholarshipEligibilityInfo: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="scholarship-help-callout">
                    <strong>Note on data privacy &amp; eligibility:</strong>
                    <p>
                      Many national scholarship trusts (such as Reliance Foundation, Tata Trusts, NSP, and AICTE Pragati) award funding based on specific family income thresholds or home states. Keeping this updated ensures you never miss eligible grants.
                    </p>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={profileSaving}
                  onClick={() => setIsEditingProfile(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary submit-profile-btn"
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
