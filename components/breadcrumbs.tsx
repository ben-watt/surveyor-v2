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
    
    // Configuration entity types that don't have index pages
    const configEntityTypes = ['sections', 'elements', 'components', 'conditions'];
    
    // Create array of segment objects with href and label
    return segments.map((segment, index) => {
      const decodedSegment = (() => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return segment;
        }
      })();
      // Check if segment contains a UUID pattern (8-4-4-4-12 format)
      const guidMatch = decodedSegment.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const hasGuid = Boolean(guidMatch);
      
      // Check if this is a configuration entity path that should redirect to main config
      const isConfigEntityPath = index >= 2 && 
        segments[1] === 'configuration' && 
        configEntityTypes.includes(segment) &&
        index < segments.length - 1; // Not the last segment
      
      const isAlphabeticLike = /^[a-zA-Z][a-zA-Z-_\s]*$/.test(decodedSegment);
      return {
        href: isConfigEntityPath ? '/home/configuration' : '/' + segments.slice(0, index + 1).join('/'),
        label: hasGuid
          ? guidMatch![0].substring(0, 8) + '...'
          : isAlphabeticLike
            ? startCase(decodedSegment)
            : decodedSegment
      };

    });
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {getBreadcrumbs().map((crumb, index, array) => (
          <React.Fragment key={crumb.href + crumb.label}>
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