import { jsPDF } from 'jspdf';

/**
 * Loads a font file from a URL and converts it to a Base64 string for jsPDF.
 */
export const loadFontAsBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load font from ${url}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const base64String = result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Registers necessary Noto Sans fonts based on the source language.
 * This allows jsPDF to render non-ASCII characters in the exported PDF.
 */
export const registerFontsForLanguage = async (doc: jsPDF, language: string) => {
    // Default fallback font (Noto Sans Latin)
    try {
        const latinBase64 = await loadFontAsBase64('/fonts/NotoSans-Regular.ttf');
        doc.addFileToVFS('NotoSans-Regular.ttf', latinBase64);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');
    } catch (e) {
        console.warn('Failed to register Latin font fallback:', e);
    }

    const lang = language.toLowerCase();

    if (lang.includes('tamil')) {
        try {
            const tamilBase64 = await loadFontAsBase64('/fonts/NotoSansTamil-Regular.ttf');
            doc.addFileToVFS('NotoSansTamil-Regular.ttf', 'NotoSansTamil');
            doc.addFont('NotoSansTamil-Regular.ttf', 'NotoSansTamil', 'normal');
            doc.setFont('NotoSansTamil');
        } catch (e) {
            console.warn('Failed to register Tamil font:', e);
        }
    } else if (lang.includes('telugu')) {
        try {
            const teluguBase64 = await loadFontAsBase64('/fonts/NotoSansTelugu-Regular.ttf');
            doc.addFileToVFS('NotoSansTelugu-Regular.ttf', teluguBase64);
            doc.addFont('NotoSansTelugu-Regular.ttf', 'NotoSansTelugu', 'normal');
            doc.setFont('NotoSansTelugu');
        } catch (e) {
            console.warn('Failed to register Telugu font:', e);
        }
    } else if (lang.includes('amharic')) {
        try {
            const ethiopicBase64 = await loadFontAsBase64('/fonts/NotoSansEthiopic-Regular.ttf');
            doc.addFileToVFS('NotoSansEthiopic-Regular.ttf', ethiopicBase64);
            doc.addFont('NotoSansEthiopic-Regular.ttf', 'NotoSansEthiopic', 'normal');
            doc.setFont('NotoSansEthiopic');
        } catch (e) {
            console.warn('Failed to register Ethiopic font for Amharic:', e);
        }
    }
    // Note: Afan Oromo uses Latin script, so it's covered by the default NotoSans Latin font.
};
