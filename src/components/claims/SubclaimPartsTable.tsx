import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { SubclaimPart } from '@/hooks/useClaimDetail';
import { formatCurrency } from '@/utils/formatters';

interface SubclaimPartsTableProps {
  parts: SubclaimPart[];
}

const SubclaimPartsTable: React.FC<SubclaimPartsTableProps> = ({ parts }) => {
  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Part Number</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Requested</TableHead>
            <TableHead className="text-right">Approved</TableHead>
            <TableHead className="text-right">Paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parts.map((part) => (
            <TableRow key={part.PartID}>
              <TableCell className="font-medium">{part.PartNumber}</TableCell>
              <TableCell>{part.Description}</TableCell>
              <TableCell className="text-right">{part.Quantity}</TableCell>
              <TableCell className="text-right">
                {part.RequestedPrice ? formatCurrency(part.RequestedPrice) : 'N/A'}
              </TableCell>
              <TableCell className="text-right">
                {part.ApprovedPrice ? formatCurrency(part.ApprovedPrice) : 'N/A'}
              </TableCell>
              <TableCell className="text-right">
                {part.PaidPrice ? formatCurrency(part.PaidPrice) : 'N/A'}
              </TableCell>
            </TableRow>
          ))}
          
          {/* Totals row */}
          <TableRow className="border-t-2">
            <TableCell colSpan={3} className="font-medium">Totals</TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(parts.reduce((sum, part) => {
                if (part.RequestedPrice) {
                  return sum + (part.RequestedPrice * (part.Quantity || 1));
                }
                return sum;
              }, 0))}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(parts.reduce((sum, part) => {
                if (part.ApprovedPrice) {
                  return sum + (part.ApprovedPrice * (part.Quantity || 1));
                }
                return sum;
              }, 0))}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(parts.reduce((sum, part) => {
                if (part.PaidPrice) {
                  return sum + (part.PaidPrice * (part.Quantity || 1));
                }
                return sum;
              }, 0))}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default SubclaimPartsTable; 