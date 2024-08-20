"use client";

import { useNetworkState } from "@uidotdev/usehooks";
import { Squircle } from "lucide-react";

export const NetworkStatus = () => {
  const status = useNetworkState();
  const cssColour = status.online ? "fill-green-300" : "fill-red-300";
  return (
    <div className="">
      <Squircle className={cssColour} strokeWidth={1} size={16} />
    </div>
  );
};