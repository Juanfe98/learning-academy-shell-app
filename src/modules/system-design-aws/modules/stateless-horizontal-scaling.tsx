import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "stateless-vs-stateful", title: "Stateless vs Stateful: The Core Distinction", level: 2 },
  { id: "horizontal-vs-vertical", title: "Horizontal vs Vertical Scaling", level: 2 },
  { id: "session-problem", title: "The Session Storage Problem", level: 2 },
  { id: "session-solutions", title: "Solutions: Redis, DB, and JWT", level: 2 },
  { id: "lb-algorithms", title: "Load Balancing Algorithms", level: 2 },
  { id: "autoscaling", title: "Auto Scaling: Target Tracking, Step, Scheduled", level: 2 },
  { id: "ecs-fargate", title: "AWS ECS Fargate: Stateless Containers", level: 2 },
  { id: "lambda-scaling", title: "AWS Lambda: Invocation Model and Scaling", level: 2 },
  { id: "refactor-example", title: "Refactoring: Stateful → Stateless", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function StatelessHorizontalScaling() {
  return (
    <div className="article-content">
      <p>
        The most important property of a scalable service is statelessness. A stateless service
        treats every request independently, stores no local state between requests, and can be
        replaced by any identical copy. This single property enables everything else: horizontal
        scaling, zero-downtime deploys, auto-scaling, and fault tolerance. If a service is stateful
        &mdash; if it remembers something about previous requests in local memory &mdash; scaling
        it becomes exponentially harder.
      </p>

      <h2 id="stateless-vs-stateful">Stateless vs Stateful: The Core Distinction</h2>
      <p>
        <strong>Analogy:</strong> A restaurant cashier who does not remember you is stateless. They
        greet you fresh each time, take your order, process payment, and that is it &mdash; any
        cashier can serve any customer. A personal banker is stateful: they remember your account
        history, your preferences, your loan status. Replace the banker and the customer relationship
        is broken.
      </p>
      <p>
        <strong>Stateless service:</strong> Receives a request, does work using only data in the
        request plus shared external stores (database, cache), and returns a response. The server
        that handles your next request can be completely different &mdash; it does not matter.
      </p>
      <p>
        <strong>Stateful service:</strong> Remembers something from previous requests in local
        memory or local files. A server that holds your session in memory must receive your future
        requests too &mdash; you cannot route you to any server, only to your server.
      </p>
      <pre><code>{`// STATEFUL (bad for horizontal scaling)
const sessions = new Map();  // in-process memory

app.post('/login', (req, res) => {
  const user = authenticate(req.body);
  const sessionId = generateId();
  sessions.set(sessionId, user);  // stored in THIS server's memory
  res.cookie('sessionId', sessionId);
});

app.get('/profile', (req, res) => {
  const user = sessions.get(req.cookies.sessionId);
  // If request goes to a DIFFERENT server instance,
  // sessions Map is empty there → user not found → 401
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json(user);
});

// STATELESS (scales horizontally)
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
  // No server-side state stored. Any server can verify the JWT.
});

app.get('/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const payload = jwt.verify(token, process.env.JWT_SECRET);  // cryptographic verification
  const user = await db.users.findById(payload.userId);       // from shared DB
  res.json(user);
});`}</code></pre>

      <h2 id="horizontal-vs-vertical">Horizontal vs Vertical Scaling</h2>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Vertical (Scale Up)</th>
            <th>Horizontal (Scale Out)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Mechanism</td>
            <td>Bigger instance (more CPU/RAM)</td>
            <td>More instances of the same size</td>
          </tr>
          <tr>
            <td>Ceiling</td>
            <td>Hard limit (largest EC2 type)</td>
            <td>Effectively unlimited</td>
          </tr>
          <tr>
            <td>Cost</td>
            <td>Exponential: 2&times; resources &gt; 2&times; cost</td>
            <td>Linear: 2&times; instances = 2&times; cost</td>
          </tr>
          <tr>
            <td>Downtime</td>
            <td>Usually requires restart</td>
            <td>None (add instances while old ones run)</td>
          </tr>
          <tr>
            <td>Fault tolerance</td>
            <td>Single point of failure</td>
            <td>Built-in redundancy</td>
          </tr>
          <tr>
            <td>Requires stateless?</td>
            <td>No</td>
            <td>Yes (requests go to any instance)</td>
          </tr>
          <tr>
            <td>Best for</td>
            <td>Databases (limited options for horizontal), legacy apps</td>
            <td>Stateless APIs, web servers, workers</td>
          </tr>
        </tbody>
      </table>
      <p>
        For stateless services, horizontal scaling is almost always preferred. Vertical scaling
        is used when horizontal is impractical: databases with complex sharding requirements,
        in-memory computation that exceeds single-node RAM, or legacy applications that cannot
        be made stateless.
      </p>

      <h2 id="session-problem">The Session Storage Problem</h2>
      <p>
        Many web frameworks create server-side sessions by default: Express with express-session,
        Django sessions, etc. By default, these sessions are stored in server memory. This works
        on a single server but breaks the moment you have multiple instances.
      </p>
      <p>
        <strong>What happens without sticky sessions:</strong> User logs in on Server A. Session is
        stored in Server A&apos;s memory. User&apos;s next request goes to Server B (round-robin
        load balancing). Server B has no session. User appears logged out. This is confusing and
        produces intermittent auth failures that are hard to reproduce.
      </p>
      <p>
        <strong>Sticky sessions (the bad solution):</strong> Configure the load balancer to route all
        requests from a client to the same server using a cookie. This &quot;solves&quot; the problem
        but creates worse problems: uneven load distribution (one server handles heavy users while
        others sit idle), no true failover (if Server A goes down, all its sessions are lost), and
        makes deployments harder (cannot drain traffic cleanly).
      </p>

      <h2 id="session-solutions">Solutions: Redis, DB, and JWT</h2>
      <p>
        There are three correct approaches to session storage in a multi-instance architecture:
      </p>
      <p><strong>Option 1: Shared session store (Redis)</strong></p>
      <pre><code>{`// Express + Redis session store
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, maxAge: 3600000 }
}));

// Now any server instance can read the session from Redis
// Sessions survive server restarts and instance replacements`}</code></pre>

      <p><strong>Option 2: Database-backed sessions</strong></p>
      <p>
        Store session data in a database table. Similar to Redis but slower (database read on every
        request vs sub-millisecond Redis read). Good when you already have a database and low
        session volume. Not recommended for high-traffic APIs.
      </p>

      <p><strong>Option 3: JWT (JSON Web Tokens) &mdash; stateless auth</strong></p>
      <p>
        Store all necessary auth info in a signed token that the client holds. No server-side
        session state at all. Any server can verify the token by checking the signature with the
        shared secret.
      </p>
      <pre><code>{`// JWT: stateless, no server-side storage needed
import jwt from 'jsonwebtoken';

// Login: create token
const token = jwt.sign(
  { userId: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '1h', algorithm: 'RS256' }
);

// Any server verifies it independently
const payload = jwt.verify(token, process.env.JWT_PUBLIC_KEY);
// payload.userId is trusted — cryptographically verified

// Tradeoff: JWTs cannot be invalidated before expiry
// Solution: short-lived access tokens (15min) + refresh tokens
// Or: token blacklist in Redis (but now you have state again)`}</code></pre>

      <h2 id="lb-algorithms">Load Balancing Algorithms</h2>
      <p>
        When a load balancer receives a request, it uses an algorithm to decide which backend
        instance to send it to:
      </p>
      <table>
        <thead>
          <tr>
            <th>Algorithm</th>
            <th>How it works</th>
            <th>Best for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Round Robin</td>
            <td>Distribute requests equally in sequence</td>
            <td>Homogeneous instances, similar request cost</td>
          </tr>
          <tr>
            <td>Least Connections</td>
            <td>Send to instance with fewest active connections</td>
            <td>Requests with highly variable processing time</td>
          </tr>
          <tr>
            <td>Weighted Round Robin</td>
            <td>Larger instances get proportionally more traffic</td>
            <td>Heterogeneous instance sizes</td>
          </tr>
          <tr>
            <td>IP Hash</td>
            <td>Same client IP always goes to same server</td>
            <td>Stateful apps (avoid &mdash; see above)</td>
          </tr>
          <tr>
            <td>Random</td>
            <td>Pick a random healthy instance</td>
            <td>Simple, works well with many instances</td>
          </tr>
        </tbody>
      </table>
      <p>
        AWS ALB uses round-robin for HTTP and least-outstanding-requests for HTTP/2 and gRPC. You
        cannot configure the algorithm directly but can use weighted target groups.
      </p>

      <h2 id="autoscaling">Auto Scaling: Target Tracking, Step, Scheduled</h2>
      <p>
        Auto scaling automatically adjusts the number of running instances based on demand. AWS ECS,
        EC2, and Lambda all support auto scaling.
      </p>
      <p><strong>Three auto scaling policies:</strong></p>
      <ul>
        <li>
          <strong>Target tracking (recommended):</strong> Maintain a target metric value. E.g.,
          &quot;keep average CPU utilization at 60%.&quot; AWS automatically adds instances when
          above 60% and removes them when below. Simple to configure, works well for most services.
        </li>
        <li>
          <strong>Step scaling:</strong> Define specific scaling actions based on metric thresholds.
          E.g., &quot;when CPU &gt; 70%, add 2 instances. When CPU &gt; 90%, add 5 instances.&quot;
          More control, more configuration.
        </li>
        <li>
          <strong>Scheduled scaling:</strong> Scale at specific times. E.g., &quot;every weekday
          at 8am, set minimum instances to 10. At 8pm, reduce to 3.&quot; Useful when you know
          your traffic patterns (e.g., a B2B SaaS with business hours traffic).
        </li>
      </ul>
      <pre><code>{`# ECS Service Auto Scaling (AWS CLI)
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/my-cluster/my-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 50

# Target tracking: maintain 60% CPU
aws application-autoscaling put-scaling-policy \
  --policy-name cpu-target-tracking \
  --service-namespace ecs \
  --resource-id service/my-cluster/my-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 60.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'`}</code></pre>

      <h2 id="ecs-fargate">AWS ECS Fargate: Stateless Containers</h2>
      <p>
        ECS (Elastic Container Service) with Fargate launch type is the primary way to run
        stateless containerized services in AWS without managing servers. Fargate handles the
        underlying EC2 infrastructure &mdash; you just define what you want to run.
      </p>
      <p><strong>Key ECS concepts:</strong></p>
      <ul>
        <li><strong>Cluster:</strong> A logical grouping of services and tasks.</li>
        <li><strong>Task Definition:</strong> Blueprint for a container: Docker image, CPU/memory, environment variables, ports, IAM role.</li>
        <li><strong>Task:</strong> A running instance of a task definition (one or more containers).</li>
        <li><strong>Service:</strong> Maintains a desired number of tasks, integrates with ALB, handles rolling deploys.</li>
      </ul>
      <pre><code>{`# task-definition.json
{
  "family": "api-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",    // 0.25 vCPU
  "memory": "512", // 512 MB
  "executionRoleArn": "arn:aws:iam::123:role/ecs-task-execution",
  "taskRoleArn": "arn:aws:iam::123:role/ecs-task-role",
  "containerDefinitions": [{
    "name": "api",
    "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/api:latest",
    "portMappings": [{ "containerPort": 3000 }],
    "environment": [
      { "name": "NODE_ENV", "value": "production" }
    ],
    "secrets": [
      { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..." }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/api",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3
    }
  }]
}`}</code></pre>

      <h2 id="lambda-scaling">AWS Lambda: Invocation Model and Scaling</h2>
      <p>
        Lambda is the extreme end of stateless: each invocation is fully isolated, runs for a
        maximum of 15 minutes, and carries no state between invocations. AWS scales Lambda
        automatically &mdash; it can handle thousands of concurrent invocations within seconds.
      </p>
      <p><strong>Lambda scaling model:</strong></p>
      <ul>
        <li>
          <strong>Concurrency:</strong> Each simultaneous invocation uses one concurrency unit.
          Default limit: 1,000 concurrent executions per region (soft limit, can be raised).
        </li>
        <li>
          <strong>Cold start:</strong> First invocation after a period of inactivity requires
          container initialization (~100ms&ndash;1s depending on language and package size). Subsequent
          invocations reuse the warm container (~1ms startup). Cold starts are the main Lambda
          latency concern.
        </li>
        <li>
          <strong>Provisioned concurrency:</strong> Keep N containers warm at all times. Eliminates
          cold starts but costs ~2&times; normal Lambda pricing. Use for latency-sensitive APIs.
        </li>
        <li>
          <strong>Reserved concurrency:</strong> Guarantee N concurrent executions are always
          available for a function (prevents it from being starved), and cap it from consuming
          too many (prevents one function from exhausting the account limit).
        </li>
      </ul>

      <h2 id="refactor-example">Refactoring: Stateful &rarr; Stateless</h2>
      <pre><code>{`// BEFORE: Stateful rate limiter (breaks with horizontal scaling)
const requestCounts = new Map();  // in-process memory

app.use('/api', (req, res, next) => {
  const ip = req.ip;
  const count = requestCounts.get(ip) || 0;
  if (count >= 100) return res.status(429).json({ error: 'Rate limited' });
  requestCounts.set(ip, count + 1);
  setTimeout(() => requestCounts.delete(ip), 60000);
  next();
});
// Problem: each server has its own counter.
// With 10 servers, each client can make 100 * 10 = 1000 requests/minute

// AFTER: Stateless rate limiter using Redis
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

app.use('/api', async (req, res, next) => {
  const key = \`rate:\${req.ip}\`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);  // set TTL on first request
  if (count > 100) return res.status(429).json({ error: 'Rate limited' });
  next();
});
// Now Redis maintains the count across all server instances
// Works correctly regardless of which server handles the request`}</code></pre>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>In-memory caching in a multi-instance service:</strong> Caching data in a
          Node.js <code>Map</code> or Python dict within the application process. Each instance
          has its own cache &mdash; cache invalidation must happen on every instance, and instances
          have inconsistent data. Use Redis for shared caching.
        </li>
        <li>
          <strong>Writing temp files to the local filesystem in a containerized service:</strong>
          Container filesystems are ephemeral. Files written to a container&apos;s local filesystem
          are lost when the container stops. Use S3 or EFS for persistence.
        </li>
        <li>
          <strong>Setting scale-out cooldown too long:</strong> If your service can spike from
          10 to 1000 req/s in seconds (e.g., a news site during a breaking story), a 5-minute
          scale-out cooldown means you are down for 5 minutes. Set scale-out cooldown to 30&ndash;60s.
        </li>
        <li>
          <strong>Not accounting for Lambda cold starts in user-facing latency:</strong> Lambda
          cold starts are invisible during testing (warm container) and invisible in average
          latency (small %) but visible in p99 latency (when containers are cold). If p99 latency
          matters, use ECS or provisioned concurrency.
        </li>
        <li>
          <strong>Setting minimum instances to 0 for a user-facing service:</strong> Every request
          that arrives when all containers are scaled down pays a cold start. For user-facing APIs,
          minimum capacity should be &gt;= 2 (for availability) and sized for baseline load.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What does it mean for a service to be stateless, and why does it matter?</strong></p>
      <p>
        A stateless service stores no information about previous requests in local memory. Each
        request is handled using only the data it contains plus shared external stores (database,
        cache). Statelessness matters because it enables horizontal scaling (any instance can handle
        any request), zero-downtime deployments (instances can be replaced freely), and automatic
        failover (if one instance dies, requests go to others seamlessly).
      </p>

      <p><strong>Q: How do you handle sessions in a horizontally scaled service?</strong></p>
      <p>
        Three options: shared session store (Redis or database), where all instances read/write
        session data from a central store; JWT tokens, where all auth state is encoded in a
        cryptographically signed token that any server can verify without external calls; or
        stateless APIs with short-lived access tokens plus refresh token rotation. JWT is most
        common for APIs. Avoid sticky sessions &mdash; they negate the benefits of horizontal scaling.
      </p>

      <p><strong>Q: What is the difference between horizontal and vertical scaling?</strong></p>
      <p>
        Vertical scaling adds resources to existing instances (more CPU, more RAM). It has a hard
        ceiling (the largest instance type), usually requires downtime, creates a single point of
        failure, and becomes exponentially expensive. Horizontal scaling adds more instances of
        the same size. It has effectively no ceiling, adds no downtime, provides fault tolerance,
        and costs linearly. For stateless services, horizontal scaling is always preferred.
      </p>

      <p><strong>Q: How does AWS ECS Fargate auto-scale?</strong></p>
      <p>
        ECS Fargate integrates with Application Auto Scaling. You register a scalable target (ECS
        service desired count) and attach scaling policies. Target tracking is most common: specify
        a target metric (e.g., CPU at 60% or ALB request count per target) and AWS automatically
        adjusts the number of running tasks to hit that target. Scale-out happens quickly (60s
        cooldown typical); scale-in is more conservative (300s cooldown) to avoid flapping.
      </p>

      <p><strong>Q: When would you choose Lambda over ECS Fargate?</strong></p>
      <p>
        Lambda is better for: event-driven workloads (triggered by S3 uploads, SQS messages,
        scheduled events), low-traffic or sporadic workloads (you pay per invocation, not idle time),
        short-duration tasks (under 15 minutes), and quick iteration without container management.
        ECS Fargate is better for: persistent HTTP APIs (no cold starts), long-running tasks,
        workloads requiring more than 10GB RAM, or services that need predictable latency (no cold
        start variance at p99).
      </p>
    </div>
  );
}
