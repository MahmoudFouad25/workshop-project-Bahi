// Vercel Serverless Function - 5 Whys Analysis with Claude API

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
        const { cause, category, responses } = req.body;

        if (!cause || !category || !responses || !Array.isArray(responses) || responses.length === 0) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        // Check for Anthropic API key
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error('Missing ANTHROPIC_API_KEY');
            return res.status(500).json({ error: 'API key not configured' });
        }

        console.log(`Analyzing 5 Whys for cause: ${cause} (${responses.length} responses)`);

        // Call Claude API
        const result = await analyzeWithClaude(cause, category, responses, apiKey);

        console.log('5 Whys analysis completed successfully');

        return res.status(200).json(result);

    } catch (error) {
        console.error('Error in analyze-5whys:', error);
        return res.status(500).json({ 
            error: 'Analysis failed',
            details: error.message 
        });
    }
}

async function analyzeWithClaude(cause, category, responses, apiKey) {
    // Format responses
    const responsesText = responses.map((r, i) => `
تحليل #${i + 1}:
- Why 1: ${r.why1}
- Why 2: ${r.why2}
- Why 3: ${r.why3}
- Why 4: ${r.why4}
- Why 5: ${r.why5}
    `).join('\n---\n');

    const categoryNames = {
        external: 'عوامل خارجية (External)',
        system: 'الأنظمة والعمليات (System)',
        internal: 'عوامل داخلية (Internal)'
    };

    const prompt = `أنت خبير في Root Cause Analysis وتحليل الـ 5 Whys لمشاكل المؤسسات الخيرية.

**السياق:**
المؤسسة: صناع الحياة مصر (مؤسسة خيرية)
الهدف: جمع 41 مليون جنيه في 2025
المشكلة الأصلية: "${cause}"
الفئة: ${categoryNames[category]}

**تحليلات الـ 5 Whys من المشاركين:**

${responsesText}

**مهمتك:**

حلل جميع تحليلات الـ 5 Whys أعلاه واستخرج:

1. **Root Cause (السبب الجذري)**: السبب الأعمق والأساسي الذي إذا حللناه، حلت المشكلة من جذورها. كن محدداً وواضحاً.

2. **Contributing Factors (العوامل المساهمة)**: العوامل الأخرى التي تساهم في المشكلة (2-4 عوامل).

3. **Action Items (إجراءات العمل)**: خطوات عملية محددة وقابلة للتنفيذ لحل السبب الجذري (3-5 إجراءات). كل إجراء يجب أن يكون:
   - محدد (Specific)
   - قابل للقياس (Measurable)
   - واقعي (Achievable)
   - ذو صلة (Relevant)
   - محدد بوقت (Time-bound)

4. **Quick Wins (إجراءات سريعة)**: حلول يمكن تنفيذها خلال أسبوع-أسبوعين (2-3 إجراءات).

5. **Long-term Solutions (حلول طويلة المدى)**: تغييرات استراتيجية تحتاج 3-6 شهور (2-3 حلول).

6. **Success Indicators (مؤشرات النجاح)**: كيف نعرف أن الحل نجح؟ مؤشرات قابلة للقياس (3-4 مؤشرات).

**تنبيهات:**
- كن عملياً - المؤسسة خيرية محدودة الموارد
- اجعل الحلول قابلة للتطبيق في السياق المصري
- ركز على التأثير الأكبر
- استخدم لغة عربية واضحة ومباشرة

**الرد المطلوب بصيغة JSON فقط (بدون أي نص إضافي):**

\`\`\`json
{
  "root_cause": "السبب الجذري الأساسي بوضوح",
  "contributing_factors": [
    "عامل مساهم 1",
    "عامل مساهم 2"
  ],
  "action_items": [
    "إجراء عمل محدد 1 (SMART)",
    "إجراء عمل محدد 2 (SMART)"
  ],
  "quick_wins": [
    "إجراء سريع 1",
    "إجراء سريع 2"
  ],
  "long_term_solutions": [
    "حل استراتيجي 1",
    "حل استراتيجي 2"
  ],
  "success_indicators": [
    "مؤشر نجاح قابل للقياس 1",
    "مؤشر نجاح قابل للقياس 2"
  ]
}
\`\`\`

**مهم جداً:** رد فقط بالـ JSON - لا تضع أي نص قبله أو بعده.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 3000,
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

    console.log('Claude response received:', claudeResponse.substring(0, 200));

    // Clean up response
    let cleanedResponse = claudeResponse.trim();
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    cleanedResponse = cleanedResponse.trim();

    // Parse JSON
    let result;
    try {
        result = JSON.parse(cleanedResponse);
    } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response text:', cleanedResponse);
        throw new Error('Failed to parse Claude response as JSON');
    }

    // Validate structure
    if (!result.root_cause || !result.action_items) {
        console.error('Invalid structure:', result);
        throw new Error('Invalid response structure from Claude');
    }

    return result;
}
