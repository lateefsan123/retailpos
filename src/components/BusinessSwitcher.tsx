import React from 'react'
import { useBusiness } from '../contexts/BusinessContext'

interface BusinessSwitcherProps {
  className?: string
}

export const BusinessSwitcher: React.FC<BusinessSwitcherProps> = ({ className = '' }) => {
  const { currentBusiness, businesses, switchBusiness, loading } = useBusiness()

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-pulse bg-gray-300 h-8 w-32 rounded"></div>
      </div>
    )
  }

  if (!currentBusiness || businesses.length <= 1) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-sm font-medium text-gray-700">
          {currentBusiness?.name || 'No Business Selected'}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <label htmlFor="business-select" className="text-xs font-medium text-gray-300">
        Store:
      </label>
      <select
        id="business-select"
        value={currentBusiness.business_id}
        onChange={(e) => switchBusiness(parseInt(e.target.value))}
        className="px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
        style={{
          backgroundColor: '#374151',
          borderColor: '#4B5563',
          color: '#ffffff'
        }}
      >
        {businesses.map((business) => (
          <option key={business.business_id} value={business.business_id} style={{ backgroundColor: '#374151', color: '#ffffff' }}>
            {business.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default BusinessSwitcher
