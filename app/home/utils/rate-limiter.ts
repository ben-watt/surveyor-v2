/**
 * Simple rate limiter implementation
 */
class RateLimiter {
  private limits: Map<string, { count: number; timestamp: number }> = new Map();
  private readonly windowMs = 60000; // 1 minute window
  private readonly maxRequests = 100; // max requests per window

  checkLimit(operation: string): boolean {
    const now = Date.now();
    const limit = this.limits.get(operation);

    if (!limit || now - limit.timestamp > this.windowMs) {
      this.limits.set(operation, { count: 1, timestamp: now });
      return true;
    }

    if (limit.count >= this.maxRequests) {
      return false;
    }

    limit.count++;
    return true;
  }
}

export const rateLimiter = new RateLimiter();
