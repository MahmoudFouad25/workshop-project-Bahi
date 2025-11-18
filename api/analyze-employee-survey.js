// ═══════════════════════════════════════════════════════════
// AI Analysis API for Employee Survey
// Analyzes survey responses using Claude AI
// ═══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
    });
}

const db = admin.firestore();

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ success: true });
    }
    
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            allowedMethods: ['POST']
        });
    }
    
    try {
        console.log('🔍 Starting AI analysis...');
        
        // Step 1: Fetch all responses from Firebase
        const responsesSnapshot = await db
            .collection('workshop_nov18_donor_journey')
            .doc('employee_survey')
            .collection('responses')
            .get();
        
        if (responsesSnapshot.empty) {
            return res.status(404).json({
                error: 'No responses found',
                message: 'لا توجد ردود للتحليل'
            });
        }
        
        // Step 2: Prepare responses data
        const responses = [];
        responsesSnapshot.forEach(doc => {
            responses.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`📊 Found ${responses.length} responses to analyze`);
        
        // Step 3: Prepare data summary for AI
        const dataSummary = prepareDataSummary(responses);
        
        // Step 4: Call Claude AI for analysis
        console.log('🤖 Calling Claude AI for analysis...');
        
        const analysisPrompt = buildAnalysisPrompt(responses, dataSummary);
        
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 16000,
            temperature: 0.7,
            messages: [{
                role: 'user',
                content: analysisPrompt
            }]
        });
        
        const analysisText = message.content[0].text;
        
        // Step 5: Parse AI response
        const analysis = parseAnalysisResponse(analysisText);
        
        // Step 6: Save analysis to Firebase
        const analysisDoc = {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            totalResponses: responses.length,
            analysis: analysis,
            rawAnalysis: analysisText,
            dataSummary: dataSummary,
            version: '1.0'
        };
        
        await db
            .collection('workshop_nov18_donor_journey')
            .doc('employee_survey')
            .collection('analysis')
            .add(analysisDoc);
        
        console.log('✅ Analysis completed and saved');
        
        // Step 7: Return response
        return res.status(200).json({
            success: true,
            message: 'تم التحليل بنجاح',
            totalResponses: responses.length,
            analysis: analysis,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error in analysis:', error);
        
        return res.status(500).json({
            error: 'Analysis failed',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

function prepareDataSummary(responses) {
    const summary = {
        totalResponses: responses.length,
        departments: {},
        experience: {},
        averageRating: 0,
        commonChallenges: {},
        techProblems: {},
        motivations: {},
        churnReasons: {},
        improvements: []
    };
    
    let totalRating = 0;
    
    responses.forEach(r => {
        // Departments
        if (r.department) {
            summary.departments[r.department] = (summary.departments[r.department] || 0) + 1;
        }
        
        // Experience
        if (r.experience) {
            summary.experience[r.experience] = (summary.experience[r.experience] || 0) + 1;
        }
        
        // Rating
        if (r.service_quality_rating) {
            totalRating += r.service_quality_rating;
        }
        
        // Challenges
        if (r.biggest_challenge) {
            summary.commonChallenges[r.biggest_challenge] = (summary.commonChallenges[r.biggest_challenge] || 0) + 1;
        }
        
        // Tech problems
        if (r.tech_problem) {
            summary.techProblems[r.tech_problem] = (summary.techProblems[r.tech_problem] || 0) + 1;
        }
        
        // Motivations
        if (r.main_motivation) {
            summary.motivations[r.main_motivation] = (summary.motivations[r.main_motivation] || 0) + 1;
        }
        
        // Churn reasons
        if (r.churn_reason) {
            summary.churnReasons[r.churn_reason] = (summary.churnReasons[r.churn_reason] || 0) + 1;
        }
        
        // Improvement suggestions
        if (r.immediate_increase) {
            summary.improvements.push(r.immediate_increase);
        }
        if (r.first_action_donors) {
            summary.improvements.push(r.first_action_donors);
        }
    });
    
    summary.averageRating = (totalRating / responses.length).toFixed(2);
    
    return summary;
}

function buildAnalysisPrompt(responses, summary) {
    return `أنت محلل خبير في تجربة العملاء والتحسين المؤسسي. لديك ${summary.totalResponses} رد من استبيان شامل عن تجربة الموظفين مع المتبرعين في مؤسسة صناع الحياة الخيرية.

# 📊 ملخص البيانات:

## التوزيع الديموغرافي:
- **الأقسام:** ${JSON.stringify(summary.departments, null, 2)}
- **سنوات الخبرة:** ${JSON.stringify(summary.experience, null, 2)}
- **متوسط تقييم جودة الخدمة:** ${summary.averageRating}/10

## أهم التحديات:
${JSON.stringify(summary.commonChallenges, null, 2)}

## المشاكل التقنية:
${JSON.stringify(summary.techProblems, null, 2)}

## دوافع المتبرعين:
${JSON.stringify(summary.motivations, null, 2)}

## أسباب ابتعاد المتبرعين:
${JSON.stringify(summary.churnReasons, null, 2)}

## مقترحات التحسين (عينة):
${summary.improvements.slice(0, 20).map((imp, i) => `${i + 1}. ${imp}`).join('\n')}

---

# 🎯 المطلوب منك:

قم بتحليل عميق ومفصل للبيانات وأعطِ تقرير شامل يتضمن:

## 1. 📌 الاكتشافات الرئيسية (Key Findings)
- ما هي أهم 5 اكتشافات من البيانات؟
- ما الأنماط المتكررة؟
- ما المفاجآت غير المتوقعة؟

## 2. 🔥 المشاكل الحرجة (Critical Issues)
- ما أكثر 3 مشاكل تحتاج حل فوري؟
- ما تأثير كل مشكلة على المتبرعين؟
- ما نسبة الموظفين المتأثرين؟

## 3. 💡 الفرص الذهبية (Golden Opportunities)
- ما أسهل 3 تحسينات يمكن تنفيذها بسرعة؟
- ما التحسينات التي ستعطي أكبر impact؟
- ما الموارد المطلوبة؟

## 4. 🎯 التوصيات الاستراتيجية (Strategic Recommendations)
قدم 10 توصيات محددة وقابلة للتنفيذ، كل واحدة تتضمن:
- **التوصية:** (جملة واضحة)
- **الأولوية:** (عالية/متوسطة/منخفضة)
- **الأثر المتوقع:** (على المتبرعين وعلى الموظفين)
- **الخطوات التنفيذية:** (3-5 خطوات عملية)
- **المدة الزمنية:** (فوري/قصير المدى/متوسط المدى)
- **المسؤول:** (أي قسم/إدارة)

## 5. 📈 مؤشرات النجاح (Success Metrics)
- ما الـ KPIs التي يجب قياسها؟
- ما الأهداف المناسبة لكل مؤشر؟
- كيف نتابع التحسن؟

## 6. 🗺️ خارطة الطريق (Roadmap)
قسّم التوصيات إلى 3 مراحل:
- **المرحلة 1 (الشهر الأول):** الإجراءات السريعة
- **المرحلة 2 (3-6 أشهر):** التحسينات المتوسطة
- **المرحلة 3 (6-12 شهر):** التحولات الاستراتيجية

## 7. 🎨 رسائل للإدارة (Executive Summary)
اكتب ملخص تنفيذي من 200-300 كلمة للإدارة العليا يلخص:
- الوضع الحالي
- أهم المشاكل
- التوصيات الرئيسية
- الأثر المتوقع

---

# ✅ تنسيق الإجابة:

أرجو أن تكون الإجابة بالعربية الفصحى المبسطة، منظمة بعناوين واضحة، وتستخدم:
- ✅ نقاط محددة
- 📊 أرقام وإحصائيات
- 💡 أمثلة واقعية من البيانات
- 🎯 توصيات قابلة للتنفيذ

ابدأ التحليل الآن:`;
}

function parseAnalysisResponse(text) {
    // Try to extract structured data from the response
    const sections = {
        keyFindings: extractSection(text, 'الاكتشافات الرئيسية', 'المشاكل الحرجة'),
        criticalIssues: extractSection(text, 'المشاكل الحرجة', 'الفرص الذهبية'),
        opportunities: extractSection(text, 'الفرص الذهبية', 'التوصيات الاستراتيجية'),
        recommendations: extractSection(text, 'التوصيات الاستراتيجية', 'مؤشرات النجاح'),
        metrics: extractSection(text, 'مؤشرات النجاح', 'خارطة الطريق'),
        roadmap: extractSection(text, 'خارطة الطريق', 'رسائل للإدارة'),
        executiveSummary: extractSection(text, 'رسائل للإدارة', null)
    };
    
    return {
        fullText: text,
        sections: sections,
        generatedAt: new Date().toISOString()
    };
}

function extractSection(text, startMarker, endMarker) {
    try {
        const startIndex = text.indexOf(startMarker);
        if (startIndex === -1) return '';
        
        const contentStart = startIndex + startMarker.length;
        
        if (endMarker) {
            const endIndex = text.indexOf(endMarker, contentStart);
            if (endIndex === -1) {
                return text.substring(contentStart).trim();
            }
            return text.substring(contentStart, endIndex).trim();
        }
        
        return text.substring(contentStart).trim();
    } catch (error) {
        console.error('Error extracting section:', error);
        return '';
    }
}

// Export for serverless
export const config = {
    api: {
        bodyParser: true,
        externalResolver: true
    }
};
