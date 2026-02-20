import React, { useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Download, Loader2 } from 'lucide-react';
import exportService from '../../services/exportService';
import { toast } from 'sonner';

const ExportButton = ({
  exportType,
  filters = {},
  onExported,
  variant = 'default',
  size = 'default',
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formatType, setFormatType] = useState('csv');
  const [filename, setFilename] = useState('');

  /* ===============================
     DOWNLOAD HELPER
  ================================ */
  const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  /* ===============================
     EXPORT + DOWNLOAD (WORKING)
  ================================ */
  const startExport = async () => {
    try {
      setLoading(true);

      // 1️⃣ GENERATE EXPORT
      const generateRes = await exportService.generateExport({
        export_type: exportType,
        format: formatType,
        filters
      });

      const exportId =
        generateRes.data?.export_id ||
        generateRes.data?.id;

      if (!exportId) {
        throw new Error('Export ID not returned from server');
      }

      // 2️⃣ DOWNLOAD EXPORT FILE
      const downloadRes = await exportService.downloadExport(exportId);

      const finalFilename =
        filename ||
        `${exportType}_report_${Date.now()}.${formatType}`;

      triggerDownload(downloadRes.data, finalFilename);

      toast.success('File downloaded successfully');
      setOpen(false);
      onExported?.();
    } catch (err) {
      console.error(err);
      toast.error('Failed to export and download file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* FORMAT */}
            <div>
              <Label>Format</Label>
              <select
                className="w-full border rounded-md p-2"
                value={formatType}
                onChange={e => setFormatType(e.target.value)}
              >
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="json">JSON</option>
              </select>
            </div>

            {/* FILENAME */}
            <div>
              <Label>Filename (optional)</Label>
              <Input
                placeholder="Auto-generated if empty"
                value={filename}
                onChange={e => setFilename(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={startExport} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export & Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExportButton;
