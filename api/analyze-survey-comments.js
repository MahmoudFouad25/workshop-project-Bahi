// Vercel Serverless Function - Survey Comments Analysis with Claude API

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
        const { question, comments } = req.body;

        if (!comments || !Array.isArray(comments) || comments.length === 0) {
            return res.status(400).json({ error: 'No comments provided' });
        }

        if (!question) {
            return res.status(400).json({ error: 'No question provided' });
        }

        // Check for Anthropic API key
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error('Missing ANTHROPIC_API_KEY');
            return res.status(500).json({ error: 'API key not configured' });
        }

        console.log(`Analyzing ${comments.length} comments for question: ${question}`);

        // Call Claude API
        const result = await analyzeWithClaude(question, comments, apiKey);

        console.log('Analysis completed successfully');

        return res.status(200).json(result);

    } catch (error) {
        console.error('Error in analyze-survey-comments:', error);
        return res.status(500).json({ 
            error: 'Analysis failed',
            details: error.message 
        });
    }
}

async function analyzeWithClaude(question, comments, apiKey) {
    // Prepare comments list
    const commentsList = comments
        .map((c, i) => `${i + 1}. ${c}`)
        .join('\n');

    const prompt = `أنت محلل موارد بشرية خبير متخصص في تحليل استطلاعات رضا الموظفين.

**السياق:**
المؤسسة: صناع الحياة - مصر (مؤسسة خيرية)
الموظفون: 150 موظف
القطاع: جمع التبرعات والعمل الخيري

**السؤال المطروح:**
"${question}"

**التعليقات من الموظفين (${comments.length} تعليق):**

${commentsList}

═══════════════════════════════════════════════════

**مهمتك:**

قم بتحليل عميق وشامل لهذه التعليقات واستخرج:

1. **الموضوعات الرئيسية (Themes):**
   - حدد أهم 5-7 موضوعات متكررة
   - لكل موضوع: احسب عدد التكرارات (تقريبياً)
   - رتبهم من الأكثر تكراراً للأقل

2. **التصنيف حسب المشاعر (Sentiment):**
   - إيجابي (positive)
   - محايد (neutral)  
   - سلبي (negative)

3. **أهم 5 اقتباسات (Top Quotes):**
   - اختر أهم 5 تعليقات تمثل الموضوعات الرئيسية
   - اختر تعليقات واضحة وقوية

4. **رؤى قابلة للتنفيذ (Actionable Insights):**
   - 3-5 إجراءات عملية يمكن للإدارة تنفيذها
   - كل إجراء يجب أن يكون SMART (محدد، قابل للقياس، قابل للتحقيق)

**ملاحظات مهمة:**
- كن دقيقاً في حساب التكرارات - راجع كل تعليق بعناية
- التعليقات المتشابهة في المعنى تُحسب في نفس الموضوع
- ركز على الموضوعات ذات الأثر الأكبر
- اجعل الرؤى عملية وواقعية للسياق المصري
- استخدم لغة عربية واضحة ومهنية

═══════════════════════════════════════════════════

**الرد المطلوب - JSON فقط بدون أي نص إضافي:**

{
  "themes": [
    {
      "theme": "اسم الموضوع بالعربية",
      "count": عدد التكرارات (رقم),
      "sentiment": "positive/neutral/negative",
      "description": "وصف مختصر للموضوع"
    }
  ],
  "top_quotes": [
    "الاقتباس الأول",
    "الاقتباس الثاني",
    "الاقتباس الثالث",
    "الاقتباس الرابع",
    "الاقتباس الخامس"
  ],
  "actionable_insights": [
    {
      "action": "الإجراء المطلوب",
      "priority": "high/medium/low",
      "timeframe": "فوري/قصير المدى/طويل المدى",
      "expected_impact": "التأثير المتوقع"
    }
  ],
  "summary": {
    "total_comments": ${comments.length},
    "overall_sentiment": "positive/neutral/negative",
    "key_finding": "أهم اكتشاف من التحليل في جملة واحدة"
  }
}

**ابدأ الآن - JSON فقط بدون أي نص قبل أو بعد:**`;

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
            temperature: 0.5,
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

    // ═══════════════════════════════════════════════════
    // Enhanced Response Cleaning
    // ═══════════════════════════════════════════════════
    claudeResponse = claudeResponse.trim();
    
    // Remove markdown code blocks
    claudeResponse = claudeResponse.replace(/```json\s*/gi, '');
    claudeResponse = claudeResponse.replace(/```javascript\s*/gi, '');
    claudeResponse = claudeResponse.replace(/```js\s*/gi, '');
    claudeResponse = claudeResponse.replace(/```\s*/g, '');
    
    console.log('After markdown removal, length:', claudeResponse.length);
    
    // Find first {
    const firstBrace = claudeResponse.indexOf('{');
    console.log('First { found at position:', firstBrace);
    
    if (firstBrace === -1) {
        console.error('CRITICAL: No opening brace found');
        console.error('Response preview:', claudeResponse.substring(0, 500));
        throw new Error('Response does not contain JSON object');
    }
    
    if (firstBrace > 0) {
        console.log('Removing text before {:', claudeResponse.substring(0, firstBrace));
        claudeResponse = claudeResponse.substring(firstBrace);
    }
    
    // Find last }
    const lastBrace = claudeResponse.lastIndexOf('}');
    console.log('Last } found at position:', lastBrace);
    
    if (lastBrace === -1) {
        console.error('CRITICAL: No closing brace found');
        throw new Error('Response does not contain complete JSON object');
    }
    
    if (lastBrace < claudeResponse.length - 1) {
        console.log('Removing text after }');
        claudeResponse = claudeResponse.substring(0, lastBrace + 1);
    }
    
    // Fix smart quotes
    claudeResponse = claudeResponse.replace(/[\u201C\u201D]/g, '"');
    claudeResponse = claudeResponse.replace(/[\u2018\u2019]/g, "'");
    
    // Final trim
    claudeResponse = claudeResponse.trim();
    
    console.log('Final cleaned response length:', claudeResponse.length);
    console.log('Starts with {:', claudeResponse.startsWith('{'));
    console.log('Ends with }:', claudeResponse.endsWith('}'));

    // Parse JSON
    let result;
    try {
        result = JSON.parse(claudeResponse);
    } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response preview:', claudeResponse.substring(0, 1000));
        
        throw new Error(JSON.stringify({
            error: 'Failed to parse Claude response as JSON',
            parseError: parseError.message,
            responsePreview: claudeResponse.substring(0, 500),
            responseLength: claudeResponse.length
        }));
    }

    // Validate structure
    if (!result.themes || !result.actionable_insights || !result.summary) {
        console.error('Invalid structure:', result);
        throw new Error('Invalid response structure from Claude');
    }

    console.log('Analysis successful:', {
        themes: result.themes.length,
        quotes: result.top_quotes?.length || 0,
        insights: result.actionable_insights.length
    });

    return result;
}
