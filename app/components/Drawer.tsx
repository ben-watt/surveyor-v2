import * as React from "react";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface DynamicDrawerOpenArgs {
  title: string;
  description?: string;
  content?: React.ReactNode;
}

interface DynamicDrawerContextType {
  openDrawer: (props: DynamicDrawerOpenArgs) => void;
}

const DynamicDrawerContext = React.createContext<DynamicDrawerContextType>({
  openDrawer: (props: DynamicDrawerOpenArgs) => {},
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
    <DynamicDrawerContext.Provider value={{ openDrawer: handleOpenDrawer }}>
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

  console.log("[DynamicDrawer] isDesktop", isOpen);

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="sm:max-w-[425px] max-h-full overflow-scroll">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="p-4">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
            {content}
          </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
