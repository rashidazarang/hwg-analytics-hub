
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '@/components/layout/Dashboard';
import { DateRange } from '@/lib/dateUtils';
import KPISection from '@/components/metrics/KPISection';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date()
  });

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
    console.log("📅 Date range changed in Index:", range);
    setDateRange(range);
  };

  return (
    <Dashboard 
      onDateRangeChange={handleDateRangeChange}
      kpiSection={
        <KPISection />
      }
      pageTitle="Analytics Dashboard"
    >
      <div className="w-full overflow-x-hidden">
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to the Analytics Dashboard</h2>
          <p className="text-gray-600 mb-3">
            Use the navigation sidebar to access detailed views:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
            <li><strong>Agreements</strong> - View and manage all contract agreements</li>
            <li><strong>Claims</strong> - Track and analyze all claims</li>
            <li><strong>Performance</strong> - Monitor performance metrics over time</li>
            <li><strong>Leaderboard</strong> - View top-performing dealers</li>
          </ul>
          <div className="flex space-x-4 mt-4">
            <button 
              onClick={() => navigate('/agreements')} 
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Go to Agreements
            </button>
            <button 
              onClick={() => navigate('/claims')} 
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Go to Claims
            </button>
          </div>
        </div>
      </div>
    </Dashboard>
  );
};

export default Index;
