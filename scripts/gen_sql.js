
import fs from 'fs';
import path from 'path';

const referenceDir = 'c:/ANTIGRABITY/letter-translator-gemini/reference_data';

function generateSql() {
    const files = fs.readdirSync(referenceDir);
    const truthFiles = files.filter(f => f.endsWith('_Truth.txt'));

    let sql = "INSERT INTO translations (user_id, file_name, transcription, translation, source_language, target_language, is_golden) VALUES \n";
    const values = [];

    for (const file of truthFiles) {
        const filePath = path.join(referenceDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Parse content
        const transcriptionMatch = content.match(/TRANSCRIPTION:\s*([\s\S]*?)\s*TRANSLATION:/i);
        const translationOuterMatch = content.match(/TRANSLATION:\s*([\s\S]*)/i);

        if (!transcriptionMatch || !translationOuterMatch) continue;

        const transcription = transcriptionMatch[1].trim().replace(/'/g, "''");
        const translation = translationOuterMatch[1].trim().replace(/'/g, "''");

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

        values.push(`('00000000-0000-0000-0000-000000000000', '${file}', '${transcription}', '${translation}', '${lang}', 'English', true)`);
    }

    sql += values.join(",\n") + ";";
    fs.writeFileSync('import_truth.sql', sql);
    console.log("Generated import_truth.sql");
}

generateSql();
