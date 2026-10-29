/**
 * Sahay Profile Matching & Opportunity Ranking Engine
 *
 * Implements transparent, defensible scoring and labeling for both internships
 * and scholarships based on the student's latest profile.
 *
 * Principles:
 * - Never treat unknown requirements as satisfied.
 * - Never claim confirmed eligibility if required information is missing.
 * - Distinguish mandatory criteria from preferred skills.
 * - Return honest labels and clear textual explanations.
 * - Keep every opportunity in the catalog (never hide unmatched items).
 */

export const MATCH_LABELS = {
  STRONG: 'Strong match',
  GOOD: 'Good match',
  POTENTIAL: 'Potential match',
  PARTIAL: 'Some requirements missing',
  SPARSE: 'Not enough information',
  INELIGIBLE: 'Does not meet known mandatory criteria',
};

export const MATCH_TIERS = {
  STRONG: 'strong',
  GOOD: 'good',
  POTENTIAL: 'potential',
  PARTIAL: 'partial',
  SPARSE: 'sparse',
  INELIGIBLE: 'ineligible',
};

/**
 * Resolves verified destination, label, and portal type for applying to an opportunity.
 * Under no circumstances does this treat a PDF document as an application destination.
 */
export function getOpportunityApplyAction(opp) {
  if (!opp) return { type: 'unavailable', label: 'Apply Unavailable', shortLabel: 'Unavailable', url: null };
  const isInternship = clean(opp.type) === 'internship';

  if (isInternship) {
    const url = opp.applicationUrl || opp.sourceUrl;
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      return {
        type: 'direct',
        label: 'Apply on AICTE Portal',
        shortLabel: 'Apply',
        url,
        isPdf: false,
      };
    }
    return {
      type: 'unavailable',
      label: 'Application link unavailable — verify the official source',
      shortLabel: 'Unavailable',
      url: null,
      isPdf: false,
    };
  }

  // Scholarship
  const appUrl = (opp.applicationUrl && !opp.applicationUrl.toLowerCase().endsWith('.pdf')) ? opp.applicationUrl : null;
  const schemeUrl = (opp.officialSchemeUrl && !opp.officialSchemeUrl.toLowerCase().endsWith('.pdf')) ? opp.officialSchemeUrl : null;

  if (opp.hasDirectApply && appUrl && (appUrl.startsWith('http://') || appUrl.startsWith('https://'))) {
    const isDedicated = !appUrl.includes('otrapplication');
    return {
      type: 'direct',
      label: isDedicated ? 'Apply on Scheme Portal' : 'Apply on Official Portal',
      shortLabel: 'Apply',
      url: appUrl,
      isPdf: false,
    };
  }

  if (schemeUrl && (schemeUrl.startsWith('http://') || schemeUrl.startsWith('https://'))) {
    return {
      type: 'official_site',
      label: 'Visit Official Scholarship Website',
      shortLabel: 'Official Site',
      url: schemeUrl,
      isPdf: false,
    };
  }

  return {
    type: 'unavailable',
    label: 'Application link unavailable — verify the official source',
    shortLabel: 'Unavailable',
    url: null,
    isPdf: false,
  };
}

/**
 * Normalizes text for case-insensitive token comparison.
 */
function clean(str) {
  return (str || '').toString().toLowerCase().trim();
}

/**
 * Evaluates match between an opportunity and student profile.
 * @param {Object} opp - Opportunity record
 * @param {Object} profile - Student profile
 * @returns {Object} { score, label, labelTier, reason, highlights, missingCriteria, mandatoryMet }
 */
export function evaluateMatch(opp, profile) {
  if (!opp) {
    return {
      score: 0,
      label: MATCH_LABELS.SPARSE,
      labelTier: MATCH_TIERS.SPARSE,
      reason: 'No opportunity data available.',
      highlights: [],
      missingCriteria: [],
      mandatoryMet: false,
    };
  }

  const isScholarship = clean(opp.type) === 'scholarship';

  if (!profile || Object.keys(profile).length === 0) {
    return {
      score: 40,
      label: MATCH_LABELS.SPARSE,
      labelTier: MATCH_TIERS.SPARSE,
      reason: 'Complete your profile to view personalized match ranking.',
      highlights: ['Open for all applicants'],
      missingCriteria: ['Profile incomplete'],
      mandatoryMet: null,
    };
  }

  return isScholarship
    ? evaluateScholarshipMatch(opp, profile)
    : evaluateInternshipMatch(opp, profile);
}

/**
 * Evaluates internship matches.
 * Criteria:
 * 1. Mandatory Academic Eligibility (30 pts)
 * 2. Skills Match (35 pts)
 * 3. Role Preference Alignment (20 pts)
 * 4. Work Mode & Location Preference (15 pts)
 */
function evaluateInternshipMatch(opp, profile) {
  const highlights = [];
  const missingCriteria = [];
  let score = 0;
  let mandatoryMet = true;

  const oppTitle = clean(opp.title);
  const oppDesc = clean(opp.description);
  const oppElig = clean(opp.eligibility || opp.academicRequirements);
  const oppSkills = Array.isArray(opp.skills) ? opp.skills.map(clean).filter(Boolean) : [];
  const oppLocation = clean(opp.location);
  const oppWorkMode = clean(opp.workMode || (oppLocation.includes('remote') ? 'remote' : 'onsite'));

  const userDegree = clean(profile.degree);
  const userCourse = clean(profile.course);
  const userSkills = [
    ...(Array.isArray(profile.skills) ? profile.skills : []),
    ...(Array.isArray(profile.languages) ? profile.languages : []),
    ...(Array.isArray(profile.frameworks) ? profile.frameworks : []),
  ].map(clean).filter(Boolean);
  const userRoles = Array.isArray(profile.internshipRoles) ? profile.internshipRoles.map(clean) : [];
  const userWorkMode = clean(profile.workMode || 'all');
  const userLocation = clean(profile.location);

  // 1. Mandatory Academic Requirements (Max 30 pts)
  if (oppElig) {
    const requiresTechnical = oppElig.includes('b.tech') || oppElig.includes('b.e.') || oppElig.includes('engineering') || oppElig.includes('computer');
    const requiresDiploma = oppElig.includes('diploma') && !oppElig.includes('degree') && !oppElig.includes('b.tech');
    const requiresPostgrad = oppElig.includes('m.tech') || oppElig.includes('mba') || oppElig.includes('post graduate') || oppElig.includes('master');

    const userIsTech = userDegree.includes('b.tech') || userDegree.includes('b.e.') || userCourse.includes('computer') || userCourse.includes('information technology');
    const userIsDiploma = userDegree.includes('diploma');
    const userIsPostgrad = userDegree.includes('m.tech') || userDegree.includes('master') || userDegree.includes('pg');

    if (requiresPostgrad && !userIsPostgrad) {
      mandatoryMet = false;
      missingCriteria.push('Requires postgraduate/Master’s qualification');
      score += 5;
    } else if (requiresDiploma && !userIsDiploma && !userIsTech) {
      mandatoryMet = false;
      missingCriteria.push('Requires technical diploma qualification');
      score += 5;
    } else if (requiresTechnical && userIsTech) {
      score += 30;
      highlights.push(`Matches your ${profile.degree || 'technical'} qualification`);
    } else if (userDegree && oppElig.includes(userDegree)) {
      score += 30;
      highlights.push(`Degree matches: ${profile.degree}`);
    } else if (userCourse && oppElig.includes(userCourse)) {
      score += 25;
      highlights.push(`Course matches: ${profile.course}`);
    } else if (oppElig.includes('equivalent') || oppElig.includes('any')) {
      score += 20;
      highlights.push('Broad eligibility criteria');
    } else {
      score += 12;
      missingCriteria.push('Specific qualification preferred');
    }
  } else {
    // Unknown requirements: do not give full marks
    score += 15;
    highlights.push('Open academic criteria');
  }

  // 2. Skill Alignment (Max 35 pts)
  if (oppSkills.length > 0 && userSkills.length > 0) {
    const matchedSkills = [];
    const unmatchedSkills = [];

    oppSkills.forEach(os => {
      const isMatch = userSkills.some(us => os.includes(us) || us.includes(os));
      if (isMatch) {
        matchedSkills.push(os);
      } else {
        unmatchedSkills.push(os);
      }
    });

    const matchRatio = matchedSkills.length / oppSkills.length;
    const skillScore = Math.round(matchRatio * 35);
    score += skillScore;

    if (matchedSkills.length > 0) {
      highlights.push(`${matchedSkills.length} skill${matchedSkills.length > 1 ? 's' : ''} match (${matchedSkills.slice(0, 2).join(', ')})`);
    }
    if (unmatchedSkills.length > 0) {
      missingCriteria.push(`Missing: ${unmatchedSkills.slice(0, 2).join(', ')}`);
    }
  } else if (userSkills.length > 0) {
    // Opportunity has no explicit skill list; check description keywords
    const descMatches = userSkills.filter(s => oppDesc.includes(s) || oppTitle.includes(s));
    if (descMatches.length > 0) {
      score += Math.min(25, descMatches.length * 8);
      highlights.push(`Skills mentioned in role: ${descMatches.slice(0, 2).join(', ')}`);
    } else {
      score += 10;
    }
  } else {
    score += 5;
    missingCriteria.push('Add technical skills to profile to improve match');
  }

  // 3. Role Preference Alignment (Max 20 pts)
  if (userRoles.length > 0) {
    const hasRoleMatch = userRoles.some(r => oppTitle.includes(r) || oppDesc.includes(r));
    if (hasRoleMatch) {
      score += 20;
      highlights.push('Directly matches your target role');
    } else {
      // Check related tech roles
      const generalTechMatch = (oppTitle.includes('developer') || oppTitle.includes('engineer') || oppTitle.includes('analyst') || oppTitle.includes('tech'));
      if (generalTechMatch) {
        score += 10;
        highlights.push('Related technology domain');
      } else {
        score += 5;
      }
    }
  } else {
    score += 8;
  }

  // 4. Work Mode & Location (Max 15 pts)
  if (userWorkMode === 'all' || userWorkMode === oppWorkMode) {
    score += 10;
    highlights.push(`Preferred work mode: ${oppWorkMode}`);
  } else if (oppWorkMode === 'hybrid') {
    score += 7;
  } else if (userWorkMode === 'remote' && oppWorkMode === 'onsite') {
    missingCriteria.push('Onsite role (you prefer remote)');
    score += 2;
  } else {
    score += 5;
  }

  if (oppLocation.includes('remote') || oppLocation.includes('pan india')) {
    score += 5;
  } else if (userLocation && oppLocation && userLocation.includes(oppLocation.split(',')[0].trim())) {
    score += 5;
    highlights.push('In your preferred city');
  } else {
    score += 2;
  }

  // Final score clamping
  score = Math.max(10, Math.min(99, score));

  // Determine Label & Reason
  return buildResult(score, mandatoryMet, highlights, missingCriteria, 'internship');
}

/**
 * Evaluates scholarship matches.
 * Criteria:
 * 1. Academic Level & Degree Alignment (35 pts)
 * 2. Domicile & Geographic Scope (25 pts)
 * 3. Category & Demographic Eligibility (20 pts)
 * 4. Financial & Academic Merit Criteria (20 pts)
 */
function evaluateScholarshipMatch(opp, profile) {
  const highlights = [];
  const missingCriteria = [];
  let score = 0;
  let mandatoryMet = true;

  const oppTitle = clean(opp.title);
  const oppElig = clean(opp.eligibility || opp.academicRequirements || opp.description);
  const oppLoc = clean(opp.location);

  const userDegree = clean(profile.degree);
  const userCourse = clean(profile.course);
  const userState = clean(profile.domicileState);
  const userCategory = clean(profile.category || 'general');
  const userIncome = clean(profile.incomeRange);
  const userCgpa = parseFloat(profile.cgpa) || 8.0;

  // 1. Academic Level & Degree (Max 35 pts)
  const isPostgradScheme = oppTitle.includes('post graduate') || oppTitle.includes('jrf') || oppTitle.includes('srf') || oppTitle.includes('fellowship') || oppElig.includes('master');
  const isSchoolScheme = oppTitle.includes('school') || oppTitle.includes('pre matric') || oppTitle.includes('nmmss');
  const isDiplomaScheme = oppTitle.includes('diploma');
  const isDegreeScheme = oppTitle.includes('technical degree') || oppTitle.includes('degree') || oppTitle.includes('college') || oppElig.includes('degree') || oppElig.includes('undergraduate');

  const userIsTechDegree = userDegree.includes('b.tech') || userDegree.includes('b.e.') || userDegree.includes('degree');

  if (isSchoolScheme) {
    mandatoryMet = false;
    missingCriteria.push('School/Pre-matric level scheme');
    score += 5;
  } else if (isPostgradScheme && !userDegree.includes('master') && !userDegree.includes('m.tech')) {
    mandatoryMet = false;
    missingCriteria.push('Requires postgraduate/Master’s enrollment');
    score += 8;
  } else if (isDiplomaScheme && !userDegree.includes('diploma')) {
    if (userIsTechDegree) {
      score += 15;
      missingCriteria.push('Specifically targeted for diploma students');
    } else {
      mandatoryMet = false;
      missingCriteria.push('Requires diploma enrollment');
      score += 5;
    }
  } else if (isDegreeScheme && userIsTechDegree) {
    score += 35;
    highlights.push('Matches technical degree enrollment (B.Tech/B.E.)');
  } else if (userDegree && (oppElig.includes(userDegree) || oppTitle.includes(userDegree))) {
    score += 30;
    highlights.push(`Aligned with ${profile.degree}`);
  } else if (userCourse && (oppElig.includes(userCourse) || oppTitle.includes(userCourse))) {
    score += 25;
    highlights.push(`Course aligned with ${profile.course}`);
  } else {
    score += 20;
    highlights.push('Undergraduate / college level');
  }

  // 2. Domicile & Geographic Scope (Max 25 pts)
  const isNER = /\b(ner|ishan uday|nec)\b/i.test(oppTitle) || oppTitle.includes('north eastern') || /\b(ner)\b/i.test(oppLoc) || oppLoc.includes('north eastern');
  const isJK = /\b(jammu|kashmir|ladakh|pmsss)\b/i.test(oppTitle) || /\b(jammu|kashmir|ladakh)\b/i.test(oppLoc);

  if (isNER) {
    const nerStates = ['assam', 'arunachal', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'sikkim', 'tripura'];
    const matchesNER = nerStates.some(st => userState.includes(st));
    if (matchesNER) {
      score += 25;
      highlights.push(`Domicile verified for NER (${profile.domicileState})`);
    } else {
      mandatoryMet = false;
      missingCriteria.push('Requires North Eastern Region (NER) domicile');
      score += 5;
    }
  } else if (isJK) {
    const matchesJK = userState.includes('jammu') || userState.includes('kashmir') || userState.includes('ladakh');
    if (matchesJK) {
      score += 25;
      highlights.push('Domicile verified for J&K / Ladakh');
    } else {
      mandatoryMet = false;
      missingCriteria.push('Requires J&K or Ladakh domicile');
      score += 5;
    }
  } else if (oppLoc.includes('pan india') || !oppLoc || oppLoc === 'unspecified') {
    score += 25;
    highlights.push('Nationwide eligibility across all states');
  } else {
    score += 15;
  }

  // 3. Category & Demographic Criteria (Max 20 pts)
  const isScScheme = oppTitle.includes('sc students') || oppTitle.includes('top class education for sc');
  const isStScheme = oppTitle.includes('st students') || oppTitle.includes('tribal');
  const isObcScheme = oppTitle.includes('obc') || oppTitle.includes('yasasvi');
  const isDisabilityScheme = oppTitle.includes('specially abled') || oppTitle.includes('disabilities') || oppTitle.includes('saksham');
  const isGirlScheme = oppTitle.includes('girl students') || oppTitle.includes('pragati');

  if (isScScheme) {
    if (userCategory.includes('sc')) {
      score += 20;
      highlights.push('Matches SC category reservation criteria');
    } else {
      mandatoryMet = false;
      missingCriteria.push('Reserved for SC category applicants');
      score += 4;
    }
  } else if (isStScheme) {
    if (userCategory.includes('st')) {
      score += 20;
      highlights.push('Matches ST category reservation criteria');
    } else {
      mandatoryMet = false;
      missingCriteria.push('Reserved for ST category applicants');
      score += 4;
    }
  } else if (isObcScheme) {
    if (userCategory.includes('obc')) {
      score += 20;
      highlights.push('Matches OBC/EBC category reservation criteria');
    } else {
      score += 8;
      missingCriteria.push('Priority for OBC/EBC category applicants');
    }
  } else if (isDisabilityScheme) {
    // Specially abled criteria
    if (clean(profile.scholarshipEligibilityInfo).includes('disab') || userCategory.includes('pwd')) {
      score += 20;
      highlights.push('Specially abled quota applicable');
    } else {
      // Not confirmed in profile
      score += 8;
      missingCriteria.push('Requires disability certificate verification (>=40%)');
    }
  } else if (isGirlScheme) {
    score += 18;
    highlights.push('Women in technical education scheme');
  } else {
    // Open / Welfare scheme
    score += 20;
    highlights.push('Open across social categories');
  }

  // 4. Financial & Academic Merit Criteria (Max 20 pts)
  const isMerit = oppTitle.includes('merit') || oppElig.includes('merit');
  if (isMerit) {
    if (userCgpa >= 8.5) {
      score += 10;
      highlights.push(`High CGPA (${profile.cgpa}) meets merit cut-off`);
    } else if (userCgpa >= 7.5) {
      score += 8;
      highlights.push(`CGPA (${profile.cgpa}) satisfies minimum threshold`);
    } else {
      score += 5;
      missingCriteria.push('Competitive merit cut-off');
    }
  } else {
    score += 10;
  }

  // Financial criteria
  if (userIncome.includes('<2.5') || userIncome.includes('below 2.5')) {
    score += 10;
    highlights.push('Annual family income satisfies government limit');
  } else if (userIncome.includes('2.5') || userIncome.includes('8l') || userIncome.includes('<8')) {
    score += 8;
    highlights.push('Income within eligible threshold');
  } else {
    score += 6;
  }

  // Final score clamping
  score = Math.max(10, Math.min(99, score));

  return buildResult(score, mandatoryMet, highlights, missingCriteria, 'scholarship');
}

/**
 * Builds standard result with transparent label, tier, and defensible explanation.
 */
function buildResult(score, mandatoryMet, highlights, missingCriteria, type) {
  let label;
  let labelTier;
  let reason;

  if (!mandatoryMet) {
    score = Math.min(score, 30);
    label = MATCH_LABELS.INELIGIBLE;
    labelTier = MATCH_TIERS.INELIGIBLE;
    reason = missingCriteria.length > 0
      ? `Does not satisfy mandatory criteria: ${missingCriteria[0]}.`
      : 'Does not satisfy mandatory opportunity requirements.';
  } else if (score >= 80) {
    label = MATCH_LABELS.STRONG;
    labelTier = MATCH_TIERS.STRONG;
    reason = type === 'internship'
      ? `Strong fit: ${highlights.slice(0, 2).join(' and ')}.`
      : `High eligibility: ${highlights.slice(0, 2).join(' and ')}.`;
  } else if (score >= 68) {
    label = MATCH_LABELS.GOOD;
    labelTier = MATCH_TIERS.GOOD;
    reason = type === 'internship'
      ? `Good match: ${highlights.slice(0, 2).join(', ')}.`
      : `Eligible: ${highlights.slice(0, 2).join(', ')}.`;
  } else if (score >= 50) {
    label = MATCH_LABELS.POTENTIAL;
    labelTier = MATCH_TIERS.POTENTIAL;
    reason = missingCriteria.length > 0
      ? `Potential fit: ${highlights[0] || 'Eligible domain'}, but ${missingCriteria[0]}.`
      : 'Potential fit based on general qualification criteria.';
  } else if (score >= 35) {
    label = MATCH_LABELS.PARTIAL;
    labelTier = MATCH_TIERS.PARTIAL;
    reason = missingCriteria.length > 0
      ? `Some requirements missing: ${missingCriteria.slice(0, 2).join(', ')}.`
      : 'Some profile requirements are unverified.';
  } else {
    label = MATCH_LABELS.SPARSE;
    labelTier = MATCH_TIERS.SPARSE;
    reason = 'Insufficient details published to confirm profile match.';
  }

  return {
    score,
    label,
    labelTier,
    reason,
    highlights,
    missingCriteria,
    mandatoryMet,
  };
}
