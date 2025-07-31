# Deployment Guide 🚀

This guide will help you deploy Smart Reach to various platforms. We recommend using Vercel for the easiest deployment experience.

## 🎯 Quick Deploy to Vercel

### Prerequisites

- GitHub account
- Vercel account
- Supabase project
- Google Cloud Platform project
- Stripe account

### Step-by-Step Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "feat: initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account
   - Click "New Project"
   - Import your Smart Reach repository

3. **Configure Environment Variables**
   In your Vercel project settings, add the following environment variables:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Stripe Configuration
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   STRIPE_WEBHOOK_SECRET_LIVE=your_stripe_webhook_secret_live

   # Google Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=https://yourdomain.vercel.app/auth/callback
   GOOGLE_API_KEY=your_google_api_key
   GOOGLE_AI_API_KEY=your_google_ai_api_key
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your application

## 🏗 Manual Deployment

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- A hosting provider (AWS, DigitalOcean, etc.)

### Build Process

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build the application**
   ```bash
   npm run build
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

### Environment Configuration

Create a `.env.production` file with your production environment variables:

```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
STRIPE_SECRET_KEY=your_production_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_production_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_production_stripe_webhook_secret
STRIPE_WEBHOOK_SECRET_LIVE=your_production_stripe_webhook_secret_live
GOOGLE_CLIENT_ID=your_production_google_client_id
GOOGLE_CLIENT_SECRET=your_production_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/callback
GOOGLE_API_KEY=your_production_google_api_key
GOOGLE_AI_API_KEY=your_production_google_ai_api_key
```

## 🌐 Domain Configuration

### Custom Domain Setup

1. **Purchase a domain** (if you don't have one)
2. **Configure DNS**
   - Add an A record pointing to your hosting provider's IP
   - Add a CNAME record for www subdomain
3. **Configure SSL certificate**
   - Most hosting providers offer automatic SSL
   - For Vercel, SSL is automatically configured

### Google OAuth Configuration

Update your Google OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" > "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add your production domain to authorized redirect URIs:
   ```
   https://yourdomain.com/auth/callback
   ```

## 🔧 Service Configuration

### Supabase Setup

1. **Create production project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project for production

2. **Run migrations**
   ```sql
   -- Run the migration files in src/lib/supabase/migrations/
   -- 0001_add_payment_tables.sql
   -- 0002_add_profiles_and_usage.sql
   ```

3. **Configure Row Level Security (RLS)**
   - Enable RLS on all tables
   - Create appropriate policies

### Stripe Configuration

1. **Switch to live mode**
   - Use live API keys instead of test keys
   - Update webhook endpoints

2. **Configure webhooks**
   - Add your production webhook URL
   - Select relevant events (payment_intent.succeeded, etc.)

### Google AI Setup

1. **Enable APIs**
   - Google Generative AI API
   - Gmail API

2. **Configure quotas**
   - Set appropriate rate limits
   - Monitor usage

## 📊 Monitoring & Analytics

### Error Monitoring

We recommend setting up error monitoring:

- **Sentry**: For error tracking
- **Vercel Analytics**: For performance monitoring
- **Google Analytics**: For user analytics

### Health Checks

Create a health check endpoint:

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
}
```

## 🔒 Security Considerations

### Production Security

1. **Environment Variables**
   - Never commit `.env` files
   - Use secure environment variable management
   - Rotate keys regularly

2. **HTTPS**
   - Ensure all traffic uses HTTPS
   - Configure HSTS headers

3. **Rate Limiting**
   - Implement API rate limiting
   - Monitor for abuse

4. **CORS**
   - Configure CORS for your domain
   - Restrict to necessary origins

### Database Security

1. **Backup Strategy**
   - Set up automated backups
   - Test restore procedures

2. **Access Control**
   - Use least privilege principle
   - Monitor database access

## 🚀 Performance Optimization

### Build Optimization

1. **Bundle Analysis**
   ```bash
   npm run build
   # Analyze bundle size
   ```

2. **Image Optimization**
   - Use Next.js Image component
   - Optimize image formats

3. **Caching**
   - Configure CDN caching
   - Implement browser caching

### Database Optimization

1. **Indexes**
   - Add appropriate database indexes
   - Monitor query performance

2. **Connection Pooling**
   - Configure connection pooling
   - Monitor connection usage

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📈 Post-Deployment Checklist

- [ ] Test all functionality
- [ ] Verify email sending works
- [ ] Check payment processing
- [ ] Test user registration/login
- [ ] Verify Google OAuth flow
- [ ] Check mobile responsiveness
- [ ] Monitor error logs
- [ ] Set up monitoring alerts
- [ ] Configure backup systems
- [ ] Document deployment procedures

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **Environment Variables**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify variable values are correct

3. **Database Connection**
   - Verify Supabase credentials
   - Check network connectivity
   - Ensure database is accessible

4. **OAuth Issues**
   - Verify redirect URIs are correct
   - Check Google Cloud Console settings
   - Ensure OAuth consent screen is configured

### Getting Help

- Check the [GitHub Issues](https://github.com/yourusername/smart-reach/issues)
- Review the [README.md](README.md) for setup instructions
- Contact support at [support@smartreach.com](mailto:support@smartreach.com)

---

**Note**: This deployment guide is a living document. Please check for updates regularly. 