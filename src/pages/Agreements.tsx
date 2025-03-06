
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '@/components/layout/Dashboard';
import { DateRange } from '@/lib/dateUtils';
import AgreementKPISection from '@/components/metrics/AgreementKPISection';
import AgreementChart from '@/components/charts/AgreementChart';
import AgreementBarChart from '@/components/charts/AgreementBarChart';
import AgreementsTable from '@/components/tables/AgreementsTable';
import DealershipSearch from '@/components/search/DealershipSearch';
import { supabase } from '@/integrations/supabase/client';

const Agreements = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date()
  });
  const [dealershipUUID, setDealershipUUID] = useState<string>('');
  const [dealershipName, setDealershipName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Check authentication
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate('/auth');
      }
    };
    
    checkSession();
  }, [navigate]);

  const handleDateRangeChange = (range: DateRange) => {
    console.log("📅 Date range changed in Agreements:", range);
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
      <div className="w-full sm:w-auto min-w-0 sm:min-w-[240px]">
        <DealershipSearch 
          onDealershipSelect={handleDealershipSelect}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </div>
    </div>
  );

  useEffect(() => {
    console.log(`📊 Agreements: Current dealership state - UUID: '${dealershipUUID}', Name: '${dealershipName}'`);
    console.log(`📅 Agreements: Current dateRange: ${dateRange.from} to ${dateRange.to}`);
  }, [dealershipUUID, dealershipName, dateRange]);

  return (
    <Dashboard 
      onDateRangeChange={handleDateRangeChange}
      kpiSection={
        <AgreementKPISection 
          dateRange={dateRange} 
          dealerFilter={dealershipUUID} 
        />
      }
      subnavbar={subnavbarContent}
      pageTitle="Agreements Dashboard"
    >
      <div className="w-full overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 xs:gap-4 sm:gap-6 mb-4 sm:mb-6 lg:mb-8 w-full overflow-hidden">
          <div className="w-full min-w-0 overflow-hidden">
            <AgreementChart 
              dateRange={dateRange} 
              dealerFilter={dealershipUUID} 
            />
          </div>
          <div className="w-full min-w-0 overflow-hidden">
            <AgreementBarChart
              dateRange={dateRange}
              dealerFilter={dealershipUUID}
            />
          </div>
        </div>
        <AgreementsTable
          dateRange={dateRange}
          dealerFilter={dealershipUUID}
          dealerName={dealershipName}
          searchQuery={searchTerm}
        />
      </div>
    </Dashboard>
  );
};

export default Agreements;
