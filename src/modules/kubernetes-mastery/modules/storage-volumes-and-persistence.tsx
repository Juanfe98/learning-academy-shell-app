import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const storageBindingDiagram = String.raw`flowchart TD
  APP["Application (StatefulSet / Deployment)"]
  PVC["PersistentVolumeClaim\n(what the app requests:\n50Gi, ReadWriteOnce, fast-ssd)"]
  SC["StorageClass\n(provisioner: ebs.csi.aws.com\nparameters: type=gp3)"]
  PV["PersistentVolume\n(actual storage resource:\nAWS EBS vol-0abc123)"]
  DISK["Cloud Disk / NFS / Ceph\n(physical storage)"]

  APP -->|"references"| PVC
  PVC -->|"requests via"| SC
  SC -->|"dynamic provisioning"| PV
  PV -->|"backed by"| DISK
  PVC <-->|"bound"| PV`;

const volumeLifecycleDiagram = String.raw`stateDiagram-v2
  [*] --> Available : PV created (static) or dynamically provisioned
  Available --> Bound : PVC bound to PV
  Bound --> Released : PVC deleted
  Released --> Available : reclaimPolicy=Recycle (deprecated)
  Released --> [*] : reclaimPolicy=Delete (cloud disk deleted)
  Released --> Released : reclaimPolicy=Retain (manual cleanup required)
  Bound --> Bound : Pod using PVC (no state change)`;

const accessModesDiagram = String.raw`flowchart LR
  subgraph "ReadWriteOnce (RWO)"
    N1A["Node A\n(read + write)"]
    N1B["Node B\n(blocked)"]
    D1["EBS Volume"]
    N1A --> D1
    N1B -. "cannot mount" .-> D1
  end
  subgraph "ReadWriteMany (RWX)"
    N2A["Node A\n(read + write)"]
    N2B["Node B\n(read + write)"]
    D2["NFS / CephFS / EFS"]
    N2A --> D2
    N2B --> D2
  end`;

export const toc: TocItem[] = [
  { id: "why-persistent-storage", title: "Why Persistent Storage Is Hard in Kubernetes", level: 2 },
  { id: "volume-types", title: "Ephemeral Volume Types", level: 2 },
  { id: "pv-pvc-storageclass", title: "PV, PVC, and StorageClass", level: 2 },
  { id: "binding-lifecycle", title: "Binding Lifecycle", level: 3 },
  { id: "access-modes", title: "Access Modes: RWO vs RWX vs ROX", level: 3 },
  { id: "reclaim-policies", title: "Reclaim Policies", level: 3 },
  { id: "dynamic-provisioning", title: "Dynamic Provisioning", level: 2 },
  { id: "statefulset-storage", title: "StatefulSet Storage Patterns", level: 2 },
  { id: "storage-comparison", title: "Storage Option Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function StorageVolumesAndPersistence() {
  return (
    <div className="article-content">
      <p>
        Kubernetes was designed for stateless workloads. Persistent storage was bolted on later,
        and it shows — the PV/PVC/StorageClass model is one of the more complex parts of the
        API. But stateless-only is not realistic: databases, message brokers, ML model stores,
        and audit logs all need durable storage. This module cuts through the complexity and
        builds the mental model you need to design storage correctly.
      </p>

      <h2 id="why-persistent-storage">Why Persistent Storage Is Hard in Kubernetes</h2>
      <p>
        Containers are ephemeral — the filesystem inside a container is destroyed when the container
        dies. A Pod can be replaced on a completely different node. Cloud disks (EBS, GCP PD) can
        only be attached to one node at a time in most configurations. These three constraints
        create the complexity you see in the Kubernetes storage API.
      </p>
      <p>
        The storage API has three layered objects designed to separate concerns:{" "}
        <strong>PersistentVolume (PV)</strong> is the actual storage resource. A{" "}
        <strong>PersistentVolumeClaim (PVC)</strong> is an application&apos;s request for storage.
        A <strong>StorageClass</strong> is a template for dynamically creating PVs on demand.
        This layering means developers work with PVCs (portable, expressive) while administrators
        manage the actual storage backend.
      </p>

      <MermaidDiagram
        chart={storageBindingDiagram}
        title="PV / PVC / StorageClass Relationship"
        caption="The application only needs to know what it wants (PVC). The StorageClass and PV layer abstracts the actual cloud disk, NFS share, or Ceph volume. This makes workloads portable across cloud providers."
        minHeight={420}
      />

      <h2 id="volume-types">Ephemeral Volume Types</h2>
      <p>
        Not all volumes need to persist beyond the Pod lifetime. Kubernetes has several ephemeral
        volume types that are created and destroyed with the Pod:
      </p>

      <CodeBlock
        code={`spec:
  volumes:
    # emptyDir: empty directory, lives and dies with the Pod
    # Use for: scratch space, caching, sharing files between containers in a Pod
    - name: scratch
      emptyDir: {}

    # emptyDir with memory backing (tmpfs) — faster, but counts toward container memory limit
    - name: shared-mem
      emptyDir:
        medium: Memory
        sizeLimit: 256Mi

    # hostPath: mount a directory from the node's filesystem
    # Use for: DaemonSets that need access to node-level data (logs, device files)
    # DANGER: creates tight coupling to the node, breaks Pod portability
    - name: host-logs
      hostPath:
        path: /var/log/app
        type: DirectoryOrCreate

    # projected: combine multiple sources (secrets, configmaps, serviceAccountToken)
    - name: token-vol
      projected:
        sources:
          - serviceAccountToken:
              path: token
              expirationSeconds: 3600
          - configMap:
              name: app-config`}
        lang="yaml"
        filename="ephemeral-volumes.yaml"
      />

      <h2 id="pv-pvc-storageclass">PV, PVC, and StorageClass</h2>
      <p>
        <strong>PersistentVolume (PV)</strong>: a cluster-level resource representing a piece of
        storage. It is either statically provisioned by an admin (pre-created cloud disk) or
        dynamically provisioned by a StorageClass when a PVC requests it. PVs are not
        namespace-scoped.
      </p>
      <p>
        <strong>PersistentVolumeClaim (PVC)</strong>: a namespace-scoped request for storage.
        It specifies how much storage, what access modes, and optionally which StorageClass.
        Pods reference PVCs by name; the PVC is bound to a PV.
      </p>

      <CodeBlock
        code={`# PersistentVolumeClaim — what the app requests
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3-encrypted   # which StorageClass to use
  resources:
    requests:
      storage: 50Gi
---
# Use the PVC in a Pod
spec:
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: postgres-data
  containers:
    - name: postgres
      image: postgres:16
      volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data`}
        lang="yaml"
        filename="pvc-usage.yaml"
      />

      <h3 id="binding-lifecycle">Binding Lifecycle</h3>

      <MermaidDiagram
        chart={volumeLifecycleDiagram}
        title="PersistentVolume Lifecycle States"
        caption="The Released state after PVC deletion is a critical production gotcha: with reclaimPolicy=Retain, the data persists but the PV cannot be reused without manual admin intervention to reset it to Available."
        minHeight={340}
      />

      <h3 id="access-modes">Access Modes: RWO vs RWX vs ROX</h3>
      <p>
        Access modes describe how a volume can be mounted by nodes — not Pods. This is a common
        source of confusion:{" "}
        <strong>ReadWriteOnce means one node, not one Pod</strong>. Multiple Pods on the same
        node can all write to a ReadWriteOnce volume.
      </p>

      <MermaidDiagram
        chart={accessModesDiagram}
        title="Access Mode Behavior"
        caption="Most cloud block storage (AWS EBS, GCP PD) only supports ReadWriteOnce. For shared access across nodes you need a network filesystem (NFS, CephFS, AWS EFS) which supports ReadWriteMany."
        minHeight={280}
      />

      <ArticleTable
        caption="Access mode capabilities — the mode required depends on whether your Pods are spread across nodes."
        minWidth={720}
      >
        <table>
          <thead>
            <tr>
              <th>Mode</th>
              <th>Abbreviation</th>
              <th>Mounted by</th>
              <th>Typical backing storage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>ReadWriteOnce</strong></td>
              <td>RWO</td>
              <td>Single node, read+write</td>
              <td>AWS EBS, GCP PD, Azure Disk</td>
            </tr>
            <tr>
              <td><strong>ReadOnlyMany</strong></td>
              <td>ROX</td>
              <td>Multiple nodes, read-only</td>
              <td>NFS, object storage</td>
            </tr>
            <tr>
              <td><strong>ReadWriteMany</strong></td>
              <td>RWX</td>
              <td>Multiple nodes, read+write</td>
              <td>NFS, CephFS, AWS EFS, Azure Files</td>
            </tr>
            <tr>
              <td><strong>ReadWriteOncePod</strong></td>
              <td>RWOP</td>
              <td>Single Pod only (GA in v1.29)</td>
              <td>CSI volumes that support it</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="reclaim-policies">Reclaim Policies</h3>
      <p>
        The reclaim policy on a PV (or StorageClass) determines what happens when the PVC is
        deleted. This is a critical operational decision — getting it wrong means either data
        loss or orphaned expensive cloud disks.
      </p>
      <CodeBlock
        code={`# Reclaim policies:
# Delete (default for dynamic provisioning): PV and underlying cloud disk are deleted
#   when PVC is deleted. Fast cleanup, but data is GONE.
# Retain: PV moves to Released state, underlying disk is kept.
#   Admin must manually delete the PV (and disk) or rebind it. Safe for critical data.
# Recycle (deprecated since v1.15): scrubs the volume and makes it Available again.

# Check reclaim policy on existing StorageClass:
kubectl get storageclass gp3-encrypted -o yaml | grep reclaimPolicy

# Change reclaim policy on an existing PV (cannot change on StorageClass after the fact):
kubectl patch pv pvc-abc123 -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'

# PVs with Retain policy after PVC deletion:
kubectl get pv                    # STATUS = Released
# To reuse: manually delete and recreate the PV pointing to the same cloud disk,
# or delete the PV and let StorageClass provision fresh storage`}
        lang="bash"
        filename="reclaim-policy.sh"
      />

      <h2 id="dynamic-provisioning">Dynamic Provisioning</h2>
      <p>
        With dynamic provisioning, you do not pre-create PVs. When a PVC is created, the
        StorageClass provisioner (a CSI driver) creates the cloud disk on demand and creates
        a PV to represent it. This is the standard production pattern.
      </p>

      <CodeBlock
        code={`# StorageClass definition (AWS EBS gp3, encrypted)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3-encrypted
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"  # make this the default
provisioner: ebs.csi.aws.com      # CSI driver
parameters:
  type: gp3
  encrypted: "true"
  kmsKeyId: "arn:aws:kms:us-east-1:123456789:key/abc-def"
reclaimPolicy: Retain             # keep disks when PVC is deleted
allowVolumeExpansion: true        # allow pvc resize
volumeBindingMode: WaitForFirstConsumer  # delay provisioning until Pod is scheduled
# WaitForFirstConsumer is critical for multi-AZ clusters — it ensures the disk is
# created in the same AZ as the node the Pod lands on`}
        lang="yaml"
        filename="storageclass-aws-ebs.yaml"
      />

      <p>
        <strong>
          <code>volumeBindingMode: WaitForFirstConsumer</code>
        </strong>{" "}
        is critical in multi-AZ clusters. Without it, the StorageClass provisions the disk in
        a random AZ, and if the scheduler places the Pod on a node in a different AZ, the Pod
        gets stuck in Pending because the disk cannot attach cross-AZ. With{" "}
        <code>WaitForFirstConsumer</code>, provisioning waits until the Pod is scheduled, then
        creates the disk in the same AZ.
      </p>

      <h2 id="statefulset-storage">StatefulSet Storage Patterns</h2>
      <p>
        StatefulSets use <code>volumeClaimTemplates</code> to give each Pod its own PVC. The
        names follow a predictable pattern: <code>&lt;pvc-name&gt;-&lt;pod-name&gt;</code>.
        These PVCs are not deleted when the StatefulSet is scaled down or deleted — you must
        clean them up manually. This is a safety feature, not a bug.
      </p>

      <CodeBlock
        code={`# Check PVCs created by a StatefulSet
kubectl get pvc -l app=postgres
# NAME                STATUS   VOLUME              CAPACITY   ACCESS MODES
# data-postgres-0     Bound    pvc-abc123          50Gi       RWO
# data-postgres-1     Bound    pvc-def456          50Gi       RWO
# data-postgres-2     Bound    pvc-ghi789          50Gi       RWO

# Scale down StatefulSet to 0
kubectl scale statefulset postgres --replicas=0
# PVCs still exist! Data is safe.

# To fully clean up (destructive!):
kubectl delete statefulset postgres
kubectl delete pvc -l app=postgres  # must be explicit`}
        lang="bash"
        filename="statefulset-pvc.sh"
      />

      <h2 id="storage-comparison">Storage Option Comparison</h2>

      <ArticleTable
        caption="Choose based on your durability, access pattern, and workload type requirements."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Volume Type</th>
              <th>Durability</th>
              <th>Access</th>
              <th>Performance</th>
              <th>Use for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>emptyDir</strong></td>
              <td>Pod lifetime only</td>
              <td>Same Pod containers</td>
              <td>Node disk speed</td>
              <td>Cache, scratch space, inter-container sharing</td>
            </tr>
            <tr>
              <td><strong>hostPath</strong></td>
              <td>Node lifetime</td>
              <td>Node-local only</td>
              <td>Node disk speed</td>
              <td>DaemonSet node agents (avoid for app workloads)</td>
            </tr>
            <tr>
              <td><strong>AWS EBS / GCP PD (RWO)</strong></td>
              <td>Independent of Pod/node</td>
              <td>One node at a time</td>
              <td>High (SSD gp3/pd-ssd)</td>
              <td>Databases, StatefulSets, any single-Pod write workload</td>
            </tr>
            <tr>
              <td><strong>AWS EFS / NFS (RWX)</strong></td>
              <td>Independent of Pod/node</td>
              <td>Multiple nodes simultaneously</td>
              <td>Lower (network FS latency)</td>
              <td>Shared content, ML datasets, multi-replica write access</td>
            </tr>
            <tr>
              <td><strong>CephRBD / Longhorn (RWO)</strong></td>
              <td>Replicated across cluster</td>
              <td>One node at a time</td>
              <td>Good (in-cluster storage)</td>
              <td>On-prem Kubernetes, air-gapped environments</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'Explain the relationship between PV, PVC, and StorageClass'"
        intro="This is a standard Kubernetes storage question. The strong answer covers the separation of concerns and the administrator/developer split."
        steps={[
          "Lead with the separation: PV is the actual storage resource (a cloud disk, NFS share). PVC is the application's request for storage — 50Gi, ReadWriteOnce. StorageClass is the template that tells Kubernetes how to dynamically provision PVs.",
          "Explain the binding: when a PVC is created, the controller finds a compatible PV (matching capacity, access mode, StorageClass) and binds them. With dynamic provisioning, the StorageClass provisioner creates a PV automatically.",
          "Explain the admin/dev split: developers write PVCs (what they need). Admins manage StorageClasses (how to provision). This abstraction makes workloads portable across AWS, GCP, on-prem.",
          "Name the lifecycle gotcha: with reclaimPolicy=Retain, deleting a PVC leaves the PV in Released state — the data exists but the PV cannot be automatically reused. With Delete, the cloud disk is deleted. Production recommendation: use Retain for databases, Delete for ephemeral caches.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'How would you run a database on Kubernetes?'"
        intro="This question often follows storage questions. The honest answer acknowledges tradeoffs — managed databases are often better than in-cluster databases."
        steps={[
          "Lead with the tradeoff: for production databases, a managed cloud service (RDS, Cloud SQL) is usually preferable. No etcd backup complexity, automated failover, point-in-time recovery. Running databases on Kubernetes makes sense for dev/test, cost optimization at scale, or portability requirements.",
          "If running on Kubernetes: use a StatefulSet with volumeClaimTemplates, a gp3 StorageClass with WaitForFirstConsumer, reclaimPolicy=Retain, and a Headless Service for stable DNS.",
          "Pod disruption budget: create a PodDisruptionBudget to prevent node maintenance from killing all replicas simultaneously.",
          "Operator pattern: production databases on Kubernetes should use an operator (CloudNativePG for Postgres, Strimzi for Kafka) that handles leader election, failover, backup, and restore — not a hand-crafted StatefulSet.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>

      <InterviewChallenge
        title="Debug a Pod Stuck in Pending Due to Storage"
        scenario={
          <>
            A StatefulSet with 3 replicas was deployed to a multi-AZ EKS cluster. The first
            two Pods (<code>db-0</code> and <code>db-1</code>) are Running. The third Pod{" "}
            (<code>db-2</code>) has been stuck in Pending for 10 minutes. No node resource
            issues exist — all nodes have ample CPU and memory.
          </>
        }
        tasks={[
          "What kubectl commands would you run to identify the storage-related cause?",
          "Name three storage-specific reasons a Pod can be stuck in Pending even when node resources are available.",
          "The StorageClass uses volumeBindingMode: Immediate. Explain why this is the likely culprit in a multi-AZ cluster and what the fix is.",
          "Write the corrected StorageClass that prevents this issue.",
        ]}
      />
      <SolutionReveal>
        <CodeBlock
          code={`# Step 1: Describe the pending Pod — check Events
kubectl describe pod db-2
# Look for events like:
# "pod has unbound immediate PersistentVolumeClaims"
# "volume node affinity conflict"
# "no nodes available to schedule volumes"

# Step 2: Check PVC status
kubectl get pvc data-db-2
# If STATUS = Pending, the PV was not provisioned or bound

# Step 3: Describe the PVC
kubectl describe pvc data-db-2
# Look for Events like:
# "waiting for a volume to be created, either by external provisioner or manually"
# "volume [x] already bound to a different claim"

# Step 4: Check StorageClass
kubectl get storageclass -o wide`}
          lang="bash"
          filename="debug-pending-pvc.sh"
        />
        <p>
          <strong>Three storage-specific Pending causes:</strong>
        </p>
        <ol>
          <li>
            <strong>AZ mismatch (this case):</strong> <code>volumeBindingMode: Immediate</code>{" "}
            provisioned the EBS disk in us-east-1a, but the scheduler wants to place db-2 on a
            node in us-east-1b. EBS cannot attach cross-AZ — the Pod stays Pending.
          </li>
          <li>
            <strong>StorageClass not found:</strong> The PVC references a StorageClass that
            does not exist (typo or cluster migration issue). PVC stays Pending indefinitely.
          </li>
          <li>
            <strong>Storage quota exceeded:</strong> Cloud account storage quota or per-namespace
            ResourceQuota for PVC count/size is exhausted. New PVCs are rejected.
          </li>
        </ol>
        <CodeBlock
          code={`# Fix: use WaitForFirstConsumer so the disk is created in the same AZ as the node
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3-multi-az
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer  # KEY: wait for Pod scheduling before provisioning
# Now: scheduler picks the node first, EBS disk is created in the same AZ`}
          lang="yaml"
          filename="fix-storageclass.yaml"
        />
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>PVC is portable, PV is the implementation.</strong> Developers write PVCs;
          StorageClasses and PVs are admin concerns. This abstraction enables cloud portability.
        </li>
        <li>
          <strong>ReadWriteOnce means one node, not one Pod.</strong> Multiple Pods on the same
          node can write to an RWO volume. Cross-node write sharing requires RWX (NFS/EFS/CephFS).
        </li>
        <li>
          <strong>WaitForFirstConsumer is essential for multi-AZ clusters.</strong> Without it,
          EBS/GCP PD disks provision in random AZs and cause cross-AZ attach failures.
        </li>
        <li>
          <strong>StatefulSet PVCs survive deletion.</strong> Deleting a StatefulSet or scaling
          it to 0 does not delete PVCs. You must manually delete PVCs to clean up storage.
        </li>
        <li>
          <strong>reclaimPolicy=Retain for databases, Delete for ephemeral data.</strong> Retain
          protects against accidental PVC deletion but requires manual cleanup. Delete is faster
          but loses data immediately.
        </li>
        <li>
          For production databases on Kubernetes, use a <strong>Kubernetes operator</strong>
          (CloudNativePG, Strimzi, Zalando Postgres Operator) that automates HA, failover,
          and backup — not a hand-crafted StatefulSet.
        </li>
      </ul>
    </div>
  );
}
