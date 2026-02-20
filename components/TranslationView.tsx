import React, { useState, useEffect } from 'react';
import { translateImage } from '../services/geminiService';
import { User, TranslationResult } from '../types';
import { logActivity } from '../services/activityService';
import { saveTranslation } from '../services/translationService';
import { jsPDF } from 'jspdf';

import { compressImage } from '../services/imageUtils';

interface TranslationViewProps {
   user: User | null;
   images: { url: string; file: File }[]; // Changed prop
   onReset: () => void;
}

export const TranslationView: React.FC<TranslationViewProps> = ({ user, images, onReset }) => {
   const [result, setResult] = useState<TranslationResult | null>(null);
   const [editedResult, setEditedResult] = useState<TranslationResult | null>(null);
   const [isProcessing, setIsProcessing] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [showLanguageConfirm, setShowLanguageConfirm] = useState(false);
   const [queuePosition, setQueuePosition] = useState<number>(0);

   const [showExportModal, setShowExportModal] = useState(false);
   const [exportFormat, setExportFormat] = useState<'pdf' | 'txt'>('pdf');
   const [exportFileName, setExportFileName] = useState('letter_translation');
   const [selectedLanguage, setSelectedLanguage] = useState('Auto-Detect');
   const [targetLanguage, setTargetLanguage] = useState('English');
   const [error, setError] = useState<string | null>(null);
   const [activeTab, setActiveTab] = useState<'transcription' | 'translation'>('translation');
   const [currentImageIndex, setCurrentImageIndex] = useState(0);
   const [translatorName, setTranslatorName] = useState(user?.name || 'Children Believe AI');
   const [isSaving, setIsSaving] = useState(false);
   const [hasSaved, setHasSaved] = useState(false);

   useEffect(() => {
      if (user?.name) {
         setTranslatorName(user.name);
      }
   }, [user]);

   const LANGUAGES = [
      'Auto-Detect', '(nic) spanish', '(BFA) French', '(CAN) English', '(Ind) Telugu', '(ind) Tamil', '(ETH) Amharic', '(ETH) Afan Oromo', '(HND) Spanish', '(PRY) Spanish', 'German', 'Italian', '(BRA) Portuguese', 'Latin', 'Dutch', 'Russian', 'Chinese', 'Japanese'
   ];

   const handleProcessStart = () => {
      setShowLanguageConfirm(true);
   };

   const handleProcessConfirmed = async () => {
      setShowLanguageConfirm(false);
      setError(null);
      if (images.length === 0) return;

      console.log("Starting processing...");
      setIsProcessing(true);
      try {
         // Read all files to base64 with Compression
         const imagesContent = await Promise.all(images.map(async (img) => {
            // Compress locally before converting to base64
            const compressedFile = await compressImage(img.file);
            console.log(`[Compression] ${img.file.name}: ${(img.file.size / 1024).toFixed(1)}KB -> ${(compressedFile.size / 1024).toFixed(1)}KB`);

            return new Promise<{ base64: string, mimeType: string }>((resolve, reject) => {
               const reader = new FileReader();
               reader.onload = () => {
                  const result = reader.result as string;
                  const base64 = result.split(',')[1];
                  resolve({ base64, mimeType: compressedFile.type });
               };
               reader.onerror = reject;
               reader.readAsDataURL(compressedFile);
            });
         }));

         const data = await translateImage(imagesContent, selectedLanguage, targetLanguage);
         setResult(data);
         setEditedResult(data);
         setHasSaved(false); // Reset saved state for new result

         if (data.confidenceScore < 0.7) {
            setError("Warning: Low confidence translation. Some parts of the handwriting may be illegible or misinterpreted. Please review carefully before saving.");
         }

         if (user) {
            logActivity(user.id, 'TRANSLATE_LETTER', {
               language: data.detectedLanguage,
               confidence: data.confidenceScore,
               pages: images.length
            });
         }

      } catch (error) {
         console.error('Processing error:', error);
         const errString = String(error instanceof Error ? error.message : error);
         if (errString.includes("429") || errString.toLowerCase().includes("quota")) {
            setError("Processing failed: API Quota Exceeded. The AI service is currently busy. Please try again later.");
         } else {
            setError(`Failed to process: ${errString}`);
         }
      } finally {
         setIsProcessing(false);
      }
   };

   const handleSaveToHistory = async () => {
      if (!user || !editedResult || hasSaved || isSaving) return;

      setIsSaving(true);
      // Safety timeout: 15 seconds max for saving. 
      const timeoutId = setTimeout(() => {
         setIsSaving(false);
         alert("Save operation timed out. Please check your internet connection and try again.");
         console.error("Save operation timed out - force resetting button state");
      }, 15000);

      try {
         const saved = await saveTranslation(
            user.id,
            images[0].file.name,
            editedResult.transcription,
            editedResult.translation,
            editedResult.detectedLanguage || selectedLanguage,
            targetLanguage
         );

         if (saved) {
            setHasSaved(true);
            if (error?.includes("Low confidence")) setError(null);
         } else {
            alert("Could not save to history. Please check your connection.");
         }
      } catch (err) {
         console.error("Failed to save:", err);
         alert("Could not save to history. Please try again.");
      } finally {
         clearTimeout(timeoutId);
         setIsSaving(false);
      }
   };

   const handleExportClick = () => {
      setShowExportModal(true);
   };


   // Helper to load image for PDF
   const loadImageBase64 = async (file: File): Promise<{ data: string, type: string }> => {
      return new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.onload = () => resolve({ data: reader.result as string, type: file.type });
         reader.onerror = reject;
         reader.readAsDataURL(file);
      });
   };

   const loadLogo = async (): Promise<string | null> => {
      try {
         const response = await fetch('/logo.png');
         const blob = await response.blob();
         return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
         });
      } catch (e) {
         console.warn("Could not load logo for PDF", e);
         return null;
      }
   };

   const handleExportConfirm = async () => {
      if (!editedResult) return;

      let fileName = exportFileName.trim();
      if (!fileName) fileName = 'letter_translation';

      // Harsh sanitization
      fileName = fileName.replace(/[^a-zA-Z0-9\-_]/g, '_');

      const isPdf = exportFormat === 'pdf';
      const extension = isPdf ? '.pdf' : '.txt';

      if (!fileName.toLowerCase().endsWith(extension)) {
         fileName += extension;
      }

      let pdfDoc: jsPDF | null = null;
      let textContent = '';

      if (isPdf) {
         try {
            pdfDoc = new jsPDF();
            const margin = 20;
            const pageWidth = pdfDoc.internal.pageSize.getWidth();
            const pageHeight = pdfDoc.internal.pageSize.getHeight();
            const contentWidth = pageWidth - (margin * 2);

            const logoBase64 = await loadLogo();

            // 1. ADD IMAGES (One per page)
            for (let i = 0; i < images.length; i++) {
               if (i > 0) pdfDoc.addPage();

               // Add Custom File Name at top ONLY on first page
               if (i === 0) {
                  const displayFileName = exportFileName.trim().replace(/\.[^/.]+$/, "") || 'letter_translation';
                  pdfDoc.setFontSize(10);
                  pdfDoc.setFont("helvetica", "normal");
                  pdfDoc.setTextColor(100);
                  pdfDoc.text(`Child ID: ${displayFileName} | Pages: ${images.length}`, margin, 15);
               }

               // Add Logo small in corner
               if (logoBase64) {
                  pdfDoc.addImage(logoBase64, 'PNG', pageWidth - margin - 15, 8, 15, 15);
               }

               const { data: imgData, type: imgType } = await loadImageBase64(images[i].file);

               // Calculate dimensions to fit 85% of page height
               const imgProps = pdfDoc.getImageProperties(imgData);
               const imgRatio = imgProps.width / imgProps.height;

               let finalW = contentWidth;
               let finalH = contentWidth / imgRatio;

               const maxH = pageHeight - 40; // Leave room for headers/footers
               if (finalH > maxH) {
                  finalH = maxH;
                  finalW = maxH * imgRatio;
               }

               const xCentered = margin + (contentWidth - finalW) / 2;
               pdfDoc.addImage(imgData, imgType.includes('png') ? 'PNG' : 'JPEG', xCentered, 25, finalW, finalH);
            }

            // 2. ADD TRANSLATION (Starts on new page)
            pdfDoc.addPage();
            let y = 20;

            // Logo on Translation Page
            if (logoBase64) {
               pdfDoc.addImage(logoBase64, 'PNG', margin, y, 20, 20);
               y += 25;
            }

            pdfDoc.setFontSize(18);
            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.setTextColor(0);
            pdfDoc.text("Letter Translation", margin, y);
            y += 12;

            if (editedResult.headerInfo) {
               const idToDisplay = exportFileName.trim().replace(/\.[^/.]+$/, "") || 'N/A';
               pdfDoc.setFontSize(10);
               pdfDoc.setFont("helvetica", "normal");
               pdfDoc.text(`Child Name: ${editedResult.headerInfo.childName || 'N/A'}`, margin, y);
               pdfDoc.text(`Child ID: ${idToDisplay}`, margin + 60, y);
               pdfDoc.text(`Date: ${editedResult.headerInfo.date || 'N/A'}`, margin + 120, y);
               y += 10;
            }

            pdfDoc.setLineWidth(0.5);
            pdfDoc.line(margin, y, pageWidth - margin, y);
            y += 15;

            pdfDoc.setFontSize(12);
            pdfDoc.setFont("helvetica", "normal");
            pdfDoc.setTextColor(30);

            // SANITIZATION: Strip non-Latin characters from translation for PDF
            // jsPDF default fonts crash/show gibberish with Telugu/Amharic.
            // We keep only standard English/Latin characters for the PDF version.
            const safeTranslation = editedResult.translation
               .replace(/[^\x00-\x7F\xA0-\xFF]/g, '') // Keep ASCII and extended Latin
               .trim()
               .replace(/\n{3,}/g, '\n\n');

            const splitText = pdfDoc.splitTextToSize(safeTranslation, contentWidth);

            splitText.forEach((line: string) => {
               if (y > pageHeight - 30) {
                  pdfDoc.addPage();
                  y = 20;
               }
               pdfDoc.text(line, margin, y);
               y += 7;
            });

            // "Below translation" ID Reference
            y += 10;
            if (y > pageHeight - 20) {
               pdfDoc.addPage();
               y = 20;
            }
            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.setFontSize(10);
            const idToDisplayBelow = exportFileName.trim().replace(/\.[^/.]+$/, "") || 'N/A';
            pdfDoc.text(`Child ID: ${idToDisplayBelow}`, margin, y);

            // Footer
            y += 15;
            if (y > pageHeight - 20) {
               pdfDoc.addPage();
               y = 20;
            }
            const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            pdfDoc.setFont("helvetica", "italic");
            pdfDoc.setFontSize(10);
            pdfDoc.setTextColor(100);
            pdfDoc.text(`Date Translated: ${dateStr}`, margin, y);
            y += 5;
            pdfDoc.text(`Translated by: ${translatorName || 'Children Believe AI'}`, margin, y);

         } catch (e) {
            console.error("PDF Logic Failure:", e);
            alert("Error generating PDF: " + (e as Error).message);
            return;
         }
      } else {
         textContent = `LETTER TRANSLATION\n------------------\n\nDetected Language: ${editedResult.detectedLanguage}\nTarget Language: ${targetLanguage}\n\nTRANSLATION:\n${editedResult.translation}\n\nORIGINAL TRANSCRIPTION:\n${editedResult.transcription}`;
      }

      // Modern Approach: File System Access API
      try {
         // @ts-ignore
         if (window.showSaveFilePicker) {
            const opts = {
               suggestedName: fileName,
               types: [{
                  description: isPdf ? 'PDF Document' : 'Text File',
                  accept: isPdf
                     ? { 'application/pdf': ['.pdf'] }
                     : { 'text/plain': ['.txt'] },
               }],
            };

            // @ts-ignore
            const fileHandle = await window.showSaveFilePicker(opts);
            // @ts-ignore
            const writable = await fileHandle.createWritable();

            if (isPdf && pdfDoc) {
               await writable.write(pdfDoc.output('blob'));
            } else {
               await writable.write(textContent);
            }

            await writable.close();
            setShowExportModal(false);
            return;
         }
      } catch (err: any) {
         if (err.name !== 'AbortError') {
            console.warn("File System Access API failed, falling back:", err);
         } else {
            return;
         }
      }

      // Fallback: Legacy Download Link
      try {
         if (isPdf && pdfDoc) {
            console.log("Saving PDF as (fallback):", fileName);
            pdfDoc.save(fileName);
         } else {
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
               document.body.removeChild(link);
               URL.revokeObjectURL(url);
            }, 100);
         }
         setShowExportModal(false);
      } catch (err) {
         console.error("Export failed:", err);
         alert("An error occurred while exporting.");
      }
   };

   // Check bounds
   const currentImage = images[currentImageIndex];

   return (
      <div className="w-full max-w-[1280px] px-4 lg:px-10 py-8 flex flex-col gap-8 min-h-[calc(100vh-64px)]">
         <div className="flex justify-between items-center">
            <div>
               <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Workspace</h1>
               <p className="text-slate-500 dark:text-slate-400">Deciphering your document.</p>
            </div>
            <div className="flex gap-3">
               <button
                  onClick={onReset}
                  className="flex items-center justify-center h-10 px-4 rounded-lg bg-white dark:bg-card-dark border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm"
               >
                  <span className="material-symbols-outlined mr-2 text-[20px]">add_photo_alternate</span>
                  Change Images
               </button>
               {result && (
                  <div className="flex gap-2">
                     {!hasSaved && user && (
                        <button
                           onClick={handleSaveToHistory}
                           disabled={isSaving}
                           className={`flex items-center justify-center h-10 px-4 rounded-lg transition-colors text-sm font-bold shadow-sm ${isSaving ? 'bg-slate-100 text-slate-400' : 'bg-green-600 text-white hover:bg-green-700'}`}
                        >
                           <span className="material-symbols-outlined mr-2 text-[20px]">{isSaving ? 'sync' : 'save'}</span>
                           {isSaving ? 'Saving...' : 'Approve & Save'}
                        </button>
                     )}
                     {hasSaved && (
                        <div className="flex items-center px-4 h-10 text-green-600 font-bold text-sm bg-green-50 rounded-lg border border-green-100">
                           <span className="material-symbols-outlined mr-2 text-[20px]">check_circle</span>
                           Saved to History
                        </div>
                     )}
                     <button
                        onClick={handleExportClick}
                        className="flex items-center justify-center h-10 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-bold"
                     >
                        <span className="material-symbols-outlined mr-2 text-[20px]">download</span>
                        Export PDF
                     </button>
                  </div>
               )}
            </div>
         </div>




         <div className="flex flex-col lg:flex-row gap-6 h-full flex-1">
            {/* Left Column: Image Viewer */}
            <div className="flex-1 bg-slate-100 dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden relative min-h-[400px] flex flex-col group">
               <div className="flex-1 relative flex items-center justify-center bg-slate-200/50 dark:bg-black/20">
                  {currentImage.file.type === 'application/pdf' ? (
                     <div className="flex flex-col items-center justify-center text-slate-400 p-8 scale-150">
                        <span className="material-symbols-outlined text-6xl text-red-500 mb-4 opacity-100">picture_as_pdf</span>
                        <span className="text-lg font-medium text-slate-700 dark:text-slate-300">{currentImage.file.name}</span>
                        <span className="text-sm mt-1">PDF Document</span>
                     </div>
                  ) : (
                     <img
                        src={currentImage.url}
                        alt={`Uploaded letter page ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain max-h-[70vh]"
                     />
                  )}

                  {/* Navigation Arrows */}
                  {images.length > 1 && (
                     <>
                        <button
                           onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                           disabled={currentImageIndex === 0}
                           className="absolute left-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                           <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <button
                           onClick={() => setCurrentImageIndex(prev => Math.min(images.length - 1, prev + 1))}
                           disabled={currentImageIndex === images.length - 1}
                           className="absolute right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                           <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                     </>
                  )}
               </div>

               {/* Image Dots/Counter */}
               {images.length > 1 && (
                  <div className="h-12 bg-white dark:bg-card-dark border-t border-slate-200 dark:border-border-dark flex items-center justify-center gap-2">
                     {images.map((_, idx) => (
                        <button
                           key={idx}
                           onClick={() => setCurrentImageIndex(idx)}
                           className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-primary w-4' : 'bg-slate-300 dark:bg-slate-600'}`}
                        />
                     ))}
                     <span className="ml-2 text-xs text-slate-500 font-medium">Page {currentImageIndex + 1} of {images.length}</span>
                  </div>
               )}

               {/* Action Overlay */}
               {!result && !isProcessing && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[1px]">
                     <button
                        onClick={handleProcessStart}
                        className="h-14 px-8 rounded-full bg-primary hover:bg-blue-600 text-white font-bold text-lg shadow-2xl scale-100 hover:scale-105 transition-all flex items-center gap-2 animate-in fade-in zoom-in duration-300"
                     >
                        <span className="material-symbols-outlined">auto_awesome</span>
                        Decipher {images.length} Document{images.length !== 1 ? 's' : ''} with AI
                     </button>
                  </div>
               )}


               {isProcessing && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-black/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                     <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                     <p className="text-lg font-bold text-primary animate-pulse">Deciphering with Gemini AI...</p>
                     <p className="text-sm text-slate-500">Gemini 2.0 Flash is analyzing strokes & context across {images.length} page{images.length !== 1 ? 's' : ''}</p>
                  </div>
               )}
            </div>

            {/* Right Column: Results */}
            <div className="flex-1 flex flex-col bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden min-h-[400px]">
               <div className="flex border-b border-slate-200 dark:border-border-dark">
                  <button
                     onClick={() => setActiveTab('translation')}
                     className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'translation' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                     {targetLanguage} Translation
                  </button>
                  <button
                     onClick={() => setActiveTab('transcription')}
                     className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'transcription' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                     Original Transcription
                  </button>
               </div>

               <div className="flex-1 p-6 overflow-y-auto max-h-[70vh]">
                  {/* Processing State in Results */}
                  {isProcessing && !result && (
                     <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Deciphering with Gemini AI</h3>
                        {queuePosition > 1 ? (
                           <div className="flex flex-col gap-1 items-center animate-pulse">
                              <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                                 Processing your letter... You are position <span className="font-bold text-primary">#{queuePosition}</span> in the queue.
                              </p>
                              <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                                 Estimated wait: ~{queuePosition * 15} seconds
                              </p>
                           </div>
                        ) : (
                           <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                              Google Gemini 2.0 Flash is analyzing the handwriting, transcribing the text, and translating it to {targetLanguage}.
                           </p>
                        )}
                        <div className="flex gap-2 mt-6">
                           <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
                           <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-150"></span>
                           <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-300"></span>
                        </div>
                     </div>
                  )}

                  {/* Empty State or Error */}
                  {!result && !isProcessing && (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                        {error ? (
                           <div className="flex flex-col items-center text-red-500 animate-in fade-in zoom-in">
                              <span className="material-symbols-outlined text-6xl mb-4">error</span>
                              <h3 className="text-xl font-bold mb-2">Translation Failed</h3>
                              <p className="text-center text-slate-600 dark:text-slate-300 mb-6 max-w-sm">{error}</p>
                              <button
                                 onClick={handleProcessStart}
                                 className="px-6 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold transition-colors"
                              >
                                 Try Again
                              </button>
                           </div>
                        ) : (
                           <>
                              <span className="material-symbols-outlined text-5xl mb-3 opacity-50">description</span>
                              <p className="text-center">Results will appear here<br />after processing.</p>
                           </>
                        )}
                     </div>
                  )}

                  {/* Results Content */}
                  {result && editedResult && (
                     <div className="prose dark:prose-invert max-w-none relative">
                        <div className="flex justify-between items-center mb-4">
                           <div className="flex items-center gap-3">
                              {result.detectedLanguage && (
                                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    <span className="material-symbols-outlined text-[16px]">translate</span>
                                    Detected: {result.detectedLanguage}
                                 </div>
                              )}

                           </div>
                           <button
                              onClick={() => setIsEditing(!isEditing)}
                              className={`text-sm font-semibold flex items-center gap-1 ${isEditing ? 'text-green-600' : 'text-blue-600'}`}
                           >
                              <span className="material-symbols-outlined text-[18px]">{isEditing ? 'check' : 'edit'}</span>
                              {isEditing ? 'Done Editing' : 'Edit Text'}
                           </button>
                        </div>

                        {activeTab === 'translation' ? (
                           isEditing ? (
                              <textarea
                                 className="w-full h-[300px] p-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-lg font-serif"
                                 value={editedResult.translation}
                                 onChange={(e) => setEditedResult({ ...editedResult, translation: e.target.value })}
                              />
                           ) : (
                              <div className="whitespace-pre-wrap text-lg leading-relaxed text-slate-800 dark:text-slate-200 font-serif">
                                 {editedResult.translation}
                              </div>
                           )
                        ) : (
                           isEditing ? (
                              <textarea
                                 className="w-full h-[300px] p-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-yellow-50 dark:bg-slate-800 text-lg font-serif italic"
                                 value={editedResult.transcription}
                                 onChange={(e) => setEditedResult({ ...editedResult, transcription: e.target.value })}
                              />
                           ) : (
                              <div className="whitespace-pre-wrap text-lg leading-relaxed text-slate-800 dark:text-slate-200 font-serif italic bg-yellow-50/50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                                 {editedResult.transcription}
                              </div>
                           )
                        )}
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Language Confirmation Modal */}
         {showLanguageConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden">
                  {/* Preview Image Side */}
                  <div className="md:w-1/2 bg-slate-100 dark:bg-black/50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 relative">
                     {currentImage.file.type === 'application/pdf' ? (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-8">
                           <span className="material-symbols-outlined text-6xl text-red-500 mb-4">picture_as_pdf</span>
                           <span className="text-lg font-medium text-slate-700 dark:text-slate-300">{currentImage.file.name}</span>
                        </div>
                     ) : (
                        <img src={currentImage.url} alt="Preview" className="max-h-[300px] object-contain rounded-lg shadow-lg" />
                     )}
                     <div className="mt-4 text-xs text-slate-500">Preview of page {currentImageIndex + 1}</div>
                     {/* Navigation Arrows for Modal */}
                     {images.length > 1 && (
                        <>
                           <button
                              onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                              disabled={currentImageIndex === 0}
                              className="absolute left-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-black/50 hover:text-white disabled:opacity-0 transition-all"
                           >
                              <span className="material-symbols-outlined">chevron_left</span>
                           </button>
                           <button
                              onClick={() => setCurrentImageIndex(prev => Math.min(images.length - 1, prev + 1))}
                              disabled={currentImageIndex === images.length - 1}
                              className="absolute right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-black/50 hover:text-white disabled:opacity-0 transition-all"
                           >
                              <span className="material-symbols-outlined">chevron_right</span>
                           </button>
                        </>
                     )}
                  </div>

                  {/* Controls Side */}
                  <div className="md:w-1/2 p-8 flex flex-col justify-center">
                     <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Confirm Source Language</h3>
                     <p className="text-slate-500 dark:text-slate-400 mb-6">
                        Help the AI provide the best translation by confirming the language of the document.
                     </p>

                     <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-lg border border-blue-100 dark:border-blue-900/50 mb-6">
                        <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
                           <span className="material-symbols-outlined text-sm">auto_awesome</span>
                           AI Detection
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-sm">
                           We'll attempt to auto-detect the language, but you can specify it for better accuracy.
                        </p>
                     </div>

                     <div className="flex flex-col gap-2 mb-8">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex flex-col gap-2">
                              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                 Source Language
                              </label>
                              <div className="relative">
                                 <select
                                    value={selectedLanguage}
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                    className="w-full h-12 pl-4 pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg appearance-none text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                 >
                                    {LANGUAGES.map(lang => (
                                       <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                 </select>
                                 <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    expand_more
                                 </span>
                              </div>
                           </div>
                           <div className="flex flex-col gap-2">
                              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                 Target Language
                              </label>
                              <div className="relative">
                                 <select
                                    value={targetLanguage}
                                    readOnly
                                    disabled
                                    className="w-full h-12 pl-4 pr-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg appearance-none text-slate-500 dark:text-slate-500 cursor-not-allowed outline-none"
                                 >
                                    <option value="English">English</option>
                                 </select>
                                 {/* Dropdown arrow removed for read-only look */}
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center gap-3">
                        <button
                           onClick={() => setShowLanguageConfirm(false)}
                           className="flex-1 h-12 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                           Cancel
                        </button>
                        <button
                           onClick={handleProcessConfirmed}
                           className="flex-1 h-12 rounded-lg bg-primary hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                        >
                           Confirm & Translate
                           <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Export PDF Modal */}
         {showExportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-8">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Export Result</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">
                     Choose a format and filename for your translation document.
                  </p>

                  <div className="flex flex-col gap-4 mb-6">

                     {/* Format Selection */}
                     <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Format</label>
                        <div className="flex gap-4">
                           <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${exportFormat === 'pdf' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                              <input
                                 type="radio"
                                 name="format"
                                 className="hidden"
                                 checked={exportFormat === 'pdf'}
                                 onChange={() => setExportFormat('pdf')}
                              />
                              <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                              <span className="font-medium">PDF Document</span>
                           </label>

                           <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${exportFormat === 'txt' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                              <input
                                 type="radio"
                                 name="format"
                                 className="hidden"
                                 checked={exportFormat === 'txt'}
                                 onChange={() => setExportFormat('txt')}
                              />
                              <span className="material-symbols-outlined text-slate-500">description</span>
                              <span className="font-medium">Text File (.txt)</span>
                           </label>
                        </div>
                     </div>

                     <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                           Translator Name
                        </label>
                        <input
                           type="text"
                           value={translatorName}
                           onChange={(e) => setTranslatorName(e.target.value)}
                           className="w-full h-12 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                           placeholder="Enter your name"
                        />
                     </div>

                     <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                           Filename
                        </label>
                        <div className="flex">
                           <input
                              type="text"
                              value={exportFileName}
                              onChange={(e) => setExportFileName(e.target.value)}
                              className="flex-1 h-12 pl-4 pr-4 bg-white dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-600 rounded-l-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                              placeholder="Enter filename..."
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleExportConfirm()}
                           />
                           <div className="h-12 px-4 flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-l-0 border-slate-200 dark:border-slate-600 rounded-r-lg text-slate-500 font-medium">
                              .{exportFormat}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-3">
                     <button
                        onClick={() => setShowExportModal(false)}
                        className="flex-1 h-12 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={handleExportConfirm}
                        className="flex-1 h-12 rounded-lg bg-primary hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                     >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                        Export
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
