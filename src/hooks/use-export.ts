import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportColumn {
  header: string;
  accessor: string | ((row: any) => string);
}

export function useExport() {
  const exportToCSV = (data: any[], columns: ExportColumn[], filename: string) => {
    const headers = columns.map(col => col.header);
    const rows = data.map(row => 
      columns.map(col => {
        const value = typeof col.accessor === 'function' 
          ? col.accessor(row) 
          : row[col.accessor];
        // Escape quotes and wrap in quotes if contains comma
        const strValue = String(value ?? '');
        if (strValue.includes(',') || strValue.includes('"')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      })
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
  };

  const exportToPDF = (
    data: any[], 
    columns: ExportColumn[], 
    filename: string,
    title?: string
  ) => {
    const doc = new jsPDF();
    
    // Add title
    if (title) {
      doc.setFontSize(16);
      doc.text(title, 14, 15);
    }

    // Add timestamp
    doc.setFontSize(10);
    doc.text(`导出时间: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, title ? 25 : 15);

    const headers = columns.map(col => col.header);
    const rows = data.map(row => 
      columns.map(col => {
        const value = typeof col.accessor === 'function' 
          ? col.accessor(row) 
          : row[col.accessor];
        return String(value ?? '-');
      })
    );

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: title ? 30 : 20,
      styles: { 
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
      },
    });

    doc.save(`${filename}.pdf`);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return { exportToCSV, exportToPDF };
}
