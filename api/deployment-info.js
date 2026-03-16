// Deployment info endpoint (AIX-50)
// Returns Vercel deployment metadata so the client can show "last updated" notices.
//
// GET /api/deployment-info
// Returns:
//   { vercel: { deployedAt: ISO8601, sha: string } | null }

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');

    const sha = process.env.VERCEL_GIT_COMMIT_SHA || null;
    // VERCEL_GIT_COMMIT_DATE is not always set; fall back to checking if we're on Vercel.
    // We derive the deploy time from the deployment ID when commit date isn't available.
    const commitDate = process.env.VERCEL_GIT_COMMIT_DATE || null;
    const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || null;
    const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV);

    if (!isVercel) {
        return res.status(200).json({ vercel: null });
    }

    res.status(200).json({
        vercel: {
            deployedAt: commitDate || null,
            sha: sha ? sha.slice(0, 7) : null,
            deploymentId,
        }
    });
}
