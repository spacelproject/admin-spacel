import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

export const useDataExport = () => {
  const [exporting, setExporting] = useState(false)
  const { user, isAdmin } = useAuth()

  const exportData = async (exportConfig) => {
    if (!user || !isAdmin) {
      throw new Error('Unauthorized access')
    }

    setExporting(true)
    try {
      const { format, columns, dateRange, customDateRange } = exportConfig
      
      // Calculate date range - support custom dates and all options
      const now = new Date()
      let startDate, endDate
      
      // Handle custom date range
      if (dateRange === 'custom' && customDateRange) {
        startDate = new Date(customDateRange.from)
        endDate = new Date(customDateRange.to)
        endDate.setHours(23, 59, 59, 999) // End of day
      } else {
        endDate = now
        switch (dateRange) {
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          case '6m':
            startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
            break
          case '1y':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            break
          case 'ytd':
            startDate = new Date(now.getFullYear(), 0, 1)
            break
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }
      }
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date range specified')
      }
      
      if (startDate > endDate) {
        throw new Error('Start date cannot be after end date')
      }

      const exportData = {}

      // Fetch data based on selected columns with date range filters
      if (columns.includes('user-data')) {
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, role, created_at, updated_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
        
        if (usersError) {
          console.warn('Error fetching user data for export:', usersError)
        }
        exportData.users = usersData || []
      }

      if (columns.includes('booking-data')) {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id, status, total_paid, price, created_at, updated_at,
            listings:listing_id (name, category),
            seekers:seeker_id (first_name, last_name, email)
          `)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
        
        if (bookingsError) {
          console.warn('Error fetching booking data for export:', bookingsError)
        }
        exportData.bookings = bookingsData || []
      }

      if (columns.includes('revenue-data')) {
        const { data: revenueData, error: revenueError } = await supabase
          .from('bookings')
          .select('id, total_paid, price, created_at, status')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
        
        if (revenueError) {
          console.warn('Error fetching revenue data for export:', revenueError)
        }
        exportData.revenue = revenueData || []
      }

      if (columns.includes('space-data')) {
        const { data: spacesData, error: spacesError } = await supabase
          .from('listings')
          .select('id, name, category, status, created_at, updated_at, partner_id')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
        
        if (spacesError) {
          console.warn('Error fetching space data for export:', spacesError)
        }
        exportData.spaces = spacesData || []
      }

      if (columns.includes('performance-metrics')) {
        // Calculate performance metrics
        const { data: metricsData, error: metricsError } = await supabase
          .from('bookings')
          .select('id, status, total_paid, price, created_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())

        if (metricsError) {
          console.warn('Error fetching performance metrics for export:', metricsError)
        }

        const totalBookings = metricsData?.length || 0
        const totalRevenue = metricsData?.reduce((sum, booking) => {
          const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0
          return sum + amount
        }, 0) || 0
        const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0
        
        // Calculate conversion rate from user data if available
        let conversionRate = 0
        if (exportData.users && exportData.users.length > 0) {
          conversionRate = totalBookings > 0 ? (totalBookings / exportData.users.length) * 100 : 0
        }

        exportData.performanceMetrics = {
          totalBookings,
          totalRevenue,
          avgBookingValue,
          conversionRate: conversionRate.toFixed(2),
          period: dateRange === 'custom' && customDateRange 
            ? `${customDateRange.from} to ${customDateRange.to}`
            : dateRange,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          generatedAt: new Date().toISOString()
        }
      }

      if (columns.includes('analytics-data')) {
        // Generate analytics summary
        const { data: analyticsData, error: analyticsError } = await supabase
          .from('bookings')
          .select('id, created_at, total_paid, price')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())

        if (analyticsError) {
          console.warn('Error fetching analytics data for export:', analyticsError)
        }

        const analytics = {
          totalBookings: analyticsData?.length || 0,
          totalRevenue: analyticsData?.reduce((sum, booking) => {
            const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0
            return sum + amount
          }, 0) || 0,
          period: dateRange === 'custom' && customDateRange 
            ? `${customDateRange.from} to ${customDateRange.to}`
            : dateRange,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          generatedAt: new Date().toISOString()
        }

        exportData.analytics = analytics
      }
      
      // Check if any data was fetched
      if (Object.keys(exportData).length === 0) {
        throw new Error('No data columns selected for export')
      }

      // Generate file based on format
      let fileName
      if (dateRange === 'custom' && customDateRange) {
        fileName = `spacel-analytics-custom-${customDateRange.from}-to-${customDateRange.to}`
      } else {
        fileName = `spacel-analytics-${dateRange}-${new Date().toISOString().split('T')[0]}`
      }
      
      if (format === 'csv') {
        return generateCSV(exportData, fileName)
      } else if (format === 'excel') {
        return generateExcel(exportData, fileName)
      } else if (format === 'pdf') {
        return await generatePDF(exportData, fileName)
      }

    } catch (error) {
      console.error('Export error:', error)
      throw error
    } finally {
      setExporting(false)
    }
  }

  const generateCSV = (data, fileName) => {
    const csvContent = []
    
    Object.entries(data).forEach(([key, value]) => {
      csvContent.push(`\n=== ${key.toUpperCase()} ===\n`)
      
      if (Array.isArray(value) && value.length > 0) {
        // Generate CSV headers
        const headers = Object.keys(value[0])
        csvContent.push(headers.join(','))
        
        // Generate CSV rows
        value.forEach(row => {
          const csvRow = headers.map(header => {
            const cellValue = row[header]
            // Handle nested objects and arrays
            if (typeof cellValue === 'object' && cellValue !== null) {
              return `"${JSON.stringify(cellValue).replace(/"/g, '""')}"`
            }
            return `"${String(cellValue || '').replace(/"/g, '""')}"`
          })
          csvContent.push(csvRow.join(','))
        })
      } else if (typeof value === 'object') {
        // Handle single objects
        csvContent.push(Object.keys(value).join(','))
        csvContent.push(Object.values(value).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
      }
    })

    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${fileName}.csv`
    link.click()
    
    return { success: true, message: 'CSV file downloaded successfully' }
  }

  const generateExcel = (data, fileName) => {
    try {
      const workbook = XLSX.utils.book_new()
      
      // Create a worksheet for each data type
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          // Flatten nested objects for Excel
          const flattenedData = value.map(row => {
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
          XLSX.utils.book_append_sheet(workbook, worksheet, key)
        } else if (typeof value === 'object' && value !== null) {
          // Single object - convert to array
          const worksheet = XLSX.utils.json_to_sheet([value])
          XLSX.utils.book_append_sheet(workbook, worksheet, key)
        }
      })
      
      // Write the file
      XLSX.writeFile(workbook, `${fileName}.xlsx`)
      
      return { success: true, message: 'Excel file downloaded successfully' }
    } catch (error) {
      console.error('Error generating Excel:', error)
      // Fallback to CSV
      return generateCSV(data, fileName)
    }
  }

  const generatePDF = async (data, fileName) => {
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
      doc.text('SPACEL Analytics Report', margin, yPosition)
      yPosition += 10
      
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition)
      yPosition += 15
      
      // Process each data section
      for (const [key, value] of Object.entries(data)) {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          doc.addPage()
          yPosition = 20
        }
        
        // Section header
        doc.setFontSize(14)
        doc.text(key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '), margin, yPosition)
        yPosition += 10
        
        if (Array.isArray(value) && value.length > 0) {
          // Prepare table data
          const headers = Object.keys(value[0])
          const rows = value.map(row => 
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
        } else if (typeof value === 'object' && value !== null) {
          // Single object - display as key-value pairs
          const entries = Object.entries(value)
          entries.forEach(([k, v]) => {
            if (yPosition > pageHeight - 20) {
              doc.addPage()
              yPosition = 20
            }
            doc.setFontSize(10)
            doc.text(`${k}: ${String(v)}`, margin + 5, yPosition)
            yPosition += 7
          })
          yPosition += 5
        }
      }
      
      // Save the PDF
      doc.save(`${fileName}.pdf`)
      
      return { success: true, message: 'PDF file downloaded successfully' }
    } catch (error) {
      console.error('Error generating PDF:', error)
      // Fallback to CSV
      return generateCSV(data, fileName)
    }
  }

  return {
    exportData,
    exporting
  }
}
