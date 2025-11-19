// ═══════════════════════════════════════════════════════════
// AI Analysis API for Internal Procedures Survey
// Analyzes survey responses using Claude AI
// Workshop: 19 نوفمبر 2025 - الإجراءات الداخلية والضوابط العامة
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
        console.log('🔍 Starting AI analysis for Internal Procedures Survey...');
        
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
            .collection('internal-procedures-survey')
            .orderBy('timestamp', 'asc')
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
        
        // Prepare comprehensive data summary
        const dataSummary = prepareDataSummary(responses);
        
        console.log('📈 Data summary prepared:', {
            totalResponses: dataSummary.totalResponses,
            departments: Object.keys(dataSummary.departments).length,
            bottleneckStories: dataSummary.bottleneckStories.length,
            sopPriorities: Object.keys(dataSummary.sopPriorities).length
        });
        
        // Call Claude AI
        console.log('🤖 Calling Claude AI for deep analysis...');
        
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
        const savedDoc = await db.collection('internal-procedures-analysis')
            .add({
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                totalResponses: responses.length,
                fullText: analysisText,
                dataSummary: dataSummary,
                workshopDate: '2025-11-19',
                workshopTitle: 'من الفوضى إلى النظام: بناء آليات عمل محكمة'
            });
        
        console.log('✅ Analysis completed and saved with ID:', savedDoc.id);
        
        // Return response
        return res.status(200).json({
            success: true,
            analysis: analysisText,
            totalResponses: responses.length,
            savedId: savedDoc.id,
            message: 'تم التحليل بنجاح'
        });
        
    } catch (error) {
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        return res.status(500).json({
            error: 'Analysis failed',
            message: error.message,
            details: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}

// ═══════════════════════════════════════════════════════════
// Prepare Comprehensive Data Summary
// ═══════════════════════════════════════════════════════════
function prepareDataSummary(responses) {
    const summary = {
        totalResponses: responses.length,
        
        // Demographics
        departments: {},
        experience: {},
        workNature: {},
        departmentsCount: {},
        
        // Ratings (1-10)
        roleClarity: { values: [], average: 0 },
        cooperationQuality: { values: [], average: 0 },
        readinessNewProcedures: { values: [], average: 0 },
        expectedImpact: { values: [], average: 0 },
        
        // Current State
        instructionSources: {},
        documentedProcedures: {},
        trainingDuration: {},
        realityStatements: {},
        duplicateWork: {},
        approvalDuration: {},
        nonComplianceReason: {},
        
        // Bottlenecks
        timeWasters: {},
        slowDepartments: {},
        longestWait: {},
        delayReasons: {},
        bottleneckStories: [],
        unnecessarySteps: [],
        
        // SLAs & Cooperation
        slaExistence: {},
        responseExpectation: {},
        negativeBehavior: {},
        oneChange: {},
        slaImpact: {},
        
        // Stories
        unclearProcedureStories: [],
        brokeProcedureStories: [],
        positiveCoordinationStories: [],
        worstBottlenecks: [],
        conflictFrequency: {},
        
        // Priorities
        sopPriorities: {},
        slaPriorities: {},
        magicFixes: [],
        
        // Final messages
        finalMessages: []
    };
    
    responses.forEach(r => {
        // Demographics
        if (r.department) summary.departments[r.department] = (summary.departments[r.department] || 0) + 1;
        if (r.experience) summary.experience[r.experience] = (summary.experience[r.experience] || 0) + 1;
        if (r.work_nature) summary.workNature[r.work_nature] = (summary.workNature[r.work_nature] || 0) + 1;
        if (r.departments_count) summary.departmentsCount[r.departments_count] = (summary.departmentsCount[r.departments_count] || 0) + 1;
        
        // Ratings
        if (r.role_clarity) {
            summary.roleClarity.values.push(parseFloat(r.role_clarity));
        }
        if (r.cooperation_quality) {
            summary.cooperationQuality.values.push(parseFloat(r.cooperation_quality));
        }
        if (r.readiness_new_procedures) {
            summary.readinessNewProcedures.values.push(parseFloat(r.readiness_new_procedures));
        }
        if (r.expected_impact) {
            summary.expectedImpact.values.push(parseFloat(r.expected_impact));
        }
        
        // Current State
        if (r.instruction_sources && Array.isArray(r.instruction_sources)) {
            r.instruction_sources.forEach(src => {
                summary.instructionSources[src] = (summary.instructionSources[src] || 0) + 1;
            });
        }
        if (r.documented_procedures) summary.documentedProcedures[r.documented_procedures] = (summary.documentedProcedures[r.documented_procedures] || 0) + 1;
        if (r.training_duration) summary.trainingDuration[r.training_duration] = (summary.trainingDuration[r.training_duration] || 0) + 1;
        if (r.reality_statements && Array.isArray(r.reality_statements)) {
            r.reality_statements.forEach(stmt => {
                summary.realityStatements[stmt] = (summary.realityStatements[stmt] || 0) + 1;
            });
        }
        if (r.duplicate_work) summary.duplicateWork[r.duplicate_work] = (summary.duplicateWork[r.duplicate_work] || 0) + 1;
        if (r.approval_duration) summary.approvalDuration[r.approval_duration] = (summary.approvalDuration[r.approval_duration] || 0) + 1;
        if (r.non_compliance_reason) summary.nonComplianceReason[r.non_compliance_reason] = (summary.nonComplianceReason[r.non_compliance_reason] || 0) + 1;
        
        // Bottlenecks
        if (r.time_wasters && Array.isArray(r.time_wasters)) {
            r.time_wasters.forEach(tw => {
                summary.timeWasters[tw] = (summary.timeWasters[tw] || 0) + 1;
            });
        }
        if (r.slow_department && r.slow_department !== 'أفضل عدم الإجابة' && r.slow_department !== 'لا يوجد تأخير') {
            summary.slowDepartments[r.slow_department] = (summary.slowDepartments[r.slow_department] || 0) + 1;
        }
        if (r.longest_wait) summary.longestWait[r.longest_wait] = (summary.longestWait[r.longest_wait] || 0) + 1;
        if (r.delay_main_reason) summary.delayReasons[r.delay_main_reason] = (summary.delayReasons[r.delay_main_reason] || 0) + 1;
        if (r.bottleneck_story && r.bottleneck_story.trim() !== '.' && r.bottleneck_story.trim() !== '' && r.bottleneck_story.trim().length > 20) {
            summary.bottleneckStories.push({
                story: r.bottleneck_story,
                department: r.department,
                experience: r.experience
            });
        }
        if (r.unnecessary_step_example && r.unnecessary_step_example.trim() !== '' && r.unnecessary_step_example.trim().length > 10) {
            summary.unnecessarySteps.push(r.unnecessary_step_example);
        }
        
        // SLAs & Cooperation
        if (r.sla_existence) summary.slaExistence[r.sla_existence] = (summary.slaExistence[r.sla_existence] || 0) + 1;
        if (r.response_expectation) summary.responseExpectation[r.response_expectation] = (summary.responseExpectation[r.response_expectation] || 0) + 1;
        if (r.negative_behavior) summary.negativeBehavior[r.negative_behavior] = (summary.negativeBehavior[r.negative_behavior] || 0) + 1;
        if (r.one_change) summary.oneChange[r.one_change] = (summary.oneChange[r.one_change] || 0) + 1;
        if (r.sla_impact) summary.slaImpact[r.sla_impact] = (summary.slaImpact[r.sla_impact] || 0) + 1;
        
        // Stories
        if (r.unclear_procedure_story && r.unclear_procedure_story.trim() !== '.' && r.unclear_procedure_story.trim() !== '' && r.unclear_procedure_story.trim().length > 20) {
            summary.unclearProcedureStories.push({
                story: r.unclear_procedure_story,
                department: r.department
            });
        }
        if (r.broke_procedure === 'نعم' && r.broke_procedure_details && r.broke_procedure_details.trim().length > 20) {
            summary.brokeProcedureStories.push({
                story: r.broke_procedure_details,
                department: r.department
            });
        }
        if (r.positive_coordination_story && r.positive_coordination_story.trim() !== '.' && r.positive_coordination_story.trim() !== '' && r.positive_coordination_story.trim().length > 20) {
            summary.positiveCoordinationStories.push({
                story: r.positive_coordination_story,
                department: r.department
            });
        }
        if (r.worst_bottleneck && r.worst_bottleneck.trim() !== '.' && r.worst_bottleneck.trim() !== '' && r.worst_bottleneck.trim().length > 20) {
            summary.worstBottlenecks.push({
                story: r.worst_bottleneck,
                department: r.department
            });
        }
        if (r.conflict_frequency) summary.conflictFrequency[r.conflict_frequency] = (summary.conflictFrequency[r.conflict_frequency] || 0) + 1;
        
        // Priorities
        [r.sop_priority_1, r.sop_priority_2, r.sop_priority_3].forEach(sop => {
            if (sop && isValidResponse(sop)) {
                summary.sopPriorities[sop.trim()] = (summary.sopPriorities[sop.trim()] || 0) + 1;
            }
        });
        [r.sla_priority_1, r.sla_priority_2, r.sla_priority_3].forEach(sla => {
            if (sla && isValidResponse(sla)) {
                summary.slaPriorities[sla.trim()] = (summary.slaPriorities[sla.trim()] || 0) + 1;
            }
        });
        [r.magic_fix_1, r.magic_fix_2, r.magic_fix_3].forEach(fix => {
            if (fix && fix.trim() !== '.' && fix.trim() !== '' && fix.trim().length > 10) {
                summary.magicFixes.push({
                    fix: fix.trim(),
                    department: r.department
                });
            }
        });
        
        // Final messages
        if (r.final_message && r.final_message.trim() !== '.' && r.final_message.trim() !== '' && r.final_message.trim().length > 10) {
            summary.finalMessages.push({
                message: r.final_message,
                department: r.department
            });
        }
    });
    
    // Calculate averages
    summary.roleClarity.average = calculateAverage(summary.roleClarity.values);
    summary.cooperationQuality.average = calculateAverage(summary.cooperationQuality.values);
    summary.readinessNewProcedures.average = calculateAverage(summary.readinessNewProcedures.values);
    summary.expectedImpact.average = calculateAverage(summary.expectedImpact.values);
    
    return summary;
}

function calculateAverage(values) {
    if (values.length === 0) return 0;
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
}

function isValidResponse(value) {
    if (!value) return false;
    const cleaned = value.trim().toLowerCase();
    if (cleaned.length < 3) return false;
    if (/^\.+$/.test(cleaned)) return false;
    if (/^،+$/.test(cleaned)) return false;
    const garbage = ['لا أعرف', 'لا اعرف', 'مش عارف', 'معرفش', 'لا اعلم', 'لا أعلم', 'لا يوجد', 'تم', '...', '..', '،،'];
    if (garbage.includes(cleaned)) return false;
    return true;
}

// ═══════════════════════════════════════════════════════════
// Build Comprehensive Analysis Prompt
// ═══════════════════════════════════════════════════════════
function buildAnalysisPrompt(responses, summary) {
    return `أنت خبير استراتيجي في التحول المؤسسي وتحسين العمليات التشغيلية. لديك ${summary.totalResponses} رد من استبيان شامل عن **الإجراءات الداخلية والضوابط العامة** في مؤسسة صناع الحياة الخيرية - مصر (قطاع التمويل).

# 📊 ملخص البيانات الكامل:

## 👥 التوزيع الديموغرافي:
**الأقسام:** ${JSON.stringify(summary.departments, null, 2)}
**سنوات الخبرة:** ${JSON.stringify(summary.experience, null, 2)}
**طبيعة العمل:** ${JSON.stringify(summary.workNature, null, 2)}
**عدد الأقسام المتعامل معها:** ${JSON.stringify(summary.departmentsCount, null, 2)}

## 📈 التقييمات الرئيسية (من 1-10):
- **وضوح الدور والمسؤوليات:** ${summary.roleClarity.average}/10
- **جودة التعاون بين الأقسام:** ${summary.cooperationQuality.average}/10
- **الاستعداد لإجراءات جديدة:** ${summary.readinessNewProcedures.average}/10
- **التأثير المتوقع للورشة:** ${summary.expectedImpact.average}/10

## 📋 واقع الإجراءات الحالية:
**مصادر التعليمات:** ${JSON.stringify(summary.instructionSources, null, 2)}
**نسبة الإجراءات الموثقة:** ${JSON.stringify(summary.documentedProcedures, null, 2)}
**مدة تدريب موظف جديد:** ${JSON.stringify(summary.trainingDuration, null, 2)}
**واقع الإجراءات:** ${JSON.stringify(summary.realityStatements, null, 2)}
**تكرار المهام المزدوجة:** ${JSON.stringify(summary.duplicateWork, null, 2)}
**مدة الموافقات:** ${JSON.stringify(summary.approvalDuration, null, 2)}
**أسباب عدم الالتزام:** ${JSON.stringify(summary.nonComplianceReason, null, 2)}

## 🚧 الاختناقات والعوائق:
**أكثر ما يضيع الوقت:** ${JSON.stringify(summary.timeWasters, null, 2)}
**الأقسام الأبطأ:** ${JSON.stringify(summary.slowDepartments, null, 2)}
**أطول مدة انتظار:** ${JSON.stringify(summary.longestWait, null, 2)}
**أسباب التأخير:** ${JSON.stringify(summary.delayReasons, null, 2)}
**عدد قصص الاختناقات الموثقة:** ${summary.bottleneckStories.length} قصة

## 🤝 التعاون والـ SLAs:
**وجود SLAs حالياً:** ${JSON.stringify(summary.slaExistence, null, 2)}
**توقع موعد الرد:** ${JSON.stringify(summary.responseExpectation, null, 2)}
**السلوكيات السلبية:** ${JSON.stringify(summary.negativeBehavior, null, 2)}
**التغيير المطلوب:** ${JSON.stringify(summary.oneChange, null, 2)}
**تأثير SLAs المتوقع:** ${JSON.stringify(summary.slaImpact, null, 2)}

## 🎯 الأولويات:
**أهم SOPs مطلوبة (Top 10):**
${Object.entries(summary.sopPriorities).sort((a,b) => b[1] - a[1]).slice(0,10).map(([k,v]) => `- ${k}: ${v} طلب`).join('\n')}

**أهم SLAs مطلوبة (Top 10):**
${Object.entries(summary.slaPriorities).sort((a,b) => b[1] - a[1]).slice(0,10).map(([k,v]) => `- ${k}: ${v} طلب`).join('\n')}

## ✨ التحسينات المقترحة (عينة):
${summary.magicFixes.slice(0, 15).map((f, i) => `${i+1}. ${f.fix} (${f.department})`).join('\n')}

## 📖 قصص واقعية (عينات):
**قصص اختناقات (${summary.bottleneckStories.length} قصة):**
${summary.bottleneckStories.slice(0, 5).map((s, i) => `${i+1}. [${s.department}] ${s.story}`).join('\n')}

**قصص إجراءات غير واضحة (${summary.unclearProcedureStories.length} قصة):**
${summary.unclearProcedureStories.slice(0, 3).map((s, i) => `${i+1}. [${s.department}] ${s.story}`).join('\n')}

**قصص نجاح في التنسيق (${summary.positiveCoordinationStories.length} قصة):**
${summary.positiveCoordinationStories.slice(0, 3).map((s, i) => `${i+1}. [${s.department}] ${s.story}`).join('\n')}

**أسوأ الاختناقات (${summary.worstBottlenecks.length} قصة):**
${summary.worstBottlenecks.slice(0, 5).map((s, i) => `${i+1}. [${s.department}] ${s.story}`).join('\n')}

---

# 🎯 المطلوب منك - تحليل شامل ومفصل:

قم بتحليل **عميق جداً** للبيانات وأعطِ تقرير استراتيجي كامل يتضمن:

## 1. 🔍 الاكتشافات الرئيسية (Key Findings)
حدد أهم **10 اكتشافات** من البيانات مع:
- الاكتشاف بوضوح
- الدليل من البيانات (أرقام وإحصائيات)
- مستوى الخطورة: 🔴 حرج / 🟡 متوسط / 🟢 إيجابي
- التأثير على المؤسسة

## 2. 🚧 الاختناقات الحرجة (Critical Bottlenecks)
حلل أهم **7 اختناقات** بالتفصيل:
- وصف الاختناق
- الأقسام المتأثرة
- التكلفة (وقت ضائع / فرص ضائعة)
- السبب الجذري (Root Cause)
- الحل المقترح (قصير وطويل المدى)

## 3. 📋 أولويات الـ SOPs
حدد أهم **15 إجراء** يحتاج توثيق فوري مع:
- اسم الإجراء
- عدد الطلبات
- الأقسام المستفيدة
- مستوى الأولوية: P0 (حرج) / P1 (عالي) / P2 (متوسط)
- الوقت المتوقع للتوثيق
- المسؤول عن التوثيق

## 4. ⏱️ توصيات الـ SLAs
اقترح **SLAs محددة** لأهم **10 إدارات/أقسام** مع:
- اسم الإدارة/الخدمة
- زمن الاستجابة المقترح (بالساعات/أيام)
- المبرر
- آلية القياس
- آلية التصعيد

## 5. 🏢 تحليل الأقسام
حلل كل قسم رئيسي (Top 5 أقسام) مع:
- نقاط القوة
- نقاط الضعف
- الاحتياجات العاجلة
- التوصيات المخصصة

## 6. 🎯 Quick Wins (حلول سريعة)
حدد **10 إجراءات** يمكن تنفيذها في **أسبوع واحد** مع:
- الإجراء
- التأثير المتوقع
- الجهد المطلوب (ساعات عمل)
- المسؤول

## 7. 🗺️ خارطة الطريق (12 شهر)
قسّم التوصيات إلى:
- **المرحلة 1 (شهر 1):** الإجراءات الحرجة
- **المرحلة 2 (شهر 2-3):** بناء الأساسات
- **المرحلة 3 (شهر 4-6):** التحسينات الهيكلية
- **المرحلة 4 (شهر 7-12):** الاستدامة والتطوير

## 8. 📊 مؤشرات النجاح (KPIs)
حدد **12 مؤشر** قابل للقياس مع:
- اسم المؤشر
- طريقة القياس
- الهدف (Baseline → Target)
- دورية القياس

## 9. 💰 تقدير التكلفة والعائد
- **الوضع الحالي:** الوقت الضائع بالساعات/شهرياً
- **الاستثمار المطلوب:** (وقت + موارد)
- **العائد المتوقع:** (توفير وقت + زيادة إنتاجية)
- **ROI المتوقع**

## 10. 🎨 ملخص تنفيذي للإدارة العليا
اكتب ملخص **300-400 كلمة** يتضمن:
- الوضع الحالي (مشاكل + أرقام)
- الفرص والحلول
- الإجراءات المطلوبة فوراً
- الأثر المتوقع على المؤسسة
- الرسالة الرئيسية

## 11. ⚠️ المخاطر المحتملة
حدد **5 مخاطر** لو لم يتم التحرك:
- المخاطر
- الاحتمالية
- التأثير
- خطة التخفيف

## 12. 🌟 قصص النجاح المستفادة
استخرج من القصص الإيجابية:
- ما الذي نجح؟
- لماذا نجح؟
- كيف نكرره؟

---

# ✅ تنسيق الإجابة:

- استخدم **العربية الفصحى المبسطة**
- **منظم بعناوين واضحة ومرقمة**
- **أرقام وإحصائيات** في كل نقطة
- **أمثلة واقعية** من القصص
- **توصيات قابلة للتنفيذ فوراً**
- **جداول ونقاط محددة**

**🔥 ابدأ التحليل الشامل الآن:**`;
}
