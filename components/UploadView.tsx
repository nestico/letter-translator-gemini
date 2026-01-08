import React, { useState, useRef } from 'react';

interface UploadViewProps {
    onProcess: (imageFile: File, imageUrl: string) => void;
    onCancel: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onProcess, onCancel }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [rotation, setRotation] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setRotation(0); // Reset rotation for new file
        }
    };

    const handleRotateLeft = () => setRotation(prev => prev - 90);
    const handleRotateRight = () => setRotation(prev => prev + 90);
    const handleReset = () => setRotation(0);

    const handleTriggerUpload = () => {
        fileInputRef.current?.click();
    };

    const handleProcess = async () => {
        if (selectedFile && previewUrl) {
            if (selectedFile.type === 'application/pdf' || rotation === 0) {
                // No processing needed for PDFs or unrotated images
                onProcess(selectedFile, previewUrl);
            } else {
                // Apply rotation using Canvas
                try {
                    const image = new Image();
                    image.src = previewUrl;
                    await new Promise((resolve) => { image.onload = resolve; });

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;

                    // Calculate new dimensions (swap width/height for 90/270 degrees)
                    const angleInRadians = (rotation * Math.PI) / 180;
                    const sin = Math.sin(angleInRadians);
                    const cos = Math.cos(angleInRadians);

                    // Logic to fit the rotated image
                    // Simple approach for 90 degree increments
                    const isVertical = Math.abs(rotation / 90) % 2 === 1;
                    canvas.width = isVertical ? image.height : image.width;
                    canvas.height = isVertical ? image.width : image.height;

                    // Translate to center, rotate, translate back
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate(angleInRadians);
                    ctx.drawImage(image, -image.width / 2, -image.height / 2);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const newFile = new File([blob], selectedFile.name, { type: selectedFile.type });
                            const newUrl = URL.createObjectURL(newFile);
                            onProcess(newFile, newUrl);
                        }
                    }, selectedFile.type);
                } catch (error) {
                    console.error("Error processing image:", error);
                    // Fallback to original
                    onProcess(selectedFile, previewUrl);
                }
            }
        }
    };

    return (
        <div className="w-full flex-grow flex flex-col items-center py-8 px-4 sm:px-6 bg-background-light dark:bg-background-dark min-h-[calc(100vh-64px)]">
            <div className="w-full max-w-5xl flex flex-col gap-6">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm">
                    <a href="#" onClick={onCancel} className="text-[#92a4c9] hover:text-slate-900 dark:hover:text-white transition-colors">Home</a>
                    <span className="text-[#92a4c9]">/</span>
                    <span className="text-slate-900 dark:text-white font-medium">Upload Letter</span>
                </div>

                {/* Page Heading */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Upload & Pre-process</h2>
                        <p className="text-[#92a4c9] text-base">Crop, rotate, and enhance your image before translation.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-[#1e293b] px-3 py-1.5 rounded-full border border-slate-200 dark:border-[#334155]">
                        <span className="material-symbols-outlined text-green-500 text-lg">verified_user</span>
                        <span className="text-xs font-medium text-slate-600 dark:text-gray-300">Secured by Azure AI</span>
                    </div>
                </div>

                {/* Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">

                    {/* Left Column: Upload Tools & Info */}
                    <div className="lg:col-span-4 flex flex-col gap-6 order-2 lg:order-1">
                        {/* File Selection Card */}
                        <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl p-6 flex flex-col gap-5 shadow-sm">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-slate-900 dark:text-white font-bold text-lg">Input Source</h3>
                                <p className="text-[#92a4c9] text-sm">Select a file or take a new photo.</p>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.pdf"
                                onChange={handleFileChange}
                            />

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleTriggerUpload}
                                    className="flex items-center justify-center gap-3 w-full h-12 bg-[#232f48] hover:bg-[#2d3b55] border border-surface-border rounded-lg text-white font-semibold transition-all group"
                                >
                                    <span className="material-symbols-outlined text-[#92a4c9] group-hover:text-white">photo_camera</span>
                                    Take Photo
                                </button>
                                <button
                                    onClick={handleTriggerUpload}
                                    className="flex items-center justify-center gap-3 w-full h-12 bg-transparent hover:bg-slate-100 dark:hover:bg-[#232f48] border border-slate-200 dark:border-surface-border rounded-lg text-slate-700 dark:text-white font-semibold transition-all group"
                                >
                                    <span className="material-symbols-outlined text-slate-400 dark:text-[#92a4c9] group-hover:text-slate-900 dark:group-hover:text-white">add_photo_alternate</span>
                                    Select from Gallery
                                </button>
                            </div>

                            {selectedFile && (
                                <div className="flex items-center gap-3 py-3 border-t border-slate-200 dark:border-[#334155] mt-2">
                                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{selectedFile.name}</span>
                                        <span className="text-xs text-[#92a4c9]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Loaded successfully</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Instructions Card */}
                        <div className="bg-slate-50 dark:bg-card-dark/50 border border-slate-200 dark:border-border-dark/50 rounded-xl p-5">
                            <h4 className="text-slate-900 dark:text-white font-semibold text-sm mb-3">Tips for best results:</h4>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-[#92a4c9]">
                                    <span className="material-symbols-outlined text-base mt-0.5 text-primary">lightbulb</span>
                                    Ensure handwriting is legible and clear.
                                </li>
                                <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-[#92a4c9]">
                                    <span className="material-symbols-outlined text-base mt-0.5 text-primary">crop</span>
                                    Crop out background noise like table edges.
                                </li>
                                <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-[#92a4c9]">
                                    <span className="material-symbols-outlined text-base mt-0.5 text-primary">rotate_right</span>
                                    Rotate the image to be perfectly vertical.
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Right Column: Image Editor / Preview */}
                    <div className="lg:col-span-8 flex flex-col gap-4 order-1 lg:order-2">
                        {/* Editor Toolbar */}
                        <div className="flex items-center justify-between bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-t-xl px-4 py-3">
                            {selectedFile?.type !== 'application/pdf' ? (
                                <div className="flex items-center gap-2">
                                    <button onClick={handleRotateLeft} className="p-2 text-slate-400 dark:text-[#92a4c9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#232f48] rounded-lg transition-colors" title="Rotate Left">
                                        <span className="material-symbols-outlined">rotate_left</span>
                                    </button>
                                    <button onClick={handleRotateRight} className="p-2 text-slate-400 dark:text-[#92a4c9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#232f48] rounded-lg transition-colors" title="Rotate Right">
                                        <span className="material-symbols-outlined">rotate_right</span>
                                    </button>
                                    <div className="w-px h-6 bg-slate-200 dark:bg-[#334155] mx-1"></div>
                                    <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-transparent rounded-lg text-sm font-medium" title="Crop Coming Soon" disabled>
                                        <span className="material-symbols-outlined text-lg">crop</span>
                                        Crop
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-slate-400 italic">
                                    Editing disabled for PDF
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <button onClick={handleReset} className="p-2 text-slate-400 dark:text-[#92a4c9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#232f48] rounded-lg transition-colors" title="Reset Changes">
                                    <span className="material-symbols-outlined">restart_alt</span>
                                </button>
                            </div>
                        </div>

                        {/* Editor Canvas */}
                        <div className="relative w-full aspect-[4/3] bg-slate-900 dark:bg-[#0b0f17] border-x border-b border-slate-200 dark:border-surface-border rounded-b-xl overflow-hidden flex items-center justify-center group/canvas">
                            {/* Background Grid Pattern */}
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                            {/* The Image or PDF Preview */}
                            <div className="relative shadow-2xl transition-transform duration-300 ease-in-out p-4 flex items-center justify-center">
                                {previewUrl ? (
                                    selectedFile?.type === 'application/pdf' ? (
                                        <div className="flex flex-col items-center justify-center text-slate-400 p-8 bg-slate-800 rounded-lg border border-slate-700">
                                            <span className="material-symbols-outlined text-6xl text-red-400 mb-4">picture_as_pdf</span>
                                            <span className="text-lg font-medium text-white">{selectedFile.name}</span>
                                            <span className="text-sm mt-2">PDF Document - {Math.round(selectedFile.size / 1024)} KB</span>
                                            <p className="text-xs text-yellow-500 mt-4 max-w-[200px] text-center">
                                                <span className="material-symbols-outlined text-sm align-middle mr-1">warning</span>
                                                Image editing (crop/rotate) is not available for PDFs.
                                            </p>
                                        </div>
                                    ) : (
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="max-h-[500px] w-auto max-w-full object-contain rounded-sm transition-transform duration-300"
                                            style={{ transform: `rotate(${rotation}deg)` }}
                                        />
                                    )
                                ) : (
                                    <div className="text-gray-500 flex flex-col items-center">
                                        <span className="material-symbols-outlined text-6xl opacity-50">image</span>
                                        <p className="mt-2">No file selected</p>
                                    </div>
                                )}

                                {/* Crop Overlay (Images only) */}
                                {previewUrl && selectedFile?.type !== 'application/pdf' && (
                                    <div className="absolute top-[10%] left-[10%] right-[10%] bottom-[10%] border-2 border-primary border-dashed cursor-move z-10 box-border pointer-events-none opacity-0 group-hover/canvas:opacity-100 transition-opacity">
                                        {/* Handles */}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Main Action Footer */}
                        <div className="flex items-center justify-between pt-4">
                            <button
                                onClick={onCancel}
                                className="px-6 py-2.5 rounded-lg text-slate-500 dark:text-[#92a4c9] font-medium hover:bg-slate-100 dark:hover:bg-[#232f48] hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleProcess}
                                disabled={!selectedFile}
                                className={`flex items-center gap-2 px-8 py-2.5 rounded-lg text-white font-bold shadow-lg transition-all transform ${selectedFile ? 'bg-primary hover:bg-blue-600 active:scale-95 shadow-blue-900/20' : 'bg-slate-400 cursor-not-allowed'}`}
                            >
                                <span>Process Document</span>
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
