export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { responses } = req.body;
    
    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      throw new Error('No responses provided');
    }
    
    // Build numbered list
    const challengesList = responses
      .map((r, i) => `${i + 1}. ${r}`)
      .join('\n');
    
    // Enhanced prompt with deep analysis
    const promptText = `أنت خبير في تحليل المشاكل التنظيمية والتخطيط الاستراتيجي. مهمتك تحليل التحديات التالية بعمق.

التحديات من فريق إدارة جمع التبرعات - صناع الحياة (25 شخص):

${challengesList}

المطلوب منك:

1. **التصنيف:** صنف كل تحدي لواحدة من الفئات الخمس:
   - resources (الموارد: Budget, People, Tools)
   - coordination (التنسيق بين الأقسام)
   - accountability (المتابعة والمساءلة)
   - systems (الأنظمة والعمليات)
   - planning (التخطيط والأهداف)

2. **التحليل العميق لكل فئة:**
   - عدد التحديات ونسبتها
   - الأنماط المشتركة (patterns)
   - السبب الجذري المحتمل (root cause hypothesis)
   - التأثير على الأداء
   - توصيات قابلة للتنفيذ فوراً

3. **الرؤية الشاملة:**
   - أكثر فئة تكراراً (وماذا يعني ذلك)
   - العلاقة بين الفئات
   - أولويات التدخل
   - خطوات سريعة (quick wins)

أعطني النتيجة بصيغة JSON التالية بالضبط:

{
  "categories": {
    "resources": ["التحدي 1", "التحدي 5", ...],
    "coordination": ["التحدي 2", ...],
    "accountability": [...],
    "systems": [...],
    "planning": [...]
  },
  "analysis": {
    "resources": {
      "count": 5,
      "percentage": 20,
      "patterns": ["نمط 1", "نمط 2"],
      "root_cause": "السبب الجذري المحتمل",
      "impact": "التأثير على الأداء",
      "recommendations": ["توصية 1", "توصية 2", "توصية 3"]
    },
    "coordination": { ... },
    "accountability": { ... },
    "systems": { ... },
    "planning": { ... }
  },
  "overall_insights": {
    "top_category": "accountability",
    "top_category_significance": "شرح لماذا هذه الفئة هي الأهم",
    "relationships": "كيف الفئات مرتبطة ببعض",
    "priorities": ["الأولوية 1", "الأولوية 2", "الأولوية 3"],
    "quick_wins": ["إجراء سريع 1", "إجراء سريع 2"]
  }
}

تأكد من:
- كل التحليل بالعربية الفصحى
- التوصيات عملية وقابلة للتنفيذ
- الأنماط محددة ومش عامة
- JSON صحيح 100%`;

    // Call Claude API
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{ 
          role: 'user', 
          content: promptText 
        }]
      })
    });
    
    if (!apiResponse.ok) {
      const errorData = await apiResponse.text();
      console.error('Claude API Error:', errorData);
      throw new Error('Claude API request failed: ' + apiResponse.status);
    }
    
    const data = await apiResponse.json();
    const text = data.content[0].text;
    
    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error('No JSON found in response:', text);
      throw new Error('No valid JSON found in Claude response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    // Validate structure
    if (!result.categories || !result.analysis || !result.overall_insights) {
      throw new Error('Invalid response structure from Claude');
    }
    
    // Add metadata
    result.metadata = {
      timestamp: new Date().toISOString(),
      total_responses: responses.length,
      model: 'claude-sonnet-4-20250514',
      tokens_used: data.usage
    };
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Error in cluster function:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
