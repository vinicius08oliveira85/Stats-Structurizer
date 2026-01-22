import React from 'react';
import { ClipboardList } from 'lucide-react';

const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
      <ClipboardList className="w-16 h-16 mb-4 opacity-50" />
      <h3 className="text-lg font-medium text-gray-900">No Data Parsed Yet</h3>
      <p className="text-sm text-center max-w-sm mt-2">
        Paste your statistics text on the left to see the structured result here.
      </p>
    </div>
  );
};

export default EmptyState;
