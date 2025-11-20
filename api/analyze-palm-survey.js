// ============================================
// Palm Trees Survey AI Analysis
// Powered by Claude API
// ============================================

import Anthropic from '@anthropic-ai/sdk';

// CORS headers
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ ok: true });
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            headers 
        });
    }

    try {
        console.log('🤖 Starting AI analysis...');
        
        // Get data from request
        const { responses } = req.body;
        
        if (!responses || !Array.isArray(responses) || responses.length === 0) {
            return res.status(400).json({ 
                error: 'No responses provided',
                headers 
            });
        }

        console.log(`📊 Analyzing ${responses.length} responses`);

        // Initialize Anthropic client
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });

        // Prepare data summary for Claude
        const dataSummary = prepareDataSummary(responses);

        // Create analysis prompt
        const prompt = createAnalysisPrompt(dataSummary, responses.length);

        console.log('🧠 Calling Claude API...');

        // Call Claude API
        const message = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            temperature: 1,
            messages: [{
                role: "user",
                content: prompt
            }]
        });

        console.log('✅ Analysis complete');

        // Extract text from response
        const analysisText = message.content[0].text;

        // Parse the analysis
        const analysis = parseAnalysis(analysisText);

        // Return results
        return res.status(200).json({
            success: true,
            analysis,
            metadata: {
                responsesAnalyzed: responses.length,
                timestamp: new Date().toISOString(),
                model: "claude-sonnet-4-20250514"
            },
            headers
        });

    } catch (error) {
        console.error('❌ Analysis error:', error);
        
        return res.status(500).json({ 
            error: 'Analysis failed',
            message: error.message,
            headers
        });
    }
}

// ============================================
// Prepare Data Summary
// ============================================
function prepareDataSummary(responses) {
    const summary = {
        total: responses.length,
        departments: {},
        experience: {},
        knowledge: [],
        readiness: {
            personal: [],
            team: []
        },
        failureReasons: {},
        missingInfo: {},
        difficulties: {},
        coordinationIssues: {},
        suggestions: {
            magicFixes: [],
            creativeIdeas: [],
            shouldStop: [],
            shouldStart: []
        },
        donorPerspective: {
            donate: {},
            repeat: {},
            stop: {}
        }
    };

    responses.forEach(r => {
        // Demographics
        if (r.department) {
            summary.departments[r.department] = (summary.departments[r.department] || 0) + 1;
        }
        if (r.experience) {
            summary.experience[r.experience] = (summary.experience[r.experience] || 0) + 1;
        }

        // Knowledge & Readiness
        if (r.palm_knowledge) {
            summary.knowledge.push(parseInt(r.palm_knowledge));
        }
        if (r.personal_readiness) {
            summary.readiness.personal.push(parseInt(r.personal_readiness));
        }
        if (r.team_readiness) {
            summary.readiness.team.push(parseInt(r.team_readiness));
        }

        // Failure reasons
        if (r.failure_reasons) {
            const reasons = Array.isArray(r.failure_reasons) ? r.failure_reasons : [r.failure_reasons];
            reasons.forEach(reason => {
                summary.failureReasons[reason] = (summary.failureReasons[reason] || 0) + 1;
            });
        }

        // Missing info
        if (r.missing_info) {
            const info = Array.isArray(r.missing_info) ? r.missing_info : [r.missing_info];
            info.forEach(item => {
                summary.missingInfo[item] = (summary.missingInfo[item] || 0) + 1;
            });
        }

        // Difficulties
        if (r.palm_difficulty) {
            const diffs = Array.isArray(r.palm_difficulty) ? r.palm_difficulty : [r.palm_difficulty];
            diffs.forEach(diff => {
                summary.difficulties[diff] = (summary.difficulties[diff] || 0) + 1;
            });
        }

        // Coordination
        if (r.coordination_problems) {
            const probs = Array.isArray(r.coordination_problems) ? r.coordination_problems : [r.coordination_problems];
            probs.forEach(prob => {
                summary.coordinationIssues[prob] = (summary.coordinationIssues[prob] || 0) + 1;
            });
        }

        // Suggestions
        if (r.magic_fix_1) summary.suggestions.magicFixes.push(r.magic_fix_1);
        if (r.magic_fix_2) summary.suggestions.magicFixes.push(r.magic_fix_2);
        if (r.magic_fix_3) summary.suggestions.magicFixes.push(r.magic_fix_3);
        if (r.creative_idea) summary.suggestions.creativeIdeas.push(r.creative_idea);
        if (r.should_stop) summary.suggestions.shouldStop.push(r.should_stop);
        if (r.should_start) summary.suggestions.shouldStart.push(r.should_start);

        // Donor perspective
        if (r.reasons_to_donate) {
            const reasons = Array.isArray(r.reasons_to_donate) ? r.reasons_to_donate : [r.reasons_to_donate];
            reasons.forEach(reason => {
                summary.donorPerspective.donate[reason] = (summary.donorPerspective.donate[reason] || 0) + 1;
            });
        }
        if (r.reasons_to_repeat) {
            const reasons = Array.isArray(r.reasons_to_repeat) ? r.reasons_to_repeat : [r.reasons_to_repeat];
            reasons.forEach(reason => {
                summary.donorPerspective.repeat[reason] = (summary.donorPerspective.repeat[reason] || 0) + 1;
            });
        }
        if (r.reasons_to_stop) {
            const reasons = Array.isArray(r.reasons_to_stop) ? r.reasons_to_stop : [r.reasons_to_stop];
            reasons.forEach(reason => {
                summary.donorPerspective.stop[reason] = (summary.donorPerspective.stop[reason] || 0) + 1;
            });
        }
    });

    // Calculate averages
    summary.averages = {
        knowledge: calculateAverage(summary.knowledge),
        personalReadiness: calculateAverage(summary.readiness.personal),
        teamReadiness: calculateAverage(summary.readiness.team)
    };

    return summary;
}

// ============================================
// Create Analysis Prompt
// ============================================
function createAnalysisPrompt(summary, totalResponses) {
    return `أنت محلل استراتيجي متخصص في تحليل بيانات المنظمات غير الربحية. قم بتحليل بيانات استبيان بند النخيل لعام 2026 بهدف تحقيق 60+ مليون جنيه.

📊 **ملخص البيانات:**

**عدد المشاركين:** ${totalResponses}

**الأقسام:**
${Object.entries(summary.departments).map(([dept, count]) => `- ${dept}: ${count} موظف`).join('\n')}

**متوسط المعرفة ببند النخيل:** ${summary.averages.knowledge.toFixed(1)}/10
**متوسط الجاهزية الشخصية:** ${summary.averages.personalReadiness.toFixed(1)}/10
**متوسط جاهزية الفريق:** ${summary.averages.teamReadiness.toFixed(1)}/10

**أهم أسباب فشل 2025:**
${Object.entries(summary.failureReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => `- ${reason} (${count} ذكر)`)
    .join('\n')}

**المعلومات الناقصة الأكثر طلباً:**
${Object.entries(summary.missingInfo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([info, count]) => `- ${info} (${count} طلب)`)
    .join('\n')}

**أصعب جوانب النخيل:**
${Object.entries(summary.difficulties)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([diff, count]) => `- ${diff} (${count} ذكر)`)
    .join('\n')}

**مشاكل التنسيق مع البرامج:**
${Object.entries(summary.coordinationIssues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, count]) => `- ${issue} (${count} ذكر)`)
    .join('\n')}

**عدد الإصلاحات المقترحة (العصا السحرية):** ${summary.suggestions.magicFixes.length}
**عدد الأفكار الإبداعية:** ${summary.suggestions.creativeIdeas.length}

---

المطلوب منك:

قدم تحليلاً شاملاً ومنظماً في الصيغة التالية بالضبط (استخدم HTML formatting):

## CRITICAL_ISSUES
[5 قضايا حرجة - كل واحدة في <li> مع تفسير مختصر ومؤثر]

## QUICK_WINS
[5 نتائج سريعة ممكن تحقيقها فوراً - كل واحدة actionable]

## PATTERNS
[5 أنماط واتجاهات مكتشفة من البيانات - insights عميقة]

## STRATEGIC_RECOMMENDATIONS
[7 توصيات استراتيجية واضحة ومفصلة للورشة - كل واحدة بخطوات تنفيذية]

## COMPETITIVE_ADVANTAGE
[أهم 3 ميزات تنافسية يجب التركيز عليها]

## DONOR_JOURNEY_INSIGHTS
[تحليل رحلة المتبرع: ما يجذبه، ما يبقيه، ما يفقده]

## READINESS_GAP_ANALYSIS
[تحليل الفجوة بين الجاهزية الشخصية وجاهزية الفريق وكيفية معالجتها]

## ACTION_PLAN_PRIORITIES
[أهم 5 أولويات يجب البدء بها فوراً بعد الورشة]

تأكد من:
- استخدام HTML tags: <strong>, <em>, <ul>, <li>
- كل section يبدأ بـ ##
- التحليل عملي وقابل للتنفيذ
- الأرقام والإحصائيات واضحة
- اللغة مباشرة وقوية
- التركيز على الحلول مش المشاكل فقط`;
}

// ============================================
// Parse Analysis from Claude
// ============================================
function parseAnalysis(text) {
    const sections = {};
    
    const sectionPatterns = {
        criticalIssues: /## CRITICAL_ISSUES\n([\s\S]*?)(?=\n## |$)/,
        quickWins: /## QUICK_WINS\n([\s\S]*?)(?=\n## |$)/,
        patterns: /## PATTERNS\n([\s\S]*?)(?=\n## |$)/,
        recommendations: /## STRATEGIC_RECOMMENDATIONS\n([\s\S]*?)(?=\n## |$)/,
        competitiveAdvantage: /## COMPETITIVE_ADVANTAGE\n([\s\S]*?)(?=\n## |$)/,
        donorJourney: /## DONOR_JOURNEY_INSIGHTS\n([\s\S]*?)(?=\n## |$)/,
        readinessGap: /## READINESS_GAP_ANALYSIS\n([\s\S]*?)(?=\n## |$)/,
        actionPlan: /## ACTION_PLAN_PRIORITIES\n([\s\S]*?)(?=\n## |$)/
    };

    for (const [key, pattern] of Object.entries(sectionPatterns)) {
        const match = text.match(pattern);
        if (match) {
            sections[key] = match[1].trim();
        }
    }

    return sections;
}

// ============================================
// Helper: Calculate Average
// ============================================
function calculateAverage(arr) {
    if (arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
}
