import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { useRouter, type Href } from "expo-router";

// Global settings-drawer state so it survives navigation: opening a menu item
// closes the drawer and navigates, and pressing Back on that screen reopens it.

type DrawerCtx = {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  go: (route: Href) => void; // navigate from a menu item, remembering to reopen on return
  returnToDrawer: () => void; // called by a menu sub-screen on unmount
};

const Ctx = createContext<DrawerCtx>({ open: false, openDrawer: () => {}, closeDrawer: () => {}, go: () => {}, returnToDrawer: () => {} });

export function DrawerProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pendingReopen = useRef(false);

  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const go = useCallback((route: Href) => {
    setOpen(false);
    pendingReopen.current = true;
    router.push(route);
  }, [router]);
  const returnToDrawer = useCallback(() => {
    if (pendingReopen.current) { pendingReopen.current = false; setOpen(true); }
  }, []);

  return <Ctx.Provider value={{ open, openDrawer, closeDrawer, go, returnToDrawer }}>{children}</Ctx.Provider>;
}

export function useDrawer() {
  return useContext(Ctx);
}

// Menu sub-screens call this: on unmount (Back), reopen the drawer if it sent us here.
export function useDrawerReturn() {
  const { returnToDrawer } = useDrawer();
  useEffect(() => () => returnToDrawer(), [returnToDrawer]);
}
