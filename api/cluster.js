export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const { responses } = req.body;
  
  const challenges = responses.map((r, i) => (i+1) + '. ' + r).join('\n');
  const prompt = 'صنف التحديات إلى 5 فئات وارجع JSON:\n' + challenges + '\nالفئات: resources, coordination, accountability, systems, planning\n{"categories": {"resources": [...], "coordination": [...], "accountability": [...], "systems": [...], "planning": [...]}}';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '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',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{role: 'user', content: prompt}]
    })
  });
  
  const data = await response.json();
  const text = data.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  
  res.json(JSON.parse(jsonMatch[0]));
}
