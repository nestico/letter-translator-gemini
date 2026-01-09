import React, { useState, useRef } from 'react';

interface UploadViewProps {
    onProcess: (files: File[], imageUrls: string[]) => void;
    onCancel: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onProcess, onCancel }) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [rotations, setRotations] = useState<number[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(Array.from(e.target.files));
        }
        if (e.target) e.target.value = '';
    };

    const addFiles = (files: File[]) => {
        const remainingSlots = 3 - selectedFiles.length;
        const filesToAdd = files.slice(0, remainingSlots);

        if (filesToAdd.length > 0) {
            const newFiles = [...selectedFiles, ...filesToAdd];
            const newUrls = [...previewUrls, ...filesToAdd.map(f => URL.createObjectURL(f))];
            const newRotations = [...rotations, ...filesToAdd.map(() => 0)];

            setSelectedFiles(newFiles);
            setPreviewUrls(newUrls);
            setRotations(newRotations);
            setSelectedIndex(newFiles.length - 1);
        }
    };

    const removeFile = (index: number) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        const newUrls = previewUrls.filter((_, i) => i !== index);
        const newRotations = rotations.filter((_, i) => i !== index);

        URL.revokeObjectURL(previewUrls[index]);

        setSelectedFiles(newFiles);
        setPreviewUrls(newUrls);
        setRotations(newRotations);
        if (selectedIndex >= newFiles.length) setSelectedIndex(Math.max(0, newFiles.length - 1));
    };

    const moveFile = (index: number, direction: -1 | 1) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= selectedFiles.length) return;

        const newFiles = [...selectedFiles];
        const newUrls = [...previewUrls];
        const newRotations = [...rotations];

        [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
        [newUrls[index], newUrls[newIndex]] = [newUrls[newIndex], newUrls[index]];
        [newRotations[index], newRotations[newIndex]] = [newRotations[newIndex], newRotations[index]];

        setSelectedFiles(newFiles);
        setPreviewUrls(newUrls);
        setRotations(newRotations);

        if (selectedIndex === index) setSelectedIndex(newIndex);
        else if (selectedIndex === newIndex) setSelectedIndex(index);
    };

    const updateRotation = (delta: number) => {
        if (selectedFiles.length === 0) return;
        setRotations(prev => {
            const next = [...prev];
            next[selectedIndex] = (next[selectedIndex] + delta);
            return next;
        });
    };

    const handleReset = () => {
        if (selectedFiles.length === 0) return;
        setRotations(prev => {
            const next = [...prev];
            next[selectedIndex] = 0;
            return next;
        });
    };

    const processSingleImage = async (file: File, url: string, rotation: number): Promise<{ file: File, url: string }> => {
        if (file.type === 'application/pdf' || rotation % 360 === 0) {
            return { file, url };
        }
        try {
            const image = new Image();
            image.src = url;
            await new Promise((resolve) => { image.onload = resolve; });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return { file, url };

            const angleInRadians = (rotation * Math.PI) / 180;
            const isVertical = Math.abs(rotation / 90) % 2 === 1;

            if (isVertical) {
                canvas.width = image.height;
                canvas.height = image.width;
            } else {
                canvas.width = image.width;
                canvas.height = image.height;
            }

            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(angleInRadians);
            ctx.drawImage(image, -image.width / 2, -image.height / 2);

            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name, { type: file.type });
                        const newUrl = URL.createObjectURL(newFile);
                        resolve({ file: newFile, url: newUrl });
                    } else {
                        resolve({ file, url });
                    }
                }, file.type);
            });
        } catch (e) {
            console.error("Rotation error", e);
            return { file, url };
        }
    };

    const handleProcess = async () => {
        if (selectedFiles.length === 0) return;
        const processed = await Promise.all(selectedFiles.map((file, i) =>
            processSingleImage(file, previewUrls[i], rotations[i])
        ));
        onProcess(processed.map(p => p.file), processed.map(p => p.url));
    };

    const currentFile = selectedFiles[selectedIndex];
    const currentUrl = previewUrls[selectedIndex];
    const currentRotation = rotations[selectedIndex];

    return (
        <div className="w-full flex-grow flex flex-col items-center py-8 px-4 sm:px-6 bg-background-light dark:bg-background-dark min-h-[calc(100vh-64px)]">
            <div className="w-full max-w-6xl flex flex-col gap-6">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm mb-1">
                        <button onClick={onCancel} className="text-[#92a4c9] hover:text-slate-900 dark:hover:text-white transition-colors">Home</button>
                        <span className="text-[#92a4c9]">/</span>
                        <span className="text-slate-900 dark:text-white font-medium">Upload Letter</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Upload & Pre-process</h2>
                    <p className="text-[#92a4c9] text-base">Crop, rotate, and enhance your image before translation.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">

                    {/* Left Column: Input Source & Tips */}
                    <div className="lg:col-span-4 flex flex-col gap-6 order-2 lg:order-1">

                        {/* Input Source Card */}
                        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg border border-slate-700">
                            <h3 className="text-lg font-bold mb-1">Input Source</h3>
                            <p className="text-slate-400 text-sm mb-4">Select a file or take a new photo.</p>

                            <div className="flex flex-col gap-3">
                                <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                                <button
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-slate-600 hover:bg-slate-800 transition-colors font-medium"
                                >
                                    <span className="material-symbols-outlined">photo_camera</span>
                                    Take Photo
                                </button>

                                <input type="file" ref={fileInputRef} className="hidden" accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.pdf" multiple onChange={handleFileChange} />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-slate-600 hover:bg-slate-800 transition-colors font-medium"
                                >
                                    <span className="material-symbols-outlined">collections</span>
                                    Select from Gallery
                                </button>
                            </div>
                        </div>

                        {/* Tips Card */}
                        <div className="bg-[#0f172a] text-white rounded-xl p-6 shadow-lg border border-slate-800">
                            <h3 className="text-lg font-bold mb-4">Tips for best results:</h3>
                            <ul className="flex flex-col gap-3">
                                <li className="flex items-start gap-2 text-sm text-slate-300">
                                    <span className="material-symbols-outlined text-primary text-lg">lightbulb</span>
                                    Ensure handwriting is legible and clear.
                                </li>
                                <li className="flex items-start gap-2 text-sm text-slate-300">
                                    <span className="material-symbols-outlined text-primary text-lg">crop</span>
                                    Crop out background noise like table edges.
                                </li>
                                <li className="flex items-start gap-2 text-sm text-slate-300">
                                    <span className="material-symbols-outlined text-primary text-lg">rotate_right</span>
                                    Rotate the image to be perfectly vertical.
                                </li>
                            </ul>
                        </div>

                        {/* Page Management (Conditional) */}
                        {selectedFiles.length > 0 && (
                            <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl p-4 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-900 dark:text-white">Pages ({selectedFiles.length}/3)</h3>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {selectedFiles.map((file, i) => (
                                        <div key={i} onClick={() => setSelectedIndex(i)} className={`flex items-center justify-between p-2 rounded cursor-pointer border ${i === selectedIndex ? 'bg-blue-50 border-primary' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                                            <div className="flex items-center gap-2 truncate">
                                                <div className="w-8 h-8 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                                                    {file.type === 'application/pdf' ? <span className="material-symbols-outlined text-red-500 text-sm p-1">picture_as_pdf</span> : <img src={previewUrls[i]} className="w-full h-full object-cover" />}
                                                </div>
                                                <span className="text-xs font-medium truncate max-w-[100px] text-slate-700">{file.name}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); moveFile(i, -1); }} disabled={i === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-20"><span className="material-symbols-outlined text-base">arrow_upward</span></button>
                                                <button onClick={(e) => { e.stopPropagation(); moveFile(i, 1); }} disabled={i === selectedFiles.length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-20"><span className="material-symbols-outlined text-base">arrow_downward</span></button>
                                                <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-red-400 hover:text-red-600"><span className="material-symbols-outlined text-base">close</span></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Preview & Toolbar */}
                    <div className="lg:col-span-8 flex flex-col gap-0 order-1 lg:order-2">
                        {/* Toolbar */}
                        <div className="bg-slate-900 dark:bg-card-dark rounded-t-xl p-2 flex items-center justify-between border-b border-slate-700">
                            <div className="flex gap-2">
                                <button onClick={() => updateRotation(-90)} disabled={!currentFile || currentFile.type === 'application/pdf'} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30" title="Rotate Left"><span className="material-symbols-outlined">rotate_left</span></button>
                                <button onClick={() => updateRotation(90)} disabled={!currentFile || currentFile.type === 'application/pdf'} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30" title="Rotate Right"><span className="material-symbols-outlined">rotate_right</span></button>
                                <div className="w-px h-6 bg-slate-700 my-auto mx-2"></div>
                                <button disabled className="p-2 text-slate-500 cursor-not-allowed flex items-center gap-1" title="Crop (Coming Soon)"><span className="material-symbols-outlined">crop</span> <span className="text-xs">Crop</span></button>
                            </div>
                            <button onClick={handleReset} disabled={!currentFile} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30" title="Reset"><span className="material-symbols-outlined">restart_alt</span></button>
                        </div>

                        {/* Preview Area */}
                        <div className="relative w-full aspect-[4/3] bg-[#0b0f17] border border-slate-700 rounded-b-xl overflow-hidden flex items-center justify-center">
                            {currentFile ? (
                                currentFile.type === 'application/pdf' ? (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <span className="material-symbols-outlined text-6xl text-red-400 mb-4">picture_as_pdf</span>
                                        <span className="text-lg text-white">{currentFile.name}</span>
                                        <span className="text-sm">Cannot preview/edit PDF content</span>
                                    </div>
                                ) : (
                                    <img
                                        src={currentUrl}
                                        alt="preview"
                                        className="max-h-full max-w-full object-contain transition-transform duration-300"
                                        style={{ transform: `rotate(${currentRotation}deg)` }}
                                    />
                                )
                            ) : (
                                <div className="flex flex-col items-center text-slate-600">
                                    <span className="material-symbols-outlined text-6xl mb-4 opacity-50">image</span>
                                    <p>No file selected</p>
                                </div>
                            )}
                        </div>

                        {/* Process Button */}
                        <div className="flex justify-end pt-6">
                            <button
                                onClick={handleProcess}
                                disabled={selectedFiles.length === 0}
                                className={`px-8 py-3 rounded-lg text-white font-bold shadow-lg transition-all flex items-center gap-2 ${selectedFiles.length > 0 ? 'bg-primary hover:bg-blue-600' : 'bg-slate-700 cursor-not-allowed text-slate-400'}`}
                            >
                                <span>Translate Document</span>
                                {selectedFiles.length > 0 && <span className="bg-white/20 px-2 py-0.5 rounded text-sm">{selectedFiles.length}</span>}
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
