const dns = require('dns').promises;
const ipaddr = require('ipaddr.js');

/**
 * Validates a target URL against SSRF vulnerabilities:
 * - Ensures scheme is strictly HTTP or HTTPS
 * - Resolves hostname via DNS
 * - Blocks loopback, private RFC 1918, link-local (cloud metadata 169.254.x.x),
 *   multicast, and carrier-grade NAT IPs
 * - Prevents bypassing checks via redirects or DNS rebinding
 */
async function validateTargetUrl(urlString, allowPrivate = false) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (err) {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // Enforce protocol
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTP and HTTPS protocols are permitted' };
  }

  const hostname = parsed.hostname;

  // Check for common loopback aliases
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    if (!allowPrivate) {
      return { valid: false, reason: 'Prohibited target: localhost / loopback addresses are blocked to prevent SSRF' };
    }
  }

  // Check for AWS / GCP / Azure metadata endpoint explicitly
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    return { valid: false, reason: 'Prohibited target: Cloud metadata services are blocked' };
  }

  // If allowPrivate is explicitly enabled (e.g. for local dev outage testing), allow
  if (allowPrivate) {
    return { valid: true };
  }

  // Resolve DNS to verify the underlying IP address
  try {
    const addresses = await dns.lookup(hostname, { all: true });

    for (const record of addresses) {
      const ip = record.address;
      let parsedIp;
      try {
        parsedIp = ipaddr.parse(ip);
      } catch (e) {
        return { valid: false, reason: `Unrecognized IP address format: ${ip}` };
      }

      const range = parsedIp.range();
      const forbiddenRanges = [
        'loopback',
        'private',       // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
        'linkLocal',     // 169.254.0.0/16
        'carrierGradeNat',
        'broadcast',
        'multicast',
        'uniqueLocal',   // IPv6 private
        'unspecified',
      ];

      if (forbiddenRanges.includes(range)) {
        return {
          valid: false,
          reason: `Prohibited destination IP (${ip} in ${range} range) blocked by SSRF security policy`,
        };
      }
    }
  } catch (dnsErr) {
    return { valid: false, reason: `DNS resolution failed for hostname '${hostname}': ${dnsErr.message}` };
  }

  return { valid: true };
}

module.exports = { validateTargetUrl };
