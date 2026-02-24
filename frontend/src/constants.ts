// Constants for Connected Auto Dashboard

import {
  LayoutDashboard,
  Map,
  TrendingUp,
  AlertTriangle,
  FileText,
  Cpu,
  Wifi,
  Settings,
  Building2,
  Users,
  Plus,
  MapPin,
  BarChart3,
  Truck,
  CircleDot,
  Square,
  Battery,
  Thermometer,
  Headphones,
  UserPlus
} from 'lucide-react';

import { UserRole } from './types';

const ALL_ROLES: UserRole[] = ['SUPER_ADMIN', 'OEM', 'RND', 'DEALER', 'SERVICE', 'FLEET', 'SALES', 'RIDER', 'USER'];

export const MENU_ITEMS: { icon: any; label: string; id: string; roles: UserRole[]; subItems?: any[] }[] = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', roles: ALL_ROLES },
  { icon: Truck, label: 'Vehicle Management', id: 'add-vehicle', roles: ALL_ROLES },
  { icon: Users, label: 'Dealer Management', id: 'dealer-management', roles: ['SUPER_ADMIN', 'OEM', 'RND', 'SALES'] },
  { icon: Truck, label: 'Fleet Management', id: 'fleet-management', roles: ['SUPER_ADMIN', 'OEM', 'RND', 'SALES','DEALER']  },
  { icon: Map, label: 'Live Tracking', id: 'tracking', roles: ALL_ROLES },
  { icon: TrendingUp, label: 'Vehicle Insights', id: 'insights', roles: ALL_ROLES },
  { icon: AlertTriangle, label: 'Fault Analysis', id: 'faults', roles: ['SUPER_ADMIN', 'OEM', 'RND', 'SALES','DEALER','SERVICE','FLEET',]  },
  { icon: FileText, label: 'Reports', id: 'reports', roles: ALL_ROLES },
  { icon: Cpu, label: 'Device Management', id: 'devices', roles: ALL_ROLES },
  { icon: Wifi, label: 'Software Updates', id: 'fota', roles: ALL_ROLES },
  { icon: Headphones, label: 'Support & Connect', id: 'support-connect', roles: ALL_ROLES },
  { icon: Settings, label: 'Configure', id: 'configure', roles: ALL_ROLES },
  { icon: Building2, label: 'Enterprise Settings', id: 'enterprise', roles: ['SUPER_ADMIN', 'OEM', 'RND', 'SALES'] }
];

export const QUICK_ACTIONS = [
  { icon: Map, label: 'Live Tracking', color: 'bg-blue-500' },
  { icon: BarChart3, label: 'Statistics', color: 'bg-green-500' },
  { icon: MapPin, label: 'Route Replay', color: 'bg-purple-500' },
  { icon: Plus, label: 'Add Users', color: 'bg-orange-500' },
  { icon: Cpu, label: 'Device Mapping', color: 'bg-cyan-500' },
  { icon: Users, label: 'User Management', color: 'bg-pink-500' }
];

export const INITIAL_DEVICE_STATS = {
  active: 1248,
  faulty: 15,
  inactive: 156,
  total: 1419
};

export const INITIAL_SALES_DATA = {
  sold: 8456,
  inventory: 12000,
  percentage: 70
};

export const INITIAL_ENVIRONMENTAL_DATA = {
  co2Saved: 857,
  totalKm: 1000,
  treesEquivalent: 105
};

// Dealer Management Data for Plant Users
export const DEALER_DATA = [
  {
    id: 'D001',
    name: 'Mumbai Motors',
    location: 'Mumbai, Maharashtra',
    contact: '+91 98765 43210',
    email: 'contact@mumbaimotors.com',
    establishedYear: 2020,
    vehicles: {
      twoWheeler: [
        {
          vehicleId: 'KG-2026-0012',
          vin: 'MA1KG12345678901',
          model: 'Kinetic Zulu',
          vcuNumber: 'VCU-MM-001',
          batterySerialNo: 'BSN-MM-2026-001',
          imei: '860123456789012',
          status: 'assigned',
          customerName: 'Rajesh Kumar',
          licensePlate: 'MH-01-AB-1234',
          deliveryDate: '2026-01-10'
        },
        {
          vehicleId: 'KG-2026-0013',
          vin: 'MA1KG12345678902',
          model: 'Kinetic Zulu',
          vcuNumber: 'VCU-MM-002',
          batterySerialNo: 'BSN-MM-2026-002',
          imei: '860123456789013',
          status: 'assigned',
          customerName: 'Priya Sharma',
          licensePlate: 'MH-01-AB-1235',
          deliveryDate: '2026-01-15'
        },
        {
          vehicleId: 'KG-2026-0014',
          vin: 'MA1KG12345678903',
          model: 'Kinetic Zoom',
          vcuNumber: 'VCU-MM-003',
          batterySerialNo: 'BSN-MM-2026-003',
          imei: '860123456789014',
          status: 'in-stock',
          customerName: '',
          licensePlate: ''
        },
        {
          vehicleId: 'KG-2026-0015',
          vin: 'MA1KG12345678904',
          model: 'Kinetic Zoom',
          vcuNumber: 'VCU-MM-004',
          batterySerialNo: 'BSN-MM-2026-004',
          imei: '860123456789015',
          status: 'assigned',
          customerName: 'Amit Patel',
          licensePlate: 'MH-01-AB-1236',
          deliveryDate: '2026-01-18'
        }
      ],
      threeWheeler: [
        {
          vehicleId: 'KG-2026-3001',
          vin: 'MA1KG32345678905',
          model: 'Kinetic Cargo Pro',
          vcuNumber: 'VCU-MM-3001',
          batterySerialNo: 'BSN-MM-2026-3001',
          imei: '860123456789016',
          status: 'assigned',
          customerName: 'Suresh Enterprises',
          licensePlate: 'MH-01-CD-5678',
          deliveryDate: '2026-01-12'
        },
        {
          vehicleId: 'KG-2026-3002',
          vin: 'MA1KG32345678906',
          model: 'Kinetic Cargo Pro',
          vcuNumber: 'VCU-MM-3002',
          batterySerialNo: 'BSN-MM-2026-3002',
          imei: '860123456789017',
          status: 'in-stock',
          customerName: '',
          licensePlate: ''
        }
      ]
    }
  },
  {
    id: 'D002',
    name: 'Delhi Auto Hub',
    location: 'New Delhi',
    contact: '+91 99887 76543',
    email: 'info@delhiautohub.com',
    establishedYear: 2019,
    vehicles: {
      twoWheeler: [
        {
          vehicleId: 'KG-2026-0025',
          vin: 'MA1KG12345678920',
          model: 'Kinetic Zulu',
          vcuNumber: 'VCU-DH-001',
          batterySerialNo: 'BSN-DH-2026-001',
          imei: '860123456789030',
          status: 'assigned',
          customerName: 'Arjun Singh',
          licensePlate: 'DL-08-CD-2345',
          deliveryDate: '2026-01-08'
        },
        {
          vehicleId: 'KG-2026-0026',
          vin: 'MA1KG12345678921',
          model: 'Kinetic Zoom',
          vcuNumber: 'VCU-DH-002',
          batterySerialNo: 'BSN-DH-2026-002',
          imei: '860123456789031',
          status: 'in-stock',
          customerName: '',
          licensePlate: ''
        },
        {
          vehicleId: 'KG-2026-0027',
          vin: 'MA1KG12345678922',
          model: 'Kinetic Zoom',
          vcuNumber: 'VCU-DH-003',
          batterySerialNo: 'BSN-DH-2026-003',
          imei: '860123456789032',
          status: 'assigned',
          customerName: 'Neha Gupta',
          licensePlate: 'DL-08-CD-2346',
          deliveryDate: '2026-01-14'
        }
      ],
      threeWheeler: [
        {
          vehicleId: 'KG-2026-3010',
          vin: 'MA1KG32345678923',
          model: 'Kinetic Cargo Max',
          vcuNumber: 'VCU-DH-3001',
          batterySerialNo: 'BSN-DH-2026-3001',
          imei: '860123456789033',
          status: 'assigned',
          customerName: 'Fast Logistics Pvt Ltd',
          licensePlate: 'DL-08-EF-7890',
          deliveryDate: '2026-01-05'
        },
        {
          vehicleId: 'KG-2026-3011',
          vin: 'MA1KG32345678924',
          model: 'Kinetic Cargo Max',
          vcuNumber: 'VCU-DH-3002',
          batterySerialNo: 'BSN-DH-2026-3002',
          imei: '860123456789034',
          status: 'assigned',
          customerName: 'City Delivery Services',
          licensePlate: 'DL-08-EF-7891',
          deliveryDate: '2026-01-16'
        },
        {
          vehicleId: 'KG-2026-3012',
          vin: 'MA1KG32345678925',
          model: 'Kinetic Cargo Pro',
          vcuNumber: 'VCU-DH-3003',
          batterySerialNo: 'BSN-DH-2026-3003',
          imei: '860123456789035',
          status: 'in-stock',
          customerName: '',
          licensePlate: ''
        }
      ]
    }
  },
  {
    id: 'D003',
    name: 'Bangalore EV Center',
    location: 'Bangalore, Karnataka',
    contact: '+91 97654 32109',
    email: 'sales@bangaloreev.com',
    establishedYear: 2021,
    vehicles: {
      twoWheeler: [
        {
          vehicleId: 'KG-2026-0040',
          vin: 'MA1KG12345678940',
          model: 'Kinetic Zulu',
          vcuNumber: 'VCU-BEC-001',
          batterySerialNo: 'BSN-BEC-2026-001',
          imei: '860123456789050',
          status: 'assigned',
          customerName: 'Karthik Reddy',
          licensePlate: 'KA-01-MN-3456',
          deliveryDate: '2026-01-11'
        },
        {
          vehicleId: 'KG-2026-0041',
          vin: 'MA1KG12345678941',
          model: 'Kinetic Zulu',
          vcuNumber: 'VCU-BEC-002',
          batterySerialNo: 'BSN-BEC-2026-002',
          imei: '860123456789051',
          status: 'assigned',
          customerName: 'Lakshmi Iyer',
          licensePlate: 'KA-01-MN-3457',
          deliveryDate: '2026-01-19'
        },
        {
          vehicleId: 'KG-2026-0042',
          vin: 'MA1KG12345678942',
          model: 'Kinetic Zoom',
          vcuNumber: 'VCU-BEC-003',
          batterySerialNo: 'BSN-BEC-2026-003',
          imei: '860123456789052',
          status: 'in-stock',
          customerName: '',
          licensePlate: ''
        }
      ],
      threeWheeler: [
        {
          vehicleId: 'KG-2026-3020',
          vin: 'MA1KG32345678943',
          model: 'Kinetic Cargo Pro',
          vcuNumber: 'VCU-BEC-3001',
          batterySerialNo: 'BSN-BEC-2026-3001',
          imei: '860123456789053',
          status: 'assigned',
          customerName: 'Metro Goods Transport',
          licensePlate: 'KA-01-OP-8901',
          deliveryDate: '2026-01-07'
        },
        {
          vehicleId: 'KG-2026-3021',
          vin: 'MA1KG32345678944',
          model: 'Kinetic Cargo Max',
          vcuNumber: 'VCU-BEC-3002',
          batterySerialNo: 'BSN-BEC-2026-3002',
          imei: '860123456789054',
          status: 'in-stock',
          customerName: '',
          licensePlate: ''
        }
      ]
    }
  }
];

// Recent Alerts & Notifications
export const RECENT_ALERTS = [
  {
    id: 1,
    type: 'critical',
    title: 'Engine Temperature Warning',
    vehicle: 'Kinetic Scooter 1 - ABC 1234',
    timestamp: '2 minutes ago',
    location: 'Downtown Mumbai',
    status: 'active'
  },
  {
    id: 2,
    type: 'warning',
    title: 'Low Battery Alert',
    vehicle: 'Kinetic Scooter 2 - ABC 1235',
    timestamp: '15 minutes ago',
    location: 'Bandra West',
    status: 'active'
  },
  {
    id: 3,
    type: 'info',
    title: 'Maintenance Due',
    vehicle: 'Kinetic Scooter 3 - ABC 1236',
    timestamp: '1 hour ago',
    location: 'Andheri East',
    status: 'pending'
  },
  {
    id: 4,
    type: 'resolved',
    title: 'GPS Signal Lost',
    vehicle: 'Kinetic Scooter 4 - ABC 1237',
    timestamp: '3 hours ago',
    location: 'Powai',
    status: 'resolved'
  },
  {
    id: 5,
    type: 'warning',
    title: 'Tire Pressure Low',
    vehicle: 'Kinetic Scooter 5 - ABC 1238',
    timestamp: '5 hours ago',
    location: 'Goregaon',
    status: 'active'
  },
  {
    id: 6,
    type: 'critical',
    title: 'Inverter Overcurrent Detected',
    vehicle: 'Kinetic Scooter 7 - ABC 1240',
    timestamp: '12 minutes ago',
    location: 'Mahim',
    status: 'active'
  },
  {
    id: 7,
    type: 'critical',
    title: 'Thermal Runaway Risk',
    vehicle: 'Kinetic Scooter 7 - ABC 1241',
    timestamp: '28 minutes ago',
    location: 'Kurla',
    status: 'active'
  },
  {
    id: 8,
    type: 'warning',
    title: 'Brake Pressure Sensor Fault',
    vehicle: 'Kinetic Scooter 7 - ABC 1240',
    timestamp: '1 hour ago',
    location: 'Sion',
    status: 'pending'
  }
];

// Total Vehicle Data - Programmatically Generated
const generateFleetVehicles = () => {
  const vehicles = [];
  const totalVehicles = 25000;

  const statuses = ['active', 'charging', 'idle', 'maintenance'];
  const statusWeights = [0.80, 0.10, 0.07, 0.03]; // 80% active, 10% charging, 7% idle, 3% maintenance
  const types = ['Electric Scooter', 'Electric tri Wheeler', 'Electric MPV', 'Electric Cargo'];
  const dealerIds = ['D001', 'D002', 'D003'];
  const driverNames = [
    'Raj Kumar', 'Priya Singh', 'Amit Patel', 'Sneha Desai', 'Vikram Shah',
    'Farhan Ali', 'Karthik Reddy', 'Lakshmi Iyer', 'Arjun Singh', 'Neha Gupta',
    'Rajesh Kumar', 'Suresh Enterprises', 'Fast Logistics Pvt Ltd', 'City Delivery Services',
    'Metro Goods Transport', 'Unassigned'
  ];

  const getWeightedStatus = () => {
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < statuses.length; i++) {
      cumulative += statusWeights[i];
      if (rand < cumulative) return statuses[i];
    }
    return statuses[0];
  };

  for (let i = 1; i <= totalVehicles; i++) {
    const status = getWeightedStatus();
    const paddedId = String(i).padStart(6, '0');
    const licensePlateNum = String(1000 + (i % 9000)).padStart(4, '0');
    const battery = status === 'maintenance' ? Math.floor(Math.random() * 20) :
      status === 'charging' ? Math.floor(Math.random() * 40) + 20 :
        status === 'idle' ? Math.floor(Math.random() * 30) + 40 :
          Math.floor(Math.random() * 40) + 50;
    const speed = (status === 'active') ? Math.floor(Math.random() * 60) + 20 : 0;
    const health = status === 'maintenance' ? Math.floor(Math.random() * 30) + 50 :
      Math.floor(Math.random() * 30) + 70;

    vehicles.push({
      id: `V${paddedId}`,
      name: `Kinetic ${types[i % types.length]} ${i}`,
      licensePlate: `KG ${licensePlateNum}`,
      type: types[i % types.length],
      status: status,
      battery: battery,
      speed: speed,
      location: {
        lat: 19.0 + (Math.random() * 0.3),
        lng: 72.8 + (Math.random() * 0.3)
      },
      driver: status === 'maintenance' ? 'Unassigned' : driverNames[i % driverNames.length],
      lastUpdate: status === 'active' ? `${Math.floor(Math.random() * 60)} sec ago` :
        status === 'charging' ? `${Math.floor(Math.random() * 10)} min ago` :
          status === 'idle' ? `${Math.floor(Math.random() * 30)} min ago` :
            `${Math.floor(Math.random() * 12)} hours ago`,
      odometer: Math.floor(Math.random() * 100000) + 1000,
      health: health,
      dealerId: dealerIds[i % dealerIds.length]
    });
  }

  return vehicles;
};

export const FLEET_VEHICLES = generateFleetVehicles();

// Fault Codes Data
export const FAULT_CODES = [
  {
    id: 'F001',
    code: 'P0420',
    severity: 'high',
    description: 'Battery Cell Temperature High',
    vehicle: 'Kinetic Scooter 1 - ABC 1234',
    occurrences: 3,
    firstDetected: '2024-01-15 14:32',
    lastDetected: '2024-01-16 10:15',
    status: 'active'
  },
  {
    id: 'F002',
    code: 'P0171',
    severity: 'medium',
    description: 'Regenerative Braking System Warning',
    vehicle: 'Kinetic Scooter 2 - ABC 1235',
    occurrences: 1,
    firstDetected: '2024-01-16 09:45',
    lastDetected: '2024-01-16 09:45',
    status: 'active'
  },
  {
    id: 'F003',
    code: 'B1342',
    severity: 'low',
    description: 'Door Lock Sensor Malfunction',
    vehicle: 'Kinetic Scooter 3 - ABC 1236',
    occurrences: 5,
    firstDetected: '2024-01-14 16:20',
    lastDetected: '2024-01-15 18:30',
    status: 'resolved'
  },
  {
    id: 'F004',
    code: 'U0100',
    severity: 'high',
    description: 'Communication Lost with ECU',
    vehicle: 'Kinetic Scooter 6 - ABC 1239',
    occurrences: 12,
    firstDetected: '2024-01-10 08:15',
    lastDetected: '2024-01-15 22:40',
    status: 'active'
  },
  {
    id: 'F005',
    code: 'C1201',
    severity: 'medium',
    description: 'ABS System Warning',
    vehicle: 'Kinetic Scooter 4 - ABC 1237',
    occurrences: 2,
    firstDetected: '2024-01-16 07:00',
    lastDetected: '2024-01-16 08:20',
    status: 'investigating'
  },
  {
    id: 'F006',
    code: 'P0A80',
    severity: 'high',
    description: 'Battery Management System Fault',
    vehicle: 'Kinetic Scooter 1 - ABC 1234',
    occurrences: 7,
    firstDetected: '2024-01-12 11:20',
    lastDetected: '2024-01-17 09:15',
    status: 'active'
  },
  {
    id: 'F007',
    code: 'P0300',
    severity: 'medium',
    description: 'Motor Controller Overheating',
    vehicle: 'Kinetic Scooter 5 - ABC 1238',
    occurrences: 4,
    firstDetected: '2024-01-13 15:45',
    lastDetected: '2024-01-16 14:30',
    status: 'resolved'
  },
  {
    id: 'F008',
    code: 'B2141',
    severity: 'low',
    description: 'Tire Pressure Sensor Low Battery',
    vehicle: 'Kinetic Scooter 2 - ABC 1235',
    occurrences: 1,
    firstDetected: '2024-01-17 08:00',
    lastDetected: '2024-01-17 08:00',
    status: 'active'
  },
  {
    id: 'F009',
    code: 'U0001',
    severity: 'high',
    description: 'High Voltage System Isolation Fault',
    vehicle: 'Kinetic Scooter 6 - ABC 1239',
    occurrences: 15,
    firstDetected: '2024-01-08 12:30',
    lastDetected: '2024-01-16 18:45',
    status: 'active'
  },
  {
    id: 'F010',
    code: 'C1234',
    severity: 'medium',
    description: 'Stability Control System Malfunction',
    vehicle: 'Kinetic Scooter 3 - ABC 1236',
    occurrences: 3,
    firstDetected: '2024-01-15 10:20',
    lastDetected: '2024-01-16 16:10',
    status: 'investigating'
  },
  {
    id: 'F011',
    code: 'P0AA6',
    severity: 'low',
    description: 'Battery Cooling System Performance',
    vehicle: 'Kinetic Scooter 4 - ABC 1237',
    occurrences: 2,
    firstDetected: '2024-01-16 13:15',
    lastDetected: '2024-01-17 07:20',
    status: 'active'
  },
  {
    id: 'F012',
    code: 'P1A00',
    severity: 'medium',
    description: 'Charging System Voltage Low',
    vehicle: 'Kinetic Scooter 5 - ABC 1238',
    occurrences: 6,
    firstDetected: '2024-01-14 09:00',
    lastDetected: '2024-01-16 20:30',
    status: 'resolved'
  },
  {
    id: 'F013',
    code: 'P0A92',
    severity: 'high',
    description: 'Inverter Overcurrent',
    vehicle: 'Kinetic Scooter 7 - ABC 1240',
    occurrences: 9,
    firstDetected: '2026-01-18 07:12',
    lastDetected: '2026-01-21 09:05',
    status: 'active'
  },
  {
    id: 'F014',
    code: 'P0A1F',
    severity: 'high',
    description: 'Battery Thermal Runaway Risk',
    vehicle: 'Kinetic Scooter 8 - ABC 1241',
    occurrences: 4,
    firstDetected: '2026-01-20 12:40',
    lastDetected: '2026-01-21 08:52',
    status: 'active'
  },
  {
    id: 'F015',
    code: 'C1239',
    severity: 'medium',
    description: 'Brake Pressure Sensor Malfunction',
    vehicle: 'Kinetic Scooter 7 - ABC 1240',
    occurrences: 5,
    firstDetected: '2026-01-19 10:18',
    lastDetected: '2026-01-21 07:15',
    status: 'investigating'
  },
  {
    id: 'F016',
    code: 'U0124',
    severity: 'low',
    description: 'GPS Antenna Intermittent',
    vehicle: 'Kinetic Scooter 8 - ABC 1241',
    occurrences: 2,
    firstDetected: '2026-01-20 15:20',
    lastDetected: '2026-01-21 06:40',
    status: 'active'
  }
];

// Fault Code Analysis Data
export const FAULT_CODE_ANALYSIS = {
  summary: {
    totalFaults: 73,
    activeFaults: 35,
    resolvedFaults: 33,
    criticalFaults: 11,
    avgResolutionTime: 4.6
  },
  byCategory: [
    {
      category: 'Battery & Power',
      count: 18,
      percentage: 27.7,
      trend: 'increasing'
    },
    {
      category: 'Motor & Drive',
      count: 12,
      percentage: 18.5,
      trend: 'stable'
    },
    {
      category: 'Braking System',
      count: 9,
      percentage: 13.8,
      trend: 'decreasing'
    },
    {
      category: 'Communication',
      count: 14,
      percentage: 21.5,
      trend: 'increasing'
    },
    {
      category: 'Sensors',
      count: 8,
      percentage: 12.3,
      trend: 'stable'
    },
    {
      category: 'Other',
      count: 4,
      percentage: 6.2,
      trend: 'decreasing'
    }
  ],
  bySeverity: [
    { severity: 'high', count: 27, percentage: 37.0 },
    { severity: 'medium', count: 30, percentage: 41.1 },
    { severity: 'low', count: 16, percentage: 21.9 }
  ],
  topFaults: [
    {
      code: 'U0001',
      description: 'High Voltage System Isolation Fault',
      occurrences: 15,
      affectedVehicles: 2,
      avgResolutionTime: 6.5,
      lastOccurrence: '2024-01-16 18:45'
    },
    {
      code: 'P0A92',
      description: 'Inverter Overcurrent',
      occurrences: 9,
      affectedVehicles: 1,
      avgResolutionTime: 5.8,
      lastOccurrence: '2026-01-21 09:05'
    },
    {
      code: 'P0A1F',
      description: 'Battery Thermal Runaway Risk',
      occurrences: 4,
      affectedVehicles: 1,
      avgResolutionTime: 7.1,
      lastOccurrence: '2026-01-21 08:52'
    },
    {
      code: 'U0100',
      description: 'Communication Lost with ECU',
      occurrences: 12,
      affectedVehicles: 3,
      avgResolutionTime: 3.8,
      lastOccurrence: '2024-01-15 22:40'
    },
    {
      code: 'P0A80',
      description: 'Battery Management System Fault',
      occurrences: 7,
      affectedVehicles: 1,
      avgResolutionTime: 5.2,
      lastOccurrence: '2024-01-17 09:15'
    },
    {
      code: 'P1A00',
      description: 'Charging System Voltage Low',
      occurrences: 6,
      affectedVehicles: 2,
      avgResolutionTime: 2.5,
      lastOccurrence: '2024-01-16 20:30'
    }
  ],
  monthlyTrend: [
    { month: 'Sep', total: 42, resolved: 35, active: 7 },
    { month: 'Oct', total: 48, resolved: 40, active: 8 },
    { month: 'Nov', total: 38, resolved: 31, active: 7 },
    { month: 'Dec', total: 52, resolved: 45, active: 7 },
    { month: 'Jan', total: 65, resolved: 32, active: 33 }
  ],
  vehicleDistribution: [
    {
      vehicle: 'Kinetic Scooter 1',
      faultCount: 10,
      criticalCount: 2,
      status: 'attention'
    },
    {
      vehicle: 'Kinetic Scooter 2',
      faultCount: 8,
      criticalCount: 1,
      status: 'healthy'
    },
    {
      vehicle: 'Kinetic Scooter 3',
      faultCount: 9,
      criticalCount: 0,
      status: 'healthy'
    },
    {
      vehicle: 'Kinetic Scooter 4',
      faultCount: 11,
      criticalCount: 1,
      status: 'attention'
    },
    {
      vehicle: 'Kinetic Scooter 5',
      faultCount: 7,
      criticalCount: 0,
      status: 'healthy'
    },
    {
      vehicle: 'Kinetic Scooter 6',
      faultCount: 20,
      criticalCount: 4,
      status: 'critical'
    },
    {
      vehicle: 'Kinetic Scooter 7',
      faultCount: 16,
      criticalCount: 5,
      status: 'critical'
    },
    {
      vehicle: 'Kinetic Scooter 8',
      faultCount: 12,
      criticalCount: 3,
      status: 'attention'
    }
  ]
};

// Recent Trip Data
export const RECENT_TRIPS = [
  {
    id: 'T001',
    vehicle: 'Kinetic Scooter 1',
    driver: 'Raj Kumar',
    startTime: '08:30 AM',
    endTime: '09:45 AM',
    duration: '1h 15m',
    distance: '42.5 km',
    startLocation: 'Andheri West',
    endLocation: 'BKC',
    efficiency: 95,
    cost: '₹127'
  },
  {
    id: 'T002',
    vehicle: 'Kinetic Scooter 2',
    driver: 'Priya Singh',
    startTime: '07:15 AM',
    endTime: '07:52 AM',
    duration: '37m',
    distance: '18.2 km',
    startLocation: 'Malad',
    endLocation: 'Goregaon',
    efficiency: 88,
    cost: '₹45'
  },
  {
    id: 'T003',
    vehicle: 'Kinetic Scooter 3',
    driver: 'Amit Patel',
    startTime: '06:00 AM',
    endTime: '07:30 AM',
    duration: '1h 30m',
    distance: '65.8 km',
    startLocation: 'Navi Mumbai',
    endLocation: 'Worli',
    efficiency: 92,
    cost: '₹198'
  },
  {
    id: 'T004',
    vehicle: 'Kinetic Scooter 5',
    driver: 'Vikram Shah',
    startTime: '09:00 AM',
    endTime: '09:28 AM',
    duration: '28m',
    distance: '12.3 km',
    startLocation: 'Powai',
    endLocation: 'Vikhroli',
    efficiency: 90,
    cost: '₹32'
  }
];

// Performance Metrics (Last 7 days)
export const PERFORMANCE_METRICS = {
  dailyStats: [
    { day: 'Mon', trips: 145, distance: 3240, efficiency: 91, incidents: 2 },
    { day: 'Tue', trips: 158, distance: 3456, efficiency: 89, incidents: 3 },
    { day: 'Wed', trips: 162, distance: 3598, efficiency: 93, incidents: 1 },
    { day: 'Thu', trips: 171, distance: 3712, efficiency: 92, incidents: 2 },
    { day: 'Fri', trips: 168, distance: 3645, efficiency: 94, incidents: 1 },
    { day: 'Sat', trips: 134, distance: 2987, efficiency: 88, incidents: 4 },
    { day: 'Sun', trips: 122, distance: 2645, efficiency: 90, incidents: 2 }
  ],
  weeklyTotals: {
    totalTrips: 1060,
    totalDistance: 23283,
    avgEfficiency: 91,
    totalIncidents: 15
  }
};

// Charging Station Data
export const CHARGING_STATIONS = [
  {
    id: 'CS001',
    name: 'PowerHub BKC',
    location: 'Bandra Kurla Complex',
    totalSlots: 12,
    occupiedSlots: 8,
    availableSlots: 4,
    fastChargers: 6,
    normalChargers: 6,
    status: 'operational'
  },
  {
    id: 'CS002',
    name: 'QuickCharge Andheri',
    location: 'Andheri West',
    totalSlots: 8,
    occupiedSlots: 8,
    availableSlots: 0,
    fastChargers: 4,
    normalChargers: 4,
    status: 'full'
  },
  {
    id: 'CS003',
    name: 'EcoCharge Powai',
    location: 'Powai Lake',
    totalSlots: 10,
    occupiedSlots: 3,
    availableSlots: 7,
    fastChargers: 5,
    normalChargers: 5,
    status: 'operational'
  },
  {
    id: 'CS004',
    name: 'VoltStation Malad',
    location: 'Malad East',
    totalSlots: 6,
    occupiedSlots: 0,
    availableSlots: 0,
    fastChargers: 3,
    normalChargers: 3,
    status: 'maintenance'
  }
];

// Driver Performance Data
export const DRIVER_PERFORMANCE = [
  {
    id: 'D001',
    name: 'Raj Kumar',
    rating: 4.8,
    totalTrips: 324,
    totalDistance: 8956,
    efficiency: 94,
    incidents: 2,
    status: 'excellent'
  },
  {
    id: 'D002',
    name: 'Priya Singh',
    rating: 4.6,
    totalTrips: 287,
    totalDistance: 6234,
    efficiency: 91,
    incidents: 3,
    status: 'good'
  },
  {
    id: 'D003',
    name: 'Amit Patel',
    rating: 4.9,
    totalTrips: 412,
    totalDistance: 12458,
    efficiency: 96,
    incidents: 1,
    status: 'excellent'
  },
  {
    id: 'D004',
    name: 'Sneha Desai',
    rating: 4.3,
    totalTrips: 198,
    totalDistance: 4567,
    efficiency: 87,
    incidents: 5,
    status: 'average'
  },
  {
    id: 'D005',
    name: 'Vikram Shah',
    rating: 4.7,
    totalTrips: 356,
    totalDistance: 7823,
    efficiency: 93,
    incidents: 2,
    status: 'good'
  }
];

// Vehicle Insights Data
export const VEHICLE_INSIGHTS = [
  {
    id: 'VI001',
    vehicle: 'Kinetic Scooter 1',
    licensePlate: 'ABC 1234',
    totalTrips: 342,
    totalDistance: 2.4,
    avgSpeed: 28,
    fuelEfficiency: 95.6,
    uptime: 96.5,
    maintenanceCost: 1245,
    revenue: 18560,
    utilizationRate: 89,
    lastService: '2026-01-05',
    nextService: '2026-02-05',
    healthScore: 94,
    batteryHealth: 96,
    tireCondition: 88,
    brakeHealth: 92,
    co2Saved: 785,
    monthlyTrend: [
      { month: 'Sep', trips: 82, distance: 587, revenue: 4450 },
      { month: 'Oct', trips: 89, distance: 634, revenue: 4830 },
      { month: 'Nov', trips: 76, distance: 543, revenue: 4120 },
      { month: 'Dec', trips: 95, distance: 692, revenue: 5160 },
      { month: 'Jan', trips: 58, distance: 412, revenue: 3140 }
    ]
  },
  {
    id: 'VI002',
    vehicle: 'Kinetic Scooter 2',
    licensePlate: 'ABC 1235',
    totalTrips: 298,
    totalDistance: 2.1,
    avgSpeed: 25,
    fuelEfficiency: 92.3,
    uptime: 94.2,
    maintenanceCost: 1456,
    revenue: 16280,
    utilizationRate: 85,
    lastService: '2025-12-28',
    nextService: '2026-01-28',
    healthScore: 91,
    batteryHealth: 93,
    tireCondition: 85,
    brakeHealth: 90,
    co2Saved: 682,
    monthlyTrend: [
      { month: 'Sep', trips: 72, distance: 498, revenue: 3920 },
      { month: 'Oct', trips: 78, distance: 534, revenue: 4240 },
      { month: 'Nov', trips: 65, distance: 445, revenue: 3540 },
      { month: 'Dec', trips: 83, distance: 587, revenue: 4520 },
      { month: 'Jan', trips: 51, distance: 362, revenue: 2780 }
    ]
  },
  {
    id: 'VI003',
    vehicle: 'Kinetic Scooter 3',
    licensePlate: 'ABC 1236',
    totalTrips: 387,
    totalDistance: 2.7,
    avgSpeed: 32,
    fuelEfficiency: 97.8,
    uptime: 98.1,
    maintenanceCost: 985,
    revenue: 21050,
    utilizationRate: 93,
    lastService: '2026-01-10',
    nextService: '2026-02-10',
    healthScore: 97,
    batteryHealth: 98,
    tireCondition: 94,
    brakeHealth: 96,
    co2Saved: 892,
    monthlyTrend: [
      { month: 'Sep', trips: 93, distance: 668, revenue: 5060 },
      { month: 'Oct', trips: 98, distance: 705, revenue: 5330 },
      { month: 'Nov', trips: 87, distance: 624, revenue: 4730 },
      { month: 'Dec', trips: 109, distance: 792, revenue: 5930 },
      { month: 'Jan', trips: 68, distance: 489, revenue: 3700 }
    ]
  },
  {
    id: 'VI004',
    vehicle: 'Kinetic Scooter 4',
    licensePlate: 'ABC 1237',
    totalTrips: 256,
    totalDistance: 1.8,
    avgSpeed: 24,
    fuelEfficiency: 88.4,
    uptime: 87.6,
    maintenanceCost: 1876,
    revenue: 13920,
    utilizationRate: 76,
    lastService: '2025-12-15',
    nextService: '2026-01-15',
    healthScore: 84,
    batteryHealth: 86,
    tireCondition: 78,
    brakeHealth: 85,
    co2Saved: 583,
    monthlyTrend: [
      { month: 'Sep', trips: 64, distance: 445, revenue: 3480 },
      { month: 'Oct', trips: 67, distance: 478, revenue: 3640 },
      { month: 'Nov', trips: 58, distance: 412, revenue: 3150 },
      { month: 'Dec', trips: 69, distance: 488, revenue: 3750 },
      { month: 'Jan', trips: 43, distance: 305, revenue: 2340 }
    ]
  },
  {
    id: 'VI005',
    vehicle: 'Kinetic Scooter 5',
    licensePlate: 'ABC 1238',
    totalTrips: 315,
    totalDistance: 2.2,
    avgSpeed: 27,
    fuelEfficiency: 93.7,
    uptime: 95.3,
    maintenanceCost: 1134,
    revenue: 17120,
    utilizationRate: 87,
    lastService: '2026-01-03',
    nextService: '2026-02-03',
    healthScore: 93,
    batteryHealth: 95,
    tireCondition: 90,
    brakeHealth: 93,
    co2Saved: 724,
    monthlyTrend: [
      { month: 'Sep', trips: 76, distance: 534, revenue: 4130 },
      { month: 'Oct', trips: 82, distance: 578, revenue: 4460 },
      { month: 'Nov', trips: 71, distance: 498, revenue: 3860 },
      { month: 'Dec', trips: 86, distance: 605, revenue: 4670 },
      { month: 'Jan', trips: 54, distance: 382, revenue: 2940 }
    ]
  },
  {
    id: 'VI006',
    vehicle: 'Kinetic Scooter 6',
    licensePlate: 'ABC 1239',
    totalTrips: 361,
    totalDistance: 2.5,
    avgSpeed: 30,
    fuelEfficiency: 96.2,
    uptime: 97.4,
    maintenanceCost: 1068,
    revenue: 19630,
    utilizationRate: 91,
    lastService: '2026-01-08',
    nextService: '2026-02-08',
    healthScore: 96,
    batteryHealth: 97,
    tireCondition: 93,
    brakeHealth: 95,
    co2Saved: 831,
    monthlyTrend: [
      { month: 'Sep', trips: 87, distance: 624, revenue: 4730 },
      { month: 'Oct', trips: 93, distance: 668, revenue: 5060 },
      { month: 'Nov', trips: 84, distance: 602, revenue: 4570 },
      { month: 'Dec', trips: 97, distance: 704, revenue: 5270 },
      { month: 'Jan', trips: 61, distance: 438, revenue: 3320 }
    ]
  },
  {
    id: 'VI007',
    vehicle: 'Kinetic Scooter 7',
    licensePlate: 'ABC 1240',
    totalTrips: 190,
    totalDistance: 1.4,
    avgSpeed: 19,
    fuelEfficiency: 81.2,
    uptime: 72.5,
    maintenanceCost: 3560,
    revenue: 9800,
    utilizationRate: 52,
    lastService: '2025-12-22',
    nextService: '2026-01-22',
    healthScore: 62,
    batteryHealth: 58,
    tireCondition: 64,
    brakeHealth: 59,
    co2Saved: 312,
    monthlyTrend: [
      { month: 'Sep', trips: 38, distance: 212, revenue: 1580 },
      { month: 'Oct', trips: 44, distance: 238, revenue: 1760 },
      { month: 'Nov', trips: 36, distance: 198, revenue: 1490 },
      { month: 'Dec', trips: 49, distance: 268, revenue: 1960 },
      { month: 'Jan', trips: 23, distance: 128, revenue: 910 }
    ]
  },
  {
    id: 'VI008',
    vehicle: 'Kinetic Scooter 8',
    licensePlate: 'ABC 1241',
    totalTrips: 214,
    totalDistance: 1.6,
    avgSpeed: 21,
    fuelEfficiency: 84.6,
    uptime: 78.9,
    maintenanceCost: 2980,
    revenue: 11240,
    utilizationRate: 58,
    lastService: '2026-01-02',
    nextService: '2026-01-20',
    healthScore: 68,
    batteryHealth: 62,
    tireCondition: 70,
    brakeHealth: 66,
    co2Saved: 356,
    monthlyTrend: [
      { month: 'Sep', trips: 42, distance: 235, revenue: 1760 },
      { month: 'Oct', trips: 46, distance: 254, revenue: 1900 },
      { month: 'Nov', trips: 39, distance: 218, revenue: 1650 },
      { month: 'Dec', trips: 51, distance: 286, revenue: 2100 },
      { month: 'Jan', trips: 28, distance: 155, revenue: 1230 }
    ]
  }
];
