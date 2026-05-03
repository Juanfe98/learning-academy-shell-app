import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import type { TocItem } from "@/lib/types/academy";

const envelopeEncryptionDiagram = String.raw`flowchart TD
    DATA["Your plaintext data"]
    DEK["Data encryption key"]
    CMK["KMS customer key"]
    ENC_DATA["Encrypted data"]
    ENC_DEK["Encrypted DEK"]
    STORE["Store encrypted data + encrypted DEK together"]

    DATA -->|encrypt locally with| DEK --> ENC_DATA
    DEK -->|encrypt with KMS| CMK --> ENC_DEK
    ENC_DATA --> STORE
    ENC_DEK --> STORE
    STORE -->|decrypt DEK via KMS| CMK
    CMK -->|returns plaintext DEK| DEK
    DEK -->|decrypt locally| DATA`;

export const toc: TocItem[] = [
  { id: "least-privilege", title: "Principle of Least Privilege", level: 2 },
  { id: "iam-deep-dive", title: "IAM Deep Dive: Users, Groups, Roles, Policies", level: 2 },
  { id: "iam-policy-structure", title: "IAM Policy JSON Structure", level: 2 },
  { id: "secrets-management", title: "Secrets Management", level: 2 },
  { id: "encryption-at-rest", title: "Encryption at Rest", level: 2 },
  { id: "encryption-in-transit", title: "Encryption in Transit", level: 2 },
  { id: "kms", title: "AWS KMS and Envelope Encryption", level: 2 },
  { id: "waf-shield", title: "WAF and Shield", level: 2 },
  { id: "cloudtrail-guardduty", title: "CloudTrail and GuardDuty", level: 2 },
  { id: "security-checklist", title: "Production Security Checklist", level: 2 },
  { id: "insecure-patterns", title: "Insecure Patterns to Avoid", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function CloudSecurity() {
  return (
    <div className="article-content">
      <p>
        Cloud security is not an add-on &mdash; it is an architectural property. A system with correct
        functionality but poor security is not production-ready. The good news is that AWS provides
        excellent building blocks for security, and the majority of breaches are caused by configuration
        mistakes rather than sophisticated attacks: public S3 buckets, hardcoded credentials, overly
        permissive IAM policies, missing encryption. This module covers the patterns that prevent the
        most common security failures.
      </p>

      <h2 id="least-privilege">Principle of Least Privilege</h2>
      <p>
        Every IAM principal (user, role, service) should have only the permissions required to do
        its specific job, and nothing more. If an API server needs to read from DynamoDB and write
        to S3, its role should have exactly those permissions on exactly those resources &mdash; not
        full DynamoDB access, not full S3 access, and not admin permissions.
      </p>
      <p>
        <strong>Why it matters:</strong> If a service is compromised (SQL injection, RCE vulnerability),
        least privilege limits the blast radius. An API server with read-only access to a specific
        DynamoDB table cannot delete data, cannot access other services, and cannot provision new
        infrastructure &mdash; even if fully compromised.
      </p>
      <p>
        <strong>In practice:</strong> Start with zero permissions, then add what is actually needed.
        Use AWS IAM Access Analyzer to identify unused permissions and tighten policies over time.
        Never grant <code>*</code> permissions to a resource or action without a very specific reason.
      </p>

      <h2 id="iam-deep-dive">IAM Deep Dive: Users, Groups, Roles, Policies</h2>
      <table>
        <thead>
          <tr>
            <th>Concept</th>
            <th>What it is</th>
            <th>When to use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>IAM User</td>
            <td>Long-term identity with permanent credentials</td>
            <td>Avoid for applications. Use for human operators who need console/CLI access. Prefer SSO.</td>
          </tr>
          <tr>
            <td>IAM Group</td>
            <td>Collection of IAM users with shared policies</td>
            <td>Organize users: Developers group, Admins group. Attach policies to groups, not users.</td>
          </tr>
          <tr>
            <td>IAM Role</td>
            <td>Identity assumed by AWS services or users; temporary credentials</td>
            <td>Always use for: EC2, ECS, Lambda, cross-account access. Roles use temporary credentials that auto-rotate.</td>
          </tr>
          <tr>
            <td>IAM Policy</td>
            <td>JSON document defining Allow/Deny actions on resources</td>
            <td>Attached to users/groups/roles. Use managed policies for common patterns; inline for fine-grained.</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Golden rule:</strong> Applications should never use IAM users with access keys.
        Use IAM roles. Roles provide temporary credentials, automatically rotate, and do not require
        credential management.
      </p>

      <h2 id="iam-policy-structure">IAM Policy JSON Structure</h2>
      <pre><code>{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCVRead",          // optional identifier
      "Effect": "Allow",             // or "Deny"
      "Action": [                    // AWS API actions
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:BatchGetItem"
      ],
      "Resource": [                  // which resources
        "arn:aws:dynamodb:us-east-1:123456789:table/cvs",
        "arn:aws:dynamodb:us-east-1:123456789:table/cvs/index/*"  // include GSIs
      ]
    },
    {
      "Sid": "AllowCVWrite",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789:table/cvs",
      "Condition": {                 // optional conditions
        "ForAllValues:StringEquals": {
          "dynamodb:LeadingKeys": ["\${aws:PrincipalTag/userId}"]
          // Only allow writes to items where PK matches user's ID
        }
      }
    },
    {
      "Sid": "AllowS3Upload",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::my-bucket/uploads/*"
      // NEVER: "Resource": "arn:aws:s3:::*"
    }
  ]
}`}</code></pre>

      <p>
        <strong>Assume role:</strong> ECS tasks assume their task role automatically. For cross-account
        access, service A assumes a role in account B using <code>sts:AssumeRole</code>.
      </p>

      <h2 id="secrets-management">Secrets Management</h2>
      <table>
        <thead>
          <tr>
            <th>Approach</th>
            <th>Risk</th>
            <th>Use case</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Hardcoded in code</td>
            <td>Critical: in version control, all who can read code can access secret</td>
            <td>Never</td>
          </tr>
          <tr>
            <td>Environment variables (.env)</td>
            <td>High: accidentally committed, visible in process list</td>
            <td>Local development only</td>
          </tr>
          <tr>
            <td>AWS SSM Parameter Store</td>
            <td>Low: IAM-controlled, encrypted</td>
            <td>Non-sensitive config, feature flags, simple secrets</td>
          </tr>
          <tr>
            <td>AWS Secrets Manager</td>
            <td>Very low: IAM-controlled, encrypted, automatic rotation</td>
            <td>Database credentials, API keys, OAuth secrets</td>
          </tr>
        </tbody>
      </table>
      <pre><code>{`// Reading secret from Secrets Manager in ECS task
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManagerClient({ region: 'us-east-1' });

async function getDbCredentials() {
  const response = await secretsManager.send(new GetSecretValueCommand({
    SecretId: 'prod/api/database-credentials'
  }));
  return JSON.parse(response.SecretString!);
  // { username: "api_user", password: "..." }
}

// In ECS task definition, inject secrets at container start:
// (this is better than fetching in code — ECS fetches at launch time)
"secrets": [{
  "name": "DATABASE_URL",
  "valueFrom": "arn:aws:secretsmanager:us-east-1:123:secret:prod/db/url"
}]
// Container gets DATABASE_URL as environment variable from Secrets Manager
// Never stored in task definition, never in code

// Automatic rotation: Secrets Manager can rotate DB credentials automatically
// Lambda function updates both the secret value and the DB user password
// Zero downtime rotation with gradual transition`}</code></pre>

      <h2 id="encryption-at-rest">Encryption at Rest</h2>
      <p>
        Encryption at rest protects data if physical storage media is accessed. All AWS storage
        services support encryption, and many enable it by default:
      </p>
      <ul>
        <li><strong>S3:</strong> SSE-S3 enabled by default for new buckets. Use SSE-KMS for audit trail and key control.</li>
        <li><strong>DynamoDB:</strong> Always encrypted at rest using AWS-managed key. Optionally use customer-managed KMS key.</li>
        <li><strong>RDS/Aurora:</strong> Enable at creation with <code>--storage-encrypted</code>. KMS key for the volume. Cannot enable on existing instance without restore.</li>
        <li><strong>EBS:</strong> Enable account-wide default encryption so all new volumes are automatically encrypted.</li>
        <li><strong>EFS:</strong> Encrypt at creation; cannot encrypt existing file system.</li>
      </ul>
      <pre><code>{`# Enable EBS default encryption for account (do this once)
aws ec2 enable-ebs-encryption-by-default

# Verify
aws ec2 get-ebs-encryption-by-default
# → { "EbsEncryptionByDefault": true }

# Create RDS with encryption
aws rds create-db-instance \
  --db-instance-identifier prod-db \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:us-east-1:123:key/key-id \
  ...`}</code></pre>

      <h2 id="encryption-in-transit">Encryption in Transit</h2>
      <p>
        All traffic must be encrypted in transit using TLS. This applies not just to external traffic
        but also traffic <em>inside</em> the VPC:
      </p>
      <ul>
        <li>Client &rarr; CloudFront: TLS (enforced by CloudFront)</li>
        <li>CloudFront &rarr; ALB: TLS (use HTTPS origin policy in CloudFront)</li>
        <li>ALB &rarr; ECS tasks: TLS (optional but recommended for compliance)</li>
        <li>ECS &rarr; RDS: SSL connection string</li>
        <li>ECS &rarr; ElastiCache: TLS enabled on cluster</li>
        <li>ECS &rarr; S3: HTTPS-only (enforce via bucket policy)</li>
      </ul>
      <pre><code>{`# Force HTTPS on ALB: redirect HTTP to HTTPS
# ALB listener on port 80:
{
  "Type": "redirect",
  "RedirectConfig": {
    "Protocol": "HTTPS",
    "Port": "443",
    "StatusCode": "HTTP_301"
  }
}

# Enforce HTTPS on S3 (bucket policy)
{
  "Statement": [{
    "Effect": "Deny",
    "Action": "s3:*",
    "Principal": "*",
    "Resource": ["arn:aws:s3:::my-bucket", "arn:aws:s3:::my-bucket/*"],
    "Condition": { "Bool": { "aws:SecureTransport": "false" } }
  }]
}

# RDS: require SSL connection
# Add to PostgreSQL connection string
DATABASE_URL=postgresql://user:pass@rds-host/db?sslmode=require`}</code></pre>

      <h2 id="kms">AWS KMS and Envelope Encryption</h2>
      <p>
        AWS KMS (Key Management Service) manages cryptographic keys for encrypting data. KMS
        keys (Customer Master Keys) never leave KMS &mdash; encryption and decryption operations
        happen within KMS.
      </p>
      <p>
        <strong>Envelope encryption:</strong> You do not encrypt large data directly with KMS
        (too slow, 4KB limit). Instead, KMS generates a data encryption key (DEK), you encrypt
        your data with the DEK locally, then KMS encrypts the DEK. To decrypt: send the encrypted
        DEK to KMS, get back the plaintext DEK, use it to decrypt your data.
      </p>
      <MermaidDiagram
        chart={envelopeEncryptionDiagram}
        title="Envelope Encryption with AWS KMS"
        caption="KMS protects the key that protects your data. Large payloads are encrypted locally with a data key, while KMS only handles wrapping and unwrapping that smaller key."
        minHeight={560}
      />

      <h2 id="waf-shield">WAF and Shield</h2>
      <p>
        <strong>AWS WAF:</strong> Application-layer (L7) protection. Inspects HTTP requests and
        blocks based on rules: IP lists, SQL injection, XSS, rate limiting, geographic blocking,
        bot signatures. Integrates with CloudFront (recommended &mdash; blocks at edge) and ALB.
      </p>
      <p>
        <strong>AWS Shield Standard:</strong> Free, automatic DDoS protection for all AWS resources.
        Protects against common network and transport layer attacks (SYN floods, UDP floods).
      </p>
      <p>
        <strong>AWS Shield Advanced:</strong> $3,000/month + data transfer. Enhanced DDoS protection,
        near-real-time visibility, dedicated DDoS response team, cost protection for scaling during attacks.
        Required for: financial services, high-value targets, compliance requirements.
      </p>

      <h2 id="cloudtrail-guardduty">CloudTrail and GuardDuty</h2>
      <p>
        <strong>CloudTrail:</strong> Logs every AWS API call made in your account: who made the
        call, when, from what IP, what resource was affected, what parameters were used. Enables
        compliance auditing and security forensics. Enable in all regions, deliver logs to S3
        with CloudWatch Logs integration for alerting.
      </p>
      <p>
        <strong>GuardDuty:</strong> Intelligent threat detection using ML. Analyzes CloudTrail,
        VPC Flow Logs, and DNS logs to detect: compromised instances (unusually high traffic to
        known bad IPs), credential theft (API calls from unusual locations), crypto mining,
        privilege escalation attempts. Enable in all regions.
      </p>
      <pre><code>{`# Enable GuardDuty (do once)
aws guardduty create-detector --enable

# Create CloudTrail multi-region trail
aws cloudtrail create-trail \
  --name audit-trail \
  --s3-bucket-name audit-logs-bucket \
  --include-global-service-events \
  --is-multi-region-trail \
  --enable-log-file-validation

aws cloudtrail start-logging --name audit-trail`}</code></pre>

      <h2 id="security-checklist">Production Security Checklist</h2>
      <ul>
        <li>All S3 buckets have Block Public Access enabled</li>
        <li>S3 buckets with sensitive data use SSE-KMS encryption</li>
        <li>S3 bucket policies enforce HTTPS only</li>
        <li>All databases in private subnets</li>
        <li>RDS encrypted at rest with KMS</li>
        <li>DynamoDB encryption verified (on by default)</li>
        <li>No IAM users with access keys for application code; all use IAM roles</li>
        <li>IAM roles follow least privilege; no wildcards on sensitive resources</li>
        <li>All secrets in Secrets Manager or Parameter Store (never in code or plain env vars)</li>
        <li>CloudTrail enabled in all regions, logs delivered to immutable S3 bucket</li>
        <li>GuardDuty enabled in all regions</li>
        <li>WAF deployed in front of CloudFront or ALB</li>
        <li>VPC Flow Logs enabled</li>
        <li>No security groups allow 0.0.0.0/0 on non-80/443 ports</li>
        <li>MFA enabled for all human AWS users</li>
        <li>EBS default encryption enabled account-wide</li>
        <li>HTTP redirected to HTTPS on ALB</li>
        <li>Access logging enabled on ALB and CloudFront</li>
        <li>Dependency scanning in CI pipeline</li>
        <li>Container images scanned for vulnerabilities (ECR scanning)</li>
      </ul>

      <h2 id="insecure-patterns">Insecure Patterns to Avoid</h2>
      <ul>
        <li>
          <strong>Hardcoded credentials:</strong>
          <code>const db = postgres://user:password@host/db</code> in source code. Any developer,
          any build log, any deployment system that reads the code has the credentials.
        </li>
        <li>
          <strong>Public S3 buckets with sensitive data:</strong> Once public, data has been
          indexed by search engines and security scanners within minutes.
        </li>
        <li>
          <strong>Security group allowing SSH from 0.0.0.0/0:</strong> All internet-facing
          SSH is at risk from brute force and zero-day exploits. Use SSM Session Manager instead.
        </li>
        <li>
          <strong>IAM policies with <code>*</code> actions and resources:</strong>
          <code>"Action": "*", "Resource": "*"</code> is equivalent to admin access. Compromise
          of this role gives full account access.
        </li>
        <li>
          <strong>No encryption in transit between internal services:</strong>
          &quot;It&apos;s all within the VPC so it&apos;s safe&quot; &mdash; but VPC traffic can
          be inspected if a host on the VPC is compromised. Use TLS internally for sensitive data.
        </li>
        <li>
          <strong>Long-lived IAM access keys for programmatic access:</strong> Access keys do not
          expire, are often accidentally committed, and are the most common credential in
          data breaches. Rotate to IAM roles.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What is the principle of least privilege and how do you apply it in AWS?</strong></p>
      <p>
        Least privilege means granting only the permissions needed for a specific task. In AWS:
        ECS task roles should only allow the specific DynamoDB tables, S3 prefixes, and SQS queues
        the service actually uses &mdash; not full-service access. Use specific resource ARNs instead
        of wildcards. Use IAM Access Analyzer to identify and remove unused permissions over time.
        Start with deny-all and add permissions incrementally rather than starting with broad access
        and narrowing.
      </p>

      <p><strong>Q: How should an application on ECS authenticate to AWS services like S3 or DynamoDB?</strong></p>
      <p>
        Using an IAM task role. You define an IAM role with the specific permissions the task needs
        and attach it to the ECS task definition. AWS automatically provides temporary credentials
        to the task via the metadata service. The AWS SDK retrieves these credentials transparently.
        Credentials rotate automatically every 15 minutes. No credentials in code, no secrets to
        manage, and if the task role is compromised, credentials are short-lived and scoped.
      </p>

      <p><strong>Q: What is the difference between Secrets Manager and Parameter Store?</strong></p>
      <p>
        Both store secrets securely encrypted by KMS with IAM-controlled access. Secrets Manager
        adds: automatic rotation (Lambda rotates credentials on a schedule), cross-region replication,
        dedicated API for secrets with versioning, and costs $0.40/secret/month plus $0.05/10k API
        calls. Parameter Store is free for standard parameters, with no automatic rotation. Use
        Secrets Manager for database passwords and API keys that should rotate automatically. Use
        Parameter Store for non-sensitive configuration and feature flags.
      </p>

      <p><strong>Q: What is envelope encryption and why does KMS use it?</strong></p>
      <p>
        Envelope encryption wraps a data encryption key (DEK) with a master key. You encrypt data
        locally with the DEK (fast, any size), then encrypt the DEK with the KMS master key (slow,
        but small). KMS uses it because: KMS has a 4KB limit on directly encrypted data, local
        encryption with the DEK is orders of magnitude faster than calling KMS for every byte,
        and the master key never leaves KMS. The encrypted DEK is stored alongside the encrypted
        data &mdash; together they are useless without access to KMS.
      </p>
    </div>
  );
}
