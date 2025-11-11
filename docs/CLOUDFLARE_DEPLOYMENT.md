# Cloudflare Pages Deployment Guide

This guide explains how to deploy the HR Tools application to Cloudflare Pages.

## Prerequisites

- Cloudflare account with Pages enabled
- GitHub repository connected to Cloudflare
- Domain configured (optional)

## Deployment Configuration

### Build Settings

When setting up your Cloudflare Pages project, use the following build configuration:

- **Framework preset**: None (or Astro if available)
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (or leave empty)
- **Environment variables**: None required for basic deployment

### Build Command Details

The build command `npm run build` does the following:
1. Runs TypeScript type checking via `astro check`
2. Builds the static site via `astro build`
3. Outputs to the `dist/` directory

## Branch Deployments

Cloudflare Pages automatically creates:
- **Production deployments**: From the `main` branch
- **Preview deployments**: From pull requests and other branches

## Custom Domain Setup

1. Go to your Cloudflare Pages project
2. Navigate to **Custom domains**
3. Click **Set up a custom domain**
4. Enter your domain (e.g., `hr-tools.law.tamu.edu`)
5. Follow the DNS configuration instructions

## Cloudflare Access Protection

To protect the entire site with Cloudflare Access:

### Step 1: Enable Cloudflare Access

1. Log in to the Cloudflare Dashboard
2. Select your account and domain
3. Go to **Zero Trust** > **Access** > **Applications**
4. Click **Add an application**

### Step 2: Configure Self-Hosted Application

1. Select **Self-hosted** application type
2. **Application name**: HR Tools
3. **Session duration**: 24 hours (or as needed)
4. **Application domain**: Your HR Tools domain
5. **Subdomain**: If using a subdomain (e.g., `hr-tools`)
6. **Domain**: Your main domain (e.g., `law.tamu.edu`)
7. **Path**: Leave empty to protect entire site or specify paths

### Step 3: Set Up Authentication Policies

Create authentication policies to control who can access the site:

#### Example Policy 1: Email Domain
- **Policy name**: TAMU Law Faculty/Staff
- **Action**: Allow
- **Include rule**: 
  - **Selector**: Emails ending in
  - **Value**: `@law.tamu.edu`

#### Example Policy 2: Email List
- **Policy name**: HR Team
- **Action**: Allow
- **Include rule**:
  - **Selector**: Emails
  - **Value**: Enter specific email addresses

#### Example Policy 3: GitHub Organization
- **Policy name**: GitHub Organization Members
- **Action**: Allow
- **Include rule**:
  - **Selector**: GitHub Organizations
  - **Value**: Your organization name

### Step 4: Advanced Options (Optional)

- **Enable automatic cloudflared authentication**: Allows users to authenticate once across multiple Access-protected apps
- **CORS settings**: Configure if needed for API access
- **Cookie settings**: Adjust as needed

## Reading User Identity (Optional)

If you want to display the logged-in user's information in the header:

### Option 1: Using Cloudflare Access JWT

Cloudflare Access adds a JWT token in the `CF-Access-Jwt-Assertion` header. You can:

1. Create a Cloudflare Pages Function at `functions/api/me.ts`
2. Read the JWT and decode it
3. Return user information to the client
4. Update the Header component to fetch and display user info

Example Pages Function:

```typescript
// functions/api/me.ts
export async function onRequest(context) {
  const jwt = context.request.headers.get('CF-Access-Jwt-Assertion');
  
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Decode JWT (you'll need to verify it with your Access app's public key)
  // For now, we'll just return a simple response
  return new Response(JSON.stringify({ 
    authenticated: true,
    // Add user details from JWT
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## Environment Variables

Cloudflare Pages supports environment variables for production and preview deployments.

To add environment variables:

1. Go to your Cloudflare Pages project
2. Navigate to **Settings** > **Environment variables**
3. Add variables for **Production** and/or **Preview** environments

Currently, no environment variables are required for the basic deployment.

## Monitoring and Analytics

### Cloudflare Analytics

- Access analytics from the Cloudflare Pages dashboard
- View page views, unique visitors, bandwidth usage
- Monitor deployment history and build times

### Web Analytics (Optional)

Enable Cloudflare Web Analytics:

1. Go to **Analytics** > **Web Analytics** in Cloudflare Dashboard
2. Add your site
3. Copy the beacon script
4. Add to `src/layouts/BaseLayout.astro` before `</body>`:

```html
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
  data-cf-beacon='{"token": "YOUR_TOKEN_HERE"}'></script>
```

## Troubleshooting

### Build Failures

1. **Check build logs** in Cloudflare Pages dashboard
2. **Verify Node.js version**: Ensure Cloudflare uses Node.js 18 or higher
3. **Clear build cache**: Try redeploying with "Clear cache and deploy"

### Access Issues

1. **Verify Access policies** are configured correctly
2. **Check cookie settings** in browser
3. **Test in incognito mode** to rule out cache issues

### 404 Errors

1. **Verify build output**: Ensure `dist/` contains `index.html` and all tool pages
2. **Check file paths**: Astro uses `/tools/toolname.html` for tool pages

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [Astro Deployment Guide](https://docs.astro.build/en/guides/deploy/cloudflare/)

## Support

For issues specific to the HR Tools application, contact the TAMU Law IT team or the application maintainer.
