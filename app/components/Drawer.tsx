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
  title: string;
  description?: string;
  content?: React.ReactNode;
  contentFn?: () => React.ReactNode;
}

interface DynamicDrawerContextType {
  openDrawer: (props: DynamicDrawerOpenArgs) => void;
  closeDrawer: () => void;
}

const DynamicDrawerContext = React.createContext<DynamicDrawerContextType>({
  openDrawer: (props: DynamicDrawerOpenArgs) => {},
  closeDrawer: () => {},
});

export function useDynamicDrawer() {
  const context = React.useContext(DynamicDrawerContext);
  if (!context) {
    throw new Error("useDynamicDrawer must be used within a DynamicDrawerProvider");
  }
  return context;
}

export function DynamicDrawerProvider({
  children,
}: React.PropsWithChildren<{}>) {
  const [state, setState] = React.useState(
    {
      isOpen: false,
      props: {} as DynamicDrawerOpenArgs,
    });

  function handleOpenDrawer(props: DynamicDrawerOpenArgs) {
    setState({ isOpen: true, props });
  }

  function handleCloseDrawer() {
    setState({ isOpen: false, props: {} as DynamicDrawerOpenArgs });
  }

  return (
    <DynamicDrawerContext.Provider value={{ openDrawer: handleOpenDrawer, closeDrawer: handleCloseDrawer }}>
      {children}
      <DynamicDrawer isOpen={state.isOpen} handleClose={handleCloseDrawer} {...state.props} />
    </DynamicDrawerContext.Provider>
  );
}


interface DynamicDrawerProps extends DynamicDrawerOpenArgs {
  isOpen: boolean;
  handleClose: () => void;
}

export function DynamicDrawer({
  title,
  description,
  content,
  isOpen,
  handleClose
}: DynamicDrawerProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="sm:max-w-[425px] max-h-full overflow-scroll">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div>
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DrawerContent className="max-h-lvh">
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 overflow-scroll">
            {content}
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
