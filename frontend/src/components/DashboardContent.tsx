// Dashboard Content Component

import React, { useState } from 'react';
import {
    AlertTriangle,
    Cpu,
    Map as MapIcon,
    Zap,
    Clock,
    TrendingUp,
    Plus,
    Activity,
    Cloud,
    Battery,
    TreeDeciduous
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import kineticScooter from '../assets/Kinetic Flex.png';
import AddVehicle from './AddVehicle';
import { DeviceStats, SalesData, EnvironmentalData, QuickAction, Alert, Vehicle, Trip, PerformanceMetrics } from '../types';

interface DashboardContentProps {
    darkMode: boolean;
    deviceStats: DeviceStats;
    salesData: SalesData;
    environmentalData: EnvironmentalData;
    quickActions: QuickAction[];
    alerts: Alert[];
    vehicles: Vehicle[];
    trips: Trip[];
    performanceMetrics: PerformanceMetrics;
}

const DonutChart = ({ data, total, darkMode }: { data: { label: string, value: number, color: string }[], total: number, darkMode: boolean }) => {
    let accumulated = 0;
    const size = 120; // Reduced size
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                {data.map((item, index) => {
                    const percent = total > 0 ? item.value / total : 0;
                    const strokeDasharray = `${circumference * percent} ${circumference}`;
                    const strokeDashoffset = -1 * accumulated * (circumference / (total > 0 ? total : 1));
                    accumulated += item.value;

                    return (
                        <circle
                            key={index}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{total}</span>
                <span className={`text-[10px] font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>VEHICLES</span>
            </div>
        </div>
    );
};

const Gauge = ({ value, max, label, darkMode }: { value: number, max: number, label: string, darkMode: boolean }) => {
    const percent = Math.min(value / max, 1);
    const gaugeWidth = 32;
    const gaugeHeight = 16;
    return (
        <div className="flex flex-col items-center">
            <div className={`relative overflow-hidden`} style={{ width: `${gaugeWidth * 4}px`, height: `${gaugeHeight * 4}px` }}>
                <div className="absolute top-0 left-0 w-full h-full bg-gray-200 dark:bg-gray-700 rounded-t-full"></div>
                <div
                    className="absolute top-0 left-0 w-full h-full bg-blue-600 rounded-t-full origin-bottom transition-transform duration-1000 ease-out"
                    style={{ transform: `rotate(${(percent * 180) - 180}deg)` }}
                ></div>
            </div>
            <div className="flex flex-col items-center -mt-6 relative z-10">
                <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value} MW</span>
                <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
            </div>
        </div>
    )
}

const DashboardContent: React.FC<DashboardContentProps> = ({
    darkMode,
    deviceStats,
    salesData,
    environmentalData,
    quickActions,
    alerts,
    vehicles,
    trips,
    performanceMetrics
}) => {
    const [tripTooltip, setTripTooltip] = useState<{ x: number, y: number, time: string, value: number } | null>(null);

    const donutData = [
        { label: 'Active', value: deviceStats.active, color: '#3B82F6' },
        { label: 'Idle', value: deviceStats.inactive, color: '#10B981' },
        { label: 'Faulty', value: deviceStats.faulty, color: '#EF4444' }
    ];

    return (
        <div className="w-full h-full mx-auto">
            {/* Grid Container */}
            <div className="grid grid-cols-12 gap-4 h-full">

                {/* Left Column (3 cols) - Status & Overview */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">

                    {/* Live Status Card */}
                    <div className={`p-4 rounded-2xl ${darkMode
                        ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border border-gray-700/50 shadow-xl'
                        : 'bg-white shadow-lg border border-gray-100'
                        } flex flex-col justify-between flex-1 min-h-[300px]`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className={`font-bold text-lg mb-0.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Live Status</h3>
                                <p className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Real-time vehicle monitoring</p>
                            </div>
                            <div className="flex space-x-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center flex-1 my-2">
                            <DonutChart data={donutData} total={deviceStats.total} darkMode={darkMode} />
                        </div>

                        <div className="grid grid-cols-3 gap-2 w-full text-center">
                            <div className="rounded-xl p-2 border border-blue-100 bg-blue-50/50 dark:bg-blue-900/20 flex flex-col items-center justify-center">
                                <span className="text-lg font-bold text-blue-600 mb-1">{deviceStats.active.toLocaleString()}</span>
                                <span className={`text-[10px] font-medium uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active</span>
                            </div>
                            <div className="rounded-xl p-2 border border-green-100 bg-green-50/50 dark:bg-green-900/20 flex flex-col items-center justify-center">
                                <span className="text-lg font-bold text-green-600 mb-1">{deviceStats.inactive.toLocaleString()}</span>
                                <span className={`text-[10px] font-medium uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Idle</span>
                            </div>
                            <div className="rounded-xl p-2 border border-red-100 bg-red-50/50 dark:bg-red-900/20 flex flex-col items-center justify-center">
                                <span className="text-lg font-bold text-red-600 mb-1">{deviceStats.faulty.toLocaleString()}</span>
                                <span className={`text-[10px] font-medium uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Faulty</span>
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Model Card - Hidden on Mobile, Visible on Desktop */}
                    <div className={`hidden lg:flex p-4 rounded-2xl ${darkMode
                        ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border border-gray-700/50 shadow-xl'
                        : 'bg-gradient-to-br from-white to-blue-50/30 shadow-lg border border-blue-100'
                        } flex-col relative overflow-hidden group flex-1 justify-between min-h-[200px]`}>
                        <div className="flex items-center justify-between mb-2 relative z-10">
                            <div>
                                <h3 className={`font-bold text-lg mb-0.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Kinetic The Future of Green</h3>
                                <p className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Kinetic Green Series</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold shadow-sm">Featured</span>
                        </div>

                        <div className="relative flex-1 flex items-center justify-center my-2">
                            <img
                                src={kineticScooter}
                                alt="Electric Scooter"
                                className="w-full h-32 object-contain hover:scale-105 transition-transform duration-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 relative z-10">
                            <div className={`p-2 rounded-lg border ${darkMode ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-100'}`}>
                                <p className={`text-[10px] mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Range</p>
                                <p className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>100 <span className="text-[10px]">km</span></p>
                            </div>
                            <div className={`p-2 rounded-lg border ${darkMode ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-100'}`}>
                                <p className={`text-[10px] mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Health</p>
                                <p className={`text-sm font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>94<span className="text-[10px]">%</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Real-Time Demand */}
                    <div className={`p-4 rounded-2xl ${darkMode
                        ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border border-gray-700/50 shadow-xl'
                        : 'bg-white shadow-lg border border-gray-100'
                        } flex flex-col items-center justify-center min-h-[120px]`}>
                        <h3 className={`font-bold text-sm mb-0.5 self-start w-full ${darkMode ? 'text-white' : 'text-gray-900'}`}>Real-Time Demand</h3>
                        <div className="flex-1 flex items-center justify-center w-full">
                            <Gauge value={2.3} max={4} label="Current Load" darkMode={darkMode} />
                        </div>
                    </div>

                </div>

                {/* Right Column (9 cols) - Metrics & Charts */}
                <div className="col-span-12 lg:col-span-9 flex flex-col gap-4">

                    {/* Top Row: KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-24 sm:h-28">
                        <div className={`p-4 rounded-2xl ${darkMode
                            ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border border-gray-700/50 shadow-xl'
                            : 'bg-white shadow-lg border border-gray-100'
                            } flex flex-col justify-center relative overflow-hidden group hover:scale-[1.01] transition-all`}>
                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <MapIcon size={64} />
                            </div>
                            <div className="flex items-center space-x-3 relative z-10">
                                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                                    <MapIcon size={24} />
                                </div>
                                <div>
                                    <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Distance </p>
                                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{environmentalData.totalKm.toLocaleString()}<span className={`text-sm font-normal ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>km</span></p>
                                </div>
                            </div>
                        </div>

                        <div className={`p-4 rounded-2xl ${darkMode
                            ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border border-gray-700/50 shadow-xl'
                            : 'bg-white shadow-lg border border-gray-100'
                            } flex flex-col justify-center relative overflow-hidden group hover:scale-[1.01] transition-all`}>
                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Zap size={64} />
                            </div>
                            <div className="flex items-center space-x-3 relative z-10">
                                <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Energy Consumed</p>
                                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>3,640<span className={`text-sm font-normal ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>kWh</span></p>
                                </div>
                            </div>
                        </div>

                        <div className={`p-4 rounded-2xl ${darkMode
                            ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border border-gray-700/50 shadow-xl'
                            : 'bg-white shadow-lg border border-gray-100'
                            } flex flex-col justify-center relative overflow-hidden group hover:scale-[1.01] transition-all`}>
                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <TreeDeciduous size={64} />
                            </div>
                            <div className="flex items-center space-x-3 relative z-10">
                                <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                                    <TreeDeciduous size={24} />
                                </div>
                                <div>
                                    <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Trees Equivalent</p>
                                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{Math.round(environmentalData.co2Saved / 10)}<span className={`text-sm font-normal ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>trees</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Row: Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[250px]">
                        {/* Cost Savings Chart */}
                        <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} flex flex-col`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>Cost Savings vs Fuel</h3>
                                    <p className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Daily comparison</p>
                                </div>
                                <div className="flex items-center text-green-500 text-xs font-bold bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-lg">
                                    <TrendingUp size={12} className="mr-1" /> ₹19k
                                </div>
                            </div>
                            <div className="flex-1 w-full min-h-[180px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={[
                                        { day: 'Mon', petrol: 450, diesel: 380, cng: 250, ev: 40 },
                                        { day: 'Tue', petrol: 480, diesel: 400, cng: 260, ev: 45 },
                                        { day: 'Wed', petrol: 520, diesel: 440, cng: 280, ev: 50 },
                                        { day: 'Thu', petrol: 490, diesel: 410, cng: 270, ev: 48 },
                                        { day: 'Fri', petrol: 550, diesel: 460, cng: 290, ev: 55 },
                                        { day: 'Sat', petrol: 600, diesel: 500, cng: 310, ev: 60 },
                                        { day: 'Sun', petrol: 580, diesel: 480, cng: 300, ev: 58 },
                                    ]} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorPetrol" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorDiesel" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorCng" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorEv" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#374151" : "#E5E7EB"} />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#9CA3AF' : '#6B7280', fontSize: 10 }} dy={5} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#9CA3AF' : '#6B7280', fontSize: 10 }} tickFormatter={(value) => `₹${value}`} />
                                        <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1F2937' : '#FFFFFF', borderColor: darkMode ? '#374151' : '#E5E7EB', borderRadius: '8px', fontSize: '10px' }} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                                        <Area type="monotone" dataKey="petrol" name="Petrol" stroke="#EF4444" fillOpacity={1} fill="url(#colorPetrol)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="diesel" name="Diesel" stroke="#F59E0B" fillOpacity={1} fill="url(#colorDiesel)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="cng" name="CNG" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCng)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="ev" name="EV" stroke="#10B981" fillOpacity={1} fill="url(#colorEv)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Carbon Saved Chart */}
                        <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} flex flex-col`}>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>Carbon Saved</h3>
                                <div className="text-xs text-green-500 font-bold">Total: 842 kg</div>
                            </div>
                            <div className="flex-1 w-full relative min-h-0 border-l border-b border-gray-200 dark:border-gray-700 pl-6 pb-6">
                                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[8px] text-gray-400 pr-1">
                                    <span>200</span><span>150</span><span>100</span><span>50</span><span>0</span>
                                </div>
                                <svg className="absolute inset-0 w-full h-full overflow-visible pl-6 pb-6" preserveAspectRatio="none" viewBox="0 0 360 200">
                                    <defs>
                                        <linearGradient id="carbonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
                                        </linearGradient>
                                    </defs>
                                    {/* Grid Lines */}
                                    {[40, 80, 120, 160].map(y => <line key={y} x1="0" y1={y} x2="360" y2={y} stroke={darkMode ? '#374151' : '#E5E7EB'} strokeWidth="1" />)}
                                    {[90, 180, 270].map(x => <line key={x} x1={x} y1="0" x2={x} y2="200" stroke={darkMode ? '#374151' : '#E5E7EB'} strokeWidth="1" />)}

                                    <polygon fill="url(#carbonGradient)" points="0,145 12,140 24,135 36,130 48,125 60,120 72,115 84,110 96,105 108,100 120,95 132,90 144,85 156,80 168,75 180,70 192,65 204,60 216,55 228,60 240,65 252,70 264,75 276,80 288,85 300,90 312,95 324,100 336,105 348,110 360,200 0,200" className="animate-draw-area" />
                                    <polyline fill="none" stroke="#10B981" strokeWidth="2.5" points="0,145 12,140 24,135 36,130 48,125 60,120 72,115 84,110 96,105 108,100 120,95 132,90 144,85 156,80 168,75 180,70 192,65 204,60 216,55 228,60 240,65 252,70 264,75 276,80 288,85 300,90 312,95 324,100 336,105 348,110" className="animate-draw-line" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: News - Compact Grid */}
                    <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} flex-1 min-h-[200px] flex flex-col`}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>EV News & Insights</h3>
                            <button className="text-xs text-blue-500 font-semibold hover:underline">View All</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
                            {[
                                {
                                    id: 1,
                                    title: "Global EV Sales Surge by 40% in Q1",
                                    desc: "Electric vehicle adoption accelerates worldwide as major markets shift towards sustainable mobility solutions and cleaner energy grids.",
                                    category: "Growth",
                                    color: "blue",
                                    date: "2h"
                                },
                                {
                                    id: 2,
                                    title: "Solid-State Batteries Reach 1000km Range Milestone",
                                    desc: "New breakthrough in battery chemistry promises doubled range and faster charging times, revolutionizing long-distance EV travel.",
                                    category: "Tech",
                                    color: "purple",
                                    date: "5h"
                                },
                                {
                                    id: 3,
                                    title: "Smart Grids Enable Vehicle-to-Grid Energy Flow",
                                    desc: "EVs can now stabilize local power grids by feeding back excess energy during peak demand, reducing costs for owners.",
                                    category: "Infrastructure",
                                    color: "orange",
                                    date: "1d"
                                },
                                {
                                    id: 4,
                                    title: "Policy Shift Mandates Zero Emissions by 2035",
                                    desc: "New government regulations set strict deadlines for ending internal combustion engine sales, driving massive industry investment.",
                                    category: "Policy",
                                    color: "green",
                                    date: "2d"
                                }
                            ].map((post) => (
                                <div key={post.id} className={`p-3 rounded-xl border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'} hover:scale-[1.02] transition-transform cursor-pointer flex flex-col justify-between h-full`}>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full bg-${post.color}-100 text-${post.color}-600 dark:bg-${post.color}-900/30 dark:text-${post.color}-400`}>
                                                {post.category}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{post.date}</span>
                                        </div>
                                        <h4 className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'} line-clamp-2 leading-tight`}>
                                            {post.title}
                                        </h4>
                                        <p className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'} line-clamp-3 leading-relaxed`}>
                                            {post.desc}
                                        </p>
                                    </div>
                                    <div className="w-full h-1 bg-gray-200 dark:bg-gray-600 rounded-full mt-3 overflow-hidden">
                                        <div className={`h-full bg-${post.color}-500 w-2/3`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DashboardContent;
