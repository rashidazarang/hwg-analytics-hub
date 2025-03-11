import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  AlertTriangle,
  FileText,
  FileCheck
} from 'lucide-react';
import { Claim } from '@/hooks/useClaimDetail';

interface ClaimTimelineProps {
  claim: Claim;
}

const ClaimTimeline: React.FC<ClaimTimelineProps> = ({ claim }) => {
  // Build timeline events based on the claim data
  const events = [];
  
  // Reported date
  if (claim.Reported) {
    events.push({
      date: new Date(claim.Reported),
      title: 'Claim Reported',
      description: 'Claim was submitted and reported to the system',
      icon: <FileText className="h-5 w-5 text-blue-500" />,
      status: 'complete'
    });
  }
  
  // Incurred date
  if (claim.Incurred) {
    events.push({
      date: new Date(claim.Incurred),
      title: 'Incident Date',
      description: 'Date when the issue occurred',
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      status: 'complete'
    });
  }
  
  // Subclaim creation dates
  if (claim.subclaims && claim.subclaims.length > 0) {
    const createdSubclaims = claim.subclaims
      .filter(sc => sc.Created)
      .map(sc => ({
        date: new Date(sc.Created!),
        title: 'Subclaim Created',
        description: `Subclaim ${sc.SubClaimID} was created for ${sc.Payee}`,
        icon: <FileText className="h-5 w-5 text-indigo-500" />,
        status: 'complete'
      }));
    
    events.push(...createdSubclaims);
  }
  
  // Subclaim closure dates
  if (claim.subclaims && claim.subclaims.length > 0) {
    const closedSubclaims = claim.subclaims
      .filter(sc => sc.Closed)
      .map(sc => ({
        date: new Date(sc.Closed!),
        title: `Subclaim ${sc.Status}`,
        description: `Subclaim ${sc.SubClaimID} was processed with status: ${sc.Status}`,
        icon: <FileCheck className="h-5 w-5 text-green-500" />,
        status: 'complete'
      }));
    
    events.push(...closedSubclaims);
  }
  
  // Claim closure date
  if (claim.Closed) {
    events.push({
      date: new Date(claim.Closed),
      title: 'Claim Closed',
      description: 'Claim was processed and closed',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      status: 'complete'
    });
  }
  
  // Sort events by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  const formatDate = (date: Date) => {
    return format(date, 'MMM d, yyyy');
  };
  
  if (events.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Claim Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            No timeline events available for this claim.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Claim Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-8 space-y-6">
          {/* Vertical line */}
          <div className="absolute top-0 left-3 bottom-0 border-l-2 border-muted" />
          
          {events.map((event, index) => (
            <div key={index} className="relative">
              {/* Circle indicator */}
              <div className="absolute left-[-27px] top-0 z-10">
                {event.icon || <Circle className="h-5 w-5 text-primary" />}
              </div>
              
              <div className="mb-1 flex items-center gap-2">
                <p className="font-medium">{event.title}</p>
                <span className="text-sm text-muted-foreground">({formatDate(event.date)})</span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {event.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClaimTimeline; 