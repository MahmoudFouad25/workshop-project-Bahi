// ═══════════════════════════════════════════════════════════
// AI Analysis API for Employee Survey
// Analyzes survey responses using Claude AI
// ═══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            })
        });
        console.log('✅ Firebase initialized successfully');
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
    }
}

const db = admin.firestore();

// Initialize Anthropic client
let anthropic;
try {
    anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log('✅ Anthropic client initialized');
} catch (error) {
    console.error('❌ Anthropic initialization error:', error);
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ success: true });
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            message: 'يجب استخدام POST method'
        });
    }
    
    try {
        console.log('🔍 Starting AI analysis...');
        
        // Check if API keys exist
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY غير موجود في environment variables');
        }
        
        if (!process.env.FIREBASE_PROJECT_ID) {
            throw new Error('FIREBASE_PROJECT_ID غير موجود في environment variables');
        }
        
        // Fetch all responses from Firebase
        console.log('📊 Fetching responses from Firebase...');
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
        
        const responses = [];
        responsesSnapshot.forEach(doc => {
            responses.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`📊 Found ${responses.length} responses`);
        
        // Prepare data summary
        const dataSummary = prepareDataSummary(responses);
        
        // Call Claude AI
        console.log('🤖 Calling Claude AI...');
        
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 16000,
            temperature: 0.7,
            messages: [{
                role: 'user',
                content: buildAnalysisPrompt(responses, dataSummary)
            }]
        });
        
        const analysisText = message.content[0].text;
        
        console.log('💾 Saving analysis to Firebase...');
        
        // Save to Firebase
        const savedDoc = await db.collection('workshop_nov18_donor_journey')
            .doc('employee_survey')
            .collection('analysis')
            .add({
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                totalResponses: responses.length,
                fullText: analysisText,
                dataSummary: dataSummary
            });
        
        console.log('✅ Analysis completed and saved with ID:', savedDoc.id);
        
        // Prepare response with error handling
        try {
            const responseData = {
                success: true,
                analysis: {
                    fullText: analysisText,
                    totalResponses: responses.length,
                    savedId: savedDoc.id
                },
                message: 'تم التحليل بنجاح'
            };
            
            console.log('📤 Sending response...');
            
            return res.status(200).json(responseData);
            
        } catch (responseError) {
            console.error('❌ Error preparing response:', responseError);
            
            // Return minimal response
            return res.status(200).json({
                success: true,
                analysis: {
                    fullText: 'تم التحليل بنجاح. يمكنك الوصول للنتائج من Firebase.',
                    totalResponses: responses.length
                },
                message: 'تم التحليل وحفظه في قاعدة البيانات'
            });
        }
        
    } catch (error) {
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // Return detailed error in JSON format
        return res.status(500).json({
            error: 'Analysis failed',
            message: error.message,
            details: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}

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
    let ratingCount = 0;
    
    responses.forEach(r => {
        if (r.department) {
            summary.departments[r.department] = (summary.departments[r.department] || 0) + 1;
        }
        if (r.experience) {
            summary.experience[r.experience] = (summary.experience[r.experience] || 0) + 1;
        }
        if (r.service_quality_rating) {
            totalRating += r.service_quality_rating;
            ratingCount++;
        }
        if (r.biggest_challenge) {
            summary.commonChallenges[r.biggest_challenge] = (summary.commonChallenges[r.biggest_challenge] || 0) + 1;
        }
        if (r.tech_problem) {
            summary.techProblems[r.tech_problem] = (summary.techProblems[r.tech_problem] || 0) + 1;
        }
        if (r.main_motivation) {
            summary.motivations[r.main_motivation] = (summary.motivations[r.main_motivation] || 0) + 1;
        }
        if (r.churn_reason) {
            summary.churnReasons[r.churn_reason] = (summary.churnReasons[r.churn_reason] || 0) + 1;
        }
        if (r.immediate_increase) {
            summary.improvements.push(r.immediate_increase);
        }
        if (r.first_action_donors) {
            summary.improvements.push(r.first_action_donors);
        }
    });
    
    summary.averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : 0;
    
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
