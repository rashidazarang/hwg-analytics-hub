
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DealershipSearch from '@/components/search/DealershipSearch';

type DashboardTabsProps = {
  activeTab: string;
  setActiveTab: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onDealershipSelect: (dealershipId: string, dealershipName: string) => void;
};

const DashboardTabs: React.FC<DashboardTabsProps> = ({
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  onDealershipSelect
}) => {
  return (
    <div className="flex justify-between items-center">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="dealers">Dealers</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <DealershipSearch 
        onDealershipSelect={onDealershipSelect}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
    </div>
  );
};

export default DashboardTabs;
