interface OCRResult {
    text: string;
    lines: string[];
}

export const analyzeImage = async (base64: string): Promise<OCRResult> => {
    const visionEndpoint = import.meta.env.VITE_AZURE_VISION_ENDPOINT;
    const visionKey = import.meta.env.VITE_AZURE_VISION_KEY;

    if (!visionEndpoint || !visionKey) {
        throw new Error("Azure Vision credentials missing");
    }

    // Ensure endpoint ends with /
    const baseUrl = visionEndpoint.endsWith('/') ? visionEndpoint : `${visionEndpoint}/`;

    // Construct the Read API URL (v3.2)
    const url = `${baseUrl}vision/v3.2/read/analyze`;

    // 1. Submit the image for analysis
    try {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        console.log(`Sending image to Vision API. Size: ${bytes.length} bytes`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': visionKey,
                'Content-Type': 'application/octet-stream'
            },
            body: bytes
        });

        if (response.status !== 202) {
            throw new Error(`Vision API Error: ${response.status} ${response.statusText}`);
        }

        const operationLocation = response.headers.get('Operation-Location');
        if (!operationLocation) {
            throw new Error("Vision API did not return an operation location");
        }

        // 2. Poll for results
        let status = 'running';
        let result: any = null;
        let retries = 0;
        const maxRetries = 30; // 30 seconds max usually enough

        while (status === 'running' || status === 'notStarted') {
            if (retries >= maxRetries) throw new Error("OCR timed out");

            await new Promise(r => setTimeout(r, 1000));
            retries++;

            const pollResponse = await fetch(operationLocation, {
                headers: {
                    'Ocp-Apim-Subscription-Key': visionKey
                }
            });

            if (!pollResponse.ok) throw new Error("Failed to poll OCR status");

            const data = await pollResponse.json();
            status = data.status;
            if (status === 'succeeded') {
                result = data.analyzeResult;
            } else if (status === 'failed') {
                throw new Error("OCR analysis failed");
            }
        }

        // 3. Extract text
        if (!result || !result.readResults) return { text: "", lines: [] };

        const allLines: string[] = [];
        result.readResults.forEach((page: any) => {
            page.lines.forEach((line: any) => {
                allLines.push(line.text);
            });
        });

        console.log(`OCR extracted ${allLines.length} lines.`);

        return {
            text: allLines.join('\n'),
            lines: allLines
        };

    } catch (error) {
        console.error("OCR Service Error:", error);
        throw error;
    }
};
