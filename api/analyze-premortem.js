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
    const prompt = `أنت خبير في تحليل المؤسسات الخيرية وتحديد الأسباب الجذرية للمشاكل.

لديك قائمة بالأسباب المحتملة لفشل بنود مختلفة من أهداف جمع التبرعات، تم جمعها من تمرين Pre-Mortem مع فريق صناع الحياة مصر.

**مهمتك:**

1. **تصنيف الأسباب** إلى 3 فئات رئيسية:
   - **External (خارجية)**: أسباب خارج سيطرة المؤسسة مباشرة - مثل الاقتصاد، السوق، المنافسين، القوانين، الظروف السياسية
   - **System (أنظمة وعمليات)**: مشاكل في التقنية، العمليات، الأنظمة، الـ Processes، البنية التحتية
   - **Internal (داخلية)**: مشاكل داخلية مثل المهارات، القيادة، التدريب، الثقافة التنظيمية، الموارد البشرية

2. **تحليل كل فئة** واستخراج:
   - الأنماط المشتركة (patterns)
   - السبب الجذري المحتمل (root cause)
   - حلول مقترحة (solutions)

3. **استنتاجات شاملة** تتضمن:
   - الفئة الأكثر تأثيراً
   - استنتاجات رئيسية
   - الترابط بين الأسباب
   - توصيات الأولويات
   - إجراءات سريعة (quick wins)

**الأسباب المطلوب تحليلها:**

${causesText}

**تنبيهات مهمة:**
- كن دقيقاً في التصنيف - بعض الأسباب قد تكون مختلطة، لكن ضعها في الفئة الأنسب
- استخدم اللغة العربية الواضحة والمباشرة
- كن عملياً في الحلول المقترحة
- احذر من الأسباب المكررة - اجمعها معاً

**الرد المطلوب - اتبع هذه القواعد بدقة:**

1. أرسل JSON فقط - لا نص قبله ولا بعده
2. لا تستخدم markdown code blocks مثل ```json
3. ابدأ مباشرة بـ { واختم بـ }
4. استخدم هذا الهيكل بالضبط:

{
  "categories": {
    "external": ["السبب 1", "السبب 2"],
    "system": ["السبب 1", "السبب 2"],
    "internal": ["السبب 1", "السبب 2"]
  },
  "analysis": {
    "external": {
      "patterns": ["نمط 1", "نمط 2"],
      "root_cause": "السبب الجذري المحتمل",
      "solutions": ["حل 1", "حل 2"]
    },
    "system": {
      "patterns": [],
      "root_cause": "",
      "solutions": []
    },
    "internal": {
      "patterns": [],
      "root_cause": "",
      "solutions": []
    }
  },
  "overall_insights": {
    "dominant_category": "النص الذي يشرح الفئة الأكثر تأثيراً ولماذا",
    "key_insights": ["استنتاج رئيسي 1", "استنتاج رئيسي 2"],
    "interconnections": "كيف ترتبط الأسباب ببعضها",
    "priority_recommendations": ["توصية الأولوية 1", "توصية الأولوية 2"],
    "quick_wins": ["إجراء سريع 1", "إجراء سريع 2"]
  }
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

    console.log('Claude response received:', claudeResponse.substring(0, 200));

    // ═══════════════════════════════════════════════════
    // Enhanced Response Cleaning
    // ═══════════════════════════════════════════════════
    let cleanedResponse = claudeResponse.trim();
    
    // Remove markdown code blocks
    cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    
    // Remove any leading text before first {
    const firstBrace = cleanedResponse.indexOf('{');
    if (firstBrace > 0) {
        cleanedResponse = cleanedResponse.substring(firstBrace);
    }
    
    // Remove any trailing text after last }
    const lastBrace = cleanedResponse.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace < cleanedResponse.length - 1) {
        cleanedResponse = cleanedResponse.substring(0, lastBrace + 1);
    }
    
    // Final trim
    cleanedResponse = cleanedResponse.trim();
    
    console.log('Cleaned response preview:', cleanedResponse.substring(0, 100) + '...');

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
    if (!result.categories || !result.analysis || !result.overall_insights) {
        console.error('Invalid structure:', result);
        throw new Error('Invalid response structure from Claude');
    }

    return result;
}
