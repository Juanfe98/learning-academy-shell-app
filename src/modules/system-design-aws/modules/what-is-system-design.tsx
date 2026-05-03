import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const bigPictureDiagram = String.raw`flowchart LR
    USER["User Browser or Mobile App"]

    subgraph ENTRY["Traffic Entry Layer"]
        DNS["Route 53 DNS"]
        CDN["CloudFront CDN"]
        WAF["WAF + Rate Limits"]
        ALB["ALB or API Gateway"]
    end

    subgraph APP["Stateless App Layer"]
        API["API Services on ECS, Lambda, or EC2"]
        LOGIC["Auth, validation, and business logic"]
        RESP["Response assembly"]
    end

    subgraph DATA["Data and Async Systems"]
        CACHE["Redis Cache"]
        DB["Primary Database"]
        QUEUE["Queue or Event Bus"]
        WORKERS["Workers and Lambdas"]
        EXT["S3, notifications, and external APIs"]
    end

    USER --> DNS --> CDN --> WAF --> ALB --> API --> LOGIC --> RESP --> ALB --> CDN --> USER
    LOGIC --> CACHE
    LOGIC --> DB
    CACHE --> LOGIC
    DB --> LOGIC
    LOGIC -. offload slow or retryable work .-> QUEUE --> WORKERS --> EXT
    WORKERS --> DB`;

export const toc: TocItem[] = [
  { id: "why-system-design", title: "Why System Design Matters", level: 2 },
  { id: "four-levels", title: "The Four Levels of Architecture", level: 2 },
  { id: "nine-qualities", title: "The Nine System Qualities", level: 2 },
  { id: "scalability", title: "Scalability", level: 3 },
  { id: "reliability", title: "Reliability", level: 3 },
  { id: "availability", title: "Availability", level: 3 },
  { id: "fault-tolerance", title: "Fault Tolerance", level: 3 },
  { id: "security", title: "Security", level: 3 },
  { id: "performance", title: "Performance", level: 3 },
  { id: "observability", title: "Observability", level: 3 },
  { id: "maintainability", title: "Maintainability", level: 3 },
  { id: "cost", title: "Cost Efficiency", level: 3 },
  { id: "the-big-picture", title: "The Big Picture Diagram", level: 2 },
  { id: "interview-framework", title: "Interview Framework", level: 2 },
  { id: "tradeoffs", title: "System Design Is Negotiating Tradeoffs", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes Senior Engineers Catch", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function WhatIsSystemDesign() {
  return (
    <div className="article-content">
      <p>
        System design is the discipline of deciding how to build software systems that work reliably
        at scale. It is the highest-leverage skill a senior engineer can develop, because every
        architectural decision you make today will either constrain or enable the team for the next
        three years. A poorly designed system does not just cause outages &mdash; it slows every
        engineer who touches it, makes features expensive to add, and quietly bleeds money in
        infrastructure costs.
      </p>

      <h2 id="why-system-design">Why System Design Matters</h2>
      <p>
        Writing clean React components or optimizing a database query is important, but it operates
        within a system someone already designed. System design is deciding what that system looks
        like before a line of code is written. It is the difference between building a house and
        laying a single brick.
      </p>
      <p>
        For a senior engineer, system design is unavoidable. You will be asked to design APIs, choose
        databases, plan deployment strategies, and reason about failure modes. In interviews, every
        company at the staff-and-above level uses system design questions as the primary filter,
        because it is impossible to fake: either you understand how distributed systems behave under
        load, or you do not.
      </p>
      <p>
        The good news is that system design is learnable through a framework, not through memorizing
        answers. The patterns repeat across every system you will ever build.
      </p>

      <h2 id="four-levels">The Four Levels of Architecture</h2>
      <p>
        Think of a software system as having four distinct levels, each with its own concerns and
        decisions. Confusing levels is a major source of bad design discussions.
      </p>

      <table>
        <thead>
          <tr>
            <th>Level</th>
            <th>What it covers</th>
            <th>Example decisions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Code</strong></td>
            <td>Functions, classes, modules within a single service</td>
            <td>Design patterns, abstractions, data structures</td>
          </tr>
          <tr>
            <td><strong>Application</strong></td>
            <td>How a single service is structured internally</td>
            <td>Layered architecture, dependency injection, API boundaries</td>
          </tr>
          <tr>
            <td><strong>Infrastructure</strong></td>
            <td>How services communicate and where they run</td>
            <td>Microservices vs monolith, databases, queues, caches</td>
          </tr>
          <tr>
            <td><strong>Cloud</strong></td>
            <td>The physical and network layer services live on</td>
            <td>AWS regions, VPCs, IAM, CDN, availability zones</td>
          </tr>
        </tbody>
      </table>

      <p>
        System design interviews primarily operate at the Infrastructure and Cloud levels. You need
        fluency at all four to be effective, but the interview tests whether you can reason about
        the macro structure of a system &mdash; not whether you can implement a binary search tree.
      </p>

      <h2 id="nine-qualities">The Nine System Qualities</h2>
      <p>
        Every system design decision is ultimately about optimizing for some combination of these
        nine qualities. They are not all achievable simultaneously &mdash; you will always make
        tradeoffs. Knowing these deeply lets you have precise conversations instead of hand-wavy ones.
      </p>

      <h3 id="scalability">Scalability</h3>
      <p>
        <strong>Analogy:</strong> A food truck can serve 50 customers before the line gets
        unmanageable. A restaurant chain can handle 50,000 customers per day because it has replicated
        its model across many locations.
      </p>
      <p>
        <strong>Technical definition:</strong> The ability of a system to handle increased load by
        adding resources. Horizontal scaling adds more instances of the same service. Vertical scaling
        gives each instance more CPU and RAM. Horizontal scaling is almost always preferred for
        stateless services because it is cheaper, more fault-tolerant, and has no practical ceiling.
      </p>
      <p>
        <strong>Real example:</strong> Your API handles 100 requests/second on a single server. At
        Black Friday it needs to handle 10,000 req/s. With horizontal scaling (auto-scaling group
        behind a load balancer), you spin up 100 identical instances. The code changes nothing.
      </p>

      <h3 id="reliability">Reliability</h3>
      <p>
        <strong>Analogy:</strong> A reliable car starts every time you turn the key, even in winter,
        even after sitting in the parking lot for a week.
      </p>
      <p>
        <strong>Technical definition:</strong> The probability that a system performs its intended
        function correctly over a given time period. Reliability is about correctness and consistency
        &mdash; doing the right thing, every time. A system can be available (up and responding) but
        unreliable (returning wrong results).
      </p>
      <p>
        <strong>Real example:</strong> A payment service that successfully charges the correct amount
        99.999% of the time is reliable. One that is up 99.99% of the time but occasionally double-charges
        customers is available but unreliable.
      </p>

      <h3 id="availability">Availability</h3>
      <p>
        <strong>Analogy:</strong> A 24/7 pharmacy vs one open 9am&ndash;5pm Monday&ndash;Friday. Both
        may dispense the correct medication every time (reliable), but the 24/7 one is highly
        available.
      </p>
      <p>
        <strong>Technical definition:</strong> The percentage of time a system is operational and
        accessible. Expressed as &quot;nines&quot;: 99.9% = 8.7 hours downtime/year, 99.99% = 52
        minutes/year, 99.999% = 5.26 minutes/year. Each additional nine is roughly 10x harder and
        more expensive to achieve.
      </p>
      <p>
        <strong>Real example:</strong> An e-commerce platform targeting 99.99% availability can afford
        ~52 minutes of downtime per year across planned and unplanned outages combined. This drives
        decisions like multi-AZ deployments, no single points of failure, and zero-downtime deploys.
      </p>

      <h3 id="fault-tolerance">Fault Tolerance</h3>
      <p>
        <strong>Analogy:</strong> A cargo ship with watertight compartments. If one compartment
        floods, the ship does not sink &mdash; it continues operating in a degraded state.
      </p>
      <p>
        <strong>Technical definition:</strong> The ability of a system to continue operating correctly
        (or gracefully degrade) when one or more of its components fail. Fault tolerance is achieved
        through redundancy, circuit breakers, graceful degradation, and fallbacks.
      </p>
      <p>
        <strong>Real example:</strong> Your recommendation service goes down. A fault-tolerant product
        page falls back to showing popular items instead of crashing. Users get a slightly worse
        experience, but the core purchase flow still works.
      </p>

      <h3 id="security">Security</h3>
      <p>
        <strong>Analogy:</strong> A bank vault with multiple layers &mdash; the bank itself, a locked
        door, the vault room, the vault door, and individual safe deposit boxes. Compromising one layer
        does not compromise everything.
      </p>
      <p>
        <strong>Technical definition:</strong> Protection against unauthorized access, data breaches,
        and malicious actors. In distributed systems: authentication (who you are), authorization
        (what you can do), encryption in transit and at rest, least-privilege access, and audit logging.
      </p>
      <p>
        <strong>Real example:</strong> An API that requires a valid JWT for every request, only accepts
        HTTPS, stores passwords as bcrypt hashes, uses IAM roles instead of credentials, and logs every
        access to CloudTrail implements defense in depth.
      </p>

      <h3 id="performance">Performance</h3>
      <p>
        <strong>Analogy:</strong> A sports car vs a school bus. The car has low latency (gets one person
        there fast). The bus has high throughput (moves many people per hour) but each person arrives
        later.
      </p>
      <p>
        <strong>Technical definition:</strong> How quickly and efficiently a system responds to
        requests. Two primary metrics: <strong>latency</strong> (time to complete one request,
        typically measured at p50/p95/p99) and <strong>throughput</strong> (requests processed per
        unit of time). These often trade off against each other.
      </p>
      <p>
        <strong>Real example:</strong> A search API with p99 latency of 50ms on a single server may
        achieve only 2,000 req/s throughput. Adding a cache brings p99 to 5ms and throughput to
        20,000 req/s &mdash; both improved because the bottleneck (DB query) was removed.
      </p>

      <h3 id="observability">Observability</h3>
      <p>
        <strong>Analogy:</strong> A car&apos;s dashboard. Without it, you would not know your speed,
        fuel level, or engine temperature until something breaks. With it, you can anticipate problems
        and take corrective action.
      </p>
      <p>
        <strong>Technical definition:</strong> The ability to understand the internal state of a system
        by examining its outputs. The three pillars: <strong>logs</strong> (what happened),
        <strong>metrics</strong> (how much/how fast), and <strong>traces</strong> (where time was spent
        across services). A system without observability is undeployable in production at any serious scale.
      </p>
      <p>
        <strong>Real example:</strong> Without observability, when your API error rate spikes at 2am,
        you are debugging blind. With structured logs, metrics dashboards, and distributed traces, you
        can identify the root cause in minutes: the DB connection pool was exhausted because a new
        background job held connections for too long.
      </p>

      <h3 id="maintainability">Maintainability</h3>
      <p>
        <strong>Analogy:</strong> A well-designed office building with labeled circuit breakers, easily
        accessible plumbing, and clear floor plans. Vs a building where the electrical is hidden in the
        walls with no documentation.
      </p>
      <p>
        <strong>Technical definition:</strong> How easy it is for engineers to understand, modify, test,
        and operate the system over time. Driven by separation of concerns, clear interfaces between
        components, good documentation, testability, and avoiding tight coupling.
      </p>
      <p>
        <strong>Real example:</strong> A monolith where the payment logic, user profile, and notification
        code all read from the same database tables with no clear ownership is hard to maintain. Extracting
        these into services or at least modules with explicit interfaces makes each piece independently
        changeable.
      </p>

      <h3 id="cost">Cost Efficiency</h3>
      <p>
        <strong>Analogy:</strong> Renting a hotel room vs renting an apartment vs buying a house.
        Each has different economics at different usage levels. A senior engineer chooses the model
        that matches actual usage patterns, not the most impressive-sounding option.
      </p>
      <p>
        <strong>Technical definition:</strong> The ratio of delivered value to infrastructure spend.
        In cloud systems, cost is driven by compute (EC2/ECS/Lambda), data transfer, storage, and
        managed service pricing. Senior engineers know where money is being spent and actively
        optimize it.
      </p>
      <p>
        <strong>Real example:</strong> Running 10 always-on EC2 instances for batch jobs that run
        for 5 minutes every hour wastes money. Lambda or Fargate Spot instances would cut the bill
        by 90% while handling the same workload.
      </p>

      <h2 id="the-big-picture">The Big Picture Diagram</h2>
      <p>
        Here is the high-level request flow that most modern web systems share. Every module in this
        academy will zoom into one or more of these components.
      </p>
      <MermaidDiagram
        chart={bigPictureDiagram}
        title="Production Architecture Mental Model"
        caption="Read the solid path as the synchronous request path. Then trace the dashed branch for slow, retryable, or fan-out work that should move behind a queue."
        minHeight={560}
      />
      <ul>
        <li><strong>Read it vertically first:</strong> user → DNS → CDN → WAF → load balancer → app.</li>
        <li><strong>Then read it horizontally:</strong> the app talks to cache and database for synchronous work.</li>
        <li><strong>Then read the dashed path:</strong> queues and workers take slow or retryable work off the request path.</li>
        <li><strong>Use it as a map:</strong> every later lesson in this path is really a zoom-in on one box or one arrow.</li>
      </ul>

      <h2 id="interview-framework">Interview Framework</h2>
      <InterviewPlaybook
        title="How to Start Any System Design Interview"
        intro="Most weak answers start drawing boxes too early. Strong answers narrow the problem first, then earn each architectural choice."
        steps={[
          "Clarify scale, users, latency expectations, consistency needs, and the most important user flows before proposing infrastructure.",
          "Define the API, data model, and read/write paths so the design has a concrete workload instead of abstract boxes.",
          "Draw the simple baseline architecture first: client, entry layer, application, data store, and any obvious async work.",
          "Stress-test the baseline against bottlenecks, failure modes, and growth limits, then add caches, queues, replication, or partitioning only where needed.",
          "Close by naming the tradeoffs you accepted and what you would revisit if traffic, team size, or correctness requirements changed.",
        ]}
      />

      <h2 id="tradeoffs">System Design Is Negotiating Tradeoffs</h2>
      <p>
        The most important mental model shift for system design: <strong>there is no perfect
        architecture</strong>. Every decision optimizes some qualities at the expense of others.
        Your job is to understand the tradeoffs and make the choice that best fits the specific
        constraints of the system you are building.
      </p>
      <p>
        Common tradeoffs you will encounter constantly:
      </p>
      <ul>
        <li><strong>Consistency vs availability</strong> &mdash; during a network partition, you must choose one (CAP theorem)</li>
        <li><strong>Latency vs throughput</strong> &mdash; batching increases throughput but adds latency</li>
        <li><strong>Simplicity vs scalability</strong> &mdash; a monolith is simpler to build and operate at low scale; microservices add complexity but enable independent scaling</li>
        <li><strong>Cost vs performance</strong> &mdash; more caching and larger instances improve performance but cost more</li>
        <li><strong>Flexibility vs coupling</strong> &mdash; shared databases between services are convenient but create tight coupling that makes change expensive</li>
        <li><strong>Read performance vs write performance</strong> &mdash; denormalization speeds up reads but makes writes more complex</li>
      </ul>
      <p>
        In interviews, the best answer is rarely &quot;use technology X.&quot; The best answer is
        &quot;here are the tradeoffs between approaches A and B for this specific use case, and given
        the constraints we established, I would choose B because...&quot;
      </p>

      <h2 id="common-mistakes">Common Mistakes Senior Engineers Catch</h2>
      <ul>
        <li>
          <strong>Jumping to solutions before understanding requirements.</strong> A common junior
          pattern: &quot;We should use Kafka for this.&quot; A senior engineer first asks: what is
          the read/write ratio? How many events per second? Do consumers need ordering? Do we need
          replay? Only then pick the tool.
        </li>
        <li>
          <strong>Treating the happy path as the only path.</strong> Most designs work fine when
          everything succeeds. Seniors design for partial failures: what happens if the cache is
          down? If the queue backs up? If the third-party API is slow? These are not edge cases
          &mdash; they are production realities.
        </li>
        <li>
          <strong>Over-engineering for scale that does not exist.</strong> Building a globally
          distributed microservices architecture for an application with 1,000 users is not impressive
          &mdash; it is a red flag. Design for current scale with a clear path to the next 10x.
        </li>
        <li>
          <strong>Ignoring data.</strong> &quot;We will use a relational database&quot; is not a
          complete answer. Which one? How will you handle migrations? What is the backup strategy?
          What are the access patterns? Data decisions are often irreversible &mdash; they deserve
          the most scrutiny.
        </li>
        <li>
          <strong>No observability plan.</strong> Designing a system without specifying how you will
          know it is working (or failing) means you cannot operate it in production. Every design
          should include: what metrics matter, what gets logged, what triggers an alert.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>
      <p>These are the kinds of meta questions that open system design interviews. Prepare crisp answers to each.</p>

      <p><strong>Q: What is system design and why does it matter?</strong></p>
      <p>
        System design is the process of defining the architecture, components, and interfaces of a
        system to satisfy specified requirements. It matters because architectural decisions are
        high-leverage and hard to reverse &mdash; a wrong choice in data modeling or service
        boundaries can slow a team for years.
      </p>

      <p><strong>Q: What are the most important qualities of a well-designed system?</strong></p>
      <p>
        It depends on the use case, but the foundational ones are: availability (it is up when users
        need it), reliability (it does the right thing), scalability (it handles growth), and
        observability (you know when something goes wrong). Security and cost efficiency are always
        considerations but their relative priority depends on the product.
      </p>

      <p><strong>Q: How do you approach a system design problem you have never seen before?</strong></p>
      <p>
        I start by clarifying requirements: what does the system need to do (functional) and how well
        (non-functional &mdash; scale, latency, availability). Then I estimate capacity. Then I design
        the API and data model before drawing the architecture. Finally I stress-test the design by
        asking: what fails first under load? What is the recovery path?
      </p>

      <p><strong>Q: What is the difference between horizontal and vertical scaling?</strong></p>
      <p>
        Vertical scaling (scaling up) means giving a single server more resources &mdash; more CPU,
        more RAM. It has a ceiling and a single point of failure. Horizontal scaling (scaling out)
        means adding more instances of the same service. It has no practical ceiling, supports fault
        tolerance through redundancy, and is the standard approach for stateless services in cloud
        architectures.
      </p>

      <p><strong>Q: Can a system be available but not reliable?</strong></p>
      <p>
        Yes. Availability means the system is up and responding. Reliability means it is doing the
        right thing. A system that is always up but occasionally returns corrupted data or charges
        customers the wrong amount is highly available but unreliable. In practice you need both.
      </p>

      <p><strong>Q: What does &quot;single point of failure&quot; mean and why is it bad?</strong></p>
      <p>
        A single point of failure (SPOF) is any component whose failure causes the entire system to
        fail. It is bad because it means your system&apos;s availability is bounded by that
        component&apos;s individual reliability. Eliminating SPOFs through redundancy (multiple
        instances, multiple AZs, failover) is a core reliability principle.
      </p>

      <p><strong>Q: What is the difference between fault tolerance and graceful degradation?</strong></p>
      <p>
        Fault tolerance means the system continues functioning correctly despite component failures
        (through redundancy and failover). Graceful degradation means the system continues functioning
        at reduced capacity or with reduced features when something fails, rather than failing
        completely. Both are better than hard failures. The right choice depends on whether a full
        fallback is possible.
      </p>

      <p><strong>Q: How do you think about cost in system design?</strong></p>
      <p>
        Cost is a first-class design constraint. The goal is to match resource allocation to actual
        usage: use managed services to avoid operational overhead, use auto-scaling to avoid paying
        for idle capacity, use spot/preemptible instances for interruptible workloads, and use
        caching to reduce expensive compute and database calls. I always ask: what is the cost at
        100 users, at 100k users, at 1M users?
      </p>

      <p><strong>Q: Why does observability belong in the system design, not just the implementation?</strong></p>
      <p>
        Because instrumentation decisions (what to log, what metrics to emit, how to propagate trace
        IDs) are architectural, not implementation details. If you do not design for observability
        from the start &mdash; propagating correlation IDs through service calls, emitting structured
        logs, defining SLIs and SLOs &mdash; you cannot add it cheaply later. And without
        observability you cannot safely operate the system in production.
      </p>
    </div>
  );
}
