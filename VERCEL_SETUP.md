# Vercel Deployment Setup for Admin Portal

To make the Admin Portal work on Vercel, you need to set up GitHub OAuth.

## Step 1: Create GitHub OAuth App
1.  Go to [GitHub Developer Settings > OAuth Apps](https://github.com/settings/developers).
2.  Click **New OAuth App**.
3.  Fill in the details:
    -   **Application Name**: `MM Earthmovers Admin` (or similar)
    -   **Homepage URL**: `https://mm-earthmovers.vercel.app` (Your Vercel URL)
    -   **Authorization callback URL**: `https://mm-earthmovers.vercel.app/api/callback`
4.  Click **Register application**.
5.  Copy the **Client ID**.
6.  Click **Generate a new client secret** and copy the **Client Secret**.

## Step 2: Configure Vercel Environment Variables
1.  Go to your project on Vercel.
2.  Go to **Settings > Environment Variables**.
3.  Add the following variables:
    -   `OAUTH_CLIENT_ID`: (Paste your Client ID)
    -   `OAUTH_CLIENT_SECRET`: (Paste your Client Secret)

## Step 3: Update Config (One-time)
1.  Open `public/admin/config.yml`.
2.  Ensure `base_url` matches your actual Vercel domain.
    ```yaml
    base_url: https://mm-earthmovers.vercel.app
    ```
    *(If your domain is different, e.g., `mm-earthmovers-custom.com`, update it here).*

## Step 4: Deploy
1.  Commit and push your changes.
2.  Vercel will redeploy.
3.  Go to `/admin` and click **Login with GitHub**.

## Step 5: Grant Access to Admins (Important)
Since your repository is hosted on GitHub, anyone who wants to edit content via the Admin Portal must have **Write Access** to the repository.

1.  **For You (Owner)**: You can log in with your `bhuvi28` GitHub account immediately.
2.  **For Clients/Others**:
    -   Ask them to create a free GitHub account.
    -   Go to your repository settings: `https://github.com/bhuvi28/mm-earthmovers/settings/access`
    -   Click **Add people** and invite their GitHub username or email.
    -   They must accept the invitation (via email) before they can log in to the Admin Portal.

**Note**: They do NOT need access to your personal `bhuvi28` account credentials. They use their own account which you have authorized.
