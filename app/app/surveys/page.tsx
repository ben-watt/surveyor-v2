"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { v4 } from "uuid";


import { Button } from "@/components/ui/button";
import { surveyStore } from "@/app/app/clients/Database";
import { BuildingSurveyListCard } from "./SurveyListCard";
import { Input } from "@/components/ui/input";
import React from "react";
import { Filter, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface FilterState {
  status: string[];
}

function HomePage() {
  const router = useRouter();
  const [isHydrated, data] = surveyStore.useList();
  const [createId, setCreateId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    status: [],
  });

  // Get unique status values from data
  const availableStatuses = React.useMemo(() => {
    const statuses = new Set(data.map(survey => survey.status));
    return Array.from(statuses).filter(Boolean);
  }, [data]);

  const activeFilterCount = filters.status.length;

  const filteredData = React.useMemo(() => {
    let filtered = data;
    
    // Apply status filters
    if (filters.status.length > 0) {
      filtered = filtered.filter(survey => filters.status.includes(survey.status || ''));
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
  }, [data, searchQuery, filters]);

  const toggleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  useEffect(() => {
    setCreateId(v4());
  }, []);

  const deleteSurvey = async (id: string) => {
    try {
      surveyStore.remove(id);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-5 mt-5 items-end">
        <div>
          <h1 className="text-3xl dark:text-white">Surveys</h1>
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
              <Filter className="h-4 w-4" />
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
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant="default"
          onClick={() => router.push("/app/surveys/create")}
          className="gap-2"
        >
          <Plus className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">Create Survey</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredData.map((x) => (
          <BuildingSurveyListCard
            key={x.id}
            survey={x}
            onView={() => router.push(`/app/surveys/${x.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

export default HomePage;
