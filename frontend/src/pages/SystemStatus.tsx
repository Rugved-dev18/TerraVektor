import React from 'react';
import { Settings, CheckCircle, XCircle, AlertCircle, Database, Cpu, HardDrive, Activity } from 'lucide-react';
import { HealthResponse } from '../types';

interface SystemStatusProps {
  healthStatus: HealthResponse | null;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ healthStatus }) => {
  const systemMetrics = [
    { label: 'API Status', value: healthStatus?.status || 'unknown', icon: Activity, color: healthStatus?.status === 'healthy' ? 'text-green-400' : 'text-red-400' },
    { label: 'Database', value: healthStatus?.database || 'unknown', icon: Database, color: 'text-blue-400' },
    { label: 'Version', value: healthStatus?.version || 'unknown', icon: Settings, color: 'text-slate-400' },
  ];

  const services = healthStatus?.services || {};

  return (
    <div className="p-6 space-y-6">
      <div className="glass-effect rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">System Status</h2>
        <p className="text-slate-400 mb-6">
          Monitor system health, service status, and operational metrics.
        </p>

        {/* Overall Status */}
        <div className={`mb-6 p-4 rounded-lg ${healthStatus?.status === 'healthy' ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          <div className="flex items-center">
            {healthStatus?.status === 'healthy' ? (
              <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500 mr-3" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">
                System is {healthStatus?.status === 'healthy' ? 'Operational' : 'Degraded'}
              </h3>
              <p className="text-sm text-slate-400">
                {healthStatus?.status === 'healthy' 
                  ? 'All systems are functioning normally' 
                  : 'Some services may be experiencing issues'}
              </p>
            </div>
          </div>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {systemMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">{metric.label}</span>
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                <p className={`text-lg font-bold ${metric.color}`}>
                  {metric.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Service Status */}
      <div className="glass-effect rounded-xl overflow-hidden">
        <div className="p-4 border-b border-ui-border">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Cpu className="w-5 h-5 mr-2 text-satellite-400" />
            Service Status
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(services).map(([serviceName, status]) => (
              <div key={serviceName} className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white capitalize">
                    {serviceName.replace(/_/g, ' ')}
                  </h4>
                  <div className={`w-2 h-2 rounded-full ${status === 'mock' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                </div>
                <p className="text-xs text-slate-400">
                  {status === 'mock' ? 'Mock implementation' : 'Active'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="glass-effect rounded-xl overflow-hidden">
        <div className="p-4 border-b border-ui-border">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <HardDrive className="w-5 h-5 mr-2 text-satellite-400" />
            System Information
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-3">Application Details</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Name:</span>
                  <span className="text-slate-300">Satellite Change Analysis</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Version:</span>
                  <span className="text-slate-300">{healthStatus?.version || '1.0.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Competition:</span>
                  <span className="text-slate-300">SIH 2026</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Problem Statement:</span>
                  <span className="text-slate-300">26227</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-3">Technical Stack</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Frontend:</span>
                  <span className="text-slate-300">React + TypeScript + Vite</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Backend:</span>
                  <span className="text-slate-300">Python + FastAPI</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Database:</span>
                  <span className="text-slate-300">SQLite (MVP)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Map Library:</span>
                  <span className="text-slate-300">MapLibre GL JS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Development Status */}
      <div className="glass-effect rounded-xl overflow-hidden">
        <div className="p-4 border-b border-ui-border">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-satellite-400" />
            Development Status
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-white">Application Foundation</h4>
                <p className="text-xs text-slate-400">Complete full-stack application with React frontend and FastAPI backend</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-white">Database Schema</h4>
                <p className="text-xs text-slate-400">SQLite database with models for scenes, tiles, changes, reviews, and logs</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-white">API Endpoints</h4>
                <p className="text-xs text-slate-400">RESTful API with endpoints for scenes, search, change analysis, and provenance</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-white">Service Interfaces</h4>
                <p className="text-xs text-slate-400">Abstract interfaces for embedding, vector search, change detection, and provenance</p>
              </div>
            </div>
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-white">AI Models</h4>
                <p className="text-xs text-slate-400">Mock implementations ready for replacement with actual AI models</p>
              </div>
            </div>
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-white">Production Deployment</h4>
                <p className="text-xs text-slate-400">Currently configured for local development; production deployment pending</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-500 mb-1">Development Version</h4>
            <p className="text-xs text-yellow-400/80">
              This is a functional MVP for SIH 2026. The application uses mock data and services for demonstration purposes.
              All AI services are simulated and will be replaced with actual implementations in future development phases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
