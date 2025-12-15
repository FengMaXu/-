import React, { useState } from 'react';
import { Database, Plus, Upload, FileJson, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function ConnectionManager() {
    const [connections, setConnections] = useState([
        { id: 1, name: 'Production DB', type: 'MySQL', host: 'aws-rds-primary', status: 'connected' },
        { id: 2, name: 'Analytics Replica', type: 'PostgreSQL', host: 'aws-rds-analytics', status: 'idle' }
    ]);

    return (
        <div className="h-full flex flex-col bg-bg-primary p-6 overflow-y-auto">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Database className="text-accent-primary" />
                Data Sources
            </h2>

            {/* Connection List */}
            <section className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Active Connections</h3>
                    <button className="text-xs text-accent-primary flex items-center gap-1 hover:underline">
                        <Plus size={14} /> Add New
                    </button>
                </div>

                <div className="space-y-3">
                    {connections.map(conn => (
                        <div key={conn.id} className="glass-panel p-4 rounded-xl flex items-center justify-between group hover:border-accent-primary/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex-center text-text-secondary">
                                    <Database size={20} />
                                </div>
                                <div>
                                    <div className="font-medium text-text-primary">{conn.name}</div>
                                    <div className="text-xs text-text-tertiary">{conn.type} • {conn.host}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs px-2 py-1 rounded-full border ${conn.status === 'connected'
                                        ? 'bg-success/10 text-success border-success/20'
                                        : 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20'
                                    }`}>
                                    {conn.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ETL / Upload Section */}
            <section>
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">Data Import (ETL)</h3>
                <FileUploadZone />
            </section>
        </div>
    );
}

function FileUploadZone() {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
    const [fileName, setFileName] = useState('');

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file) => {
        setFileName(file.name);
        setUploadStatus('uploading');

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Use configured proxy to hit backend
            const response = await axios.post('/api/v1/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            console.log('Upload success:', response.data);
            setUploadStatus('success');
            setTimeout(() => setUploadStatus('idle'), 3000); // Reset after 3s
        } catch (error) {
            console.error('Upload failed:', error);
            setUploadStatus('error');
        }
    };

    return (
        <div
            className={`border-2 border-dashed rounded-xl p-8 transition-colors text-center cursor-pointer relative overflow-hidden
        ${isDragging
                    ? 'border-accent-primary bg-accent-primary/5'
                    : 'border-border-color hover:border-text-secondary hover:bg-bg-secondary/50'
                }
        ${uploadStatus === 'error' ? 'border-error/50 bg-error/5' : ''}
        ${uploadStatus === 'success' ? 'border-success/50 bg-success/5' : ''}
      `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput').click()}
        >
            <input
                id="fileInput"
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".csv,.json,.xlsx,.sql"
            />

            <div className="flex flex-col items-center gap-3">
                {uploadStatus === 'uploading' ? (
                    <div className="animate-pulse flex flex-col items-center">
                        <Upload className="text-accent-primary mb-2" size={32} />
                        <span className="text-sm font-medium">Uploading {fileName}...</span>
                    </div>
                ) : uploadStatus === 'success' ? (
                    <div className="flex flex-col items-center text-success">
                        <Check size={32} className="mb-2" />
                        <span className="text-sm font-bold">Upload Complete</span>
                        <span className="text-xs opacity-75">{fileName} processed</span>
                    </div>
                ) : uploadStatus === 'error' ? (
                    <div className="flex flex-col items-center text-error">
                        <AlertCircle size={32} className="mb-2" />
                        <span className="text-sm font-bold">Upload Failed</span>
                        <span className="text-xs opacity-75">Please try again</span>
                    </div>
                ) : (
                    <>
                        <div className="flex gap-2 text-text-tertiary mb-1">
                            <FileSpreadsheet size={24} />
                            <FileJson size={24} />
                        </div>
                        <p className="text-sm text-text-secondary font-medium">
                            Drop CSV, JSON, or Excel files here
                        </p>
                        <p className="text-xs text-text-tertiary">
                            or click to browse
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
