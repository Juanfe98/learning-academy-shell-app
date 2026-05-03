import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-is-incident", title: "What Is an Incident?", level: 2 },
  { id: "severity-levels", title: "Severity Levels", level: 2 },
  { id: "incident-lifecycle", title: "Incident Lifecycle", level: 2 },
  { id: "detection", title: "Detection", level: 2 },
  { id: "triage-mitigation", title: "Triage and Mitigation", level: 2 },
  { id: "communication", title: "Communication During an Incident", level: 2 },
  { id: "postmortem", title: "Postmortem: Blameless and Actionable", level: 2 },
  { id: "runbooks", title: "Runbook Example: API 500 Rate Spike", level: 2 },
  { id: "real-scenarios", title: "Real Production Scenarios", level: 2 },
  { id: "oncall-basics", title: "On-Call Basics", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function IncidentResponse() {
  return (
    <div className="article-content">
      <p>
        Every production system will experience incidents. The question is not whether they happen,
        but how quickly you detect them, how effectively you mitigate them, and whether you extract
        learning from them to prevent recurrence. Senior engineers are not measured by how few
        incidents they have &mdash; they are measured by how gracefully they handle incidents and
        how systematically they prevent them from recurring.
      </p>

      <h2 id="what-is-incident">What Is an Incident?</h2>
      <p>
        An incident is any event that causes or has the potential to cause degradation of your
        service quality or customer experience. Not all incidents are outages: a spike in error
        rate, a degraded feature, or a security event can all be incidents.
      </p>
      <p>
        <strong>Symptoms vs causes:</strong> The &quot;incident&quot; is the symptom (high error rate,
        slow responses, failed payments). The &quot;root cause&quot; is discovered during investigation.
        Responding to the symptom (mitigation) happens first, even before the cause is known.
      </p>

      <h2 id="severity-levels">Severity Levels</h2>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Description</th>
            <th>Response time</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>P1 (Critical)</td>
            <td>Complete service outage or data loss. All customers affected.</td>
            <td>Immediate (drop everything)</td>
            <td>Site is down, payments failing, data corrupted</td>
          </tr>
          <tr>
            <td>P2 (High)</td>
            <td>Major feature broken. Significant customer impact. No workaround.</td>
            <td>Within 15 minutes</td>
            <td>CV parsing failing, login broken for subset of users</td>
          </tr>
          <tr>
            <td>P3 (Medium)</td>
            <td>Partial degradation. Workaround exists. Moderate customer impact.</td>
            <td>Within 1 hour (business hours)</td>
            <td>Slow AI analysis, export feature broken</td>
          </tr>
          <tr>
            <td>P4 (Low)</td>
            <td>Minor issue. Cosmetic or edge case. Low customer impact.</td>
            <td>Next business day</td>
            <td>Occasional rendering glitch, minor UI bug</td>
          </tr>
        </tbody>
      </table>

      <h2 id="incident-lifecycle">Incident Lifecycle</h2>
      <pre>{`
DETECT
  Alert fires, customer report, anomaly detected
  → Acknowledge: someone owns the incident
  → Communicate: notify stakeholders of severity
         ↓
TRIAGE
  What is the scope? How many users? Which features?
  Is it still getting worse?
  What changed recently (deployments, config changes)?
  What does monitoring show?
         ↓
MITIGATE
  Take action to stop the bleeding FIRST
  (Rollback, feature flag off, scale up, disable affected endpoint)
  Mitigation goal: restore service, even partially, ASAP
  Root cause analysis can wait — user impact cannot
         ↓
RESOLVE
  Service restored to normal operation
  All metrics back to baseline
  Update status page
         ↓
POSTMORTEM
  Timeline reconstruction
  Root cause analysis
  Blameless culture: systems failed, not people
  Action items to prevent recurrence
`}</pre>

      <h2 id="detection">Detection</h2>
      <p>
        Incidents should be detected by automated monitoring before customers report them. If your
        first indication of an outage is a customer email, your monitoring is insufficient.
      </p>
      <p><strong>Detection layers:</strong></p>
      <ul>
        <li><strong>Synthetic monitoring:</strong> Automated tests that simulate real user flows (login, upload CV, export) every 1&ndash;5 minutes. Alert if they fail.</li>
        <li><strong>Infrastructure alerts:</strong> CloudWatch alarms on error rates, latency, CPU, memory, queue depth.</li>
        <li><strong>Log-based alerts:</strong> Alert on error count exceeding threshold in CloudWatch Logs.</li>
        <li><strong>External monitoring:</strong> Tools like Pingdom, UptimeRobot, or Route 53 health checks that test from outside AWS.</li>
        <li><strong>Customer reports:</strong> Last resort, should never be first. But have a clear channel for reports.</li>
      </ul>

      <h2 id="triage-mitigation">Triage and Mitigation</h2>
      <p>
        <strong>Triage questions to answer first:</strong>
      </p>
      <ul>
        <li>Is this still getting worse or has it stabilized?</li>
        <li>What percentage of users are affected?</li>
        <li>Which specific actions or endpoints are broken?</li>
        <li>What changed in the last 30 minutes? (Check deployment history first)</li>
        <li>Are there any related events? (AWS service health, third-party provider status)</li>
      </ul>
      <p>
        <strong>Mitigation options (roughly fastest first):</strong>
      </p>
      <ol>
        <li><strong>Rollback deployment:</strong> If the incident started with a recent deploy, roll back. This is usually the fastest path to resolution.</li>
        <li><strong>Feature flag:</strong> If the broken feature has a flag, disable it. Users lose the feature but the service continues.</li>
        <li><strong>Scale up:</strong> If the issue is capacity (CPU, memory, queue depth), scale up immediately while investigating root cause.</li>
        <li><strong>Circuit break:</strong> Disable integration with failing third-party service to prevent cascading failure.</li>
        <li><strong>Database failover:</strong> If RDS is unhealthy, trigger a manual failover to the standby.</li>
        <li><strong>Disable affected endpoint:</strong> Return a 503 for a broken endpoint to protect the rest of the service.</li>
      </ol>
      <pre><code>{`# Quick rollback: ECS service deploy previous image
aws ecs update-service \
  --cluster production \
  --service api-service \
  --task-definition api-task:PREVIOUS_REVISION

# Feature flag off (LaunchDarkly, custom, etc.)
await featureFlags.disable('cv-ai-analysis');

# Scale out ECS service immediately
aws ecs update-service \
  --cluster production \
  --service api-service \
  --desired-count 20  # up from 5

# Check AWS service health
# console.aws.amazon.com/health/
# or
aws health describe-events \
  --filter "services=ECS,EC2,RDS" "regions=us-east-1"`}</code></pre>

      <h2 id="communication">Communication During an Incident</h2>
      <p>
        Clear, frequent communication reduces panic and aligns the team. Overcommunicate during incidents.
      </p>
      <ul>
        <li>
          <strong>Status page:</strong> Update your public status page (statuspage.io, AWS Service Health Dashboard equivalent) within minutes of a P1/P2 being confirmed. Users seeing &quot;we know and are working on it&quot; are far less frustrated than silence.
        </li>
        <li>
          <strong>Internal updates every 15&ndash;30 minutes:</strong> &quot;We have identified the failing component. Rolling back deployment now. ETA to resolve: 15 minutes.&quot;
        </li>
        <li>
          <strong>War room:</strong> A dedicated Slack channel or video call for active incidents. Keep it to responders + observers. No questions/noise in the channel during the incident.
        </li>
        <li>
          <strong>Incident commander:</strong> One person coordinates the response. Others execute specific investigations. Clear roles prevent duplicate work and gaps.
        </li>
      </ul>

      <h2 id="postmortem">Postmortem: Blameless and Actionable</h2>
      <p>
        A postmortem is a structured analysis of what went wrong and why, with the goal of extracting
        systemic improvements to prevent recurrence. <strong>Blameless</strong> means the analysis
        focuses on systems, processes, and organizational factors &mdash; not on individuals. People
        made decisions with the information available at the time.
      </p>
      <p><strong>Postmortem template:</strong></p>
      <pre>{`
## Incident Postmortem: [Title]
**Date:** [Date]
**Severity:** P[1-4]
**Duration:** X hours Y minutes
**Impact:** ~N users, ~$N revenue, specific features affected

## Timeline
- 14:32 - Alert fires: error rate above 1%
- 14:35 - On-call acknowledges
- 14:40 - Identified: new deploy at 14:28 introduced regression
- 14:45 - Rollback initiated
- 15:00 - Error rate returns to baseline, incident resolved

## Impact
- [N]% of requests failed during [duration]
- Affected features: CV export, PDF generation
- Estimated revenue impact: $X

## Root Cause
The deploy at 14:28 included a change to the PDF generator that failed
to handle null values in the experience field. The test suite did not
cover this case with production-realistic data.

## Contributing Factors
- Test suite used only synthetic data without null fields
- Code review did not catch the null handling issue
- Staging environment did not have production-scale data

## Action Items
| Item | Owner | Due date | Priority |
|------|-------|----------|----------|
| Add null handling tests with production-like data | @alice | Next sprint | P2 |
| Add synthetic monitoring for CV export flow | @bob | This week | P1 |
| Improve code review checklist for edge cases | @team | Next month | P3 |
| Add staged rollout to deployment process | @charlie | Q2 | P2 |

## What Went Well
- Alert fired before customer reports
- Rollback completed in 5 minutes
- Clear communication on status page
`}</pre>

      <h2 id="runbooks">Runbook Example: API 500 Rate Spike</h2>
      <pre>{`
RUNBOOK: API High Error Rate (5xx)
Trigger: CloudWatch alarm "api-error-rate-high"

Step 1: Assess scope
  - CloudWatch Dashboard: check error rate, latency, request count
  - Is it all endpoints? Check: filter logs by path
  - Timestamp: when did it start?
  - Recent deployments? Check: GitHub Actions deployment history

Step 2: Check ECS task health
  - AWS Console → ECS → Cluster → Services → api-service
  - Are tasks healthy? Running count vs desired count?
  - Any recent task crashes? Check container logs for OOM, crash

Step 3: Check logs
  - CloudWatch Logs Insights:
    fields @timestamp, path, error.message, error.stack
    | filter level = "error"
    | sort @timestamp desc | limit 50
  - What is the error message?

Step 4: Common causes and fixes
  a. OOM kills → Scale up task memory: 512 → 1024 MB
  b. DB connection pool exhausted → Check pg_stat_activity, consider RDS Proxy
  c. Unhandled null pointer → Rollback, then fix in code
  d. Third-party API down → Enable circuit breaker, return fallback response
  e. DynamoDB throttling → Check ProvisionedThroughputExceededException in logs

Step 5: Rollback if deploy-related
  aws ecs update-service --cluster prod --service api --task-definition api:PREV

Step 6: Update status page and notify on-call lead

Step 7: After resolution: start postmortem within 24h
`}</pre>

      <h2 id="real-scenarios">Real Production Scenarios</h2>
      <p><strong>Scenario 1: API outage from bad deploy</strong></p>
      <p>
        Deploy at 2pm introduced a null pointer in the CV parser. Error rate spikes to 40%. Alert
        fires in 2 minutes. On-call checks deployment timeline, sees recent deploy as likely cause,
        rolls back in 5 minutes. Error rate returns to baseline. Total user impact: 7 minutes.
        Postmortem: add null safety to code review checklist, add E2E test for edge cases.
      </p>
      <p><strong>Scenario 2: DB latency spike</strong></p>
      <p>
        API p99 latency spikes from 200ms to 5 seconds. No errors. Check metrics: DB CPU at 95%.
        Check pg_stat_statements: a new background job is running a full table scan every minute
        on a 10M row table. Disable the job immediately. Add index, re-enable job. Postmortem:
        background jobs must not run full table scans; code review to check for Scan usage.
      </p>
      <p><strong>Scenario 3: Queue backlog growth</strong></p>
      <p>
        SQS queue depth growing from 0 to 50,000 over 2 hours. Lambda worker stopped processing.
        Check CloudWatch: Lambda function erroring on all messages. Check DLQ: first few messages
        contain bad data from a third-party integration that changed its payload format. Deploy
        backwards-compatible parser, redrive DLQ. Postmortem: add schema validation and alerting
        for third-party payload changes.
      </p>
      <p><strong>Scenario 4: Third-party AI provider outage</strong></p>
      <p>
        AI provider goes down. Without circuit breaker: all CV processing requests hang for 30
        seconds, then fail. API becomes unresponsive. With circuit breaker: first 5 failures open
        the circuit; subsequent requests fail immediately with a useful error; rest of API continues
        working normally. Users see &quot;AI analysis temporarily unavailable&quot; instead of
        site-wide outage.
      </p>

      <h2 id="oncall-basics">On-Call Basics</h2>
      <p>
        On-call means being the first responder for production incidents during a rotation. Key
        expectations:
      </p>
      <ul>
        <li>Acknowledge alerts within 5&ndash;15 minutes (depending on severity)</li>
        <li>Not to fix everything alone &mdash; escalate when needed</li>
        <li>Document what you investigated and what you tried, even if unresolved</li>
        <li>Hand off properly at rotation change: current incident status, open investigations</li>
        <li>Runbooks should be up to date before your on-call week</li>
      </ul>
      <p>
        <strong>Sustainable on-call:</strong> High alert fatigue from too many alerts destroys
        team health. Actively reduce alert noise: remove alerts that are not actionable, tune
        thresholds, fix the underlying issues that cause frequent alerts. Track MTTR (Mean Time
        to Resolve) and alert frequency as team health metrics.
      </p>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Answer Incident Response Questions"
        intro="The strongest answers show calm structure: detect, scope, mitigate, communicate, and learn. Interviewers are listening for judgment as much as technical detail."
        steps={[
          "Start with the symptom and immediate customer impact rather than skipping straight to the root cause.",
          "Explain how you scoped the blast radius and formed your first few hypotheses using dashboards, logs, traces, deployment history, and recent changes.",
          "Separate mitigation from diagnosis: stabilize the system first with rollback, failover, feature flags, or circuit breakers, then continue deeper investigation.",
          "Mention communication explicitly, including status updates, escalation, and clear ownership during the incident.",
          "Close with the prevention change from the postmortem so the story ends with a stronger system, not just a restored one.",
        ]}
      />

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: Tell me about a production incident you were involved in.</strong></p>
      <p>
        Strong answer structure: describe the symptom (not the cause yet), your role in the response,
        how you investigated (what tools, what you checked first), what the root cause turned out to
        be, how you resolved it, and what you changed to prevent recurrence. Show structured thinking:
        you did not panic, you narrowed down the problem systematically, you communicated clearly,
        and you extracted a learning.
      </p>

      <p><strong>Q: What is a postmortem and why is blameless culture important?</strong></p>
      <p>
        A postmortem is a structured analysis of an incident after it is resolved, focused on
        understanding root causes and preventing recurrence. Blameless culture means the analysis
        focuses on systems and processes rather than individual mistakes. This is important because:
        people made reasonable decisions with the information they had; if blame is assigned,
        engineers hide mistakes rather than learning from them; systemic issues (gaps in testing,
        monitoring, processes) are the true root causes and are what needs fixing.
      </p>

      <p><strong>Q: How do you decide between rolling back vs fixing forward during an incident?</strong></p>
      <p>
        Rollback first if: a deployment happened recently and correlates with the incident,
        rollback is quick (minutes), and the changes can be re-deployed after a fix. Fix forward
        when: rollback would require rolling back desirable changes, the issue is in infrastructure
        rather than application code, or the rollback itself might cause data loss. When in doubt,
        rollback first. Restoring service is the priority; understanding root cause comes after.
      </p>

      <p><strong>Q: What is an error budget and how do you use it?</strong></p>
      <p>
        An error budget is the acceptable amount of unreliability in a given period, derived from
        the SLO. If your SLO is 99.9% availability per month, your error budget is 0.1% &mdash;
        about 43 minutes of downtime per month. The error budget is used operationally: if you
        have used 80% of the budget by mid-month, you slow down risky deployments and prioritize
        reliability work. If the budget is healthy, you can move faster. It makes reliability
        a shared product metric, not just an ops concern.
      </p>
    </div>
  );
}
