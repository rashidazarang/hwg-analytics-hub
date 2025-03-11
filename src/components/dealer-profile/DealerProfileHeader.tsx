import React from 'react';
import { Building2, Phone, Mail, MapPin, Star } from 'lucide-react';
import { DealerProfile } from '@/hooks/useDealerProfileData';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { calculatePerformanceRating } from '@/utils/dealerProfileUtils';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Link } from 'react-router-dom';

interface DealerProfileHeaderProps {
  profile: DealerProfile;
  isLoading: boolean;
}

const DealerProfileHeader: React.FC<DealerProfileHeaderProps> = ({ profile, isLoading }) => {
  // Calculate dealer performance score (1-5 stars)
  const performanceRating = calculatePerformanceRating(profile);
  
  if (isLoading) {
    return (
      <div className="mb-4 md:mb-6">
        <div className="flex justify-between items-start animate-pulse">
          <div className="w-3/4">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          </div>
          <div className="h-12 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 md:mb-6">
      {/* Breadcrumb navigation */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/leaderboard">Leaderboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink className="font-medium">Dealer Profile</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="bg-card rounded-lg border shadow-sm p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          {/* Dealer information section */}
          <div className="space-y-2 flex-grow">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">{profile.dealer_name}</h1>
                <p className="text-sm text-muted-foreground">
                  ID: {profile.dealer_uuid}
                </p>
              </div>
            </div>

            {/* Contact & Location details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-3">
              {profile.dealer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile.dealer_phone}</span>
                </div>
              )}
              
              {profile.dealer_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile.dealer_email}</span>
                </div>
              )}
              
              {(profile.dealer_city || profile.dealer_region) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {[profile.dealer_city, profile.dealer_region, profile.dealer_country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Performance rating & quick actions */}
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1 bg-primary/5 rounded-lg p-3">
              <span className="text-sm font-medium mr-2">Performance Rating:</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`h-5 w-5 ${star <= performanceRating ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} 
                  />
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Contact
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Performance status badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline" className="bg-primary/5">
            {profile.total_contracts} Total Contracts
          </Badge>
          
          {profile.claims_per_contract > 0.5 ? (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
              High Claims Rate ({profile.claims_per_contract.toFixed(2)})
            </Badge>
          ) : (
            <Badge variant="outline">
              Claims Rate: {profile.claims_per_contract.toFixed(2)}
            </Badge>
          )}

          {/* Active contracts percentage */}
          {profile.total_contracts > 0 && (
            <Badge variant="outline" className="bg-green-50">
              {((profile.active_contracts / profile.total_contracts) * 100).toFixed(1)}% Active
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealerProfileHeader;