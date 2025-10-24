// Can.tsx
import React from "react";
import { usePermission } from "./usePermission";

interface CanProps {
  module: string
  action?: string
  children: React.ReactNode
}

export const Can: React.FC<CanProps> = ({ module, action, children }) => {
  const { can } = usePermission()
  return can(module, action) ? <>{children}</> : null
}
