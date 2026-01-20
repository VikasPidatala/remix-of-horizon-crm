import { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Call, CallStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface CallExcelImportProps {
  onImport: (calls: Omit<Call, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[]) => void;
}

const TEMPLATE_COLUMNS = [
  'Phone *',
  'Name',
  'Email',
  'Source',
  'Status (new/contacted/not_answered/callback)',
  'Call Date (YYYY-MM-DD)',
  'Call Time (HH:MM)',
  'Notes'
];

const SAMPLE_DATA = [
  ['9876543210', 'John Doe', 'john@example.com', 'website', 'new', '2024-01-15', '10:30', 'Interested in 3BHK'],
  ['9123456789', 'Jane Smith', 'jane@example.com', 'referral', 'contacted', '2024-01-15', '14:00', 'Follow up needed'],
  ['9456123789', '', '', 'facebook', 'not_answered', '2024-01-16', '11:00', ''],
];

export default function CallExcelImport({ onImport }: CallExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, ...SAMPLE_DATA]);
    
    // Set column widths
    ws['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 25 }));
    
    XLSX.utils.book_append_sheet(wb, ws, 'Calls Template');
    XLSX.writeFile(wb, 'calls_import_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        if (jsonData.length < 2) {
          toast.error('No data found in the file');
          return;
        }

        // Skip header row
        const calls: Omit<Call, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [];
        let validCount = 0;
        let invalidCount = 0;

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const phone = String(row[0] || '').trim();

          // Phone is required
          if (!phone) {
            invalidCount++;
            continue;
          }

          const status = (String(row[4] || 'new').toLowerCase().replace(' ', '_')) as CallStatus;
          const callDateStr = String(row[5] || '');
          
          let callDate = new Date();
          if (callDateStr) {
            const parsed = new Date(callDateStr);
            if (!isNaN(parsed.getTime())) {
              callDate = parsed;
            }
          }

          calls.push({
            phone,
            name: String(row[1] || '') || undefined,
            email: String(row[2] || '') || undefined,
            source: String(row[3] || '') || undefined,
            status: ['new', 'contacted', 'not_answered', 'callback', 'converted'].includes(status) 
              ? status : 'new',
            callDate,
            callTime: String(row[6] || '') || undefined,
            notes: String(row[7] || '') || undefined,
          });
          validCount++;
        }

        if (calls.length > 0) {
          onImport(calls);
          toast.success(`Imported ${validCount} calls successfully`, {
            description: invalidCount > 0 ? `${invalidCount} rows skipped (missing phone number)` : undefined,
          });
        } else {
          toast.error('No valid calls found in the file');
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('Failed to parse Excel file');
      }
    };

    reader.readAsArrayBuffer(file);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={downloadTemplate} className="gap-2">
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Download Template</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()}
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">Import Excel</span>
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
