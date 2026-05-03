import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { InterviewPlaybook, ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const iacPipelineDiagram = String.raw`flowchart LR
    GH["GitHub Pull Request"]
    PLAN["terraform plan\nor cdk diff"]
    REVIEW["Team Review\n+ Cost Estimate"]
    MERGE["Merge to main"]
    APPLY["terraform apply\nor cdk deploy"]
    AWS["AWS Infrastructure\nProvisioned"]
    STATE["Remote State\nS3 + DynamoDB Lock"]

    GH --> PLAN --> REVIEW --> MERGE --> APPLY --> AWS
    APPLY <--> STATE
    PLAN <--> STATE`;

const iacStackDiagram = String.raw`flowchart TD
    CODE["IaC Code in Git\nTerraform / CDK / CloudFormation"]

    subgraph ENVS["Environments"]
        DEV["dev\nworkspace or stack"]
        STG["staging\nworkspace or stack"]
        PROD["prod\nworkspace or stack"]
    end

    subgraph AWS_PROD["AWS Production Account"]
        VPC["VPC + Subnets"]
        ALB["Application Load Balancer"]
        ECS["ECS Fargate Service"]
        DDB["DynamoDB Table"]
        S3["S3 Bucket"]
        SM["Secrets Manager"]
    end

    CODE --> DEV & STG & PROD
    PROD --> VPC & ALB & ECS & DDB & S3 & SM`;

export const toc: TocItem[] = [
  { id: "why-iac", title: "Why Infrastructure as Code", level: 2 },
  { id: "terraform", title: "Terraform", level: 2 },
  { id: "aws-cdk", title: "AWS CDK", level: 2 },
  { id: "cloudformation", title: "CloudFormation", level: 2 },
  { id: "pulumi", title: "Pulumi", level: 2 },
  { id: "comparison", title: "Tool Comparison", level: 2 },
  { id: "state-and-drift", title: "State Files and Drift", level: 2 },
  { id: "plan-apply", title: "The Plan/Apply Workflow", level: 2 },
  { id: "modules-environments", title: "Modules and Environments", level: 2 },
  { id: "secrets-in-iac", title: "Secrets in IaC", level: 2 },
  { id: "cicd-for-infra", title: "CI/CD for Infrastructure", level: 2 },
  { id: "example", title: "Example: Full Stack in Terraform", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function InfrastructureAsCode() {
  return (
    <div className="article-content">
      <p>
        Infrastructure as Code (IaC) is the practice of managing and provisioning cloud infrastructure
        through machine-readable configuration files rather than through a cloud console or manual
        processes. It is the difference between building a production environment by clicking through
        the AWS Console &mdash; something that is unrepeatable, undocumented, and impossible to review
        &mdash; and writing a 50-line Terraform file that anyone on the team can read, version in Git,
        test in CI, and apply in seconds to create an identical environment.
      </p>
      <p>
        At scale, IaC is not optional. Without it, you have &quot;snowflake servers&quot; &mdash;
        environments that are unique, fragile, and undocumented. When they break, no one knows
        exactly what they had. With IaC, your infrastructure is reproducible, auditable, and testable.
      </p>

      <h2 id="why-iac">Why Infrastructure as Code</h2>
      <p>
        <strong>Analogy:</strong> Imagine building a restaurant by memory every time you open a new
        location. Each one ends up slightly different &mdash; different kitchen layout, different
        equipment, different electrical. IaC is the architectural blueprint: every location built
        from the same plans, identical and predictable.
      </p>
      <ul>
        <li>
          <strong>Repeatability:</strong> Run the same config in dev, staging, and prod and get
          identical infrastructure. No more &quot;it works in staging but not prod&quot; because of
          a missed config.
        </li>
        <li>
          <strong>Auditability:</strong> Every infrastructure change is a Git commit with an author,
          timestamp, and message. You can see exactly when a security group rule was changed and by whom.
        </li>
        <li>
          <strong>Disaster recovery:</strong> If your AWS account is compromised or accidentally deleted,
          you can recreate the entire infrastructure from code in minutes, not days.
        </li>
        <li>
          <strong>Cost visibility:</strong> Terraform and CDK can estimate cost before applying.
          You see the price of every resource before it is created.
        </li>
        <li>
          <strong>Code review:</strong> Infrastructure changes go through pull requests like any
          other code &mdash; colleagues can catch mistakes before they reach production.
        </li>
      </ul>

      <h2 id="terraform">Terraform</h2>
      <p>
        Terraform is the most widely used IaC tool. It uses a declarative language called HCL
        (HashiCorp Configuration Language) and works with any cloud provider through a plugin system
        called &quot;providers.&quot; You describe what you want, not how to build it.
      </p>
      <pre><code>{`# main.tf — a simple Terraform configuration

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"  # prevents concurrent apply
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  description = "dev, staging, or prod"
  type        = string
}

# A DynamoDB table
resource "aws_dynamodb_table" "notes" {
  name           = "notes-\${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Output the table name for use in other configurations
output "dynamodb_table_name" {
  value = aws_dynamodb_table.notes.name
}

# Terraform workflow:
# terraform init    — download providers, configure backend
# terraform plan    — show what would change (safe, read-only)
# terraform apply   — make the changes
# terraform destroy — tear down everything (careful!)`}</code></pre>
      <p>
        Key Terraform concepts:
      </p>
      <ul>
        <li><strong>Providers:</strong> Plugins that know how to talk to cloud APIs (AWS, GCP, Azure, Datadog, GitHub, etc.)</li>
        <li><strong>Resources:</strong> The actual infrastructure objects you manage (EC2 instance, S3 bucket, RDS cluster)</li>
        <li><strong>Variables:</strong> Parameterize your config so the same code works for dev and prod</li>
        <li><strong>Outputs:</strong> Export values from one Terraform config to be used by another</li>
        <li><strong>Modules:</strong> Reusable packages of Terraform resources (like functions for infrastructure)</li>
        <li><strong>State:</strong> The record of what Terraform has created (critical &mdash; explained below)</li>
      </ul>

      <h2 id="aws-cdk">AWS CDK</h2>
      <p>
        The AWS Cloud Development Kit (CDK) lets you define AWS infrastructure using real programming
        languages &mdash; TypeScript, Python, Java, Go, C#. Under the hood, CDK synthesizes your code
        into CloudFormation templates. If you are a TypeScript engineer, CDK feels natural &mdash; you
        get type safety, IDE autocomplete, loops, conditionals, and reuse through classes.
      </p>
      <pre><code>{`// CDK example in TypeScript
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';

export class AppStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext('environment') || 'dev';

    // DynamoDB table
    const table = new dynamodb.Table(this, 'NotesTable', {
      tableName: \`notes-\${environment}\`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN   // never delete prod data
        : cdk.RemovalPolicy.DESTROY, // clean up dev/staging easily
    });

    // S3 bucket for file uploads
    const uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: \`uploads-\${environment}-\${this.account}\`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // ECS Fargate service with load balancer (CDK handles ALB creation automatically)
    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this, 'ApiService', {
        taskImageOptions: {
          image: ecs.ContainerImage.fromEcrRepository(ecrRepo),
          containerPort: 3000,
          environment: {
            TABLE_NAME: table.tableName,
            BUCKET_NAME: uploadsBucket.bucketName,
          },
        },
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 2,
        publicLoadBalancer: true,
      }
    );

    // Grant the ECS task permission to access DynamoDB and S3
    table.grantReadWriteData(fargateService.taskDefinition.taskRole);
    uploadsBucket.grantReadWrite(fargateService.taskDefinition.taskRole);
  }
}

// CDK commands:
// cdk synth   — synthesize CloudFormation template (safe, shows what it generates)
// cdk diff    — show what would change vs current deployed stack
// cdk deploy  — deploy the stack
// cdk destroy — tear down the stack`}</code></pre>
      <p>
        CDK excels when your infrastructure has complex logic: looping over environments, conditionally
        including resources, or reusing patterns across many services through constructs (CDK&apos;s
        module system).
      </p>

      <h2 id="cloudformation">CloudFormation</h2>
      <p>
        CloudFormation is AWS&apos;s native IaC service. You write YAML or JSON templates and AWS
        directly manages the deployment. CDK generates CloudFormation under the hood, and Terraform
        bypasses it entirely in favor of direct API calls. CloudFormation has deep AWS integration
        &mdash; rollbacks, drift detection, change sets &mdash; but its YAML verbosity and limited
        logic make it painful to write directly at scale.
      </p>
      <pre><code>{`# CloudFormation template (YAML)
AWSTemplateFormatVersion: '2010-09-09'
Description: Notes application infrastructure

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]

Resources:
  NotesTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "notes-\${Environment}"
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      # Change set: CloudFormation shows what changes before applying
      # Stack rollback: if deployment fails, CloudFormation reverts

Outputs:
  TableName:
    Value: !Ref NotesTable
    Export:
      Name: !Sub "\${Environment}-NotesTable"`}</code></pre>

      <h2 id="pulumi">Pulumi</h2>
      <p>
        Pulumi takes the CDK idea further &mdash; real programming languages (TypeScript, Python, Go,
        Java, .NET) with full language features, but it manages state itself (like Terraform) rather
        than going through CloudFormation. It works with any cloud provider. The main advantage over
        CDK is multi-cloud support; the main disadvantage is a smaller ecosystem and community than Terraform.
      </p>

      <h2 id="comparison">Tool Comparison</h2>
      <ArticleTable caption="IaC Tool Comparison — choose based on team preferences and cloud strategy" minWidth={800}>
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Terraform</th>
              <th>AWS CDK</th>
              <th>CloudFormation</th>
              <th>Pulumi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Language</strong></td>
              <td>HCL (declarative DSL)</td>
              <td>TypeScript, Python, Java, Go, C#</td>
              <td>YAML / JSON</td>
              <td>TypeScript, Python, Go, Java, .NET</td>
            </tr>
            <tr>
              <td><strong>Cloud support</strong></td>
              <td>Any cloud (multi-cloud)</td>
              <td>AWS only</td>
              <td>AWS only</td>
              <td>Any cloud (multi-cloud)</td>
            </tr>
            <tr>
              <td><strong>State management</strong></td>
              <td>Remote state (S3 + DynamoDB)</td>
              <td>CloudFormation manages state</td>
              <td>AWS manages state natively</td>
              <td>Pulumi Cloud or self-hosted</td>
            </tr>
            <tr>
              <td><strong>Learning curve</strong></td>
              <td>Medium — learn HCL</td>
              <td>Low for TypeScript devs</td>
              <td>High — verbose YAML</td>
              <td>Low for existing language users</td>
            </tr>
            <tr>
              <td><strong>Ecosystem / community</strong></td>
              <td>Largest — most modules and examples</td>
              <td>Good — AWS-backed, growing</td>
              <td>Mature — all AWS docs use it</td>
              <td>Smaller but growing</td>
            </tr>
            <tr>
              <td><strong>Logic/loops/conditions</strong></td>
              <td>Limited (count, for_each, ternary)</td>
              <td>Full language — any logic</td>
              <td>Very limited</td>
              <td>Full language — any logic</td>
            </tr>
            <tr>
              <td><strong>Best for</strong></td>
              <td>Multi-cloud or standard AWS patterns</td>
              <td>AWS-only teams comfortable with TypeScript</td>
              <td>Teams staying close to AWS native tooling</td>
              <td>Multi-cloud with programming language preference</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Industry reality:</strong> Terraform dominates the market for infrastructure teams.
        CDK is popular for product teams that are AWS-only and prefer TypeScript. CloudFormation is
        what CDK compiles to &mdash; most engineers do not write it directly. Pulumi is growing but
        still a minority choice.
      </p>

      <h2 id="state-and-drift">State Files and Drift</h2>
      <p>
        <strong>Analogy:</strong> Think of the state file as Terraform&apos;s memory. Without it,
        Terraform has no idea what it previously created. It would try to create everything from scratch
        on every run, duplicating resources and causing chaos.
      </p>
      <p>
        The <strong>state file</strong> maps your Terraform resources to real AWS resources. It records:
        what resources exist, their IDs, and their current attribute values. It is the source of truth
        for what Terraform thinks is deployed.
      </p>
      <p>
        <strong>Always use remote state in teams:</strong>
      </p>
      <pre><code>{`# Remote state backend — store state in S3 with locking via DynamoDB
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"  # versioned, private bucket
    key            = "prod/api/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"        # prevents two applies at once
    encrypt        = true
  }
}

# WHY:
# - Without remote state, two engineers running 'terraform apply' simultaneously
#   can corrupt state and create duplicate resources
# - S3 versioning lets you recover if state gets corrupted
# - DynamoDB locking ensures only one person applies at a time`}</code></pre>
      <p>
        <strong>Drift</strong> happens when the actual infrastructure diverges from the state file.
        Common cause: someone clicks around in the AWS Console and changes something that Terraform
        manages. The next <code>terraform plan</code> will detect the drift and offer to reconcile it.
        Fix: either import the manual change into Terraform or let Terraform revert it.
      </p>
      <pre><code>{`# Import an existing resource into Terraform state
# (for resources created manually that you now want IaC to manage)
terraform import aws_dynamodb_table.notes notes-prod

# Check for drift without making changes
terraform plan   # shows what Terraform would do to make real state match config

# Refresh state to match actual cloud state (does NOT apply changes)
terraform refresh`}</code></pre>

      <h2 id="plan-apply">The Plan/Apply Workflow</h2>
      <p>
        The core IaC safety mechanism: never apply changes without reviewing a plan first.
      </p>
      <MermaidDiagram
        chart={iacPipelineDiagram}
        title="IaC CI/CD Pipeline"
        caption="terraform plan runs in PR (safe, read-only). terraform apply runs only after merge to main."
        minHeight={220}
      />
      <pre><code>{`# Safe workflow:

# 1. Make infrastructure changes in code
# 2. terraform init (if new providers/modules)
# 3. terraform plan -out=tfplan   — saves the plan to a file
#    Output shows:
#    + resource to add
#    ~ resource to modify
#    - resource to destroy  ← RED FLAG, review carefully
# 4. Review the plan — look for unexpected destroys
# 5. terraform apply tfplan   — executes exactly the saved plan
# 6. Verify in AWS Console or with terraform state list

# NEVER do:
# terraform apply -auto-approve  # skips review, dangerous in production`}</code></pre>

      <h2 id="modules-environments">Modules and Environments</h2>
      <p>
        <strong>Modules</strong> are reusable packages of Terraform resources. Think of them as
        functions for infrastructure. A well-designed VPC module can be used for dev, staging, and
        production with different parameters.
      </p>
      <pre><code>{`# modules/vpc/main.tf — a reusable VPC module
variable "environment" { type = string }
variable "cidr_block" { default = "10.0.0.0/16" }

resource "aws_vpc" "main" {
  cidr_block = var.cidr_block
  tags = { Name = "\${var.environment}-vpc" }
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
}

output "vpc_id" { value = aws_vpc.main.id }
output "public_subnet_ids" { value = aws_subnet.public[*].id }

# ---

# environments/prod/main.tf — using the module
module "vpc" {
  source      = "../../modules/vpc"
  environment = "prod"
  cidr_block  = "10.0.0.0/16"
}

module "vpc_dev" {
  source      = "../../modules/vpc"
  environment = "dev"
  cidr_block  = "10.1.0.0/16"
}

# Terraform workspaces (alternative to separate directories)
# terraform workspace new staging
# terraform workspace select prod
# Reference current workspace: terraform.workspace`}</code></pre>
      <MermaidDiagram
        chart={iacStackDiagram}
        title="Environments from a Single IaC Codebase"
        caption="Same Terraform code parameterized by environment variable. Each creates an isolated AWS stack."
        minHeight={420}
      />

      <h2 id="secrets-in-iac">Secrets in IaC</h2>
      <p>
        <strong>Never hardcode secrets in IaC code.</strong> IaC files live in Git. A database
        password committed to a Terraform file is visible to everyone with repo access &mdash; forever,
        even after deletion, because Git history is permanent.
      </p>
      <pre><code>{`# BAD — never do this
resource "aws_db_instance" "main" {
  password = "mypassword123"  # visible in Git, Terraform state, and CI logs
}

# GOOD approach 1: Read from AWS Secrets Manager in Terraform
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/rds/master-password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}

# GOOD approach 2: Generate a random password and store in Secrets Manager
resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

resource "aws_db_instance" "main" {
  password = random_password.db_password.result
}

# Note: Terraform state still contains the password value.
# This is why state files must be encrypted and access-controlled.`}</code></pre>

      <h2 id="cicd-for-infra">CI/CD for Infrastructure</h2>
      <p>
        Infrastructure changes should follow the same review process as code changes. Never let an
        engineer run <code>terraform apply</code> directly from their laptop in production.
      </p>
      <pre><code>{`# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:
    branches: [main]
    paths: ['infrastructure/**']
  push:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  plan:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    permissions:
      id-token: write   # for OIDC — no long-lived credentials
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::ACCOUNT:role/GitHubActionsRole
          aws-region: us-east-1

      - name: Terraform Plan
        run: |
          cd infrastructure
          terraform init
          terraform plan -out=tfplan

      - name: Comment plan on PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              body: 'Terraform plan output (see workflow logs)'
            })

  apply:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production   # requires manual approval in GitHub
    steps:
      - run: terraform apply -auto-approve tfplan`}</code></pre>

      <h2 id="example">Example: Full Stack in Terraform</h2>
      <pre><code>{`# A complete example: VPC + ALB + ECS + DynamoDB + S3

# --- NETWORKING ---
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}

# --- LOAD BALANCER ---
resource "aws_lb" "main" {
  name               = "api-alb-\${var.environment}"
  internal           = false
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.alb.id]
}

# --- ECS ---
resource "aws_ecs_cluster" "main" {
  name = "api-cluster-\${var.environment}"
}

resource "aws_ecs_task_definition" "api" {
  family                   = "api-\${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name  = "api"
    image = "\${aws_ecr_repository.api.repository_url}:latest"
    portMappings = [{ containerPort = 3000 }]
    environment = [
      { name = "TABLE_NAME", value = aws_dynamodb_table.main.name },
      { name = "BUCKET_NAME", value = aws_s3_bucket.uploads.bucket }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"  = aws_cloudwatch_log_group.api.name
        "awslogs-region" = var.aws_region
      }
    }
  }])
}

# --- DYNAMODB ---
resource "aws_dynamodb_table" "main" {
  name         = "app-\${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute { name = "PK"; type = "S" }
  attribute { name = "SK"; type = "S" }

  point_in_time_recovery { enabled = true }
}

# --- S3 ---
resource "aws_s3_bucket" "uploads" {
  bucket = "uploads-\${var.environment}-\${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`}</code></pre>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Local state files in teams.</strong> If you store <code>terraform.tfstate</code> locally,
          two engineers will diverge and create duplicate or conflicting resources. Always use remote
          state with locking from day one.
        </li>
        <li>
          <strong>Applying without reviewing the plan.</strong> A misconfigured variable or a subtle
          module change can cause Terraform to destroy and recreate a production database. Always read
          the plan. Any unexpected <code>-</code> (destroy) is a red flag.
        </li>
        <li>
          <strong>Secrets in code or state.</strong> State files contain all resource attribute values
          in plaintext. Encrypt state at rest (S3 server-side encryption), restrict who can read state,
          and never commit secrets to the code itself.
        </li>
        <li>
          <strong>No locking on state.</strong> Without DynamoDB-backed locking, two simultaneous
          <code>terraform apply</code> runs will corrupt the state file. Always configure
          <code>dynamodb_table</code> in the S3 backend.
        </li>
        <li>
          <strong>One giant Terraform file for everything.</strong> Split infrastructure into
          logical stacks: networking (VPC, subnets) in one stack, application infrastructure (ECS,
          DynamoDB) in another. This reduces blast radius and apply time.
        </li>
        <li>
          <strong>Ignoring drift.</strong> If engineers make manual changes in the console, the
          state diverges. Run <code>terraform plan</code> regularly in CI to detect drift before
          it causes a surprise during an emergency apply.
        </li>
      </ul>

      <InterviewPlaybook
        title="Interview Approach: Infrastructure as Code"
        intro="Most engineers know what IaC is. What separates senior candidates is understanding why the workflows matter and what goes wrong without them."
        steps={[
          "Define IaC as treating infrastructure configuration as version-controlled code: repeatable, reviewable, and auditable — not just 'using Terraform'.",
          "Explain the plan/apply workflow and why it matters: you review what changes before committing them, which catches mistakes before they hit production.",
          "Describe remote state and locking: explain why local state files are dangerous in teams and how S3 + DynamoDB solve this.",
          "Address drift: explain what it is, how it happens, and why running terraform plan in CI regularly is the mitigation.",
          "Compare tools with nuance: Terraform for multi-cloud or standard patterns, CDK for TypeScript teams that are AWS-only, CloudFormation for deep AWS native integration.",
          "Mention secrets handling: state contains sensitive values, always encrypt state at rest and use Secrets Manager references instead of hardcoded values.",
        ]}
      />

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What is Infrastructure as Code and why does it matter?</strong></p>
      <p>
        IaC is the practice of defining infrastructure in machine-readable configuration files that
        are version-controlled, reviewable, and executable. It matters because it replaces
        undocumented, unrepeatable manual processes with auditable, reproducible automation. If your
        production database config is in a Terraform file, anyone on the team can understand it, every
        change is tracked in Git, and you can recreate the environment from scratch in minutes.
      </p>

      <p><strong>Q: What is a Terraform state file and why is it dangerous?</strong></p>
      <p>
        The state file is Terraform&apos;s record of what it has provisioned. It maps your code
        resources to real cloud resources by their IDs and current attribute values. It is dangerous
        because it contains sensitive values (database passwords, secret ARNs), and if two engineers
        have separate state files for the same infrastructure, they will create duplicate or conflicting
        resources. Always use remote state with encryption and locking.
      </p>

      <p><strong>Q: What is infrastructure drift and how do you handle it?</strong></p>
      <p>
        Drift is when the actual cloud infrastructure no longer matches the IaC configuration &mdash;
        typically caused by someone making manual changes in the console. You handle it by running
        <code>terraform plan</code> regularly in CI to detect drift early, and by enforcing that all
        infrastructure changes go through code review. If drift is found, either import the manual
        change into Terraform or let Terraform revert it.
      </p>

      <p><strong>Q: When would you choose CDK over Terraform?</strong></p>
      <p>
        CDK when: the team is AWS-only, the team is already proficient in TypeScript or Python, and
        the infrastructure has complex logic (loops over environments, conditional resources, reusable
        constructs). Terraform when: multi-cloud is required, the team prefers declarative HCL,
        or you want access to the larger Terraform module registry and community.
      </p>

      <p><strong>Q: How do you handle secrets in Terraform?</strong></p>
      <p>
        Never hardcode secrets in Terraform code. Read secrets from AWS Secrets Manager using a
        data source, or let Terraform generate a random password and write it to Secrets Manager.
        Be aware that Terraform state still contains sensitive values in plaintext &mdash; encrypt
        S3 state at rest, enable versioning for recovery, and strictly control who has
        <code>s3:GetObject</code> on the state bucket.
      </p>

      <p><strong>Q: How do you structure Terraform for multiple environments?</strong></p>
      <p>
        Two common approaches: separate directories per environment (<code>environments/dev</code>,
        <code>environments/prod</code>) each with their own state and variable files; or Terraform
        workspaces within a single directory. Separate directories are simpler to reason about and
        have strict blast radius isolation. Workspaces share backend config but use different state
        keys per workspace.
      </p>
    </div>
  );
}
