import React from 'react';
import Icon from '../../../../components/AppIcon';
import PromotionalRatesTable from './PromotionalRatesTable';

const PromotionalRatesSection = () => {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Icon name="Tag" size={20} className="text-primary" />
        <h3 className="text-lg font-semibold text-card-foreground">Promotional Rates</h3>
      </div>
      
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Create and manage promotional commission rates for partners and seekers. 
          Set special rates for specific partners or apply globally to all partners.
        </p>
        
        <PromotionalRatesTable />
      </div>
    </div>
  );
};

export default PromotionalRatesSection;

