
/**
 * Simple client-side rate limiter for authentication endpoints
 * Note: This is not a substitute for server-side rate limiting
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes

  /**
   * Check if action is rate limited
   */
  isRateLimited(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    // Update the attempts list
    this.attempts.set(key, recentAttempts);
    
    return recentAttempts.length >= this.maxAttempts;
  }

  /**
   * Record an attempt
   */
  recordAttempt(key: string): void {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    attempts.push(now);
    this.attempts.set(key, attempts);
  }

  /**
   * Get time until rate limit resets
   */
  getTimeUntilReset(key: string): number {
    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) return 0;
    
    const oldestAttempt = Math.min(...attempts);
    const resetTime = oldestAttempt + this.windowMs;
    const now = Date.now();
    
    return Math.max(0, resetTime - now);
  }

  /**
   * Clear attempts for a key (e.g., after successful login)
   */
  clearAttempts(key: string): void {
    this.attempts.delete(key);
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();
