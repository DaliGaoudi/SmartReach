# Monthly Usage Reset Cron Job Setup

This guide explains how to set up the monthly usage reset cron job for SmartSendr.

## Overview

The cron job resets all users' email usage count (`email_count`) to 0 on the first day of each month. This ensures that free users get their monthly email allowance refreshed.

## Option 1: Vercel Cron Jobs (Recommended)

If you're using Vercel for hosting, this is the easiest option.

### 1. Create vercel.json

The `vercel.json` file has been created with the following configuration:

```json
{
  "crons": [
    {
      "path": "/api/reset-usage",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

**Schedule Explanation:**
- `0 0 1 * *` = Run at 00:00 (midnight) on the 1st day of every month
- Format: `minute hour day month day-of-week`

### 2. Deploy to Vercel

After deploying, Vercel will automatically:
- Set up the cron job
- Handle security (no external access needed)
- Provide monitoring and logs

### 3. Monitor the Cron Job

You can monitor the cron job in your Vercel dashboard:
1. Go to your project in Vercel
2. Navigate to "Functions" tab
3. Look for the cron job execution logs

## Option 2: External Cron Service

If you're not using Vercel or want more control, you can use external services.

### Using cron-job.org (Free)

1. Go to [cron-job.org](https://cron-job.org)
2. Create an account
3. Add a new cron job:
   - **URL**: `https://your-domain.vercel.app/api/reset-usage`
   - **Schedule**: `0 0 1 * *` (monthly)
   - **Method**: GET
   - **Headers**: `Authorization: Bearer YOUR_USAGE_RESET_TOKEN`

### Using GitHub Actions (Free)

Create `.github/workflows/reset-usage.yml`:

```yaml
name: Reset Monthly Usage

on:
  schedule:
    # Run at 00:00 UTC on the 1st of every month
    - cron: '0 0 1 * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  reset-usage:
    runs-on: ubuntu-latest
    steps:
      - name: Reset Usage
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.USAGE_RESET_TOKEN }}" \
            https://your-domain.vercel.app/api/reset-usage
```

## Option 3: Manual Setup

For complete control, you can set up your own cron job on a server:

### Linux/Unix Server

1. SSH into your server
2. Edit crontab: `crontab -e`
3. Add this line:
   ```
   0 0 1 * * curl -X GET -H "Authorization: Bearer YOUR_USAGE_RESET_TOKEN" https://your-domain.vercel.app/api/reset-usage
   ```

## Environment Variables

Make sure to set the `USAGE_RESET_TOKEN` environment variable:

### For Vercel:
1. Go to your Vercel project settings
2. Add environment variable: `USAGE_RESET_TOKEN`
3. Set a secure random string as the value

### For External Services:
- Use the same token value across all services
- Keep it secure and don't commit it to version control

## Testing the Cron Job

### Manual Test (Vercel)
```bash
curl -X GET https://your-domain.vercel.app/api/reset-usage
```

### Manual Test (with Authorization)
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_USAGE_RESET_TOKEN" \
  https://your-domain.vercel.app/api/reset-usage
```

## Monitoring and Logs

### Vercel Logs
- Check Vercel dashboard → Functions → `/api/reset-usage`
- View execution logs and response times

### Database Verification
After the cron job runs, verify the reset:
```sql
SELECT COUNT(*) as total_users, 
       SUM(CASE WHEN email_count = 0 THEN 1 ELSE 0 END) as reset_users
FROM profiles;
```

## Troubleshooting

### Common Issues:

1. **Cron job not running**
   - Check Vercel deployment status
   - Verify `vercel.json` is in the root directory
   - Check timezone settings

2. **Authorization errors**
   - Verify `USAGE_RESET_TOKEN` is set correctly
   - Check token format in external services

3. **Database errors**
   - Check Supabase connection
   - Verify RLS policies allow the operation
   - Check function logs in Supabase dashboard

### Debug Steps:

1. **Test the endpoint manually**
2. **Check Vercel function logs**
3. **Verify environment variables**
4. **Test database connection**

## Security Considerations

- The `USAGE_RESET_TOKEN` should be a strong, random string
- Keep the token secret and rotate it periodically
- Monitor for unauthorized access attempts
- Consider rate limiting for the endpoint

## Cost Considerations

- **Vercel Cron Jobs**: Free for hobby plan, included in Pro plan
- **External Services**: Most have free tiers
- **Database Operations**: Minimal cost for simple reset operation

## Next Steps

1. Deploy the updated code with `vercel.json`
2. Set the `USAGE_RESET_TOKEN` environment variable
3. Monitor the first execution
4. Set up alerts for failures (optional)
5. Document the process for your team 