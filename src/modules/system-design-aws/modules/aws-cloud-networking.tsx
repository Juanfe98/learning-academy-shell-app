import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import type { TocItem } from "@/lib/types/academy";

const vpcArchitectureDiagram = String.raw`flowchart TB
    subgraph REGION["AWS Region us-east-1"]
        subgraph VPC["VPC 10.0.0.0/16"]
            subgraph AZA["Availability Zone A"]
                PUBA["Public subnet 10.0.1.0/24<br/>ALB node + NAT gateway"]
                PRIVA["Private subnet 10.0.11.0/24<br/>ECS tasks / app nodes"]
                DATAA["Data subnet 10.0.21.0/24<br/>RDS / ElastiCache"]
            end
            subgraph AZB["Availability Zone B"]
                PUBB["Public subnet 10.0.2.0/24<br/>ALB node + NAT gateway"]
                PRIVB["Private subnet 10.0.12.0/24<br/>ECS tasks / app nodes"]
                DATAB["Data subnet 10.0.22.0/24<br/>RDS / ElastiCache"]
            end
        end
    end

    IGW["Internet Gateway"] --> PUBA
    IGW --> PUBB
    PUBA --> PRIVA --> DATAA
    PUBB --> PRIVB --> DATAB
    PRIVA <--> PRIVB
    DATAA <--> DATAB`;

export const toc: TocItem[] = [
  { id: "vpc-analogy", title: "VPC: Your Private Data Center in AWS", level: 2 },
  { id: "cidr-blocks", title: "CIDR Blocks Explained", level: 2 },
  { id: "subnets", title: "Public vs Private Subnets", level: 2 },
  { id: "gateways", title: "Internet Gateway vs NAT Gateway", level: 2 },
  { id: "route-tables", title: "Route Tables", level: 2 },
  { id: "security-groups", title: "Security Groups", level: 2 },
  { id: "nacls", title: "Network ACLs (NACLs)", level: 2 },
  { id: "sg-vs-nacl", title: "Security Groups vs NACLs: The Key Difference", level: 2 },
  { id: "bastion-hosts", title: "Bastion Hosts and AWS Systems Manager", level: 2 },
  { id: "vpc-endpoints", title: "VPC Endpoints and PrivateLink", level: 2 },
  { id: "vpc-diagram", title: "Production VPC Architecture", level: 2 },
  { id: "common-mistakes", title: "Common Security Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function AwsCloudNetworking() {
  return (
    <div className="article-content">
      <p>
        When you deploy to AWS, you are not just pushing code to a server &mdash; you are designing
        a network topology. Every service you create lives somewhere in that topology, and where it
        lives determines who can reach it, how it communicates with other services, and what attackers
        can access if something goes wrong. Getting VPC architecture right is fundamental to both
        security and reliability.
      </p>

      <h2 id="vpc-analogy">VPC: Your Private Data Center in AWS</h2>
      <p>
        Think of a VPC (Virtual Private Cloud) as your own private data center inside AWS. Just as a
        physical data center has its own network that is isolated from other companies&apos; networks,
        a VPC is a logically isolated network that belongs to you. Other AWS customers cannot see or
        reach your VPC by default.
      </p>
      <p>
        Within your VPC, you control everything: the IP address range, which services are public-facing,
        how services communicate with each other, and what firewall rules apply. You can have multiple
        VPCs (e.g., one for production, one for staging) and connect them via VPC peering.
      </p>

      <h2 id="cidr-blocks">CIDR Blocks Explained</h2>
      <p>
        A CIDR (Classless Inter-Domain Routing) block defines the IP address range of your network.
        For example: <code>10.0.0.0/16</code>
      </p>
      <ul>
        <li><code>10.0.0.0</code> is the base IP address</li>
        <li><code>/16</code> means the first 16 bits are fixed, the remaining 16 bits are variable</li>
        <li>This gives you 2^16 = 65,536 IP addresses (10.0.0.0 through 10.0.255.255)</li>
      </ul>
      <p>
        When you create subnets, you carve up the VPC CIDR into smaller ranges:
      </p>
      <pre><code>{`VPC: 10.0.0.0/16  (65,536 addresses)

Public Subnet A (us-east-1a):  10.0.1.0/24  (256 addresses)
Public Subnet B (us-east-1b):  10.0.2.0/24  (256 addresses)

Private Subnet A (us-east-1a): 10.0.10.0/24 (256 addresses)
Private Subnet B (us-east-1b): 10.0.11.0/24 (256 addresses)

DB Subnet A (us-east-1a):      10.0.20.0/24 (256 addresses)
DB Subnet B (us-east-1b):      10.0.21.0/24 (256 addresses)`}</code></pre>
      <p>
        Why split into subnets? Because subnet placement determines routing and firewall rules. You
        apply different security rules to your public subnet (where the load balancer lives) vs your
        private subnet (where your API servers live) vs your database subnet.
      </p>

      <h2 id="subnets">Public vs Private Subnets</h2>
      <p>
        <strong>Analogy:</strong> A hotel has a lobby (public &mdash; anyone can walk in) and back-of-house
        rooms (private &mdash; only staff can access). The front desk (load balancer) sits in the lobby
        and directs guests. The staff (your API servers) work in the back. The vault (database) is
        deep in the private area.
      </p>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Public Subnet</th>
            <th>Private Subnet</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Route to internet</td>
            <td>Via Internet Gateway (direct)</td>
            <td>Via NAT Gateway (outbound only)</td>
          </tr>
          <tr>
            <td>Inbound from internet</td>
            <td>Yes (with security group allowing it)</td>
            <td>No (no inbound route from internet)</td>
          </tr>
          <tr>
            <td>Public IP assignment</td>
            <td>Can be assigned</td>
            <td>No public IP</td>
          </tr>
          <tr>
            <td>What lives here</td>
            <td>Load balancers, NAT Gateways, bastion hosts</td>
            <td>API servers, databases, caches, Lambda, ECS tasks</td>
          </tr>
        </tbody>
      </table>

      <p>
        <strong>Critical rule:</strong> Your databases should NEVER be in a public subnet. If your
        RDS or DynamoDB table needs to be accessed by your application, put both in private subnets
        and let them communicate privately. Database ports (5432, 3306, 6379) should never be
        exposed to the internet.
      </p>

      <h2 id="gateways">Internet Gateway vs NAT Gateway</h2>
      <p>
        These two services solve different problems and are frequently confused:
      </p>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Internet Gateway (IGW)</th>
            <th>NAT Gateway</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Purpose</td>
            <td>Bidirectional internet access for public subnet resources</td>
            <td>Outbound-only internet access for private subnet resources</td>
          </tr>
          <tr>
            <td>Direction</td>
            <td>Inbound + Outbound</td>
            <td>Outbound only (inbound blocked)</td>
          </tr>
          <tr>
            <td>Lives in</td>
            <td>VPC level (not in a subnet)</td>
            <td>Public subnet</td>
          </tr>
          <tr>
            <td>Use case</td>
            <td>Load balancers that accept internet traffic</td>
            <td>Private servers that need to pull packages, call APIs</td>
          </tr>
          <tr>
            <td>Cost</td>
            <td>Free (pay only for data transfer)</td>
            <td>$0.045/hour + $0.045/GB processed</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Why NAT Gateway:</strong> Your API servers in a private subnet need to call external
        APIs, download npm packages, pull Docker images, etc. They cannot accept inbound connections
        from the internet, but they need to make outbound connections. The NAT Gateway sits in the
        public subnet, has a public IP, and translates private IP traffic to its public IP for
        outbound-only internet access.
      </p>

      <h2 id="route-tables">Route Tables</h2>
      <p>
        Route tables define how traffic is directed within and out of the VPC. Each subnet is
        associated with exactly one route table. The route table has rules that say: &quot;traffic
        destined for X should go to Y.&quot;
      </p>
      <pre><code>{`# Public subnet route table
Destination      Target
10.0.0.0/16     local          # VPC-internal traffic stays local
0.0.0.0/0       igw-xxxxx      # Everything else goes to Internet Gateway

# Private subnet route table
Destination      Target
10.0.0.0/16     local          # VPC-internal traffic stays local
0.0.0.0/0       nat-xxxxx      # Everything else goes to NAT Gateway

# Database subnet route table
Destination      Target
10.0.0.0/16     local          # Only local VPC traffic
# No route to 0.0.0.0/0 — databases cannot reach internet`}</code></pre>

      <h2 id="security-groups">Security Groups</h2>
      <p>
        Security groups are virtual firewalls attached to EC2 instances, ECS tasks, Lambda functions,
        RDS instances, and other resources. Think of them as the door policy for a specific resource.
      </p>
      <p>
        <strong>Key characteristics:</strong>
      </p>
      <ul>
        <li><strong>Stateful:</strong> If you allow inbound traffic on port 443, the response is automatically allowed out. You do not need a separate outbound rule for it.</li>
        <li><strong>Instance-level:</strong> Applied to individual resources, not subnets.</li>
        <li><strong>Allow rules only:</strong> Everything not explicitly allowed is denied. No explicit deny rules.</li>
        <li><strong>Can reference other security groups:</strong> This is powerful and the right way to define rules in AWS.</li>
      </ul>
      <pre><code>{`# ALB Security Group
Inbound:
  Port 443 from 0.0.0.0/0  (HTTPS from anywhere)
  Port 80 from 0.0.0.0/0   (HTTP, redirect to HTTPS)
Outbound:
  All traffic (to reach backend instances)

# API Server Security Group
Inbound:
  Port 3000 from sg-alb-id  (only from ALB, not internet)
Outbound:
  Port 5432 to sg-db-id     (only to DB security group)
  Port 443 to 0.0.0.0/0    (call external APIs via NAT)

# Database Security Group
Inbound:
  Port 5432 from sg-api-id  (only from API servers)
Outbound:
  Nothing needed (stateful — responses auto-allowed)`}</code></pre>
      <p>
        Note how the API servers are restricted to receive traffic only from the ALB security group
        &mdash; not from <code>0.0.0.0/0</code>. This means even if someone discovers the private IP
        of your API server, they cannot reach it from the internet. Only the ALB can.
      </p>

      <h2 id="nacls">Network ACLs (NACLs)</h2>
      <p>
        NACLs are subnet-level firewalls. They are applied to all traffic entering and leaving a
        subnet, regardless of which security group the individual instance has.
      </p>
      <ul>
        <li><strong>Stateless:</strong> You must explicitly allow both inbound AND outbound traffic. Returning traffic is not automatically allowed.</li>
        <li><strong>Subnet-level:</strong> Applied to all instances in a subnet.</li>
        <li><strong>Allow and deny rules:</strong> Unlike security groups, NACLs can explicitly deny traffic.</li>
        <li><strong>Numbered rules:</strong> Evaluated in order (lowest number first); first match wins.</li>
      </ul>

      <h2 id="sg-vs-nacl">Security Groups vs NACLs: The Key Difference</h2>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Security Group</th>
            <th>NACL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Level</td>
            <td>Instance / resource</td>
            <td>Subnet</td>
          </tr>
          <tr>
            <td>Statefulness</td>
            <td>Stateful (return traffic auto-allowed)</td>
            <td>Stateless (must allow both directions)</td>
          </tr>
          <tr>
            <td>Rules</td>
            <td>Allow only</td>
            <td>Allow and deny</td>
          </tr>
          <tr>
            <td>Rule evaluation</td>
            <td>All rules evaluated, most permissive wins</td>
            <td>Rules evaluated in order by rule number</td>
          </tr>
          <tr>
            <td>Primary use</td>
            <td>Day-to-day access control (almost always this)</td>
            <td>Subnet-level deny (block IP ranges, add defense in depth)</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>In practice:</strong> Security groups do 95% of the work. NACLs are used for
        additional defense-in-depth, especially to block known bad IP ranges or to explicitly deny
        subnets from talking to each other. If you are confused about which to use, start with
        security groups.
      </p>

      <h2 id="bastion-hosts">Bastion Hosts and AWS Systems Manager</h2>
      <p>
        If your API servers are in private subnets (which they should be), how do you SSH into them
        for debugging? Historically: a <strong>bastion host</strong> (jump box) &mdash; a small
        EC2 instance in a public subnet with SSH open to your office IP. You SSH to the bastion,
        then SSH from there to the private instance.
      </p>
      <p>
        <strong>The modern AWS way:</strong> AWS Systems Manager Session Manager. No bastion host
        required. No open SSH port (port 22). You open a browser-based shell session directly to
        any EC2 instance via the AWS console or CLI, authenticated via IAM. Zero attack surface.
      </p>
      <pre><code>{`# Start a Session Manager session (no SSH, no key pair needed)
aws ssm start-session --target i-1234567890abcdef0

# Or connect to an ECS container
aws ecs execute-command \
  --cluster my-cluster \
  --task task-id \
  --container my-container \
  --command "/bin/sh" \
  --interactive`}</code></pre>

      <h2 id="vpc-endpoints">VPC Endpoints and PrivateLink</h2>
      <p>
        By default, when your private subnet instance calls an AWS API (like S3 or DynamoDB), the
        traffic goes through the internet (via NAT Gateway). VPC endpoints allow that traffic to
        stay entirely within the AWS network &mdash; never touching the public internet.
      </p>
      <ul>
        <li><strong>Gateway endpoints:</strong> For S3 and DynamoDB. Free. Uses route table entries.</li>
        <li><strong>Interface endpoints (PrivateLink):</strong> For almost every other AWS service. Creates an ENI in your subnet. Costs ~$0.01/hour per AZ.</li>
      </ul>
      <p>
        <strong>Why use them:</strong> Security (traffic does not traverse public internet), lower
        data transfer costs (no NAT Gateway charges for S3/DynamoDB traffic), and better latency
        (shorter path within AWS network).
      </p>
      <pre><code>{`# Create a Gateway endpoint for S3 (Terraform)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = [aws_route_table.private.id]
}`}</code></pre>

      <h2 id="vpc-diagram">Production VPC Architecture</h2>
      <MermaidDiagram
        chart={vpcArchitectureDiagram}
        title="Production VPC Layout"
        caption="The common pattern is public subnets for ingress, private subnets for compute, and isolated data subnets for stateful services, duplicated across at least two availability zones."
        minHeight={640}
      />
      <pre>{`
Key ideas:
- Public subnets host internet-facing entry points such as ALB nodes and NAT gateways
- Private subnets host application compute that should not accept direct internet traffic
- Data subnets host stateful services with the smallest exposure possible
- Duplicate each tier across availability zones so one AZ failure does not take the system down
`}</pre>

      <h2 id="common-mistakes">Common Security Mistakes</h2>
      <ul>
        <li>
          <strong>Database in a public subnet:</strong> The most dangerous mistake. Databases should
          never be directly internet-accessible. Even if the security group blocks all external access,
          defense in depth requires the database to not even have a route from the internet.
        </li>
        <li>
          <strong>Security group allowing 0.0.0.0/0 on non-80/443 ports:</strong> Opening port 3000,
          5432, or 6379 to the world. These ports should only be accessible from specific security
          groups within the VPC.
        </li>
        <li>
          <strong>Not using separate security groups per service:</strong> Using one &quot;allow
          everything&quot; security group for all resources. Each service should have its own
          security group with minimal required permissions.
        </li>
        <li>
          <strong>Not enabling VPC Flow Logs:</strong> Without flow logs, you cannot audit network
          traffic or detect unusual patterns. Enable them for security compliance.
        </li>
        <li>
          <strong>Single AZ deployment:</strong> Putting all resources in one AZ means an AZ failure
          (which AWS experiences occasionally) takes down everything. Always span critical resources
          across at least two AZs.
        </li>
        <li>
          <strong>Using EC2 public IPs instead of a load balancer:</strong> If your API server has
          a public IP and you change instances, the IP changes and clients break. Load balancers
          provide a stable DNS name that routes to healthy instances.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What is a VPC and why do you use one?</strong></p>
      <p>
        A VPC is a logically isolated network within AWS where you deploy your resources. It provides
        network isolation from other AWS customers, control over IP address ranges, subnets, routing,
        and security. Without a VPC, all your resources would be in a shared public network. VPCs
        allow you to implement defense-in-depth security, private networking between services, and
        compliance requirements around network isolation.
      </p>

      <p><strong>Q: What is the difference between a public and private subnet?</strong></p>
      <p>
        A public subnet has a route to the Internet Gateway, meaning resources in it can be directly
        reachable from the internet (if their security group allows it). A private subnet has no
        direct route to the internet &mdash; resources can only make outbound requests via a NAT
        Gateway. Private subnet resources have no public IP and cannot accept inbound connections
        from the internet. Load balancers go in public subnets; API servers and databases go in
        private subnets.
      </p>

      <p><strong>Q: What is the difference between a Security Group and a NACL?</strong></p>
      <p>
        Security groups are stateful, instance-level firewalls with allow-only rules. NACLs are
        stateless, subnet-level firewalls with both allow and deny rules. In practice, security
        groups handle most access control. NACLs are used for defense-in-depth at the subnet level,
        like blocking known malicious IP ranges. The key statefulness difference: with NACLs, if
        you allow inbound traffic, you must also explicitly allow the return traffic outbound.
      </p>

      <p><strong>Q: Why should databases be in a private subnet?</strong></p>
      <p>
        Defense in depth. Even if your application is compromised, a database in a private subnet
        cannot be reached directly from the internet &mdash; an attacker would need to also compromise
        a network path from the application to the database. Additionally, no accidental
        misconfiguration (e.g., a security group rule) can expose the database publicly if it has
        no internet route.
      </p>

      <p><strong>Q: What is a NAT Gateway and when do you need one?</strong></p>
      <p>
        A NAT (Network Address Translation) Gateway allows resources in private subnets to make
        outbound connections to the internet while blocking all inbound connections. You need it when
        your private instances need to download software updates, pull Docker images, call external
        APIs, or contact AWS services that do not have VPC endpoints. Without a NAT Gateway, private
        subnet resources have no internet access at all.
      </p>

      <p><strong>Q: What are VPC endpoints and when would you use them?</strong></p>
      <p>
        VPC endpoints let your resources access AWS services (like S3, DynamoDB, SQS) without
        traffic leaving the AWS network. Without them, even intra-AWS traffic to S3 goes through
        the public internet via NAT Gateway. VPC endpoints improve security (no public internet),
        reduce cost (no NAT Gateway data processing charges), and often reduce latency. Gateway
        endpoints for S3 and DynamoDB are free and should always be configured.
      </p>
    </div>
  );
}
