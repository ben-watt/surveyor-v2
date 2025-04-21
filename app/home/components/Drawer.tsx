import * as React from "react";

import { useMediaQuery } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface DynamicDrawerOpenArgs {
  id: string;
  title: string;
  description?: string;
  content?: React.ReactNode;
}

interface DynamicDrawerContextType {
  isOpen: boolean;
  openDrawer: (props: DynamicDrawerOpenArgs) => void;
  closeDrawer: (id?: string) => void;
}

const DynamicDrawerContext = React.createContext<DynamicDrawerContextType>({
  isOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export function useDynamicDrawer() {
  const context = React.useContext(DynamicDrawerContext);
  if (!context) {
    throw new Error(
      "useDynamicDrawer must be used within a DynamicDrawerProvider"
    );
  }
  return context;
}

// Memoized content component to prevent unnecessary re-renders
const MemoizedContent = React.memo(
  ({ content }: { content: React.ReactNode }) => <div>{content}</div>
);
MemoizedContent.displayName = 'MemoizedContent';

// Individual drawer component that manages its own lifecycle
const IndividualDrawer = React.memo(
  ({ id, props, onClose }: { id: string; props: DynamicDrawerOpenArgs; onClose: (id: string) => void }) => {
    return (
      <DynamicDrawer
        key={id}
        isOpen={true}
        handleClose={() => onClose(id)}
        {...props}
      />
    );
  }
);
IndividualDrawer.displayName = 'IndividualDrawer';

export function DynamicDrawerProvider({
  children,
}: React.PropsWithChildren<{}>) {
  const [drawerStates, setDrawerStates] = React.useState<
    Record<string, DynamicDrawerOpenArgs>
  >({});

  const handleOpenDrawer = React.useCallback((props: DynamicDrawerOpenArgs) => {
    const id = props.id ?? crypto.randomUUID();
    setDrawerStates((prev) => ({ ...prev, [id]: props }));
  }, []);

  const handleCloseDrawer = React.useCallback((id?: string) => {
    if (id) {
      setDrawerStates((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    } else {
      setDrawerStates((prev) => {
        const newState = { ...prev };
        const lastKey = Object.keys(newState).pop();
        if (lastKey) delete newState[lastKey];
        return newState;
      });
    }
  }, []);

  const contextValue = React.useMemo(
    () => ({
      isOpen: Object.keys(drawerStates).length > 0,
      openDrawer: handleOpenDrawer,
      closeDrawer: handleCloseDrawer,
    }),
    [handleOpenDrawer, handleCloseDrawer, drawerStates]
  );

  return (
    <DynamicDrawerContext.Provider value={contextValue}>
      {children}
      {Object.entries(drawerStates).map(([id, props]) => (
        <IndividualDrawer
          key={id}
          id={id}
          props={props}
          onClose={handleCloseDrawer}
        />
      ))}
    </DynamicDrawerContext.Provider>
  );
}

interface DynamicDrawerProps extends DynamicDrawerOpenArgs {
  id: string;
  isOpen: boolean;
  handleClose: () => void;
}

export function DynamicDrawer({
  id,
  title,
  description,
  content,
  isOpen,
  handleClose,
}: DynamicDrawerProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) handleClose();
    },
    [handleClose]
  );

  if (isDesktop) {
    return (
      <Dialog key={id} open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md max-h-full overflow-scroll">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <MemoizedContent content={content} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer key={id} open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-lvh">
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 overflow-scroll">
          <MemoizedContent content={content} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
