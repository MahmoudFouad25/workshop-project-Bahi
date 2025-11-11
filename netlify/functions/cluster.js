exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { responses } = JSON.parse(event.body);
  
  const prompt = `صنف التحديات إلى 5 فئات وارجع JSON:
${responses.map((r, i) => `${i+1}. ${r}`).join('\n')}
الفئات: resources, coordination, accountability, systems, planning
{"categories": {"resources": [...], "coordination": [...], "accountability": [...], "systems": [...], "planning": [...]}}`;

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
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(JSON.parse(jsonMatch[0]))
  };
};
https://workshop-project-bahi.netlify.app/.netlify/functions/cluster
