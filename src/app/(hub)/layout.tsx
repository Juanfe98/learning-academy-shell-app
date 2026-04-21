import { DesktopSidebar, MobileDrawer } from "@/components/hub/Sidebar";
import TopBar from "@/components/hub/TopBar";
import PageTransition from "@/components/hub/PageTransition";
import StoreHydrator from "@/components/hub/StoreHydrator";
import ScrollToTop from "@/components/hub/ScrollToTop";

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop: fixed sidebar */}
      <DesktopSidebar />

      {/* Hydrate persisted store on client */}
      <StoreHydrator />

      {/* Mobile: slide-in drawer + backdrop */}
      <MobileDrawer />

      {/* Right column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <TopBar />

        {/* Scrollable content area */}
        <ScrollToTop />
        <main
          id="hub-main"
          className="flex-1 overflow-y-auto relative"
          style={{ background: "var(--bg-base)" }}
        >
          {/* Subtle dot-grid background pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Hero gradient bleed from top */}
          <div className="absolute inset-x-0 top-0 h-64 gradient-hero pointer-events-none" />

          <div className="relative z-10">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
