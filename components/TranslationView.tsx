import React, { useState } from 'react';
import { translateImage } from '../services/azureService';
import { User, TranslationResult } from '../types';
import { logActivity } from '../services/activity';
import { saveTranslation } from '../services/translationService';
import { jsPDF } from 'jspdf';

interface TranslationViewProps {
   user: User | null;
   image: string;
   file: File;
   onReset: () => void;
}

export const TranslationView: React.FC<TranslationViewProps> = ({ user, image, file, onReset }) => {
   const [result, setResult] = useState<TranslationResult | null>(null);
   const [editedResult, setEditedResult] = useState<TranslationResult | null>(null);
   const [isProcessing, setIsProcessing] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [showLanguageConfirm, setShowLanguageConfirm] = useState(false);
   const [showExportModal, setShowExportModal] = useState(false);
   const [exportFormat, setExportFormat] = useState<'pdf' | 'txt'>('pdf');
   const [exportFileName, setExportFileName] = useState('letter_translation');
   const [selectedLanguage, setSelectedLanguage] = useState('Auto-Detect');
   const [targetLanguage, setTargetLanguage] = useState('English');
   const [error, setError] = useState<string | null>(null);
   const [activeTab, setActiveTab] = useState<'transcription' | 'translation'>('translation');

   const LANGUAGES = [
      'Auto-Detect', 'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Latin', 'Dutch', 'Russian', 'Chinese', 'Japanese'
   ];

   const handleProcessStart = () => {
      setShowLanguageConfirm(true);
   };

   const handleProcessConfirmed = async () => {
      setShowLanguageConfirm(false);
      setError(null);
      if (!file) return;

      console.log("Starting processing...");
      setIsProcessing(true);
      try {
         // Read file to base64
         console.log("Reading file...");
         const reader = new FileReader();
         reader.readAsDataURL(file);

         const base64Promise = new Promise<{ base64Data: string, mimeType: string }>((resolve, reject) => {
            reader.onload = () => {
               const result = reader.result as string;
               const base64Data = result.split(',')[1];
               const mimeType = file.type;
               resolve({ base64Data, mimeType });
            };
            reader.onerror = (err) => {
               console.error("File reading error:", err);
               reject(err);
            };
         });

         const { base64Data, mimeType } = await base64Promise;
         const data = await translateImage(base64Data, mimeType, selectedLanguage, targetLanguage);
         setResult(data);
         setEditedResult(data);

         if (user) {
            logActivity(user.id, 'TRANSLATE_LETTER', {
               language: data.detectedLanguage,
               confidence: data.confidenceScore
            });

            // Save to history
            saveTranslation(
               user.id,
               file.name,
               data.transcription,
               data.translation,
               data.detectedLanguage || selectedLanguage,
               targetLanguage
            ).then(saved => {
               if (saved) console.log("Translation saved to history");
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

   const handleExportClick = () => {
      setShowExportModal(true);
   };

   const handleExportConfirm = async () => {
      if (!editedResult) return;

      let fileName = exportFileName.trim();
      if (!fileName) fileName = 'letter_translation';

      // Harsh sanitization to be safe: alphanumeric, dashes, underscores only
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
            let y = 20;

            // --- 1. Original Image ---
            // We need to read the file again to base64 if it's not available, 
            // but we can trust the 'image' prop if it's a data URI. 
            // However, 'image' prop might be a blob url if set from file?
            // Let's safe-read the file prop again which we know is a File object.

            // Note: reading file is async, but we are in an async function.
            const reader = new FileReader();
            const imagePromise = new Promise<{ data: string, type: string }>((resolve, reject) => {
               reader.onload = () => resolve({ data: reader.result as string, type: file.type });
               reader.onerror = reject;
               reader.readAsDataURL(file);
            });

            const { data: imgData, type: imgType } = await imagePromise;

            // Calculate numeric aspect ratio
            const imgObj = new Image();
            imgObj.src = imgData;
            await new Promise((resolve) => { imgObj.onload = resolve; });

            const imgProps = pdfDoc.getImageProperties(imgData);
            const imgRatio = imgProps.width / imgProps.height;

            let finalImgWidth = contentWidth;
            let finalImgHeight = contentWidth / imgRatio;

            // Allow image to take up to 65% of the page height now (bigger than before)
            const maxHeight = pageHeight * 0.65;
            if (finalImgHeight > maxHeight) {
               finalImgHeight = maxHeight;
               finalImgWidth = maxHeight * imgRatio;
            }

            // Center image
            const xOffset = margin + ((contentWidth - finalImgWidth) / 2);

            // Add ID Header above image
            const imageId = file.name.replace(/\.[^/.]+$/, ""); // remove extension
            pdfDoc.setFontSize(12);
            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.setTextColor(0);
            pdfDoc.text(`ID: ${imageId}`, margin, y);
            y += 10;

            pdfDoc.addImage(imgData, imgType === 'image/png' ? 'PNG' : 'JPEG', xOffset, y, finalImgWidth, finalImgHeight);

            y += finalImgHeight + 20;

            // Ensure we have space for translation start
            if (y > pageHeight - 40) {
               pdfDoc.addPage();
               y = 20;
            }

            // --- 2. Translation ---
            // Clean, simple layout matching the reference
            pdfDoc.setFontSize(12);
            pdfDoc.setFont("helvetica", "normal");
            pdfDoc.setTextColor(0); // Black text

            // Simple ID or Header if needed, but user asked to remove title. 
            // The reference image has "ID 01157711" at top, but user said "remove the title Letter Translation".
            // I will strictly just put the translation text for now as requested "only keep it the english traslation".

            // Add a small spacer/separator or just start text?
            // Reference shows text closely following. 

            const splitTranslation = pdfDoc.splitTextToSize(editedResult.translation, contentWidth);

            splitTranslation.forEach((line: string) => {
               if (y > pageHeight - 20) {
                  pdfDoc.addPage();
                  y = 20;
               }
               pdfDoc.text(line, margin, y);
               y += 7; // slightly more line spacing for readability
            });

            // Add footer/signature like "Translated by Lilian Aguero" from reference? 
            // User didn't explicitly ask for a specific footer content, just "make look like the image".
            // The image has a date and "Translated by...".
            // I'll add the current date and a generic footer for professional look if space permits.

            y += 10;
            if (y > pageHeight - 20) {
               pdfDoc.addPage();
               y = 20;
            }

            const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            pdfDoc.setFont("helvetica", "italic");
            pdfDoc.setFontSize(10);
            pdfDoc.text(dateStr, margin, y);
            y += 6;
            if (user?.name) {
               pdfDoc.text(`Translated by ${user.name}`, margin, y);
            } else {
               pdfDoc.text(`Translated by Letter Translator AI`, margin, y);
            }

         } catch (e) {
            console.error(e);
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
               await writable.write(textContent); // Text strings are auto-converted to UTF-8
            }

            await writable.close();
            setShowExportModal(false);
            return; // Success!
         }
      } catch (err: any) {
         // User cancelled or not supported
         if (err.name !== 'AbortError') {
            console.warn("File System Access API failed, falling back:", err);
         } else {
            // User intentionally cancelled the save dialog, so we stop here.
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
            // Small timeout to ensure event fires before removal
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
                  Change Image
               </button>
               {result && (
                  <button
                     onClick={handleExportClick}
                     className="flex items-center justify-center h-10 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-bold"
                  >
                     <span className="material-symbols-outlined mr-2 text-[20px]">download</span>
                     Export PDF
                  </button>
               )}
            </div>
         </div>

         <div className="flex flex-col lg:flex-row gap-6 h-full flex-1">
            {/* Left Column: Image Viewer */}
            <div className="flex-1 bg-slate-100 dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden relative min-h-[400px] flex items-center justify-center group">
               {file.type === 'application/pdf' ? (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-8 scale-150">
                     <span className="material-symbols-outlined text-6xl text-red-500 mb-4 opacity-100">picture_as_pdf</span>
                     <span className="text-lg font-medium text-slate-700 dark:text-slate-300">{file.name}</span>
                     <span className="text-sm mt-1">PDF Document</span>
                  </div>
               ) : (
                  <img
                     src={image}
                     alt="Uploaded letter"
                     className="w-full h-full object-contain max-h-[70vh]"
                  />
               )}

               {/* Action Overlay */}
               {!result && !isProcessing && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[1px]">
                     <button
                        onClick={handleProcessStart}
                        className="h-14 px-8 rounded-full bg-primary hover:bg-blue-600 text-white font-bold text-lg shadow-2xl scale-100 hover:scale-105 transition-all flex items-center gap-2 animate-in fade-in zoom-in duration-300"
                     >
                        <span className="material-symbols-outlined">auto_awesome</span>
                        Decipher with AI
                     </button>
                  </div>
               )}

               {isProcessing && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-black/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                     <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                     <p className="text-lg font-bold text-primary animate-pulse">Deciphering Handwriting...</p>
                     <p className="text-sm text-slate-500">Analyzing strokes & context</p>
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
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Deciphering Your Document</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                           Our AI is analyzing the handwriting, transcribing the text, and translating it to {targetLanguage}.
                        </p>
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
                           {result.detectedLanguage && (
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                 <span className="material-symbols-outlined text-[16px]">translate</span>
                                 Detected: {result.detectedLanguage}
                              </div>
                           )}
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
                  <div className="md:w-1/2 bg-slate-100 dark:bg-black/50 p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700">
                     {file.type === 'application/pdf' ? (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-8">
                           <span className="material-symbols-outlined text-6xl text-red-500 mb-4">picture_as_pdf</span>
                           <span className="text-lg font-medium text-slate-700 dark:text-slate-300">{file.name}</span>
                        </div>
                     ) : (
                        <img src={image} alt="Preview" className="max-h-[300px] object-contain rounded-lg shadow-lg" />
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
                                    onChange={(e) => setTargetLanguage(e.target.value)}
                                    className="w-full h-12 pl-4 pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg appearance-none text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                 >
                                    {LANGUAGES.filter(l => l !== 'Auto-Detect').map(lang => (
                                       <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                 </select>
                                 <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    expand_more
                                 </span>
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
