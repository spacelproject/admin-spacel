import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

/**
 * Export data to CSV format
 */
export const exportToCSV = (data, fileName, headers = null) => {
  try {
    let csvContent = ''
    
    if (Array.isArray(data) && data.length > 0) {
      // Use provided headers or extract from first row
      const csvHeaders = headers || Object.keys(data[0])
      csvContent += csvHeaders.join(',') + '\n'
      
      // Add data rows
      data.forEach(row => {
        const csvRow = csvHeaders.map(header => {
          const cellValue = row[header]
          if (typeof cellValue === 'object' && cellValue !== null) {
            return `"${JSON.stringify(cellValue).replace(/"/g, '""')}"`
          }
          return `"${String(cellValue || '').replace(/"/g, '""')}"`
        })
        csvContent += csvRow.join(',') + '\n'
      })
    } else if (typeof data === 'object' && data !== null) {
      // Single object
      const keys = Object.keys(data)
      csvContent += keys.join(',') + '\n'
      csvContent += keys.map(k => `"${String(data[k] || '').replace(/"/g, '""')}"`).join(',') + '\n'
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${fileName}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
    
    return { success: true, message: 'CSV file downloaded successfully' }
  } catch (error) {
    console.error('Error exporting to CSV:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export data to Excel format
 */
export const exportToExcel = (data, fileName, sheetName = 'Sheet1') => {
  try {
    const workbook = XLSX.utils.book_new()
    
    if (Array.isArray(data) && data.length > 0) {
      // Flatten nested objects for Excel
      const flattenedData = data.map(row => {
        const flatRow = {}
        Object.entries(row).forEach(([k, v]) => {
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            // Flatten nested objects
            Object.entries(v).forEach(([nk, nv]) => {
              flatRow[`${k}_${nk}`] = nv
            })
          } else {
            flatRow[k] = v
          }
        })
        return flatRow
      })
      
      const worksheet = XLSX.utils.json_to_sheet(flattenedData)
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    } else if (typeof data === 'object' && data !== null) {
      const worksheet = XLSX.utils.json_to_sheet([data])
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    }
    
    XLSX.writeFile(workbook, `${fileName}.xlsx`)
    
    return { success: true, message: 'Excel file downloaded successfully' }
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export data to PDF format
 */
export const exportToPDF = async (data, fileName, title = 'Export Report') => {
  try {
    // Dynamically import autoTable
    let autoTableFunc
    try {
      const autoTableModule = await import('jspdf-autotable')
      autoTableFunc = autoTableModule.default || autoTableModule
    } catch (e) {
      console.warn('jspdf-autotable not available, using fallback table rendering')
    }
    
    const doc = new jsPDF()
    let yPosition = 20
    const pageHeight = doc.internal.pageSize.height
    const margin = 20
    
    // Add title
    doc.setFontSize(18)
    doc.text(title, margin, yPosition)
    yPosition += 10
    
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition)
    yPosition += 15
    
    if (Array.isArray(data) && data.length > 0) {
      // Prepare table data
      const headers = Object.keys(data[0])
      const rows = data.map(row => 
        headers.map(header => {
          const cellValue = row[header]
          if (typeof cellValue === 'object' && cellValue !== null) {
            return JSON.stringify(cellValue)
          }
          return String(cellValue || '')
        })
      )
      
      // Add table using autoTable if available
      if (autoTableFunc && typeof autoTableFunc === 'function') {
        autoTableFunc(doc, {
          startY: yPosition,
          head: [headers],
          body: rows,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] }
        })
        
        // Get final Y position after table
        if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
          yPosition = doc.lastAutoTable.finalY + 10
        } else {
          yPosition += (rows.length * 5) + 20
        }
      } else {
        // Fallback: simple table without autoTable
        doc.setFontSize(8)
        const colWidth = (doc.internal.pageSize.width - (margin * 2)) / headers.length
        headers.forEach((header, i) => {
          doc.text(header.substring(0, 15), margin + (i * colWidth), yPosition)
        })
        yPosition += 8
        rows.slice(0, 30).forEach((row) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage()
            yPosition = 20
          }
          row.forEach((cell, cellIndex) => {
            doc.text(String(cell).substring(0, 12), margin + (cellIndex * colWidth), yPosition)
          })
          yPosition += 6
        })
        yPosition += 10
      }
    } else if (typeof data === 'object' && data !== null) {
      // Single object - display as key-value pairs
      const entries = Object.entries(data)
      entries.forEach(([k, v]) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage()
          yPosition = 20
        }
        doc.setFontSize(10)
        doc.text(`${k}: ${String(v)}`, margin + 5, yPosition)
        yPosition += 7
      })
    }
    
    doc.save(`${fileName}.pdf`)
    
    return { success: true, message: 'PDF file downloaded successfully' }
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export data in the specified format
 */
export const exportData = async (data, fileName, format = 'csv', options = {}) => {
  switch (format.toLowerCase()) {
    case 'csv':
      return exportToCSV(data, fileName, options.headers)
    case 'excel':
    case 'xlsx':
      return exportToExcel(data, fileName, options.sheetName)
    case 'pdf':
      return await exportToPDF(data, fileName, options.title)
    default:
      return exportToCSV(data, fileName, options.headers)
  }
}

