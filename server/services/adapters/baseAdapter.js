/**
 * BaseAdapter - Abstract base class for opportunity data source adapters.
 * All source adapters (NSP, AICTE, etc.) extend this class.
 */
export class BaseAdapter {
  constructor(sourceName, sourceUrl) {
    if (this.constructor === BaseAdapter) {
      throw new Error('BaseAdapter is an abstract class and cannot be instantiated directly.');
    }
    this.sourceName = sourceName;
    this.sourceUrl = sourceUrl;
  }

  /**
   * Returns human-readable source metadata.
   */
  getSourceInfo() {
    return {
      name: this.sourceName,
      url: this.sourceUrl,
      adapter: this.constructor.name
    };
  }

  /**
   * Fetches raw data from the external source with timeout and error handling.
   * Must be implemented by subclasses.
   * @returns {Promise<Array<Object>>} Normalized opportunity objects
   */
  async fetchOpportunities() {
    throw new Error('fetchOpportunities() must be implemented by adapter subclass.');
  }

  /**
   * Helper to perform HTTP fetch with standard headers and abort timeout.
   */
  async safeFetch(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SahayBot/1.0',
          'Accept': 'application/json, text/html, */*',
          ...(options.headers || {})
        }
      });

      if (!response.ok) {
        throw new Error(`Source responded with HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms while connecting to ${this.sourceName}`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Helper to format a Date into "MMM DD, YYYY" string (e.g. "Oct 31, 2026")
   * to guarantee compatibility with frontend's parseDeadlineDate.
   */
  formatDeadlineString(date) {
    if (!date || isNaN(date.getTime())) return null;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  }
}

