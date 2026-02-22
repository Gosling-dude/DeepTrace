import React, { useCallback, useState } from 'react';

interface UploadCardProps {
    onUpload: (file: File) => void;
    loading: boolean;
}

export default function UploadCard({ onUpload, loading }: UploadCardProps) {
    const [dragActive, setDragActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            handleFileSelected(file);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
        }
    };

    const handleFileSelected = (file: File) => {
        setPreviewUrl(URL.createObjectURL(file));
        onUpload(file);
    };

    return (
        <div className="bg-surface rounded-2xl p-6 border border-gray-700 shadow-xl overflow-hidden relative">
            <h2 className="text-xl font-semibold mb-4 text-white">Upload Image</h2>

            <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 
          ${dragActive ? 'border-primary bg-primary/10' : 'border-gray-600 hover:border-gray-500 hover:bg-white/5'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={loading}
                />

                {loading ? (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-primary font-medium animate-pulse">Analyzing image artifacts...</p>
                    </div>
                ) : previewUrl ? (
                    <div className="flex flex-col items-center">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-h-48 object-contain mb-4 rounded-lg shadow-md"
                        />
                        <p className="text-sm text-gray-400">Click or drag to upload a different image</p>
                    </div>
                ) : (
                    <div className="py-8">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-lg text-white font-medium">Drag & drop an image</p>
                        <p className="text-sm text-gray-400 mt-1">or click to browse from your computer</p>
                    </div>
                )}
            </div>
        </div>
    );
}
