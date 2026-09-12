"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

import { SidebarNavLinks } from "@/components/ui/nav-links";

/**
 * Compact mobile navigation: a header bar with a menu button that opens
 * a slide-over panel. Escape closes it, focus returns to the button, and
 * background scrolling is locked while open.
 */
export function MobileMenu({
  organizationName,
  userName,
}: {
  organizationName: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="flex items-center gap-2 md:hidden">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label="Open navigation menu"
          className="focus-light inline-flex size-11 items-center justify-center rounded-md text-sidebar-text hover:bg-sidebar-raised"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-ink/40"
            tabIndex={-1}
          />
          <div
            ref={panelRef}
            id="mobile-navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-sidebar shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-sidebar-line px-4 py-3">
              <p className="text-sm font-semibold text-sidebar-text-strong">
                {organizationName}
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                aria-label="Close navigation menu"
                className="focus-light inline-flex size-11 items-center justify-center rounded-md text-sidebar-text hover:bg-sidebar-raised"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto p-3">
              <SidebarNavLinks variant="mobile" />
            </nav>
            <div className="border-t border-sidebar-line px-4 py-3">
              <p className="truncate text-xs text-sidebar-text">{userName}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
