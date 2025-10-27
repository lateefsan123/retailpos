import React, { useState, useEffect } from 'react';
import { useBusinessId } from '../hooks/useBusinessId';
import { useBranch } from '../contexts/BranchContext';
import { useRole } from '../contexts/RoleContext';
import CustomerFieldManager from '../components/CustomerFieldManager';
import { CustomerFieldDefinition } from '../types/multitenant';
import { Button } from '../components/ui/Button';
import { Settings, Users, Database } from 'lucide-react';

const CustomerCustomization = () => {
  const { businessId, businessLoading } = useBusinessId();
  const { selectedBranchId } = useBranch();
  const { hasPermission } = useRole();
  
  const [activeTab, setActiveTab] = useState<'fields' | 'preview'>('fields');
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomerFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const canManageCustomers = hasPermission('canProcessSales');

  useEffect(() => {
    if (!businessLoading && businessId) {
      setLoading(false);
    }
  }, [businessId, businessLoading]);

  if (businessLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading customer customization settings...</p>
        </div>
      </div>
    );
  }

  if (!canManageCustomers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">You don't have permission to manage customer customization settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Customization</h1>
          <p className="text-gray-600">Customize customer fields and data collection for your business</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Database size={16} />
          <span>Business ID: {businessId}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('fields')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'fields'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings size={16} />
              Field Management
            </div>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              Preview
            </div>
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'fields' && (
          <div className="p-6">
            <CustomerFieldManager
              businessId={businessId!}
              onFieldsChange={setFieldDefinitions}
            />
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Form Preview</h3>
              <p className="text-gray-600">
                This is how the customer form will appear with your custom fields.
              </p>
              
              <div className="border rounded-lg p-6 bg-gray-50">
                <div className="space-y-4 max-w-md">
                  {/* Basic Fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      disabled
                      className="w-full p-2 border rounded-md bg-white"
                      placeholder="Enter customer name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      disabled
                      className="w-full p-2 border rounded-md bg-white"
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      disabled
                      className="w-full p-2 border rounded-md bg-white"
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Custom Fields Preview */}
                  {fieldDefinitions.length > 0 ? (
                    fieldDefinitions.map((field) => (
                      <div key={field.field_id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.field_label}
                          {field.is_required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        
                        {field.field_type === 'text' && (
                          <input
                            type="text"
                            disabled
                            className="w-full p-2 border rounded-md bg-white"
                            placeholder={`Enter ${field.field_label.toLowerCase()}`}
                          />
                        )}
                        
                        {field.field_type === 'number' && (
                          <input
                            type="number"
                            disabled
                            className="w-full p-2 border rounded-md bg-white"
                            placeholder={`Enter ${field.field_label.toLowerCase()}`}
                          />
                        )}
                        
                        {field.field_type === 'date' && (
                          <input
                            type="date"
                            disabled
                            className="w-full p-2 border rounded-md bg-white"
                          />
                        )}
                        
                        {field.field_type === 'email' && (
                          <input
                            type="email"
                            disabled
                            className="w-full p-2 border rounded-md bg-white"
                            placeholder={`Enter ${field.field_label.toLowerCase()}`}
                          />
                        )}
                        
                        {field.field_type === 'phone' && (
                          <input
                            type="tel"
                            disabled
                            className="w-full p-2 border rounded-md bg-white"
                            placeholder={`Enter ${field.field_label.toLowerCase()}`}
                          />
                        )}
                        
                        {field.field_type === 'select' && (
                          <select
                            disabled
                            className="w-full p-2 border rounded-md bg-white"
                          >
                            <option>Select an option</option>
                            {field.field_options?.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        )}
                        
                        {field.field_type === 'boolean' && (
                          <select
                            disabled
                            className="w-full p-2 border rounded-md bg-white"
                          >
                            <option>Select an option</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>No custom fields defined yet.</p>
                      <p className="text-sm">Add some custom fields to see them here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerCustomization;
