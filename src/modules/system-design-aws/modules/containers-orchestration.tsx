import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-is-container", title: "What Is a Container?", level: 2 },
  { id: "dockerfile", title: "Docker Image and Dockerfile", level: 2 },
  { id: "container-registry", title: "Container Registry: ECR", level: 2 },
  { id: "docker-networking", title: "Container Networking and Volumes", level: 2 },
  { id: "docker-compose", title: "Docker Compose for Local Dev", level: 2 },
  { id: "ecs-concepts", title: "ECS: Clusters, Task Definitions, Services", level: 2 },
  { id: "fargate-vs-ec2", title: "Fargate vs EC2 Launch Type", level: 2 },
  { id: "eks-kubernetes", title: "EKS and Kubernetes Basics", level: 2 },
  { id: "ecs-vs-kubernetes", title: "When ECS > Kubernetes", level: 2 },
  { id: "lambda-vs-ecs", title: "Lambda vs ECS vs Kubernetes", level: 2 },
  { id: "ecs-deployment", title: "Deploying a Node.js API to ECS Fargate", level: 2 },
  { id: "production-issues", title: "Common Production Issues", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function ContainersOrchestration() {
  return (
    <div className="article-content">
      <p>
        Containers have become the standard unit of deployment for server-side applications. They
        solve the &quot;works on my machine&quot; problem by packaging the application with all
        its dependencies into a reproducible, portable artifact. Understanding containers &mdash;
        from Dockerfile to ECS service &mdash; is essential for any backend or platform role.
      </p>

      <h2 id="what-is-container">What Is a Container?</h2>
      <p>
        <strong>Analogy:</strong> A VM is like renting an entire apartment (operating system,
        hardware emulation, everything). A container is like renting a room in a shared apartment
        &mdash; you have your own space and your own stuff, but you share the building infrastructure
        (kernel, hardware).
      </p>
      <p>
        <strong>Technical definition:</strong> A container is a process (or group of processes)
        with isolated filesystem, network, and process namespaces, running on the host operating
        system&apos;s kernel. It is NOT a virtual machine: there is no hardware emulation, no
        guest operating system. This makes containers much lighter and faster to start than VMs.
      </p>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Container</th>
            <th>Virtual Machine</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Startup time</td>
            <td>Milliseconds to seconds</td>
            <td>Minutes</td>
          </tr>
          <tr>
            <td>Size</td>
            <td>Megabytes</td>
            <td>Gigabytes</td>
          </tr>
          <tr>
            <td>Isolation</td>
            <td>Process isolation (shares kernel)</td>
            <td>Full OS isolation</td>
          </tr>
          <tr>
            <td>Portability</td>
            <td>Runs anywhere Docker runs</td>
            <td>Depends on hypervisor</td>
          </tr>
          <tr>
            <td>Overhead</td>
            <td>Minimal (near-native performance)</td>
            <td>Significant (hardware emulation)</td>
          </tr>
        </tbody>
      </table>

      <h2 id="dockerfile">Docker Image and Dockerfile</h2>
      <p>
        A Docker image is a read-only blueprint for a container. It is built from a Dockerfile &mdash;
        a series of instructions that layer filesystem changes on top of a base image.
      </p>
      <pre><code>{`# Production Dockerfile for a Node.js API
# Multi-stage build: keep production image small

# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production  # install exact dependencies
COPY . .
RUN npm run build              # compile TypeScript

# Stage 2: production image (no dev dependencies, no source)
FROM node:20-alpine AS production
WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001
USER nodeapp

COPY --from=builder --chown=nodeapp:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeapp:nodejs /app/package.json ./

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]

# Build and run
# docker build -t api:latest .
# docker run -p 3000:3000 -e NODE_ENV=production api:latest`}</code></pre>

      <p>
        <strong>Image layers:</strong> Each instruction in a Dockerfile creates a layer. Layers
        are cached: if nothing above a layer changes, Docker reuses the cached layer. Put frequently
        changing instructions (COPY source code) after infrequently changing ones (install
        dependencies) to maximize cache efficiency.
      </p>

      <h2 id="container-registry">Container Registry: ECR</h2>
      <p>
        ECR (Elastic Container Registry) is AWS&apos;s managed Docker registry. It integrates with
        IAM (no separate credentials needed for ECS pulling images), supports automatic image
        scanning for vulnerabilities, and handles lifecycle policies to clean up old images.
      </p>
      <pre><code>{`# Create ECR repository
aws ecr create-repository --repository-name api --region us-east-1

# Build and push
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
IMAGE_URI=$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/api:$GIT_SHA

# Authenticate Docker to ECR
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

docker build -t $IMAGE_URI .
docker push $IMAGE_URI

# ECR lifecycle policy: keep last 10 images, delete untagged images older than 1 day
aws ecr put-lifecycle-policy \
  --repository-name api \
  --lifecycle-policy-text '{
    "rules": [{
      "rulePriority": 1,
      "selection": { "tagStatus": "untagged", "countType": "sinceImagePushed",
                     "countUnit": "days", "countNumber": 1 },
      "action": { "type": "expire" }
    }, {
      "rulePriority": 2,
      "selection": { "tagStatus": "tagged", "tagPrefixList": ["sha"],
                     "countType": "imageCountMoreThan", "countNumber": 10 },
      "action": { "type": "expire" }
    }]
  }'`}</code></pre>

      <h2 id="docker-networking">Container Networking and Volumes</h2>
      <p>
        <strong>Networking modes:</strong>
      </p>
      <ul>
        <li><strong>bridge:</strong> Default for Docker. Containers get a private IP; port mapping forwards host port to container port.</li>
        <li><strong>host:</strong> Container shares host network. Faster but no isolation. Not available on Fargate.</li>
        <li><strong>overlay:</strong> Multi-host networking for Docker Swarm. Not relevant for ECS Fargate.</li>
        <li><strong>awsvpc:</strong> Each ECS task gets its own ENI (Elastic Network Interface) and private IP. Required for Fargate. This is how ECS tasks talk to each other and to other AWS services within the VPC.</li>
      </ul>
      <p>
        <strong>Volumes:</strong> Container filesystems are ephemeral. Data written to a container&apos;s
        filesystem is lost when the container stops. For persistent data:
      </p>
      <ul>
        <li>Use S3 for object storage</li>
        <li>Use EFS (NFS) for shared filesystem (ECS supports EFS volume mounts)</li>
        <li>Do not use container local storage for anything that needs to survive container restart</li>
      </ul>

      <h2 id="docker-compose">Docker Compose for Local Dev</h2>
      <pre><code>{`# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/cvapp
      - REDIS_URL=redis://cache:6379
    volumes:
      - ./src:/app/src  # hot reload in dev
    depends_on:
      - db
      - cache
    command: npm run dev  # override CMD from Dockerfile in dev

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: cvapp
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data  # persist across restarts

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  localstack:
    image: localstack/localstack
    ports:
      - "4566:4566"
    environment:
      - SERVICES=s3,sqs,dynamodb  # local AWS service emulation

volumes:
  postgres_data:

# Commands
# docker compose up -d       # start all services detached
# docker compose logs -f api # follow api logs
# docker compose down        # stop and remove containers
# docker compose down -v     # also remove volumes`}</code></pre>

      <h2 id="ecs-concepts">ECS: Clusters, Task Definitions, Services</h2>
      <pre><code>{`// ECS hierarchy:
// Cluster → Services → Tasks → Containers

// Task Definition: blueprint for what to run
{
  "family": "api-task",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",    // required for Fargate
  "cpu": "512",               // 0.5 vCPU (256, 512, 1024, 2048, 4096)
  "memory": "1024",           // MB (must be valid combination with CPU)
  "executionRoleArn": "arn:aws:iam::123:role/ecs-execution-role",
  // ^^ ECS agent uses this to pull ECR images, write CloudWatch logs
  "taskRoleArn": "arn:aws:iam::123:role/ecs-task-role",
  // ^^ Your app uses this to call S3, DynamoDB, SQS, etc.
  "containerDefinitions": [{
    "name": "api",
    "image": "123.dkr.ecr.us-east-1.amazonaws.com/api:abc123",
    "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
    "environment": [
      { "name": "NODE_ENV", "value": "production" },
      { "name": "PORT", "value": "3000" }
    ],
    "secrets": [
      // fetched from Secrets Manager at task start
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
      "command": ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 30  // grace period for startup
    },
    "essential": true  // if this container stops, stop the task
  }]
}

// Service: maintains desired count, integrates with ALB
// Handles rolling deployments, auto-scaling, health checks`}</code></pre>

      <h2 id="fargate-vs-ec2">Fargate vs EC2 Launch Type</h2>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Fargate</th>
            <th>EC2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Server management</td>
            <td>None (AWS manages all)</td>
            <td>You manage EC2 instances (patching, scaling the instances)</td>
          </tr>
          <tr>
            <td>Pricing</td>
            <td>Per vCPU/memory per second</td>
            <td>EC2 instance cost (can use reserved or spot)</td>
          </tr>
          <tr>
            <td>Startup time</td>
            <td>30&ndash;90 seconds (cold)</td>
            <td>10&ndash;30 seconds (instance already running)</td>
          </tr>
          <tr>
            <td>Cost at scale</td>
            <td>Higher per unit</td>
            <td>Lower at sustained high usage (reserved instances)</td>
          </tr>
          <tr>
            <td>Operational overhead</td>
            <td>Minimal</td>
            <td>Higher (AMI updates, cluster capacity management)</td>
          </tr>
          <tr>
            <td>Best for</td>
            <td>Most production workloads, variable traffic, startups</td>
            <td>Very high sustained throughput, GPU workloads, cost optimization at scale</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Use Fargate by default.</strong> Switch to EC2 launch type only if cost optimization
        at sustained scale is a priority and you have the operational capacity to manage EC2 instances.
      </p>

      <h2 id="eks-kubernetes">EKS and Kubernetes Basics</h2>
      <p>
        Kubernetes is the open-source container orchestration system. EKS (Elastic Kubernetes Service)
        is AWS&apos;s managed Kubernetes. Key concepts:
      </p>
      <ul>
        <li><strong>Pod:</strong> Smallest deployable unit. One or more containers sharing network and storage.</li>
        <li><strong>Deployment:</strong> Manages N replicas of a Pod. Handles rolling updates and rollbacks.</li>
        <li><strong>Service:</strong> Stable DNS name and load balancing for a set of Pods.</li>
        <li><strong>Ingress:</strong> HTTP/HTTPS routing rules to Services. (Like ALB path-based routing.)</li>
        <li><strong>ConfigMap/Secret:</strong> Inject configuration and secrets into Pods.</li>
        <li><strong>HPA (Horizontal Pod Autoscaler):</strong> Automatically scale Pod count based on CPU/memory or custom metrics.</li>
        <li><strong>Namespace:</strong> Logical isolation within a cluster (like environments or teams).</li>
      </ul>

      <h2 id="ecs-vs-kubernetes">When ECS &gt; Kubernetes</h2>
      <p>
        Kubernetes adds significant operational complexity. ECS is often the right choice for AWS-native
        workloads, especially for teams without a dedicated platform team:
      </p>
      <ul>
        <li>ECS is AWS-native: integrates seamlessly with IAM, ALB, CloudWatch, ECR, Secrets Manager.</li>
        <li>ECS Fargate requires zero cluster management. Kubernetes requires managing nodes (even with EKS managed nodes).</li>
        <li>ECS is significantly simpler to learn and operate.</li>
        <li>For most teams of 1&ndash;50 engineers, ECS provides more than enough capability.</li>
      </ul>
      <p>
        <strong>When Kubernetes wins:</strong> Large organization with dedicated platform team,
        multi-cloud strategy, need for advanced networking features (service mesh, fine-grained traffic
        management), or standardization across many teams.
      </p>

      <h2 id="lambda-vs-ecs">Lambda vs ECS vs Kubernetes</h2>
      <table>
        <thead>
          <tr>
            <th>Dimension</th>
            <th>Lambda</th>
            <th>ECS Fargate</th>
            <th>Kubernetes (EKS)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ops overhead</td>
            <td>None (fully managed)</td>
            <td>Low (managed control plane)</td>
            <td>High (node management, upgrades)</td>
          </tr>
          <tr>
            <td>Startup latency</td>
            <td>Cold start: 100ms&ndash;1s</td>
            <td>30&ndash;90s (new task)</td>
            <td>10&ndash;30s (pod scheduling)</td>
          </tr>
          <tr>
            <td>Max duration</td>
            <td>15 minutes</td>
            <td>Unlimited</td>
            <td>Unlimited</td>
          </tr>
          <tr>
            <td>Cost model</td>
            <td>Per request + duration</td>
            <td>Per vCPU/memory/second</td>
            <td>EC2 instances + EKS cluster fee</td>
          </tr>
          <tr>
            <td>Best for</td>
            <td>Event-driven, sporadic, short-duration</td>
            <td>HTTP APIs, microservices, steady traffic</td>
            <td>Large org, multi-cloud, custom networking</td>
          </tr>
        </tbody>
      </table>

      <h2 id="ecs-deployment">Deploying a Node.js API to ECS Fargate</h2>
      <pre><code>{`# End-to-end deployment steps (once infra is set up)

# 1. Build and push image
IMAGE_TAG=$(git rev-parse --short HEAD)
docker build -t $ECR_URI:$IMAGE_TAG .
docker push $ECR_URI:$IMAGE_TAG

# 2. Register new task definition revision
TASK_DEF=$(aws ecs describe-task-definition --task-definition api-task)
NEW_TASK_DEF=$(echo $TASK_DEF | \
  jq --arg IMAGE "$ECR_URI:$IMAGE_TAG" \
  '.taskDefinition | .containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)')
aws ecs register-task-definition --cli-input-json "$NEW_TASK_DEF"

# 3. Update service to use new task definition
aws ecs update-service \
  --cluster production \
  --service api-service \
  --task-definition api-task \  # uses latest revision
  --force-new-deployment

# 4. Wait for stability
aws ecs wait services-stable \
  --cluster production \
  --services api-service

echo "Deployment complete"`}</code></pre>

      <h2 id="production-issues">Common Production Issues</h2>
      <ul>
        <li>
          <strong>OOM (Out of Memory) kills:</strong> Task memory exceeds configured limit; ECS kills
          and restarts the task. Symptoms: tasks frequently stopping with exit code 137. Fix: increase
          task memory, fix memory leak, reduce batch size.
        </li>
        <li>
          <strong>Slow health checks causing deployment failures:</strong> Health check passes after
          30 seconds but ECS stops the task after 20 seconds. Fix: set appropriate <code>startPeriod</code>
          in health check configuration (grace period for app to start).
        </li>
        <li>
          <strong>Task startup failures due to secret fetching:</strong> Task fails to start because
          it cannot fetch from Secrets Manager (IAM permissions). Check the execution role has
          <code>secretsmanager:GetSecretValue</code> permission.
        </li>
        <li>
          <strong>ECR pull failures:</strong> Tasks cannot pull images because the execution role
          lacks <code>ecr:GetAuthorizationToken</code> and <code>ecr:BatchGetImage</code> permissions.
          Use the <code>AmazonECSTaskExecutionRolePolicy</code> managed policy.
        </li>
        <li>
          <strong>Container connecting to wrong service URL:</strong> Using <code>localhost</code>
          to reach another container that is not in the same task. In ECS with <code>awsvpc</code>
          networking, each task has its own IP. Use service discovery or the other service&apos;s
          ALB DNS name.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What is the difference between a container and a virtual machine?</strong></p>
      <p>
        A VM virtualizes hardware, running a complete guest operating system. A container is a
        process with isolated namespaces (filesystem, network, PID) running directly on the host
        OS kernel. Containers are much lighter (MB vs GB), start in milliseconds vs minutes, and
        have near-native performance. The tradeoff is weaker isolation: containers share the host
        kernel. VMs provide stronger isolation but at significantly higher overhead.
      </p>

      <p><strong>Q: What is ECS Fargate and how does it differ from EC2 launch type?</strong></p>
      <p>
        Fargate is a serverless compute engine for containers. You define CPU and memory, and AWS
        provisions the underlying compute. You never manage servers. With EC2 launch type, you manage
        EC2 instances in the ECS cluster (patching, capacity planning, scaling the instances). Fargate
        is simpler and recommended for most workloads. EC2 is chosen for cost optimization at sustained
        scale (using reserved or spot instances) or when you need GPU instances for ML workloads.
      </p>

      <p><strong>Q: When would you choose Lambda over ECS?</strong></p>
      <p>
        Lambda is better for: event-driven workloads triggered by S3, SQS, EventBridge, or scheduled
        events; workloads that run for under 15 minutes; sporadic traffic where idle time is wasted
        cost; simple functions without complex dependencies. ECS is better for: HTTP APIs requiring
        consistent low latency (no cold starts), long-running processes, workloads needing more than
        10GB RAM, services that need persistent state between requests (connection pools), and workloads
        with sustained high traffic where per-second pricing is more expensive than task pricing.
      </p>

      <p><strong>Q: How do containers in ECS communicate with each other?</strong></p>
      <p>
        With <code>awsvpc</code> networking (required for Fargate), each task gets its own ENI and
        private IP. Two tasks communicate via their private IPs or via a load balancer. For service
        discovery, ECS integrates with AWS Cloud Map, allowing services to discover each other by
        DNS name. The typical pattern: Service A calls Service B&apos;s internal ALB DNS name.
        Internal ALBs are in private subnets and not accessible from the internet.
      </p>
    </div>
  );
}
