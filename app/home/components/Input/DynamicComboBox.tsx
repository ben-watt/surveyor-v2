"use client";

import * as React from "react";
import { useMediaQuery } from "usehooks-ts";
import { Combobox, type ComboboxProps, type ComboboxDataItem } from "./ComboBox";
import { useController } from "react-hook-form";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ArrowDownNarrowWide } from "lucide-react";
import { Label } from "./Label";
import { ErrorMessage } from "@hookform/error-message";
import InputError from "../InputError";

type DynamicComboBoxProps = Omit<ComboboxProps, 'inDrawer' | 'onClose'>;

export function DynamicComboBox(props: DynamicComboBoxProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  
  // Always call useController to avoid conditional hook usage
  const { field } = useController({
    name: props.name,
    control: props.control,
    rules: props.rules,
    defaultValue: props.isMulti ? [] : ""
  });
  
  // Use the standard ComboBox on desktop
  if (isDesktop) {
    return <Combobox {...props} />;
  }

  const getDisplayValue = () => {
    const value = field.value;
    if (!value) return "Select...";
    
    if (props.isMulti && Array.isArray(value)) {
      if (value.length === 0) return "Select...";
      return `${value.length} selected`;
    }
    
    // Find the label for the current value
    const flattenData = (items: ComboboxDataItem[]): { value: any; label: string }[] => {
      return items.reduce((acc, item) => {
        const result = [{ value: item.value, label: item.label }];
        if (item.children) {
          result.push(...flattenData(item.children));
        }
        return [...acc, ...result];
      }, [] as { value: any; label: string }[]);
    };
    
    const flatData = flattenData(props.data);
    const item = flatData.find(item => {
      if (typeof value === 'object' && value !== null && typeof item.value === 'object' && item.value !== null) {
        return value.id === item.value.id;
      }
      return value === item.value;
    });
    
    return item?.label || "Select...";
  };

  return (
    <div className="w-full">
      <div className="flex items-center space-x-2">
        <Label text={props.labelTitle} />
      </div>
      
      {/* Mobile trigger button */}
      <Button
        type="button"
        variant="outline"
        className="justify-between w-full text-ellipsis overflow-hidden whitespace-nowrap"
        onClick={() => setMobileDrawerOpen(true)}
      >
        <span className="flex-1 text-start truncate min-w-0">{getDisplayValue()}</span>
        <ArrowDownNarrowWide className="flex-none ml-2 h-4 w-4 opacity-50 shrink-0" />
      </Button>
      
      <ErrorMessage
        name={props.name}
        errors={props.errors}
        render={({ message }) => InputError({ message })} 
      />

      {/* Mobile drawer with ComboBox inside */}
      <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{props.labelTitle || "Select an option"}</DrawerTitle>
            <DrawerDescription>
              {props.isMulti ? "Select multiple options" : "Select an option"}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            <Combobox
              {...props}
              inDrawer
              onClose={() => setMobileDrawerOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}