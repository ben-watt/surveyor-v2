"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { v4 } from "uuid";


import { Button } from "@/components/ui/button";
import { surveyStore } from "@/app/home/clients/Database";
import { BuildingSurveyListCard } from "./SurveyListCard";
import { Input } from "@/components/ui/input";
import React from "react";
import { ListFilter, Plus, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "./components/EmptyState";
import { useUserAttributes } from "../utils/useUser";

interface FilterState {
  status: string[];
  owner: string[];
}

function HomePage() {
  const router = useRouter();
  const [isHydrated, data] = surveyStore.useList();
  const [isUserHydrated, currentUser] = useUserAttributes();
  const [createId, setCreateId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    owner: [],
  });

  // Get unique status values from data
  const availableStatuses = React.useMemo(() => {
    const statuses = new Set(data.map(survey => survey.status));
    return Array.from(statuses).filter(Boolean);
  }, [data]);

  // Get unique owner values from data
  const availableOwners = React.useMemo(() => {
    const owners = new Set(data.map(survey => survey.owner?.name).filter(Boolean));
    return Array.from(owners);
  }, [data]);

  const activeFilterCount = filters.status.length + filters.owner.length;

  const filteredData = React.useMemo(() => {
    let filtered = data;
    
    // Apply status filters
    if (filters.status.length > 0) {
      filtered = filtered.filter(survey => filters.status.includes(survey.status || ''));
    }

    // Apply owner filters
    if (filters.owner.length > 0) {
      filtered = filtered.filter(survey => {
        const isMySurveysSelected = filters.owner.includes('My Surveys');
        const isMyOwnedSurvey = isUserHydrated && currentUser && survey.owner?.id === currentUser.sub;
        const isOwnerNameSelected = filters.owner.includes(survey.owner?.name || '');
        
        // Show survey if it matches any of the selected owner criteria
        if (isMySurveysSelected && isMyOwnedSurvey) return true;
        if (isOwnerNameSelected) return true;
        
        return false;
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((survey) => {
        return (
          survey.reportDetails.clientName?.toLowerCase().includes(searchLower) ||
          survey.reportDetails.address?.formatted?.toLowerCase().includes(searchLower) ||
          survey.status?.toLowerCase().includes(searchLower) ||
          survey.owner?.name?.toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered;
  }, [data, searchQuery, filters, isUserHydrated, currentUser]);

  const toggleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  const toggleOwnerFilter = (owner: string) => {
    setFilters(prev => ({
      ...prev,
      owner: prev.owner.includes(owner)
        ? prev.owner.filter(o => o !== owner)
        : [...prev.owner, owner]
    }));
  };

  useEffect(() => {
    setCreateId(v4());
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between mb-5 items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-4xl font-bold tracking-tight dark:text-white mb-2  bg-gradient-to-r from-gray-900 via-blue-800  bg-clip-text ">Surveys</h1>
            <Badge variant="outline" className="text-sm">
              {data.length} total
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Surveys are used to generate reports for building inspections.
          </p>
        </div>
      </div>
      
      <div className="mb-4 flex items-center gap-2">
        <div className="flex-1">
          <Input
            placeholder="Search surveys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <ListFilter  className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableStatuses.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={filters.status.includes(status)}
                onCheckedChange={() => toggleStatusFilter(status)}
              >
                {status}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Filter by Owner</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              key="my-surveys"
              checked={filters.owner.includes('My Surveys')}
              onCheckedChange={() => toggleOwnerFilter('My Surveys')}
            >
              My Surveys
            </DropdownMenuCheckboxItem>
            {availableOwners.map((owner) => (
              <DropdownMenuCheckboxItem
                key={owner}
                checked={filters.owner.includes(owner)}
                onCheckedChange={() => toggleOwnerFilter(owner)}
              >
                {owner}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant="default"
          onClick={() => router.push("/home/surveys/create")}
          className="gap-2"
        >
          <Plus className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">Create Survey</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {!isHydrated ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>
        ) : filteredData.length > 0 ? (
          filteredData.map((x) => (
            <BuildingSurveyListCard
              key={x.id}
              survey={x}    
              onView={() => router.push(`/home/surveys/${x.id}`)}
            />
          ))
        ) : (
          <EmptyState 
            searchQuery={searchQuery} 
            hasFilters={filters.status.length > 0 || filters.owner.length > 0} 
          />
        )}
        </div>
      </div>
  );
}

export default HomePage;
