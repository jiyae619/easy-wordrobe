# Security

## API Keys & Secrets

All sensitive credentials (Firebase, AWS Bedrock, etc.) must be stored in environment variables, never in source code.

### Setup

1. Copy `.env.example` to `.env`
2. Fill in your credentials in `.env`
3. Never commit `.env` (it is gitignored)

### If a Key Was Exposed

If a Firebase API key or other secret was committed to git history:

1. **Rotate the key immediately** in the Firebase Console (Project Settings → General → Web API Key) or the relevant service
2. Update your local `.env` with the new key
3. Consider using [git-filter-repo](https://github.com/newren/git-filter-repo) or [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) to remove the key from git history (requires force-push; coordinate with collaborators)
