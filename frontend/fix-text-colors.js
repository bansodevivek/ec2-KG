#!/usr/bin/env node

/**
 * Batch Text Color Fix Script
 * 
 * This script will fix text colors across all components to ensure:
 * - White text in dark mode
 * - Black/Gray text in light mode
 * 
 * Components to fix:
 * 1. VehicleInsights.tsx
 * 2. FaultAnalysis.tsx
 * 3. Configure.tsx
 * 4. TeamMembers.tsx
 * 5. AddVehicle.tsx
 * 6. LiveTracking.tsx
 * 7. SupportConnect.tsx
 * 8. VcuData.tsx
 * 9. BmsData.tsx
 * 10. DealerManagement.tsx (if needed)
 * 11. Header.tsx
 * 12. Sidebar.tsx
 */

const fs = require('fs');
const path = require('path');

// Pattern replacements
const replacements = [
  // Headings
  {
    pattern: /className="([^"]*?)font-bold([^"]*?)text-lg([^"]*?)"/g,
    replacement: 'className="$1font-bold$2text-lg$3${darkMode ? \'text-white\' : \'text-gray-900\'}"'
  },
  {
    pattern: /className="([^"]*?)text-2xl([^"]*?)font-bold([^"]*?)"/g,
    replacement: 'className="$1text-2xl$2font-bold$3${darkMode ? \'text-white\' : \'text-gray-900\'}"'
  },
  // Labels with text-gray-500
  {
    pattern: /className="([^"]*?)text-gray-500([^"]*?)"/g,
    replacement: 'className={`$1${darkMode ? \'text-gray-400\' : \'text-gray-500\'}$2`}'
  },
  // Body text with text-gray-600
  {
    pattern: /className="([^"]*?)text-gray-600([^"]*?)"/g,
    replacement: 'className={`$1${darkMode ? \'text-gray-300\' : \'text-gray-600\'}$2`}'
  },
  // Primary text with text-gray-900
  {
    pattern: /className="([^"]*?)text-gray-900([^"]*?)"/g,
    replacement: 'className={`$1${darkMode ? \'text-white\' : \'text-gray-900\'}$2`}'
  }
];

console.log('Text Color Fix Script');
console.log('====================\n');
console.log('This script will update text colors for dark mode compatibility.\n');
console.log('Components to process:');
console.log('- VehicleInsights.tsx');
console.log('- FaultAnalysis.tsx');
console.log('- Configure.tsx');
console.log('- And more...\n');
console.log('Note: Manual review recommended after running this script.');
