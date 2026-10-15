# GitHub Actions Workflow Approval PoC

This PoC shows how two manually triggered workflows in a shared deployment repository can behave differently:

- **`deploy-standard.yml`** always runs immediately.
- **`deploy-protected.yml`** runs immediately for `develop` and `test`, but for `main` it waits until an authorized reviewer approves it.

The approval gate is a GitHub **Environment** with a **required reviewers** protection rule. The workflows only perform mock deployments (echo and `sleep`). They use no credentials or external services.

> **Status:** the workflows have been linted with `actionlint`. The approval behaviour has to be verified on GitHub using the test steps below before it is considered proven.

## How it works

| File | Environment | Approval |
|---|---|---|
| `.github/workflows/deploy-standard.yml` | none | never |
| `.github/workflows/deploy-protected.yml` | `production` when `branch = main`, otherwise `non-production` | only for `production` |

The protected workflow selects the environment from the input:

```yaml
environment: ${{ inputs.branch == 'main' && 'production' || 'non-production' }}
```

When a job references an environment that has protection rules, GitHub holds the job in a **Waiting** state before any runner is assigned. No step of that job runs until the rules pass, so a rejected deployment never executes.

Both workflows set `permissions: {}`. The mock deployment needs no repository or API access, so the `GITHUB_TOKEN` is granted nothing.

> The `branch` input is only a label in this PoC: the workflows do not check out code. In a real setup you would check out `inputs.branch` and add `permissions: contents: read`.

## Environment configuration

You need admin access to the repository. Everything below is under **Settings → Environments**.

### 1. `production` (requires approval)

1. Click **New environment**, name it `production`, then click **Configure environment**.
2. Tick **Required reviewers**.
3. Add up to 6 users or teams who are allowed to approve. Each needs at least read access to the repository. One approval from any of them is enough.
4. *(Optional, recommended)* Tick **Prevent self-review**. The person who triggered the run then cannot approve it, even if they are a listed reviewer.
5. *(Optional, recommended)* Untick **Allow administrators to bypass configured protection rules**. Otherwise repository admins can force the deployment through without an approval.
6. Click **Save protection rules**.

### 2. `non-production` (no approval)

1. Click **New environment**, name it `non-production`, then click **Configure environment**.
2. Leave every protection rule unticked and save.

If a workflow references an environment that does not exist, GitHub creates it automatically with no rules. Create `production` up front so that the first `main` run is already protected.

### Same setup with the GitHub CLI

```bash
REPO=jovanhn/auto-journal
REVIEWER_ID=$(gh api users/supercodecrafter --jq .id)

# The reviewer must have access to the repo (sends an invitation they must accept)
gh api -X PUT repos/$REPO/collaborators/supercodecrafter -f permission=push

gh api -X PUT repos/$REPO/environments/production --input - <<EOF
{
  "prevent_self_review": true,
  "can_admins_bypass": false,
  "reviewers": [{ "type": "User", "id": $REVIEWER_ID }],
  "deployment_branch_policy": null
}
EOF

gh api -X PUT repos/$REPO/environments/non-production
```

## How reviewers are notified and respond

1. When a run reaches a job that targets `production`, the run shows **Waiting** with the message *"Review pending deployments"*.
2. Required reviewers get a GitHub notification (web and/or email, based on their notification settings) that a deployment is waiting for their review.
3. A reviewer opens the run (from the notification or **Actions → Deploy (Protected) → the run**) and clicks **Review deployments**.
4. They select the `production` environment, optionally leave a comment, and click either:
   - **Approve and deploy**: the job is queued and runs.
   - **Reject**: the job is not executed and the run ends as failed.
5. The decision, reviewer and comment are recorded in the run's summary.

A job left waiting for approval fails automatically after 30 days.

You can do the same from the CLI as a reviewer:

```bash
RUN_ID=<run id>
ENV_ID=$(gh api repos/jovanhn/auto-journal/environments/production --jq .id)
gh api repos/jovanhn/auto-journal/actions/runs/$RUN_ID/pending_deployments      # inspect
gh api -X POST repos/jovanhn/auto-journal/actions/runs/$RUN_ID/pending_deployments \
  -F "environment_ids[]=$ENV_ID" -f state=approved -f comment="LGTM"          # or state=rejected
```

## Manual test instructions

Prerequisites: both environments are configured as above. There are two accounts: a **trigger user** (e.g. `jovanhn`) and a **reviewer** (e.g. `supercodecrafter`) listed under `production`'s required reviewers. Prevent self-review is on.

To run a workflow, go to **Actions**, select the workflow, click **Run workflow**, pick a `branch` and click **Run workflow**. With the CLI: `gh workflow run deploy-protected.yml -f branch=main`.

| # | Workflow | Branch | Steps | Expected result |
|---|---|---|---|---|
| 1 | Standard | develop | Trigger as trigger user | Runs immediately and logs `Deployment status: SUCCESS` |
| 2 | Standard | main | Trigger as trigger user | Runs immediately, with no approval |
| 3 | Protected | develop | Trigger as trigger user | Runs immediately in `non-production` |
| 4 | Protected | test | Trigger as trigger user | Runs immediately in `non-production` |
| 5 | Protected | main | Trigger as trigger user | Run shows **Waiting** and no steps execute |
| 6 | Protected | main | While #5 is waiting, the trigger user opens **Review deployments** | Cannot approve because of prevent self-review |
| 7 | Protected | main (approved) | Reviewer approves #5 | Job runs and logs `Environment: production` and `SUCCESS` |
| 8 | Protected | main (rejected) | Trigger a new run, and the reviewer rejects it | Job never starts and the run ends as failed |

For each run, check the job log for the triggering user, the branch and the deployment status. Check the run summary for the review decision.

## GitHub Free plan limitations

| Feature | Public repo (Free) | Private repo (Free) |
|---|---|---|
| Environments | Yes | Not supported |
| Required reviewers / prevent self-review | Yes | No. Needs **GitHub Enterprise** for private repos |
| Wait timer | Yes | No. Needs Enterprise |
| Deployment branch/tag restrictions | Yes | No. Needs Pro or Team |
| Environment secrets and variables | Yes | No. Needs Pro, Team or Enterprise |
| Admin bypass setting | Yes | No. Needs Enterprise |

On the Free, Pro and Team plans, required reviewers only work in **public** repositories. A private shared deployment repository therefore needs **GitHub Enterprise** (Cloud or Server) for this approval model. This PoC repository is public, so it works on Free.

Other limits that apply on every plan:

- Up to 6 required reviewers (users or teams) per environment. One approval is sufficient.
- Up to 6 deployment protection rules per environment.
- Anyone with **write** access can trigger `workflow_dispatch` and edit workflow files. A user with write access could change the `environment:` line to skip `production`. In a real setup, protect `.github/workflows/` with branch rulesets and CODEOWNERS. You can also store production secrets only in the `production` environment, so that code which does not pass the gate cannot reach them.

Reference: [Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [Reviewing deployments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments).
