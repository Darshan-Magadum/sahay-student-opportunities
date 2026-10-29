import { BaseAdapter } from './baseAdapter.js';

export class AicteInternshipAdapter extends BaseAdapter {
  constructor() {
    super('AICTE Internship Portal', 'https://internship.aicte-india.org/internships');
    this.apiUrl = 'https://internship.aicte-india.org/api/v1/catalogue/internships';
  }

  /**
   * Fetches live internships from the official AICTE catalogue API.
   * Fetches multiple pages to obtain a solid dataset of authentic listings.
   */
  async fetchOpportunities(limit = 60) {
    const opportunities = [];
    const pageSize = 30;
    const maxPages = Math.ceil(limit / pageSize);

    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = `${this.apiUrl}?page=${page}&pageSize=${pageSize}&sort=latest`;
        const res = await this.safeFetch(url, {
          headers: {
            'Accept': 'application/json'
          }
        }, 12000);

        const data = await res.json();
        const items = data.items || [];
        if (!Array.isArray(items) || items.length === 0) {
          break;
        }

        for (const raw of items) {
          const normalized = this.normalize(raw);
          if (normalized) {
            opportunities.push(normalized);
          }
        }

        if (opportunities.length >= limit) break;
      } catch (err) {
        // If page 1 succeeds, continue with what we have. Otherwise throw.
        if (page === 1) {
          throw new Error(`Failed to fetch AICTE internships: ${err.message}`);
        }
        console.warn(`[AICTE Adapter] Warning fetching page ${page}: ${err.message}`);
        break;
      }
    }

    return opportunities;
  }

  /**
   * Normalizes an AICTE internship record into the Sahay Opportunity schema.
   */
  normalize(raw) {
    const rawId = raw.uid || raw.id;
    if (!rawId || !raw.title) return null;

    // Stable unique identifier
    const sourceId = String(rawId).trim();
    const id = `aicte_${sourceId}`;

    // Normalize work mode
    let workMode = 'onsite';
    const rawMode = (raw.mode || '').toLowerCase();
    const rawLocation = (raw.location || '').toLowerCase();
    if (rawMode.includes('remote') || rawLocation.includes('remote') || rawLocation.includes('virtual')) {
      workMode = 'remote';
    } else if (rawMode.includes('hybrid') || rawLocation.includes('hybrid')) {
      workMode = 'hybrid';
    }

    // Parse deadline
    let deadlineDate = null;
    let deadlineStr = null;
    if (raw.deadline) {
      const parsed = new Date(raw.deadline);
      if (!isNaN(parsed.getTime())) {
        deadlineDate = parsed;
        deadlineStr = this.formatDeadlineString(parsed);
      }
    }

    // Determine status
    const now = new Date();
    let status = 'active';
    if (deadlineDate && deadlineDate.getTime() < now.getTime()) {
      status = 'expired';
    } else if (raw.isOpen === false) {
      status = 'closed';
    }

    // Format stipend string
    let stipend = null;
    if (raw.stipendDisplay && raw.stipendDisplay.trim() !== '') {
      stipend = raw.stipendDisplay.trim();
    } else if (typeof raw.stipend === 'number' && raw.stipend > 0) {
      stipend = `₹${raw.stipend.toLocaleString('en-IN')}/mo`;
    } else if (raw.stipend === 0) {
      stipend = 'Unpaid';
    }

    // Format eligibility string
    let eligibilityStr = 'Open to eligible college students and recent graduates.';
    if (Array.isArray(raw.eligibility) && raw.eligibility.length > 0) {
      eligibilityStr = raw.eligibility.join(', ');
    } else if (typeof raw.eligibility === 'string' && raw.eligibility.trim()) {
      eligibilityStr = raw.eligibility.trim();
    }

    // Build canonical public URL
    const applicationUrl = `https://internship.aicte-india.org/internships/${sourceId}`;

    return {
      id,
      sourceId,
      title: raw.title.trim(),
      type: 'Internship',
      org: (raw.organization || 'AICTE Verified Partner').trim(),
      description: raw.description ? raw.description.trim() : `Official internship offered through the AICTE Internship Enterprise Portal by ${raw.organization || 'authorized partner'}.`,
      eligibility: eligibilityStr,
      eligibilityCriteria: Array.isArray(raw.eligibility) ? raw.eligibility : [],
      skills: Array.isArray(raw.skills) ? raw.skills.map(s => String(s).trim()).filter(Boolean) : [],
      academicRequirements: Array.isArray(raw.eligibility) ? raw.eligibility.join(', ') : '',
      location: raw.location ? raw.location.trim() : (workMode === 'remote' ? 'Remote' : 'India'),
      workMode,
      stipend,
      stipendRaw: typeof raw.stipend === 'number' ? raw.stipend : 0,
      duration: raw.duration || (raw.durationMonths ? `${raw.durationMonths} Months` : null),
      deadline: deadlineStr,
      deadlineDate,
      openings: raw.openings || 1,
      category: raw.category || 'Technical',
      applicationUrl,
      source: this.sourceName,
      sourceUrl: this.sourceUrl,
      lastFetchedAt: new Date(),
      lastVerifiedAt: new Date(),
      isVerified: Boolean(raw.verified ?? true),
      status,
      isDemo: false
    };
  }
}

