import React, { useState, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/Toast';

const ImportUsersModal = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        showToast('Please select a CSV file', 'error');
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

  const validateUserData = (userData) => {
    const errors = [];
    
    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Invalid email address');
    }
    
    if (!userData.name && (!userData.first_name || !userData.last_name)) {
      errors.push('Name is required');
    }
    
    if (!userData.role || !['seeker', 'partner', 'admin'].includes(userData.role.toLowerCase())) {
      errors.push('Invalid role (must be seeker, partner, or admin)');
    }

    return errors;
  };

  const handleImport = async () => {
    if (!file) {
      showToast('Please select a CSV file', 'error');
      return;
    }

    setIsProcessing(true);
    setResults(null);

    try {
      const text = await file.text();
      const csvData = parseCSV(text);

      if (csvData.length === 0) {
        throw new Error('No data found in CSV file');
      }

      const importResults = {
        total: csvData.length,
        success: 0,
        failed: 0,
        errors: []
      };

      // Process users in batches
      const batchSize = 5;
      for (let i = 0; i < csvData.length; i += batchSize) {
        const batch = csvData.slice(i, i + batchSize);
        
        for (const userData of batch) {
          try {
            // Validate data
            const validationErrors = validateUserData(userData);
            if (validationErrors.length > 0) {
              importResults.failed++;
              importResults.errors.push({
                row: i + csvData.indexOf(userData) + 2,
                email: userData.email || 'N/A',
                errors: validationErrors
              });
              continue;
            }

            // Check if user already exists
            const { data: existingUser } = await supabase
              .from('profiles')
              .select('id, email')
              .eq('email', userData.email)
              .maybeSingle();

            if (existingUser) {
              importResults.failed++;
              importResults.errors.push({
                row: i + csvData.indexOf(userData) + 2,
                email: userData.email,
                errors: ['User with this email already exists']
              });
              continue;
            }

            // Generate a random password
            const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

            // Create user in auth
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
              email: userData.email,
              password: tempPassword,
              email_confirm: true
            });

            if (authError) throw authError;

            // Parse name
            const nameParts = (userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`).trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Create profile
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: authData.user.id,
                email: userData.email,
                first_name: firstName,
                last_name: lastName,
                role: userData.role.toLowerCase(),
                phone: userData.phone || null,
                company_name: userData.role.toLowerCase() === 'partner' ? (userData.company || userData.location || null) : null,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (profileError) throw profileError;

            // Skip creating user_preferences from admin panel (RLS-protected; created by app/user lifecycle)

            // Create user presence
            await supabase
              .from('user_presence')
              .insert({
                user_id: authData.user.id,
                last_seen: new Date().toISOString(),
                is_online: false
              });

            importResults.success++;
          } catch (error) {
            importResults.failed++;
            importResults.errors.push({
              row: i + csvData.indexOf(userData) + 2,
              email: userData.email || 'N/A',
              errors: [error.message || 'Unknown error']
            });
          }
        }
      }

      setResults(importResults);
      
      if (importResults.success > 0) {
        showToast(`Successfully imported ${importResults.success} user(s)`, 'success');
        onSuccess?.();
      }
      
      if (importResults.failed > 0) {
        showToast(`${importResults.failed} user(s) failed to import. Check details below.`, 'warning');
      }
    } catch (error) {
      console.error('Error importing users:', error);
      showToast(`Error importing users: ${error.message}`, 'error');
    } finally {
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

  const downloadTemplate = () => {
    const template = `Name,Email,Role,Phone,Company,Location
John Doe,john.doe@example.com,seeker,+1234567890,,
Jane Smith,jane.smith@example.com,partner,+1234567891,Acme Corp,New York`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'user_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Upload" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Import Users</h2>
              <p className="text-sm text-muted-foreground">Import users from CSV file</p>
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
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-medium text-foreground">CSV Format Requirements</h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Required columns: Name (or First Name/Last Name), Email, Role</li>
              <li>Optional columns: Phone, Company, Location</li>
              <li>Role must be: seeker, partner, or admin</li>
              <li>Email addresses must be unique</li>
            </ul>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              iconName="Download"
              iconPosition="left"
              className="mt-2"
            >
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Select CSV File</label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Icon name="Upload" size={32} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-foreground mb-1">
                  {file ? file.name : 'Click to select CSV file'}
                </p>
                <p className="text-xs text-muted-foreground">CSV files only</p>
              </label>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Import Results</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{results.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="bg-success/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-success">{results.success}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{results.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <h4 className="text-sm font-medium text-destructive mb-2">Errors:</h4>
                  <div className="space-y-2">
                    {results.errors.map((error, index) => (
                      <div key={index} className="text-xs">
                        <p className="font-medium text-foreground">
                          Row {error.row} ({error.email}):
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground ml-2">
                          {error.errors.map((err, errIndex) => (
                            <li key={errIndex}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isProcessing}
          >
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && (
            <Button 
              variant="default" 
              onClick={handleImport}
              loading={isProcessing}
              iconName="Upload"
              iconPosition="left"
              disabled={!file}
            >
              {isProcessing ? 'Importing...' : 'Import Users'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportUsersModal;

