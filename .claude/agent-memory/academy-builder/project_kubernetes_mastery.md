---
name: project-kubernetes-mastery
description: Kubernetes Mastery academy — slug, color, module list, K8s version, and wiring status
metadata:
  type: project
---

Kubernetes Mastery academy is complete and wired into both REGISTRY and MOCK_ACADEMIES.

**Slug:** `kubernetes-mastery`
**Accent color:** `#326ce5` (Kubernetes brand blue)
**Icon:** ☸️
**K8s version targeted:** v1.36 (stable May 2026); v1.37 scheduled August 2026

**10 modules (all in `src/modules/kubernetes-mastery/modules/`):**
1. `architecture-and-control-plane` — control plane components, reconciliation loop, etcd
2. `pods-and-workloads` — Pod lifecycle, Deployment/StatefulSet/DaemonSet/Job/CronJob, QoS
3. `services-and-networking` — ClusterIP/NodePort/LoadBalancer/Headless, CoreDNS, Ingress, NetworkPolicy
4. `config-and-secrets` — ConfigMap vs Secret, injection methods, encryption at rest, ESO/Vault
5. `storage-volumes-and-persistence` — PV/PVC/StorageClass, access modes, reclaim policies, WaitForFirstConsumer
6. `scheduling-and-resource-management` — scheduler pipeline, affinity, taints/tolerations, TopologySpreadConstraints
7. `scaling-and-self-healing` — HPA v2, VPA, KEDA, Cluster Autoscaler/Karpenter, PDB
8. `rbac-and-security` — auth pipeline, RBAC model, ServiceAccounts, PSA, security contexts
9. `observability-and-debugging` — debug toolkit, Prometheus/Grafana, Fluent Bit, OTel tracing
10. `production-patterns` — GitOps (ArgoCD/Flux), Helm/Kustomize, deployment strategies, graceful shutdown

**Wiring:**
- `src/modules/kubernetes-mastery/manifest.ts` — AcademyManifest
- `src/lib/registry.ts` — added `kubernetesMastery` import and entry
- `src/lib/mock-data.ts` — added full MockAcademy entry with routes, learningPath, groups

**Build:** pnpm build passes clean (verified June 2026)

**Why:** Key version-specific notes for future updates:
- CronJob API is `batch/v1` (not `batch/v1beta1`, removed in v1.25)
- Docker shim removed in v1.24; containerd/CRI-O are the standard runtimes
- Pod Security Policy (PSP) removed in v1.25; replaced by Pod Security Admission (PSA)
- `ReadWriteOncePod` access mode GA in v1.29
- HPA `autoscaling/v2` stable since v1.23

**Related:** [[web-components-academy]], [[express-backend-academy]]
