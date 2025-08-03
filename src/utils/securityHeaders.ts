
/**
 * Security headers utility for production deployment
 */
export const getSecurityHeaders = () => {
  return {
    // Prevent XSS attacks
    'X-XSS-Protection': '1; mode=block',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Content Security Policy (restrictive - adjust based on needs)
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://coacymsqarronnlytceu.supabase.co wss://coacymsqarronnlytceu.supabase.co",
      "frame-ancestors 'none'",
    ].join('; '),
    
    // Permissions policy
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
    ].join(', '),
  };
};

/**
 * Apply security headers to HTML meta tags
 */
export const applySecurityMetaTags = () => {
  const headers = getSecurityHeaders();
  
  Object.entries(headers).forEach(([name, content]) => {
    const existingTag = document.querySelector(`meta[http-equiv="${name}"]`);
    if (existingTag) {
      existingTag.setAttribute('content', content);
    } else {
      const meta = document.createElement('meta');
      meta.httpEquiv = name;
      meta.content = content;
      document.head.appendChild(meta);
    }
  });
};
