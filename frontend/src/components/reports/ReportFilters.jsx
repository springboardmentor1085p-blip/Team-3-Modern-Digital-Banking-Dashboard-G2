import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import DateRangePicker from '../ui/date-range-picker';
import { RefreshCw } from 'lucide-react';

const defaultRange = () => ({
  from: new Date(Date.now() - 30 * 86400000),
  to: new Date()
});

const ReportFilters = ({ onApply, reportType }) => {
  const [filters, setFilters] = useState({
    dateRange: defaultRange(),
    minAmount: '',
    maxAmount: ''
  });

  const apply = () => {
    onApply({
      start_date: filters.dateRange.from,
      end_date: filters.dateRange.to,
      min_amount: filters.minAmount || null,
      max_amount: filters.maxAmount || null
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label>Date Range</Label>
          <DateRangePicker
            dateRange={filters.dateRange}
            onDateRangeChange={r => setFilters(f => ({ ...f, dateRange: r }))}
          />
        </div>

        {reportType === 'transactions' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Min Amount</Label>
              <Input
                value={filters.minAmount}
                onChange={e => setFilters(f => ({ ...f, minAmount: e.target.value }))}
              />
            </div>
            <div>
              <Label>Max Amount</Label>
              <Input
                value={filters.maxAmount}
                onChange={e => setFilters(f => ({ ...f, maxAmount: e.target.value }))}
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          onClick={() =>
            setFilters({
              dateRange: defaultRange(),
              minAmount: '',
              maxAmount: ''
            })
          }
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button onClick={apply}>Apply</Button>
      </CardFooter>
    </Card>
  );
};

export default ReportFilters;
