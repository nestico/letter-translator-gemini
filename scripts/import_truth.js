
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://kywdelvillnpiazzwsyy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5d2RlbHZpbGxucGlhenp3c3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3Mjc5NDQsImV4cCI6MjA4MzMwMzk0NH0.fYSdCW27-nwvEjcCbkf_JTdrLdztMK_cwk-z0OLIPNo';
const supabase = createClient(supabaseUrl, supabaseKey);

const referenceDir = 'c:/ANTIGRABITY/letter-translator-gemini/reference_data';

async function importTruthFiles() {
    console.log("Starting import...");
    const files = fs.readdirSync(referenceDir);
    const truthFiles = files.filter(f => f.endsWith('_Truth.txt'));

    console.log(`Found ${truthFiles.length} truth files.`);

    for (const file of truthFiles) {
        const filePath = path.join(referenceDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Parse content
        const transcriptionMatch = content.match(/TRANSCRIPTION:\s*([\s\S]*?)\s*TRANSLATION:/i);
        const translationOuterMatch = content.match(/TRANSLATION:\s*([\s\S]*)/i);

        if (!transcriptionMatch || !translationOuterMatch) {
            console.warn(`Could not parse ${file}`);
            continue;
        }

        const transcription = transcriptionMatch[1].trim();
        const translation = translationOuterMatch[1].trim();

        // Extract language from filename
        const languageMap = {
            'Afan_Oromo': '(ETH) Afan Oromo',
            'Amharic': '(ETH) Amharic',
            'Tigrigna': '(ETH) Tigrigna',
            'Tamil': '(ind) Tamil',
            'Telugu': '(Ind) Telugu'
        };

        let lang = 'Unknown';
        for (const [key, value] of Object.entries(languageMap)) {
            if (file.includes(key)) {
                lang = value;
                break;
            }
        }

        console.log(`Importing ${file} as ${lang}...`);

        const { data, error } = await supabase
            .from('translations')
            .insert({
                user_id: '00000000-0000-0000-0000-000000000000', // System identifier
                file_name: file,
                transcription,
                translation,
                source_language: lang,
                target_language: 'English',
                is_golden: true
            });

        if (error) {
            console.error(`Error importing ${file}:`, error);
        } else {
            console.log(`Successfully imported ${file}`);
        }
    }
}

importTruthFiles().catch(console.error);
