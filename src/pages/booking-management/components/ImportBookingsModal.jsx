import React, { useState, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/Toast';

const ImportBookingsModal = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv') || 
          selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          selectedFile.name.endsWith('.xlsx')) {
        setFile(selectedFile);
      } else {
        showToast('Please select a CSV or Excel file', 'error');
        setFile(null);
      }
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length !== headers.length) continue;

      const row = {};
      headers.forEach((header, index) => {
        row[header.toLowerCase().replace(/\s+/g, '_')] = values[index] || '';
      });
      data.push(row);
    }

    return data;
  };

  const handleImport = async () => {
    if (!file) {
      showToast('Please select a file to import', 'error');
      return;
    }

    setIsProcessing(true);
    setResults(null);

    try {
      // For Excel files, we'd need to use xlsx library
      // For now, we'll handle CSV
      if (file.name.endsWith('.xlsx')) {
        showToast('Excel import coming soon. Please use CSV format for now.', 'info');
        setIsProcessing(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target.result;
          const parsedData = parseCSV(text);

          if (parsedData.length === 0) {
            showToast('No valid booking data found in the file', 'error');
            setIsProcessing(false);
            return;
          }

          let successfulImports = 0;
          let failedImports = [];

          for (const row of parsedData) {
            try {
              // Basic validation
              if (!row.seeker_id || !row.listing_id || !row.start_time || !row.end_time) {
                failedImports.push({ row, reason: 'Missing required fields (seeker_id, listing_id, start_time, end_time)' });
                continue;
              }

              // Check if booking already exists (by ID if provided, or by seeker/listing/dates)
              if (row.id) {
                const { data: existingBooking } = await supabase
                  .from('bookings')
                  .select('id')
                  .eq('id', row.id)
                  .single();

                if (existingBooking) {
                  failedImports.push({ row, reason: 'Booking with this ID already exists' });
                  continue;
                }
              }

              // Parse dates
              const startTime = new Date(row.start_time);
              const endTime = new Date(row.end_time);

              if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                failedImports.push({ row, reason: 'Invalid date format' });
                continue;
              }

              // Calculate price if not provided
              let price = parseFloat(row.price || row.total || 0);
              if (price === 0 && row.base_amount) {
                price = parseFloat(row.base_amount);
              }

              // Insert booking
              const bookingData = {
                seeker_id: row.seeker_id,
                listing_id: row.listing_id,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                guest_count: parseInt(row.guest_count || row.guests || 1),
                status: row.status || 'pending',
                payment_status: row.payment_status || 'pending',
                base_amount: parseFloat(row.base_amount || price || 0),
                service_fee: parseFloat(row.service_fee || 0),
                payment_processing_fee: parseFloat(row.payment_processing_fee || 0),
                total_paid: parseFloat(row.total_paid || price || 0),
                price: price,
                special_requests: row.special_requests || null,
                booking_type: row.booking_type || 'instant',
                created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
              };

              const { error: bookingError } = await supabase
                .from('bookings')
                .insert(bookingData);

              if (bookingError) {
                throw bookingError;
              }

              successfulImports++;
            } catch (rowError) {
              console.error('Error importing row:', rowError);
              failedImports.push({ row, reason: rowError.message });
            }
          }

          setResults({ successfulImports, failedImports });
          showToast(`Import complete: ${successfulImports} successful, ${failedImports.length} failed`, 'info');
          
          // Rely on real-time subscription for new bookings to update the list
          onSuccess?.(); 

        } catch (parseError) {
          console.error('Error parsing file:', parseError);
          showToast(`Error parsing file: ${parseError.message}`, 'error');
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error initiating import:', error);
      showToast(`Error initiating import: ${error.message}`, 'error');
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon name="Upload" size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Import Bookings</h2>
              <p className="text-sm text-muted-foreground">Upload a CSV file to add multiple bookings</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={handleClose}
            disabled={isProcessing}
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-2">
            <label htmlFor="booking-file" className="text-sm font-medium text-foreground">
              Select CSV File
            </label>
            <Input
              id="booking-file"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileSelect}
              ref={fileInputRef}
              disabled={isProcessing}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
            />
            <p className="text-xs text-muted-foreground">
              Accepted formats: CSV, Excel. Required columns: seeker_id, listing_id, start_time, end_time, guest_count, status, payment_status, base_amount, service_fee, payment_processing_fee, total_paid, price.
            </p>
          </div>

          {results && (
            <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
              <h3 className="text-base font-semibold text-foreground">Import Results:</h3>
              <p className="text-sm text-success">
                Successful Imports: {results.successfulImports}
              </p>
              {results.failedImports.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    Failed Imports: {results.failedImports.length}
                  </p>
                  <ul className="list-disc list-inside text-xs text-muted-foreground max-h-40 overflow-y-auto border border-border rounded-md p-3 bg-card">
                    {results.failedImports.map((fail, index) => (
                      <li key={index}>
                        Reference: {fail.row.booking_reference || fail.row.id || 'N/A'} - Reason: {fail.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            onClick={handleImport}
            loading={isProcessing}
            iconName="Upload"
            iconPosition="left"
            disabled={!file || isProcessing}
          >
            {isProcessing ? 'Importing...' : 'Start Import'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportBookingsModal;

