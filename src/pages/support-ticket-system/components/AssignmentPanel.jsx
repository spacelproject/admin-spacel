import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import Image from '../../../components/AppImage';

const AssignmentPanel = ({ supportAgents, onAssignTickets, loading = false }) => {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [autoAssign, setAutoAssign] = useState(true);

  useEffect(() => {
    // Load auto-assign preference from localStorage
    const saved = localStorage.getItem('support_auto_assign');
    if (saved !== null) {
      setAutoAssign(saved === 'true');
    }
  }, []);

  const handleAutoAssignToggle = (checked) => {
    setAutoAssign(checked);
    localStorage.setItem('support_auto_assign', checked.toString());
  };

  const agentOptions = supportAgents.map(agent => ({
    value: agent.id,
    label: `${agent.name} (${agent.activeTickets} active)`
  }));

  const handleManualAssign = () => {
    if (selectedAgent) {
      onAssignTickets(selectedAgent);
      setSelectedAgent('');
    }
  };

  const handleAutoAssign = () => {
    onAssignTickets('auto');
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <LoadingSpinner text="Loading support team..." />
      </div>
    )
  }

  if (!supportAgents || supportAgents.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <p className="text-muted-foreground">No support agents found. Please add support agents in admin users.</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">Support Team Workload</h3>
      
      {/* Agent Workload Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {supportAgents.map((agent) => (
          <div key={agent.id} className="bg-muted rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Image
                src={agent.avatar}
                alt={agent.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{agent.name}</h4>
                <p className="text-sm text-muted-foreground">{agent.role}</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${agent.status === 'online' ? 'bg-green-500' : agent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Tickets:</span>
                <span className="font-medium text-foreground">{agent.activeTickets}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Response:</span>
                <span className="font-medium text-foreground">{agent.avgResponseTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Satisfaction:</span>
                <span className="font-medium text-foreground">{agent.satisfactionRate}%</span>
              </div>
            </div>

            {/* Workload Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Workload</span>
                <span>{Math.round((agent.activeTickets / 20) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    agent.activeTickets <= 10 ? 'bg-green-500' : 
                    agent.activeTickets <= 15 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((agent.activeTickets / 20) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Assignment Controls */}
      <div className="border-t border-border pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoAssign"
                checked={autoAssign}
                onChange={(e) => handleAutoAssignToggle(e.target.checked)}
                className="rounded border-border"
              />
              <label htmlFor="autoAssign" className="text-sm font-medium text-foreground">
                Auto-assign new tickets
              </label>
            </div>
            
            {autoAssign && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoAssign}
                iconName="Zap"
                iconPosition="left"
              >
                Assign Pending
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Select
              options={agentOptions}
              value={selectedAgent}
              onChange={setSelectedAgent}
              placeholder="Select agent..."
              className="w-48"
            />
            <Button
              onClick={handleManualAssign}
              disabled={!selectedAgent}
              iconName="UserPlus"
              iconPosition="left"
            >
              Assign Selected
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-8 pt-6 border-t border-border">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">
            {supportAgents.reduce((sum, agent) => sum + agent.activeTickets, 0)}
          </div>
          <div className="text-sm text-muted-foreground">Total Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">
            {supportAgents.filter(agent => agent.status === 'online').length}
          </div>
          <div className="text-sm text-muted-foreground">Online Agents</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">
            {supportAgents.length > 0 ? Math.round(supportAgents.reduce((sum, agent) => sum + agent.satisfactionRate, 0) / supportAgents.length) : 0}%
          </div>
          <div className="text-sm text-muted-foreground">Avg Satisfaction</div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentPanel;