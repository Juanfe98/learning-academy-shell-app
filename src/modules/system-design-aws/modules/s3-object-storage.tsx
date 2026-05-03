import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import type { TocItem } from "@/lib/types/academy";

const directUploadDiagram = String.raw`sequenceDiagram
    autonumber
    actor B as Browser
    participant API as Your API
    participant S3 as Amazon S3
    participant DB as Metadata Store

    B->>API: POST /upload-request with filename and content type
    API->>API: Validate file metadata and auth
    API-->>B: Presigned PUT URL + object key
    B->>S3: PUT file bytes directly to presigned URL
    S3-->>B: 200 OK
    B->>API: POST /confirm-upload with key and file size
    API->>S3: Verify object exists and read metadata
    S3-->>API: Object metadata
    API->>DB: Save application record
    API-->>B: cvId + processing status`;

export const toc: TocItem[] = [
  { id: "object-vs-block-vs-file", title: "Object vs Block vs File Storage", level: 2 },
  { id: "s3-basics", title: "S3 Buckets and Objects", level: 2 },
  { id: "versioning-lifecycle", title: "Versioning and Lifecycle Policies", level: 2 },
  { id: "storage-classes", title: "Storage Classes: Cost vs Access Speed", level: 2 },
  { id: "encryption", title: "Encryption: At Rest and In Transit", level: 2 },
  { id: "access-control", title: "Access Control: Bucket Policies vs IAM", level: 2 },
  { id: "presigned-urls", title: "Presigned URLs: Secure Temporary Access", level: 2 },
  { id: "direct-upload", title: "Direct Browser-to-S3 Upload Flow", level: 2 },
  { id: "cloudfront-s3", title: "Serving Files Through CloudFront", level: 2 },
  { id: "real-example", title: "Real Example: CV Builder Upload Flow", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function S3ObjectStorage() {
  return (
    <div className="article-content">
      <p>
        S3 is the backbone of most AWS architectures. It is used for storing user-uploaded files,
        serving static websites, hosting data lakes, archiving logs, and as the source for data
        pipelines. Understanding S3&apos;s capabilities and security model is essential for any
        production AWS architecture &mdash; not knowing it is a gap that shows up immediately.
      </p>

      <h2 id="object-vs-block-vs-file">Object vs Block vs File Storage</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>What it is</th>
            <th>AWS service</th>
            <th>Use case</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Object Storage</td>
            <td>Immutable files stored with metadata; accessed via HTTP</td>
            <td>S3</td>
            <td>User uploads, static assets, backups, data lakes, logs</td>
          </tr>
          <tr>
            <td>Block Storage</td>
            <td>Raw disk attached to one instance; supports random read/write</td>
            <td>EBS (Elastic Block Store)</td>
            <td>EC2 root disk, database storage, any OS-level file system</td>
          </tr>
          <tr>
            <td>File Storage</td>
            <td>Network file system shared by multiple instances simultaneously</td>
            <td>EFS (Elastic File System)</td>
            <td>Shared configuration, ML training data, CMS content</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Object storage key difference:</strong> S3 is immutable and accessed via HTTP GET/PUT.
        You cannot partially update a file &mdash; you replace it entirely. This makes it unsuitable
        for things like a database file that needs random writes, but perfect for file uploads,
        artifacts, and anything where you upload and serve whole files.
      </p>

      <h2 id="s3-basics">S3 Buckets and Objects</h2>
      <p>
        An S3 <strong>bucket</strong> is a container for objects. Buckets are globally unique (no
        two AWS accounts can have the same bucket name). Each bucket belongs to one region.
      </p>
      <p>
        An S3 <strong>object</strong> consists of: the data (file content), an object key (the
        &quot;path&quot; within the bucket), metadata (Content-Type, user-defined headers), an
        optional version ID, and storage class.
      </p>
      <pre><code>{`# Object key is just a string — the "/" is a convention, not a real path
# Key: "uploads/users/alice/cv-2024.pdf"
# This is stored as a flat key, not a directory tree

# S3 URL formats:
# Path style (legacy): https://s3.amazonaws.com/my-bucket/uploads/file.pdf
# Virtual-hosted style (preferred): https://my-bucket.s3.amazonaws.com/uploads/file.pdf
# CloudFront URL: https://d1234567890.cloudfront.net/uploads/file.pdf

# AWS CLI examples
aws s3 cp local-file.pdf s3://my-bucket/uploads/file.pdf
aws s3 ls s3://my-bucket/uploads/
aws s3 sync ./local-dir s3://my-bucket/prefix/    # sync directory
aws s3 rm s3://my-bucket/uploads/old-file.pdf

# Get object metadata
aws s3api head-object --bucket my-bucket --key uploads/file.pdf`}</code></pre>

      <h2 id="versioning-lifecycle">Versioning and Lifecycle Policies</h2>
      <p>
        <strong>Versioning:</strong> When enabled on a bucket, S3 keeps all versions of every object.
        Deleting an object creates a delete marker rather than removing data. You can restore any
        previous version. This protects against accidental deletion and overwrites &mdash; enable
        it for any bucket containing irreplaceable data.
      </p>
      <pre><code>{`# Enable versioning
aws s3api put-bucket-versioning \
  --bucket my-bucket \
  --versioning-configuration Status=Enabled

# List all versions of an object
aws s3api list-object-versions \
  --bucket my-bucket \
  --prefix uploads/file.pdf

# Restore by copying an old version
aws s3api copy-object \
  --bucket my-bucket \
  --copy-source my-bucket/uploads/file.pdf?versionId=abc123 \
  --key uploads/file.pdf`}</code></pre>

      <p>
        <strong>Lifecycle policies:</strong> Automatically manage objects over time. Transition old
        objects to cheaper storage classes or expire (delete) them.
      </p>
      <pre><code>{`# Lifecycle policy (JSON configuration)
{
  "Rules": [
    {
      "Id": "expire-old-logs",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"    // after 30 days: IA
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER_IR"     // after 90 days: Glacier
        }
      ],
      "Expiration": { "Days": 365 }        // delete after 1 year
    },
    {
      "Id": "delete-old-versions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
    }
  ]
}`}</code></pre>

      <h2 id="storage-classes">Storage Classes: Cost vs Access Speed</h2>
      <table>
        <thead>
          <tr>
            <th>Class</th>
            <th>Retrieval time</th>
            <th>Cost (relative)</th>
            <th>Min storage</th>
            <th>Use case</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>S3 Standard</td>
            <td>Milliseconds</td>
            <td>$$$</td>
            <td>None</td>
            <td>Frequently accessed data, default for user uploads</td>
          </tr>
          <tr>
            <td>S3 Intelligent-Tiering</td>
            <td>Milliseconds</td>
            <td>$$ + monitoring fee</td>
            <td>None</td>
            <td>Unknown or changing access patterns; auto-moves between tiers</td>
          </tr>
          <tr>
            <td>S3 Standard-IA</td>
            <td>Milliseconds</td>
            <td>$$ (lower storage, retrieval fee)</td>
            <td>30 days</td>
            <td>Infrequently accessed but need immediate retrieval; backups</td>
          </tr>
          <tr>
            <td>S3 One Zone-IA</td>
            <td>Milliseconds</td>
            <td>$ (lower, single AZ)</td>
            <td>30 days</td>
            <td>Non-critical, reproducible data; secondary backups</td>
          </tr>
          <tr>
            <td>S3 Glacier Instant</td>
            <td>Milliseconds</td>
            <td>$ (very cheap storage)</td>
            <td>90 days</td>
            <td>Archives accessed once per quarter</td>
          </tr>
          <tr>
            <td>S3 Glacier Flexible</td>
            <td>Minutes to hours</td>
            <td>$ (extremely cheap)</td>
            <td>90 days</td>
            <td>Long-term archive; compliance records</td>
          </tr>
          <tr>
            <td>S3 Glacier Deep Archive</td>
            <td>12 hours</td>
            <td>¢ (cheapest)</td>
            <td>180 days</td>
            <td>7+ year compliance archives; disaster recovery backups</td>
          </tr>
        </tbody>
      </table>

      <h2 id="encryption">Encryption: At Rest and In Transit</h2>
      <p>
        <strong>In transit:</strong> All S3 requests use HTTPS/TLS by default. Enforce HTTPS-only
        via a bucket policy that denies requests where <code>aws:SecureTransport = false</code>.
      </p>
      <p>
        <strong>At rest:</strong> Three options:
      </p>
      <ul>
        <li>
          <strong>SSE-S3 (Server-Side Encryption with S3-managed keys):</strong> AWS manages the
          keys entirely. Free. Default for new buckets as of 2023. Provides encryption at rest
          but AWS manages the keys.
        </li>
        <li>
          <strong>SSE-KMS (with AWS KMS keys):</strong> You control the keys via KMS. Provides
          an audit trail (CloudTrail logs every key usage), key rotation, and ability to revoke
          access. Costs ~$0.05 per 10,000 KMS API calls. Use for sensitive data (PII, financial).
        </li>
        <li>
          <strong>Client-side encryption:</strong> You encrypt before uploading; AWS stores
          ciphertext. Maximum control. Most complex. Use only for highly sensitive data where you
          cannot trust even AWS with the plaintext.
        </li>
      </ul>
      <pre><code>{`# Enforce HTTPS only (bucket policy)
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": ["arn:aws:s3:::my-bucket", "arn:aws:s3:::my-bucket/*"],
    "Condition": {
      "Bool": { "aws:SecureTransport": "false" }
    }
  }]
}

# Enable SSE-KMS default encryption
aws s3api put-bucket-encryption \
  --bucket my-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "arn:aws:kms:us-east-1:123:key/abc-def"
      }
    }]
  }'`}</code></pre>

      <h2 id="access-control">Access Control: Bucket Policies vs IAM</h2>
      <p>
        S3 has two access control mechanisms that work together:
      </p>
      <ul>
        <li>
          <strong>IAM policies:</strong> Attached to users, roles, or groups. Control what AWS
          principals can do to S3. Use for granting your application&apos;s ECS task role access
          to S3.
        </li>
        <li>
          <strong>Bucket policies:</strong> Attached to the bucket itself. Control who can access
          the bucket from any principal (including cross-account, public access). Use for granting
          CloudFront access, restricting to VPC-only, or requiring encryption.
        </li>
      </ul>
      <pre><code>{`# Bucket policy: allow CloudFront OAC to read objects
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "cloudfront.amazonaws.com"
    },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::123:distribution/DIST_ID"
      }
    }
  }]
}

# IAM policy for ECS task role (can read/write specific prefix)
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
    "Resource": "arn:aws:s3:::my-bucket/uploads/*"
  }, {
    "Effect": "Allow",
    "Action": "s3:ListBucket",
    "Resource": "arn:aws:s3:::my-bucket",
    "Condition": {
      "StringLike": { "s3:prefix": ["uploads/*"] }
    }
  }]
}`}</code></pre>

      <h2 id="presigned-urls">Presigned URLs: Secure Temporary Access</h2>
      <p>
        A presigned URL allows temporary access to a private S3 object without requiring the
        requester to have AWS credentials. Your backend generates the URL with an expiration time
        and signs it with its IAM credentials. The URL can then be used by anyone to download
        (presigned GET) or upload (presigned PUT) a specific object.
      </p>
      <pre><code>{`// Node.js: generate presigned URL for download
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'us-east-1' });

// Generate download URL (valid for 1 hour)
const url = await getSignedUrl(s3, new GetObjectCommand({
  Bucket: 'my-bucket',
  Key: 'uploads/user-123/cv.pdf'
}), { expiresIn: 3600 });

// Return URL to client → client can download directly from S3
// No AWS credentials needed by the client
// URL expires after 3600 seconds

// Generate presigned PUT URL for upload
import { PutObjectCommand } from '@aws-sdk/client-s3';

const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: \`uploads/\${userId}/\${filename}\`,
  ContentType: 'application/pdf',
  ContentLength: fileSize
}), { expiresIn: 300 });  // 5 minutes for upload

// Return to client → client uploads directly to S3
// Your backend never handles the file bytes`}</code></pre>

      <h2 id="direct-upload">Direct Browser-to-S3 Upload Flow</h2>
      <p>
        The wrong way to handle file uploads: browser sends file to your API, API uploads to S3.
        Your API handles the file bytes, consuming network bandwidth and memory. For large files,
        this is a bottleneck and costs more (data transfer through your servers).
      </p>
      <p>
        The right way: browser gets a presigned URL from your API, then uploads directly to S3.
        Your API never sees the file bytes.
      </p>
      <MermaidDiagram
        chart={directUploadDiagram}
        title="Direct Browser-to-S3 Upload Flow"
        caption="The file bytes never pass through your API. Your backend only authorizes the upload, verifies the result, and stores application metadata."
        minHeight={560}
      />

      <h2 id="cloudfront-s3">Serving Files Through CloudFront</h2>
      <p>
        Never make S3 buckets public to serve files. Use CloudFront as the CDN in front of your
        private S3 bucket. CloudFront uses Origin Access Control (OAC) to authenticate requests
        to S3 on behalf of users.
      </p>
      <p>
        Benefits: files are served from edge locations globally (fast for all users), S3 bucket
        stays private, CloudFront can enforce HTTPS, WAF rules apply at the edge, and you get
        CDN caching for frequently accessed files.
      </p>
      <p>
        A useful production detail: separate <strong>upload</strong>, <strong>storage</strong>, and
        <strong>delivery</strong> concerns. Presigned PUT URLs are for ingest, S3 is the source of
        truth, and CloudFront is the public delivery layer.
      </p>

      <h2 id="real-example">Real Example: CV Builder Upload Flow</h2>
      <pre><code>{`// 1. Client requests upload URL
// POST /api/cvs/upload-url
// Body: { filename: "my-cv.pdf", contentType: "application/pdf", fileSize: 245760 }

app.post('/api/cvs/upload-url', authenticate, async (req, res) => {
  const { filename, contentType, fileSize } = req.body;
  const userId = req.user.id;

  // Validate
  if (fileSize > 10 * 1024 * 1024) return res.status(400).json({ error: 'File too large' });
  if (!['application/pdf', 'application/docx'].includes(contentType)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }

  const key = \`uploads/\${userId}/\${Date.now()}-\${sanitize(filename)}\`;

  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: fileSize,
    Metadata: { userId, originalName: filename }
  }), { expiresIn: 300 });

  res.json({ uploadUrl, key });
});

// 2. Client uploads directly to S3 (browser)
const response = await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
});

// 3. Client confirms upload
// POST /api/cvs/confirm
// Body: { key: "uploads/user-123/1234567890-my-cv.pdf" }

app.post('/api/cvs/confirm', authenticate, async (req, res) => {
  const { key } = req.body;
  const userId = req.user.id;

  // Verify the object exists and belongs to this user
  if (!key.startsWith(\`uploads/\${userId}/\`)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const headObject = await s3.send(new HeadObjectCommand({
    Bucket: process.env.S3_BUCKET, Key: key
  }));

  // Save CV record to database
  const cv = await db.cvs.create({
    userId, s3Key: key, filename: headObject.Metadata.originalName,
    fileSize: headObject.ContentLength, status: 'uploaded'
  });

  // Trigger async processing (parse CV text, AI analysis, etc.)
  await sqs.sendMessage({
    QueueUrl: process.env.CV_PROCESSING_QUEUE,
    MessageBody: JSON.stringify({ cvId: cv.id, s3Key: key })
  });

  res.json({ cvId: cv.id, status: 'processing' });
});`}</code></pre>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Public S3 buckets:</strong> Making a bucket public to serve files. All files
          in the bucket become public. Use CloudFront + private bucket instead.
        </li>
        <li>
          <strong>No versioning on critical buckets:</strong> Accidental deletion or overwrite of
          a user&apos;s file with no way to recover. Enable versioning on any bucket with user data.
        </li>
        <li>
          <strong>Missing CORS configuration:</strong> Browser-based direct uploads fail with CORS
          errors if the S3 bucket does not have a CORS policy allowing PUT from your frontend domain.
        </li>
        <li>
          <strong>Not validating key ownership on confirm:</strong> An attacker could confirm with
          any S3 key. Always verify the key belongs to the authenticated user before creating
          the database record.
        </li>
        <li>
          <strong>Storing files with user-controlled filenames:</strong> <code>../../../etc/passwd</code>
          or path traversal attacks. Sanitize filenames or generate a UUID-based key and store the
          original filename in metadata or DynamoDB.
        </li>
        <li>
          <strong>No lifecycle policies:</strong> Failed uploads (presigned URL generated but never
          used) accumulate. Old versions of files accumulate. Costs grow unbounded. Add lifecycle
          policies from day one.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What is the difference between S3, EBS, and EFS?</strong></p>
      <p>
        S3 is object storage accessed via HTTP, with no practical size limit, 11 nines durability,
        and ideal for files accessed via URL (uploads, static assets, backups). EBS is block storage
        attached to a single EC2 instance, like a hard drive &mdash; used for OS volumes and databases
        requiring filesystem operations. EFS is a network file system that can be mounted by multiple
        EC2 instances simultaneously &mdash; used for shared configuration or content that multiple
        servers need read/write access to.
      </p>

      <p><strong>Q: What is a presigned URL and why would you use it?</strong></p>
      <p>
        A presigned URL is a time-limited URL that grants temporary access to a private S3 object
        without AWS credentials. Your backend generates it by signing a request with IAM credentials
        and returns it to the client. The client can then download (presigned GET) or upload
        (presigned PUT) directly to S3 without your API handling the file bytes. This eliminates
        your API as a bottleneck for file operations, reduces network costs, and keeps the bucket
        private.
      </p>

      <p><strong>Q: How would you design a file upload system that handles large files?</strong></p>
      <p>
        Use presigned PUT URLs for direct browser-to-S3 uploads. The client requests an upload URL
        from your API (which validates the request and generates a presigned URL with the correct
        key, content type, and size constraints). The client uploads directly to S3 using the
        presigned URL. For very large files (&gt;100MB), use S3 multipart upload which allows
        resumable uploads. After upload, the client calls your API to confirm, which verifies the
        object exists in S3 and creates the database record.
      </p>

      <p><strong>Q: How do you secure an S3 bucket that serves user files?</strong></p>
      <p>
        Keep the bucket private (Block Public Access enabled). Use CloudFront with Origin Access
        Control (OAC) as the CDN &mdash; CloudFront authenticates to S3 on behalf of users. Generate
        presigned URLs for direct downloads when needed. Use IAM roles for application access
        (never hardcoded credentials). Enable SSE-KMS for sensitive files. Enable versioning and
        lifecycle policies. Enable bucket access logging. Never expose the S3 bucket URL directly
        &mdash; always serve through CloudFront.
      </p>
    </div>
  );
}
