import { BaseAdapter } from './baseAdapter.js';

export class NspScholarshipAdapter extends BaseAdapter {
  constructor() {
    super('National Scholarship Portal (NSP)', 'https://scholarships.gov.in/All-Scholarships');
  }

  /**
   * Fetches the live All-Scholarships page from scholarships.gov.in and extracts
   * active central and AICTE/UGC schemes.
   */
  async fetchOpportunities() {
    const res = await this.safeFetch(this.sourceUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml'
      }
    }, 15000);

    const html = await res.text();
    return this.parseHtml(html);
  }

  /**
   * Ensures a link is an absolute HTTPS URL and does not have malformed whitespace.
   */
  toAbsoluteUrl(url) {
    if (!url || typeof url !== 'string') return null;
    let clean = url.trim();
    if (clean === 'https://scholarships.gov.in/' || clean === 'https://scholarships.gov.in' || clean === '/') {
      return null;
    }
    if (clean.startsWith('//')) {
      return `https:${clean}`;
    }
    if (clean.startsWith('/')) {
      return `https://scholarships.gov.in${clean}`;
    }
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      return `https://scholarships.gov.in/${clean}`;
    }
    return clean;
  }

  /**
   * Determines verified official application and scheme URLs for a given scholarship.
   * Under no circumstances will a PDF file be set as applicationUrl.
   */
  resolveOfficialUrls(title, _ministry, _guidelinesUrl) {
    const titleLower = title.toLowerCase();

    // 1. Dedicated scheme portals
    if (titleLower.includes('jammu') || titleLower.includes('kashmir') || titleLower.includes('pm-usp special') || titleLower.includes('pmsss')) {
      return {
        applicationUrl: 'https://www.aicte-jk-scholarship-gov.in/',
        officialSchemeUrl: 'https://www.aicte-jk-scholarship-gov.in/',
        hasDirectApply: true
      };
    }

    if (titleLower.includes('tribal fellowship') || (titleLower.includes('fellowship') && titleLower.includes('st students'))) {
      return {
        applicationUrl: 'https://fellowship.tribal.gov.in/',
        officialSchemeUrl: 'https://tribal.nic.in/',
        hasDirectApply: true
      };
    }

    if (titleLower.includes('free coaching') && titleLower.includes('pm cares')) {
      return {
        applicationUrl: 'https://coaching.dosje.gov.in/',
        officialSchemeUrl: 'https://socialjustice.gov.in/',
        hasDirectApply: true
      };
    }

    // 2. Schemes without direct NSP online submission (e.g. institutional nomination)
    if (titleLower.includes('renewable energy') || titleLower.includes('mnre')) {
      return {
        applicationUrl: null,
        officialSchemeUrl: 'https://mnre.gov.in/',
        hasDirectApply: false
      };
    }

    // 3. Specific Ministry / Body informational pages
    let officialSchemeUrl = 'https://scholarships.gov.in/';
    if (titleLower.includes('pragati')) {
      officialSchemeUrl = 'https://www.aicte-india.org/schemes/students-development-schemes/Pragati-Scholarship-Scheme';
    } else if (titleLower.includes('saksham')) {
      officialSchemeUrl = 'https://www.aicte-india.org/schemes/students-development-schemes/Saksham-Scholarship-Scheme';
    } else if (titleLower.includes('swanath')) {
      officialSchemeUrl = 'https://www.aicte-india.org/schemes/students-development-schemes/Swanath-Scholarship-Scheme';
    } else if (titleLower.includes('ishan uday') || titleLower.includes('post graduate studies')) {
      officialSchemeUrl = 'https://www.ugc.gov.in/';
    } else if (titleLower.includes('disabilities')) {
      officialSchemeUrl = 'https://depwd.gov.in/';
    } else if (titleLower.includes('nmmss')) {
      officialSchemeUrl = 'https://dsel.education.gov.in/scheme/nmmss';
    } else if (titleLower.includes('csss') || titleLower.includes('college and university students')) {
      officialSchemeUrl = 'https://www.education.gov.in/scholarships-education-loan-0';
    } else if (titleLower.includes('nec') || titleLower.includes('ner')) {
      officialSchemeUrl = 'https://necouncil.gov.in/';
    } else if (titleLower.includes('railways')) {
      officialSchemeUrl = 'https://indianrailways.gov.in/';
    } else if (titleLower.includes('icar')) {
      officialSchemeUrl = 'https://icar.org.in/';
    } else if (titleLower.includes('labour') || titleLower.includes('beedi')) {
      officialSchemeUrl = 'https://labour.gov.in/';
    } else if (titleLower.includes('statistical')) {
      officialSchemeUrl = 'https://www.isical.ac.in/';
    } else if (titleLower.includes('yasasvi') || titleLower.includes('top class education for sc')) {
      officialSchemeUrl = 'https://socialjustice.gov.in/';
    } else if (titleLower.includes('central armed police') || titleLower.includes('assam rifles')) {
      officialSchemeUrl = 'https://www.warb-mha.gov.in/';
    }

    // National Scholarship Portal One-Time Registration & Application Portal
    // All central/AICTE schemes listed on NSP are officially submitted through this student portal.
    const applicationUrl = 'https://scholarships.gov.in/otrapplication/#/login-page';

    return {
      applicationUrl,
      officialSchemeUrl,
      hasDirectApply: true
    };
  }

  /**
   * Parses NSP HTML document into normalized scholarship records.
   */
  parseHtml(html) {
    const opportunities = [];
    const blocks = html.split('<div class="col-md-10">');

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const prevBlock = blocks[i - 1];

      // Extract scheme title
      const titleMatch = block.match(/<h6>\s*([\s\S]*?)\s*<\/h6>/i);
      if (!titleMatch) continue;

      let title = titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (!title || title.length < 5 || title.toLowerCase().includes('select language')) {
        continue;
      }

      // Extract ministry / department
      let ministry = 'Government of India';
      const ministryImgMatch = prevBlock.match(/MinistryImages\/([^"']+)\.(?:png|jpg|webp)/i);
      if (ministryImgMatch) {
        ministry = ministryImgMatch[1].replace(/[-_]+/g, ' ').trim();
      } else {
        const byMatch = block.match(/by\s+([A-Za-z\s]+)/i);
        if (byMatch) ministry = byMatch[1].trim();
      }

      // Extract dates
      const openFromMatch = block.match(/Scheme\s+Open from\s*:\s*([^<\r\n]+)/i);
      const deadlineMatch = block.match(/Student Application\s+Open till\s*:\s*([^<\r\n]+)/i);
      const instituteMatch = block.match(/Institute Verification\s+Open till\s*:\s*([^<\r\n]+)/i);

      // Extract guideline and FAQ links
      const guideMatch = block.match(/href="([^"]+public\/schemeGuidelines\/[^"]+)"/i);
      const faqMatch = block.match(/href="([^"]+public\/[a-zA-Z0-9_\-\/]+(?:FAQ|faq|F)\.pdf)"/i);

      const rawDeadline = deadlineMatch ? deadlineMatch[1].trim() : null;
      const rawOpenFrom = openFromMatch ? openFromMatch[1].trim() : null;
      const rawVerification = instituteMatch ? instituteMatch[1].trim() : null;
      
      const guidelinesUrl = guideMatch ? this.toAbsoluteUrl(guideMatch[1]) : null;
      const faqUrl = faqMatch ? this.toAbsoluteUrl(faqMatch[1]) : null;

      // Parse DD-MM-YYYY deadline
      let deadlineDate = null;
      let deadlineStr = null;
      if (rawDeadline) {
        const dateParts = rawDeadline.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (dateParts) {
          const day = parseInt(dateParts[1], 10);
          const month = parseInt(dateParts[2], 10) - 1;
          const year = parseInt(dateParts[3], 10);
          const parsed = new Date(year, month, day, 23, 59, 59);
          if (!isNaN(parsed.getTime())) {
            deadlineDate = parsed;
            deadlineStr = this.formatDeadlineString(parsed);
          }
        }
      }

      // Generate stable sourceId
      let sourceId = '';
      if (guidelinesUrl && guidelinesUrl.includes('/schemeGuidelines/')) {
        const filePart = guidelinesUrl.split('/').pop().replace(/\.pdf$/i, '');
        sourceId = filePart;
      }
      if (!sourceId) {
        sourceId = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 50);
      }
      const id = `nsp_${sourceId}`;

      // Status determination
      const now = new Date();
      let status = 'active';
      if (deadlineDate && deadlineDate.getTime() < now.getTime()) {
        status = 'expired';
      }

      // Specific known scholarship award values, degree requirements and eligibility criteria
      const titleLower = title.toLowerCase();
      let amount = null;
      let eligibility = 'Enrolled in recognized technical or degree course as per ministry guidelines.';
      let academicRequirements = 'Undergraduate / Technical Degree';
      let location = 'Pan India';

      if (titleLower.includes('pragati')) {
        amount = '₹50,000 / year';
        academicRequirements = titleLower.includes('diploma') ? 'Technical Diploma (1st Year)' : 'Technical Degree (B.Tech/B.E. 1st Year)';
        eligibility = 'Female students admitted to 1st year of Degree/Diploma course via centralized admission. Family income < ₹8 LPA.';
      } else if (titleLower.includes('saksham')) {
        amount = '₹50,000 / year';
        academicRequirements = titleLower.includes('diploma') ? 'Technical Diploma (1st Year)' : 'Technical Degree (B.Tech/B.E. 1st Year)';
        eligibility = 'Specially abled students with disability ≥ 40% admitted to technical degree/diploma programs.';
      } else if (titleLower.includes('swanath')) {
        amount = '₹50,000 / year';
        academicRequirements = titleLower.includes('diploma') ? 'Technical Diploma' : 'Technical Degree (B.Tech/B.E.)';
        eligibility = 'Orphans, wards of parents deceased due to Covid-19, or wards of armed forces personnel.';
      } else if (titleLower.includes('prime minister') || titleLower.includes('pmss')) {
        amount = '₹30,000 - ₹36,000 / year';
        academicRequirements = 'Undergraduate / Professional Degree (B.Tech, MBBS, BBA, BCA, etc.)';
        eligibility = 'Wards and widows of deceased or retired CAPF, AR, and State Police personnel pursuing higher technical/professional degrees.';
      } else if (titleLower.includes('ishan uday')) {
        amount = '₹5,400 - ₹7,800 / month';
        location = 'North Eastern Region (NER)';
        academicRequirements = 'Undergraduate Degree (General or Technical)';
        eligibility = 'Students having domicile of North Eastern Region with family income < ₹4.5 LPA pursuing general/technical degree.';
      } else if (titleLower.includes('post graduate studies')) {
        amount = '₹15,000 / month';
        academicRequirements = 'Postgraduate (1st Year of Master’s Degree)';
        eligibility = 'Students pursuing regular full-time Master’s degree in recognized Indian universities/colleges.';
      } else if (titleLower.includes('jammu') || titleLower.includes('kashmir') || titleLower.includes('pmsss')) {
        amount = 'Up to ₹1,25,000 (Tuition) + ₹1,00,000 (Maintenance) / year';
        location = 'Jammu & Kashmir, Ladakh';
        academicRequirements = '12th pass (Higher Secondary) pursuing professional/general degree outside UT';
        eligibility = 'Domiciles of UTs of J&K and Ladakh with annual family income < ₹8.0 LPA who have passed 12th standard.';
      } else {
        amount = 'Direct Benefit Transfer (DBT) grant';
        academicRequirements = 'Undergraduate / College Students';
      }

      if (titleLower.includes('jammu') || titleLower.includes('kashmir') || titleLower.includes('ladakh')) {
        location = 'Jammu & Kashmir, Ladakh';
      }

      // Resolve official URLs (applicationUrl, officialSchemeUrl)
      // Never set a PDF link as applicationUrl
      const urlInfo = this.resolveOfficialUrls(title, ministry, guidelinesUrl);

      opportunities.push({
        id,
        sourceId,
        title,
        type: 'Scholarship',
        org: ministry,
        description: `Official Central/State scholarship scheme administered through the National Scholarship Portal (NSP). Provides financial assistance and fee concessions to eligible students pursuant to government guidelines.`,
        eligibility,
        eligibilityCriteria: [eligibility],
        skills: [],
        academicRequirements,
        location,
        workMode: 'unspecified',
        amount,
        deadline: deadlineStr || (rawDeadline ? `Apply by: ${rawDeadline}` : 'Rolling / Check Portal'),
        deadlineDate,
        verificationDeadline: rawVerification,
        openFrom: rawOpenFrom,
        guidelinesUrl,
        faqUrl,
        applicationUrl: urlInfo.applicationUrl,
        officialSchemeUrl: urlInfo.officialSchemeUrl,
        hasDirectApply: urlInfo.hasDirectApply,
        source: this.sourceName,
        sourceUrl: this.sourceUrl,
        lastFetchedAt: new Date(),
        lastVerifiedAt: new Date(),
        isVerified: true,
        status,
        isDemo: false
      });
    }

    return opportunities;
  }
}
