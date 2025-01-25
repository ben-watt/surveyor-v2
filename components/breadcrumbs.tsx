import React from "react";
import { startCase } from "lodash";
import { usePathname } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export function Breadcrumbs() {
  const path = usePathname();

  const getBreadcrumbs = () => {
    if (!path) return [];
    // Remove leading slash and split into segments
    const segments = path.slice(1).split('/');
    // Create array of segment objects with href and label
    return segments.map((segment, index) => {
      // Check if segment matches UUID pattern (8-4-4-4-12 format)
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      
      return {
        href: '/' + segments.slice(0, index + 1).join('/'),
        label: isGuid ? segment.substring(0, 8) + '...' : startCase(segment)
      };
    });
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {getBreadcrumbs().map((crumb, index, array) => (
          <React.Fragment key={crumb.href}>
            <BreadcrumbItem className="hidden md:block">
              {index === array.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.href}>
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < array.length - 1 && (
              <BreadcrumbSeparator className="hidden md:block" />
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
} 