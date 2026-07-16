import type { AcademyManifest } from "@/lib/types/academy";

const manifest: AcademyManifest = {
  slug: "kubernetes-mastery",
  title: "Kubernetes Mastery",
  description:
    "Master Kubernetes from cluster architecture to production operations. Learn the control plane, workloads, networking, storage, RBAC, scaling, observability, and the GitOps patterns that senior engineers use in real clusters.",
  version: "1.0.0",
  icon: "☸️",
  accentColor: "#326ce5",
  totalEstimatedMinutes: 360,
  routes: [
    {
      slug: "architecture-and-control-plane",
      title: "Architecture & Control Plane",
      order: 0,
      estimatedMinutes: 40,
      tags: ["kubernetes", "architecture", "control-plane", "etcd"],
      component: () => import("./modules/architecture-and-control-plane"),
    },
    {
      slug: "pods-and-workloads",
      title: "Pods & Workloads",
      order: 1,
      estimatedMinutes: 45,
      tags: ["kubernetes", "pods", "deployments", "statefulsets", "jobs"],
      component: () => import("./modules/pods-and-workloads"),
    },
    {
      slug: "services-and-networking",
      title: "Services & Networking",
      order: 2,
      estimatedMinutes: 40,
      tags: ["kubernetes", "services", "networking", "ingress", "dns"],
      component: () => import("./modules/services-and-networking"),
    },
    {
      slug: "config-and-secrets",
      title: "ConfigMaps & Secrets",
      order: 3,
      estimatedMinutes: 35,
      tags: ["kubernetes", "configmaps", "secrets", "rbac", "security"],
      component: () => import("./modules/config-and-secrets"),
    },
    {
      slug: "storage-volumes-and-persistence",
      title: "Storage, Volumes & Persistence",
      order: 4,
      estimatedMinutes: 40,
      tags: ["kubernetes", "storage", "pv", "pvc", "statefulsets"],
      component: () => import("./modules/storage-volumes-and-persistence"),
    },
    {
      slug: "scheduling-and-resource-management",
      title: "Scheduling & Resource Management",
      order: 5,
      estimatedMinutes: 40,
      tags: ["kubernetes", "scheduling", "affinity", "taints", "resources"],
      component: () => import("./modules/scheduling-and-resource-management"),
    },
    {
      slug: "scaling-and-self-healing",
      title: "Scaling & Self-Healing",
      order: 6,
      estimatedMinutes: 35,
      tags: ["kubernetes", "hpa", "vpa", "keda", "autoscaling"],
      component: () => import("./modules/scaling-and-self-healing"),
    },
    {
      slug: "rbac-and-security",
      title: "RBAC & Security",
      order: 7,
      estimatedMinutes: 40,
      tags: ["kubernetes", "rbac", "security", "psa", "serviceaccounts"],
      component: () => import("./modules/rbac-and-security"),
    },
    {
      slug: "observability-and-debugging",
      title: "Observability & Debugging",
      order: 8,
      estimatedMinutes: 45,
      tags: ["kubernetes", "observability", "prometheus", "logging", "tracing"],
      component: () => import("./modules/observability-and-debugging"),
    },
    {
      slug: "production-patterns",
      title: "Production Patterns",
      order: 9,
      estimatedMinutes: 40,
      tags: ["kubernetes", "gitops", "helm", "kustomize", "production"],
      component: () => import("./modules/production-patterns"),
    },
  ],
  learningPath: [
    "architecture-and-control-plane",
    "pods-and-workloads",
    "services-and-networking",
    "config-and-secrets",
    "storage-volumes-and-persistence",
    "scheduling-and-resource-management",
    "scaling-and-self-healing",
    "rbac-and-security",
    "observability-and-debugging",
    "production-patterns",
  ],
  groups: [
    {
      id: "k8s-foundations",
      title: "Cluster Foundations",
      description:
        "The control plane, workload types, networking, and configuration — the essential building blocks every Kubernetes engineer must know.",
      routeSlugs: [
        "architecture-and-control-plane",
        "pods-and-workloads",
        "services-and-networking",
        "config-and-secrets",
      ],
    },
    {
      id: "k8s-operations",
      title: "Storage, Scheduling & Scaling",
      description:
        "Persistent storage, the scheduling pipeline, resource management, autoscaling, and self-healing — how to make workloads reliable and efficient.",
      routeSlugs: [
        "storage-volumes-and-persistence",
        "scheduling-and-resource-management",
        "scaling-and-self-healing",
      ],
    },
    {
      id: "k8s-production",
      title: "Security, Observability & Production",
      description:
        "RBAC, pod security standards, the full observability stack, and the GitOps patterns that make Kubernetes operationally sound.",
      routeSlugs: [
        "rbac-and-security",
        "observability-and-debugging",
        "production-patterns",
      ],
    },
  ],
};

export default manifest;
