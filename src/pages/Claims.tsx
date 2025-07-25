
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '@/components/layout/Dashboard';
import { DateRange } from '@/lib/dateUtils';
import ClaimKPISection from '@/components/metrics/ClaimKPISection';
import ClaimsTable from '@/components/tables/ClaimsTable';
import DealershipSearch from '@/components/search/DealershipSearch';
import { supabase, shouldUseMockData } from '@/integrations/supabase/client';
import { useAtom } from 'jotai';
import { globalDateRangeAtom } from '@/contexts/DateFilterContext';

const Claims = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useAtom(globalDateRangeAtom);
  const [dealershipUUID, setDealershipUUID] = useState<string>('');
  const [dealershipName, setDealershipName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Debug logging for Claims page (simplified)
  useEffect(() => {
    console.log('📊 Claims page loaded with date range:', dateRange.from.toISOString(), 'to', dateRange.to.toISOString());
  }, [dateRange]);

  // Remove authentication check useEffect

  const handleDateRangeChange = (range: DateRange) => {
    console.log("📅 Date range changed in Claims:", range);
    setDateRange(range);
  };

  const handleDealershipSelect = (dealershipId: string, dealershipName: string) => {
    console.log(`🏢 Selected dealership: ID='${dealershipId}', Name='${dealershipName}'`);
    setDealershipUUID(dealershipId);
    setDealershipName(dealershipName);
  };

  const subnavbarContent = (
    <div 
      className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full sm:w-auto max-w-xs">
        <DealershipSearch 
          onDealershipSelect={handleDealershipSelect}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </div>
    </div>
  );

  useEffect(() => {
    console.log(`📊 Claims: Current dealership state - UUID: '${dealershipUUID}', Name: '${dealershipName}'`);
    console.log(`📅 Claims: Current dateRange: ${dateRange.from} to ${dateRange.to}`);
  }, [dealershipUUID, dealershipName, dateRange]);

  return (
    <Dashboard 
      onDateRangeChange={handleDateRangeChange}
      kpiSection={
        <ClaimKPISection 
          dateRange={dateRange} 
          dealerFilter={dealershipUUID} 
        />
      }
      subnavbar={subnavbarContent}
      pageTitle="Claims"
    >
      <div className="w-full overflow-x-hidden">
        <ClaimsTable
          dateRange={dateRange}
          dealerFilter={dealershipUUID}
          searchQuery={searchTerm}
        />
      </div>
    </Dashboard>
  );
};

export default Claims;
