export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { responses } = req.body;
    
    const challengesList = responses.map((r, i) => String(i + 1) + '. ' + r).join('\n');
    
    const promptText = 'صنف التحديات إلى 5 فئات وارجع JSON بس:\n\n' + 
                       challengesList + 
                       '\n\nالفئات: resources, coordination, accountability, systems, planning\n\n' +
                       'Format: {"categories": {"resources": [], "coordination": [], "accountability": [], "systems": [], "planning": []}}';

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: promptText }]
      })
    });
    
    if (!apiResponse.ok) {
      const errorData = await apiResponse.text();
      throw new Error('Claude API error: ' + errorData);
    }
    
    const data = await apiResponse.json();
    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
