
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before running.');
    process.exit(1);
}

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
                user_id: '82551711-7881-4f84-847d-86b4f716ed2c', // System identifier (ehernandez)
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
