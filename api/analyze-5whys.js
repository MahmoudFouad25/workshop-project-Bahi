// Vercel Serverless Function - Automatic 5 Whys Analysis with Team Building Context

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
        const { cause, category, item_name, team_building_context } = req.body;

        if (!cause || !category) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check for Anthropic API key
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error('Missing ANTHROPIC_API_KEY');
            return res.status(500).json({ error: 'API key not configured' });
        }

        console.log(`Auto-analyzing 5 Whys for: ${cause}`);

        // Call Claude API
        const result = await analyzeWithClaude(cause, category, item_name, team_building_context, apiKey);

        console.log('Auto 5 Whys analysis completed successfully');

        return res.status(200).json(result);

    } catch (error) {
        console.error('Error in analyze-5whys-auto:', error);
        return res.status(500).json({ 
            error: 'Analysis failed',
            details: error.message 
        });
    }
}

async function analyzeWithClaude(cause, category, item_name, team_building_context, apiKey) {
    const categoryNames = {
        external: 'عوامل خارجية (External)',
        system: 'الأنظمة والعمليات (System)',
        internal: 'عوامل داخلية (Internal)'
    };

    // Build context from Team Building if available
    let contextSection = '';
    if (team_building_context) {
        contextSection = `
**السياق من التحليل السابق (Team Building):**

الأنماط الملاحظة سابقاً:
${team_building_context.patterns ? team_building_context.patterns.map(p => `• ${p}`).join('\n') : 'غير متوفر'}

الأسباب الجذرية المحتملة:
${team_building_context.root_causes ? `• ${team_building_context.root_causes}` : 'غير متوفر'}

التوصيات السابقة:
${team_building_context.recommendations ? team_building_context.recommendations.map(r => `• ${r}`).join('\n') : 'غير متوفر'}

---
`;
    }

    const prompt = `أنت خبير في Root Cause Analysis باستخدام منهجية الـ 5 Whys.

**السياق العام:**
المؤسسة: صناع الحياة مصر (مؤسسة خيرية)
الهدف: جمع 41 مليون جنيه في 2025
${item_name ? `البند المتأثر: ${item_name}` : ''}

${contextSection}

**المشكلة المطلوب تحليلها:**
السبب: "${cause}"
الفئة: ${categoryNames[category]}

**مهمتك:**

قم بتحليل عميق باستخدام منهجية الـ 5 Whys، ثم استخرج:

1. **الـ 5 Whys:** اسأل "لماذا؟" 5 مرات للوصول للجذر:
   - Why 1: لماذا حدث هذا السبب؟
   - Why 2: لماذا حدث ما ذكرته في Why 1؟
   - Why 3: لماذا حدث ما ذكرته في Why 2؟
   - Why 4: لماذا حدث ما ذكرته في Why 3؟
   - Why 5: السبب الجذري الأعمق

2. **Root Cause (السبب الجذري النهائي):** السبب الأساسي الذي إذا حللناه، حلت المشكلة من جذورها.

3. **Contributing Factors (عوامل مساهمة):** 2-4 عوامل أخرى تساهم في المشكلة.

4. **Action Items (إجراءات عمل SMART):** 3-5 خطوات محددة وقابلة للتنفيذ.

5. **Quick Wins (حلول سريعة):** 2-3 إجراءات يمكن تنفيذها خلال أسبوع-أسبوعين.

6. **Long-term Solutions (حلول طويلة المدى):** 2-3 تغييرات استراتيجية تحتاج 3-6 شهور.

7. **Success Indicators (مؤشرات نجاح):** 3-4 مؤشرات قابلة للقياس.

**ملاحظات مهمة:**
- استفد من السياق السابق (إن وُجد) لتعميق التحليل
- كن عملياً - المؤسسة خيرية محدودة الموارد
- اجعل الحلول قابلة للتطبيق في السياق المصري
- استخدم لغة عربية واضحة ومباشرة

**الرد المطلوب - JSON فقط بدون أي نص إضافي:**

{
  "five_whys": {
    "why1": "الإجابة على لماذا المرة الأولى",
    "why2": "الإجابة على لماذا المرة الثانية",
    "why3": "الإجابة على لماذا المرة الثالثة",
    "why4": "الإجابة على لماذا المرة الرابعة",
    "why5": "الإجابة على لماذا المرة الخامسة - السبب الجذري الأولي"
  },
  "root_cause": "السبب الجذري النهائي المركّز والواضح",
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

ابدأ الآن - JSON فقط:`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8000,
            temperature: 0.7,
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
    let claudeResponse = data.content[0].text;

    console.log('Claude response received, length:', claudeResponse.length);

    // Enhanced cleaning
    claudeResponse = claudeResponse.trim();
    claudeResponse = claudeResponse.replace(/```json\s*/gi, '');
    claudeResponse = claudeResponse.replace(/```javascript\s*/gi, '');
    claudeResponse = claudeResponse.replace(/```\s*/g, '');
    
    const firstBrace = claudeResponse.indexOf('{');
    if (firstBrace > 0) {
        claudeResponse = claudeResponse.substring(firstBrace);
    }
    
    const lastBrace = claudeResponse.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace < claudeResponse.length - 1) {
        claudeResponse = claudeResponse.substring(0, lastBrace + 1);
    }
    
    claudeResponse = claudeResponse.replace(/[\u201C\u201D]/g, '"');
    claudeResponse = claudeResponse.replace(/[\u2018\u2019]/g, "'");
    claudeResponse = claudeResponse.trim();

    // Parse JSON
    let result;
    try {
        result = JSON.parse(claudeResponse);
    } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response preview:', claudeResponse.substring(0, 500));
        throw new Error('Failed to parse Claude response as JSON');
    }

    // Validate structure
    if (!result.five_whys || !result.root_cause || !result.action_items) {
        console.error('Invalid structure:', result);
        throw new Error('Invalid response structure from Claude');
    }

    return result;
}
