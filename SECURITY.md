# Security Policy 🔒

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Smart Reach seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Reporting Process

1. **DO NOT** create a public GitHub issue for the vulnerability.
2. Email your findings to [security@smartreach.com](mailto:security@smartreach.com).
3. Provide a detailed description of the vulnerability, including:
   - Type of issue (buffer overflow, SQL injection, cross-site scripting, etc.)
   - Full paths of source file(s) related to the vulnerability
   - The location of the affected source code (tag/branch/commit or direct URL)
   - Any special configuration required to reproduce the issue
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue, including how an attacker might exploit it

### What to Expect

- You will receive an acknowledgment within 48 hours
- We will investigate and provide updates on our progress
- Once the issue is confirmed, we will work on a fix
- We will coordinate the disclosure with you
- We will credit you in the security advisory (unless you prefer to remain anonymous)

### Responsible Disclosure

We ask that you:

- Give us reasonable time to respond to issues before any disclosure to the public or a third-party
- Make a good faith effort to avoid privacy violations, destruction of data, and interruption or degradation of our service
- Not modify or access data that does not belong to you
- Not perform actions that may negatively impact other users

## Security Best Practices

### For Users

- Keep your environment variables secure and never commit them to version control
- Regularly update your dependencies
- Use strong, unique passwords
- Enable two-factor authentication where available
- Monitor your account for suspicious activity

### For Developers

- Follow secure coding practices
- Validate and sanitize all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Keep dependencies updated
- Use HTTPS in production
- Implement rate limiting
- Log security events

## Security Features

Smart Reach includes several security features:

- **Authentication**: Secure user authentication with Supabase Auth
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive input validation and sanitization
- **HTTPS**: All communications are encrypted in production
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Proper CORS configuration
- **Environment Variables**: Secure handling of sensitive configuration

## Security Updates

We regularly update our dependencies to address security vulnerabilities. To stay secure:

1. Keep your Smart Reach installation updated
2. Monitor our security advisories
3. Subscribe to security notifications
4. Follow our release notes for security-related changes

## Contact Information

- **Security Email**: [security@smartreach.com](mailto:security@smartreach.com)
- **PGP Key**: Available upon request
- **Security Team**: Smart Reach Security Team

## Acknowledgments

We would like to thank all security researchers who responsibly disclose vulnerabilities to us. Your contributions help make Smart Reach more secure for everyone.

---

**Note**: This security policy is subject to change. Please check back regularly for updates. 