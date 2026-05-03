import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import type { TocItem } from "@/lib/types/academy";

const deploymentPipelineDiagram = String.raw`flowchart TD
    DEV["Developer pushes to main<br/>or merges a PR"]
    SRC["1. Source<br/>Webhook triggers pipeline"]
    BUILD["2. Build<br/>install deps, compile, build image, push to ECR<br/>1-5 min"]
    TEST["3. Test<br/>unit, integration, lint, SAST, image scan<br/>2-10 min"]
    STAGE["4. Staging deploy<br/>deploy, smoke tests, optional approval<br/>2-5 min"]
    PROD["5. Production deploy<br/>release, monitor latency and errors<br/>2-10 min"]
    VERIFY["6. Verify<br/>confirm metrics stable and close deployment"]

    DEV --> SRC --> BUILD --> TEST --> STAGE --> PROD --> VERIFY`;

export const toc: TocItem[] = [
  { id: "ci-cd-defined", title: "CI and CD Defined", level: 2 },
  { id: "pipeline-stages", title: "Pipeline Stages", level: 2 },
  { id: "deployment-strategies", title: "Deployment Strategies Compared", level: 2 },
  { id: "rolling", title: "Rolling Deployment", level: 2 },
  { id: "blue-green", title: "Blue/Green Deployment", level: 2 },
  { id: "canary", title: "Canary Deployment", level: 2 },
  { id: "feature-flags", title: "Feature Flags: Decouple Deploy from Release", level: 2 },
  { id: "rollbacks", title: "Rollbacks: When and How", level: 2 },
  { id: "db-migrations", title: "Database Migrations: Expand/Contract Pattern", level: 2 },
  { id: "release-monitoring", title: "Release Monitoring", level: 2 },
  { id: "aws-tools", title: "AWS CI/CD Tools", level: 2 },
  { id: "github-actions-ecs", title: "GitHub Actions → ECR → ECS Example", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function CicdDeployment() {
  return (
    <div className="article-content">
      <p>
        CI/CD is the engineering discipline of automating the path from code commit to production
        deployment. A mature CI/CD pipeline enables teams to deploy many times per day with
        confidence, reduce manual errors, and ship features faster. The goal is not automation for
        its own sake &mdash; it is reducing the cost and risk of each deployment to the point where
        deploying frequently is safer than deploying infrequently.
      </p>

      <h2 id="ci-cd-defined">CI and CD Defined</h2>
      <p>
        <strong>Continuous Integration (CI):</strong> The practice of automatically building, linting,
        and testing code on every push or pull request. Ensures the main branch is always in a
        known-working state. Catches integration issues early, before they accumulate.
      </p>
      <p>
        <strong>Continuous Delivery (CD):</strong> The practice of automatically deploying every
        change that passes CI to production (or staging for Continuous Delivery vs Continuous
        Deployment). Deployment is automated but may require a manual approval gate.
      </p>
      <p>
        <strong>Continuous Deployment:</strong> Every change that passes CI is automatically
        deployed to production with no human gate. Possible only with mature test coverage,
        monitoring, and rollback capabilities.
      </p>

      <h2 id="pipeline-stages">Pipeline Stages</h2>
      <MermaidDiagram
        chart={deploymentPipelineDiagram}
        title="CI/CD Pipeline Stages"
        caption="Think of the pipeline as progressive risk reduction: each stage should either prove the change is safe or stop it from moving closer to production."
        minHeight={620}
      />

      <h2 id="deployment-strategies">Deployment Strategies Compared</h2>
      <table>
        <thead>
          <tr>
            <th>Strategy</th>
            <th>How it works</th>
            <th>Rollback speed</th>
            <th>User impact</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Rolling</td>
            <td>Replace instances gradually (N at a time)</td>
            <td>Slow (re-deploy old version)</td>
            <td>Some requests hit new, some old version during rollout</td>
            <td>None (same instance count)</td>
          </tr>
          <tr>
            <td>Blue/Green</td>
            <td>Two environments; switch traffic at load balancer</td>
            <td>Instant (switch back to old)</td>
            <td>None (switch is atomic)</td>
            <td>2&times; instance cost during deploy</td>
          </tr>
          <tr>
            <td>Canary</td>
            <td>Route small % to new; increase gradually</td>
            <td>Fast (shift traffic back)</td>
            <td>Minimal (small % get new version first)</td>
            <td>Small extra capacity for canary</td>
          </tr>
          <tr>
            <td>Recreate</td>
            <td>Stop old, start new</td>
            <td>N/A (must re-deploy)</td>
            <td>Downtime during deployment</td>
            <td>None</td>
          </tr>
        </tbody>
      </table>

      <h2 id="rolling">Rolling Deployment</h2>
      <p>
        ECS rolling deploys are the default. The service gradually replaces old tasks with new ones,
        a few at a time. ALB health checks ensure new tasks are healthy before shifting traffic.
      </p>
      <pre><code>{`# ECS rolling deployment configuration
resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 10

  deployment_controller {
    type = "ECS"  # rolling deploy
  }

  deployment_configuration {
    maximum_percent         = 150  # allow up to 15 tasks during deploy
    minimum_healthy_percent = 100  # never go below 10 healthy tasks
    # With 10 desired: starts new tasks, waits for health, then stops old
    # No downtime if minimum_healthy_percent = 100
  }

  # ALB integration: traffic only goes to healthy tasks
  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }
}

# Deploy: just update the task definition (new Docker image)
aws ecs update-service \
  --cluster production \
  --service api-service \
  --task-definition api-task:NEW_VERSION \
  --force-new-deployment`}</code></pre>

      <h2 id="blue-green">Blue/Green Deployment</h2>
      <p>
        Blue is the current production environment. Green is the new version deployed to an
        identical environment. Traffic is switched at the load balancer level when green is
        confirmed healthy. Rollback is instant: switch back to blue.
      </p>
      <pre><code>{`# Blue/Green with ECS and CodeDeploy
# CodeDeploy creates a new target group (green), deploys new tasks there,
# runs a test period, then shifts traffic

resource "aws_ecs_service" "api" {
  deployment_controller {
    type = "CODE_DEPLOY"  # enables blue/green
  }
}

# CodeDeploy appspec.yml
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: <TASK_DEFINITION>
        LoadBalancerInfo:
          ContainerName: api
          ContainerPort: 3000
Hooks:
  - BeforeAllowTraffic: "arn:aws:lambda:...:PreTrafficHook"
  # Run smoke tests before allowing production traffic
  - AfterAllowTraffic: "arn:aws:lambda:...:PostTrafficHook"
  # Verify metrics after traffic switch`}</code></pre>

      <h2 id="canary">Canary Deployment</h2>
      <p>
        Route a small percentage of traffic (e.g., 5%) to the new version. Monitor error rates
        and latency for the canary. If healthy, gradually increase to 25%, 50%, 100%. If errors
        are detected, shift 100% back to the stable version.
      </p>
      <pre><code>{`# Canary with Route 53 weighted routing (service-level canary)
# 95% to stable ALB, 5% to canary ALB
resource "aws_route53_record" "api_stable" {
  name           = "api.example.com"
  set_identifier = "stable"
  weighted_routing_policy { weight = 95 }
  alias { name = aws_lb.stable.dns_name ... }
}

resource "aws_route53_record" "api_canary" {
  name           = "api.example.com"
  set_identifier = "canary"
  weighted_routing_policy { weight = 5 }
  alias { name = aws_lb.canary.dns_name ... }
}

# For Lambda: use aliases and versions
aws lambda update-alias \
  --function-name cv-processor \
  --name production \
  --routing-config AdditionalVersionWeights={"3"=0.05}
# 5% to version 3 (new), 95% to current version`}</code></pre>

      <h2 id="feature-flags">Feature Flags: Decouple Deploy from Release</h2>
      <p>
        Feature flags (feature toggles) let you deploy code to production without activating it for
        users. This decouples the deployment decision (when to put code on servers) from the release
        decision (when users see the feature).
      </p>
      <p>
        <strong>Benefits:</strong> Dark launches (test in production with real data without user
        visibility), gradual rollouts (release to 1% → 10% → 100% of users), instant rollback
        (disable flag, no deployment needed), kill switches for new features.
      </p>
      <pre><code>{`// Simple feature flag with DynamoDB or environment variable
async function parseCV(cvId: string) {
  const cv = await db.cvs.findById(cvId);

  // Feature flag: use new AI model only if enabled for this user
  const useNewModel = await featureFlags.isEnabled('new-ai-model', {
    userId: cv.userId,
    // Flag service can evaluate by user %, cohort, specific users, etc.
  });

  if (useNewModel) {
    return await newAIProvider.parse(cv.content);
  } else {
    return await currentAIProvider.parse(cv.content);
  }
}

// LaunchDarkly, Unleash, AWS AppConfig, or simple DynamoDB table
// for feature flags at different sophistication levels`}</code></pre>

      <h2 id="rollbacks">Rollbacks: When and How</h2>
      <p>
        <strong>Roll back when:</strong> Error rate spiked after deploy, p99 latency increased
        significantly, a deployment correlates with the incident onset, and the fix is not trivial.
      </p>
      <p>
        <strong>Fix forward when:</strong> Rollback would revert other desirable changes, the issue
        is in infrastructure (not application code), or rollback itself might cause data issues.
      </p>
      <pre><code>{`# ECS: rollback to previous task definition revision
aws ecs update-service \
  --cluster production \
  --service api-service \
  --task-definition api-task:PREVIOUS_REVISION

# ECS: list recent task definition revisions
aws ecs list-task-definitions --family api-task \
  --sort DESC --max-items 5

# Lambda: rollback to previous version
aws lambda update-alias \
  --function-name cv-processor \
  --name production \
  --function-version PREVIOUS_VERSION

# GitHub Actions: manual rollback workflow
# workflow_dispatch trigger + input for revision number`}</code></pre>

      <h2 id="db-migrations">Database Migrations: Expand/Contract Pattern</h2>
      <p>
        Database migrations are the most dangerous part of deployment because they are hard to
        rollback and can break the application if old and new code runs against the same schema
        simultaneously (which happens during rolling deployments).
      </p>
      <p>
        <strong>Expand/Contract (backwards-compatible migration):</strong>
      </p>
      <pre><code>{`// WRONG: single migration that breaks old code
ALTER TABLE users
  RENAME COLUMN full_name TO display_name;
// Old running code: uses full_name → breaks immediately
// Must deploy code + migration atomically → risky

// RIGHT: Expand/Contract pattern

// Phase 1: EXPAND (add new column, keep old)
ALTER TABLE users ADD COLUMN display_name TEXT;
// Old code: uses full_name (works)
// New code: can write to display_name and full_name

// Phase 2: MIGRATE (backfill data)
UPDATE users SET display_name = full_name WHERE display_name IS NULL;
// Background job or migration script

// Phase 3: DEPLOY NEW CODE (reads from display_name)
// Both old (uses full_name) and new (uses display_name) code work

// Phase 4: CONTRACT (remove old column — after all old code is gone)
ALTER TABLE users DROP COLUMN full_name;
// Now safe: no code uses full_name anymore

// Timeline: Phase 1+2 deployed → verify → Phase 3 deployed → verify → Phase 4`}</code></pre>

      <h2 id="release-monitoring">Release Monitoring</h2>
      <p>
        After every production deployment, watch your key metrics for 15&ndash;30 minutes:
      </p>
      <ul>
        <li>API error rate (5xx) &mdash; did it change?</li>
        <li>API p99 latency &mdash; any regression?</li>
        <li>ECS task CPU and memory &mdash; memory leak from new code?</li>
        <li>DB query performance &mdash; new query patterns causing load?</li>
        <li>SQS queue depth &mdash; new code blocking worker processing?</li>
      </ul>
      <pre><code>{`# GitHub Actions: post-deploy monitoring step
- name: Monitor deployment
  run: |
    # Wait 5 minutes, then check error rate
    sleep 300
    ERROR_COUNT=$(aws cloudwatch get-metric-statistics \
      --namespace AWS/ApplicationELB \
      --metric-name HTTPCode_ELB_5XX_Count \
      --period 300 --statistics Sum \
      --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
      --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
      --dimensions Name=LoadBalancer,Value=$ALB_ARN_SUFFIX \
      --query 'Datapoints[0].Sum' --output text)

    if [ "\${ERROR_COUNT%.*}" -gt "10" ]; then
      echo "ERROR: High error rate detected post-deploy"
      exit 1  # trigger rollback in next step
    fi`}</code></pre>

      <h2 id="aws-tools">AWS CI/CD Tools</h2>
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>Purpose</th>
            <th>When to use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GitHub Actions</td>
            <td>CI/CD pipelines defined as YAML in repo</td>
            <td>Most teams; excellent GitHub integration, large action marketplace</td>
          </tr>
          <tr>
            <td>AWS CodePipeline</td>
            <td>AWS-native pipeline orchestration</td>
            <td>AWS-only shops; integrates natively with CodeBuild, CodeDeploy, ECS</td>
          </tr>
          <tr>
            <td>AWS CodeBuild</td>
            <td>Managed build service</td>
            <td>Running builds in AWS when CodePipeline is used</td>
          </tr>
          <tr>
            <td>AWS CodeDeploy</td>
            <td>Deployment automation (blue/green, rolling)</td>
            <td>ECS blue/green deployments; EC2 rolling deploys</td>
          </tr>
          <tr>
            <td>ECR (Elastic Container Registry)</td>
            <td>Docker image registry</td>
            <td>Always, for any ECS/EKS workload; IAM-integrated, no extra setup</td>
          </tr>
        </tbody>
      </table>

      <h2 id="github-actions-ecs">GitHub Actions &rarr; ECR &rarr; ECS Example</h2>
      <pre><code>{`# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # for OIDC auth to AWS
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-deploy
          aws-region: us-east-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/api:$IMAGE_TAG .
          docker push $ECR_REGISTRY/api:$IMAGE_TAG

      - name: Run tests
        run: |
          docker run --rm $ECR_REGISTRY/api:$IMAGE_TAG npm test

      - name: Update ECS task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: api
          image: \${{ steps.login-ecr.outputs.registry }}/api:\${{ github.sha }}

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: \${{ steps.task-def.outputs.task-definition }}
          service: api-service
          cluster: production
          wait-for-service-stability: true  # wait until deploy completes

      - name: Monitor deployment health
        run: ./scripts/check-deployment-health.sh`}</code></pre>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Deploying migrations and code together in a rolling deploy:</strong> When half
          your instances are running old code and half new code, and the migration has run, old
          code breaks because the schema changed. Use expand/contract migrations that are backwards
          compatible.
        </li>
        <li>
          <strong>No rollback procedure:</strong> Deploying to production without knowing how to
          rollback is reckless. Document and test the rollback before deploying. The rollback
          should be a one-command operation.
        </li>
        <li>
          <strong>Not watching metrics after deploy:</strong> Deploying and then going to lunch.
          Stay close for 15&ndash;30 minutes after every production deployment.
        </li>
        <li>
          <strong>Using long-lived IAM user credentials in CI/CD:</strong> Using an IAM user
          with access keys in GitHub secrets. Use OIDC federation: GitHub Actions assumes an
          IAM role using a short-lived token. No credentials to rotate or leak.
        </li>
        <li>
          <strong>One environment (no staging):</strong> Testing in production. Any non-trivial
          system needs at least staging and production environments with equivalent configurations.
        </li>
        <li>
          <strong>Insufficient test coverage in CI:</strong> A CI that only runs linting and
          unit tests misses integration issues. Include integration tests against a real
          (or realistic) test database.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What is the difference between rolling and blue/green deployments?</strong></p>
      <p>
        Rolling deployment replaces instances gradually: some instances run the new version while
        others still run the old version. It costs nothing extra but rollback is slow (must re-deploy
        the old version). Blue/green maintains two complete environments: you deploy to the green
        environment, verify it, then switch traffic at the load balancer. Rollback is instant
        (switch back to blue). The tradeoff is 2&times; infrastructure cost during the deployment window.
      </p>

      <p><strong>Q: What is the expand/contract pattern for database migrations?</strong></p>
      <p>
        Expand/contract is a technique for backwards-compatible database migrations during rolling
        deployments. Expand: add new columns/tables without removing old ones, so both old and new
        code work. Migrate: backfill data in the new schema. Deploy new code: reads from new schema,
        still writes to both. Contract: remove old schema once all old code is gone. This avoids
        the risk of breaking running code with a schema change.
      </p>

      <p><strong>Q: What is a canary deployment and when would you use it?</strong></p>
      <p>
        A canary deployment routes a small percentage of traffic (e.g., 5%) to a new version while
        the rest continues on the stable version. You monitor error rates and latency for the canary;
        if healthy, you gradually increase the percentage. If errors appear, you shift traffic back.
        Use it for high-risk changes where you want real production traffic validation with limited
        blast radius, or for changes that cannot be easily tested in staging.
      </p>

      <p><strong>Q: How do feature flags differ from deployment strategies?</strong></p>
      <p>
        Deployment strategies control when code reaches production servers. Feature flags control
        when features are visible to users. You can deploy code with a feature flag disabled (code
        is on servers but inactive), then gradually enable the flag for 1% → 10% → 100% of users.
        This decouples infrastructure deployment (requires downtime risk, coordination) from feature
        release (can be changed in seconds without any deployment).
      </p>
    </div>
  );
}
