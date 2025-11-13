// Vercel Serverless Function - Pre-Mortem Analysis with Claude API

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { causes } = req.body;

        if (!causes || !Array.isArray(causes) || causes.length === 0) {
            return res.status(400).json({ error: 'No causes provided' });
        }

        // Check for Anthropic API key
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error('Missing ANTHROPIC_API_KEY');
            return res.status(500).json({ error: 'API key not configured' });
        }

        console.log(`Analyzing ${causes.length} causes...`);

        // Prepare causes text
        const causesText = causes.map((c, i) => `${i + 1}. ${c.cause} (البند: ${c.item})`).join('\n');

        // Call Claude API
        const result = await analyzeWithClaude(causesText, apiKey);

        console.log('Analysis completed successfully');

        return res.status(200).json(result);

    } catch (error) {
        console.error('Error in analyze-premortem:', error);
        return res.status(500).json({ 
            error: 'Analysis failed',
            details: error.message 
        });
    }
}

async function analyzeWithClaude(causesText, apiKey) {
    const prompt = `You are an expert analyst specializing in charity organizations and root cause analysis.

CRITICAL INSTRUCTIONS:
1. Respond ONLY with valid JSON
2. Do NOT use markdown code blocks (no backticks)
3. Do NOT add any text before or after the JSON
4. Start directly with { and end with }

TASK:
Analyze these failure causes from a Pre-Mortem exercise for a fundraising campaign in Egypt:

${causesText}

CATEGORIES:
- external: Factors outside direct control (economy, market, competitors, laws)
- system: Issues with technology, processes, systems, infrastructure
- internal: Internal issues (skills, leadership, training, organizational culture)

REQUIRED JSON FORMAT (respond with this exact structure):

{
  "categories": {
    "external": ["cause 1", "cause 2"],
    "system": ["cause 1", "cause 2"],
    "internal": ["cause 1", "cause 2"]
  },
  "analysis": {
    "external": {
      "patterns": ["pattern 1", "pattern 2"],
      "root_cause": "root cause text",
      "solutions": ["solution 1", "solution 2"]
    },
    "system": {
      "patterns": ["pattern 1"],
      "root_cause": "root cause text",
      "solutions": ["solution 1"]
    },
    "internal": {
      "patterns": ["pattern 1"],
      "root_cause": "root cause text",
      "solutions": ["solution 1"]
    }
  },
  "overall_insights": {
    "dominant_category": "analysis text in Arabic",
    "key_insights": ["insight 1 in Arabic", "insight 2 in Arabic"],
    "interconnections": "text in Arabic",
    "priority_recommendations": ["recommendation 1 in Arabic", "recommendation 2 in Arabic"],
    "quick_wins": ["quick win 1 in Arabic", "quick win 2 in Arabic"]
  }
}

IMPORTANT: Write all text content in Arabic, but respond ONLY with the JSON - no other text.`;
    

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API Error:', errorText);
        throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const claudeResponse = data.content[0].text;

   console.log('=== FULL RAW RESPONSE ===');
    console.log(claudeResponse);
    console.log('=== END RAW RESPONSE ===');
    console.log('Response length:', claudeResponse.length);
    console.log('Response type:', typeof claudeResponse);

    // ═══════════════════════════════════════════════════
    // SUPER ENHANCED Response Cleaning
    // ═══════════════════════════════════════════════════
    let cleanedResponse = claudeResponse.trim();
    
    console.log('Step 1: After trim, length:', cleanedResponse.length);
    
    // Remove markdown code blocks (all variations)
    cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/```javascript\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/```js\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    
    console.log('Step 2: After removing markdown, length:', cleanedResponse.length);
    console.log('First 100 chars:', cleanedResponse.substring(0, 100));
    
    // Find first {
    const firstBrace = cleanedResponse.indexOf('{');
    console.log('Step 3: First { found at position:', firstBrace);
    
    if (firstBrace === -1) {
        console.error('CRITICAL: No opening brace { found in response!');
        console.error('Full cleaned response:', cleanedResponse);
        throw new Error('Response does not contain JSON object - no opening brace found');
    }
    
    if (firstBrace > 0) {
        console.log('Removing text before first {:', cleanedResponse.substring(0, firstBrace));
        cleanedResponse = cleanedResponse.substring(firstBrace);
    }
    
    // Find last }
    const lastBrace = cleanedResponse.lastIndexOf('}');
    console.log('Step 4: Last } found at position:', lastBrace);
    
    if (lastBrace === -1) {
        console.error('CRITICAL: No closing brace } found in response!');
        console.error('Full cleaned response:', cleanedResponse);
        throw new Error('Response does not contain complete JSON object - no closing brace found');
    }
    
    if (lastBrace < cleanedResponse.length - 1) {
        console.log('Removing text after last }:', cleanedResponse.substring(lastBrace + 1));
        cleanedResponse = cleanedResponse.substring(0, lastBrace + 1);
    }
    
    // Fix smart quotes
    cleanedResponse = cleanedResponse.replace(/[\u201C\u201D]/g, '"');
    cleanedResponse = cleanedResponse.replace(/[\u2018\u2019]/g, "'");
    
    // Final trim
    cleanedResponse = cleanedResponse.trim();
    
    console.log('=== FINAL CLEANED RESPONSE ===');
    console.log(cleanedResponse);
    console.log('=== END CLEANED RESPONSE ===');
    console.log('Final length:', cleanedResponse.length);
    console.log('Starts with {:', cleanedResponse.startsWith('{'));
    console.log('Ends with }:', cleanedResponse.endsWith('}'));
    
   // Parse JSON with detailed error reporting
    let result;
    try {
        result = JSON.parse(cleanedResponse);
    } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response text:', cleanedResponse);
        
        // Return detailed error with raw response for debugging
        throw new Error(JSON.stringify({
            error: 'Failed to parse Claude response as JSON',
            parseError: parseError.message,
            rawResponse: claudeResponse.substring(0, 1000),
            cleanedResponse: cleanedResponse.substring(0, 1000),
            responseLength: claudeResponse.length,
            cleanedLength: cleanedResponse.length,
            startsWithBrace: cleanedResponse.trim().startsWith('{'),
            endsWithBrace: cleanedResponse.trim().endsWith('}')
        }));
    }


    // Validate structure
    if (!result.categories || !result.analysis || !result.overall_insights) {
        console.error('Invalid structure:', result);
        throw new Error('Invalid response structure from Claude');
    }

    return result;
}
