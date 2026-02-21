import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  FileText,
  FileSpreadsheet,
  File,
  Printer,
  RefreshCw,
  BarChart3,
  PieChart,
  TrendingUp,
  Trash2
} from 'lucide-react';
import ReportFilters from '../components/reports/ReportFilters';
import ExportButton from '../components/reports/ExportButton';
import exportService from '../services/exportService';
import insightService from '../services/insightService';
import { toast } from 'sonner';

const Reports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('transactions');
  const [filters, setFilters] = useState({});
  const [reportData, setReportData] = useState(null);
  const [exportHistory, setExportHistory] = useState([]);
  const [generating, setGenerating] = useState(false);

  const templates = [
    { id: 'transactions', name: 'Transaction Report', icon: <FileText />, popular: true },
    { id: 'cash_flow', name: 'Cash Flow', icon: <TrendingUp />, popular: true },
    { id: 'financial_summary', name: 'Financial Summary', icon: <BarChart3 />, popular: true },
    { id: 'budget', name: 'Budget vs Actual', icon: <PieChart /> },
    { id: 'tax', name: 'Tax Report', icon: <File /> },
    { id: 'accounts', name: 'Accounts Summary', icon: <FileSpreadsheet /> }
  ];

  const loadExports = async () => {
    const res = await exportService.getExportHistory();
    setExportHistory(res.data?.exports || []);
  };

  const loadPreview = useCallback(async () => {
    try {
      setGenerating(true);
      let res;

      switch (activeReport) {
        case 'cash_flow':
          res = await insightService.getCashFlowInsights(filters);
          break;
        case 'financial_summary':
          res = await insightService.getMonthlySummary(filters);
          break;
        case 'accounts':
          res = await insightService.getAccountSummary(filters);
          break;
        case 'budget':
          res = await insightService.getBudgetVsActual(filters);
          break;
        case 'tax':
          res = await insightService.getTaxSummary(filters);
          break;
        default:
          res = await insightService.getTransactions(filters);
      }

      setReportData(res.data);
    } catch {
      toast.error('Failed to load report');
    } finally {
      setGenerating(false);
    }
  }, [activeReport, filters]);

  useEffect(() => {
    (async () => {
      await loadExports();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-72 mb-4" />
        <Skeleton className="h-[420px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports & Exports</h1>
          <p className="text-muted-foreground">Generate and export financial reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button onClick={() => navigate('/insights')}>
            <BarChart3 className="h-4 w-4 mr-2" /> Insights
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates.map(t => (
                <div
                  key={t.id}
                  onClick={() => setActiveReport(t.id)}
                  className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center ${
                    activeReport === t.id ? 'bg-blue-50 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {t.icon}
                    <span>{t.name}</span>
                  </div>
                  {t.popular && <Badge>Popular</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>

          <ReportFilters
            reportType={activeReport}
            onApply={setFilters}
          />
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription>Live report preview</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={loadPreview}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${generating && 'animate-spin'}`} />
                  Refresh
                </Button>
                <ExportButton
                  exportType={activeReport}
                  filters={filters}
                  onExported={loadExports}
                  size="sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {!reportData ? (
                <p className="text-center text-muted-foreground py-20">
                  No preview available
                </p>
              ) : (
                <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Exports</CardTitle>
            </CardHeader>
            <CardContent>
              {exportHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">
                  No exports yet
                </p>
              ) : (
                exportHistory.slice(0, 5).map(e => (
                  <div
                    key={e.export_id}
                    className="flex justify-between items-center border-b py-2"
                  >
                    <div>
                      <p className="font-medium">{e.filename}</p>
                      <p className="text-xs text-muted-foreground">{e.format}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await exportService.deleteExport(e.export_id);
                        loadExports();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                View All Exports
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;
