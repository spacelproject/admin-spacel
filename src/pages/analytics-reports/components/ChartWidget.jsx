import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import Button from '../../../components/ui/Button';

const ChartWidget = ({ title, type, data, onRemove, onDrillDown }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const colors = ['#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED', '#DB2777'];

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#2563EB" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return <div className="h-64 flex items-center justify-center text-muted-foreground">No chart data available</div>;
    }
  };

  return (
    <div className={`bg-card border border-border rounded-lg card-shadow transition-all duration-300 ${
      isExpanded ? 'col-span-full' : ''
    }`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              iconName={isExpanded ? "Minimize2" : "Maximize2"}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onDrillDown}
              iconName="ZoomIn"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              iconName="X"
            />
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {renderChart()}
      </div>
    </div>
  );
};

export default ChartWidget;