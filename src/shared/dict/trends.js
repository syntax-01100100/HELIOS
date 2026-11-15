export const TRENDS_DICT = {
  'trend.title': { en: 'Trends', ar: 'الاتجاهات' },
  'trend.intro': {
    en: 'See how one reading moves over time. Green, amber and red bands show the demo ranges.',
    ar: 'تابع كيف تتحرك قراءة واحدة عبر الزمن. تُظهر الأشرطة الخضراء والكهرمانية والحمراء نطاقات العرض التجريبي.',
  },
  'trend.reading': { en: 'Reading', ar: 'القراءة' },
  'trend.range': { en: 'Time range', ar: 'النطاق الزمني' },
  'trend.days': { en: '{d} days', ar: '{d} يوماً' },
  'trend.noCheckins': {
    en: 'No check-ins saved yet. Save a check-in or load sample data to see a trend.',
    ar: 'لا توجد تسجيلات محفوظة بعد. احفظ تسجيلاً أو حمّل بيانات العيّنة لعرض الاتجاه.',
  },
  'trend.noReadings': { en: 'No {m} readings in the last {d} days.', ar: 'لا توجد قراءات {m} في آخر {d} يوماً.' },
  'trend.summary': {
    en: '{n} readings in the last {d} days. Latest: {v}, {s}.',
    ar: '{n} قراءات في آخر {d} يوماً. الأحدث: {v}، {s}.',
  },
  'trend.aria': { en: '{m} over the last {d} days, {n} readings', ar: '{m} خلال آخر {d} يوماً، {n} قراءات' },
  'trend.key.ok': { en: 'Within demo range', ar: 'ضمن نطاق العرض' },
  'trend.key.watch': { en: 'Watch closely', ar: 'راقبه عن كثب' },
  'trend.key.act': { en: 'Act now', ar: 'تصرف الآن' },
  'trend.sampleOn': {
    en: 'Sample readings are included in this chart. They are marked as sample data and do not reflect a real crew member.',
    ar: 'تتضمن هذه الرسمة قراءات عيّنة. وهي موسومة بأنها بيانات عيّنة ولا تعكس أي عضو طاقم حقيقي.',
  },
  'trend.sampleOff': {
    en: 'Sample data is for trying the chart. It is marked SAMPLE and can be removed at any time.',
    ar: 'بيانات العيّنة لتجربة الرسمة. وهي موسومة SAMPLE ويمكن إزالتها في أي وقت.',
  },
  'trend.loadSample': { en: 'Load 14 days of sample data (SAMPLE)', ar: 'تحميل 14 يوماً من بيانات العيّنة (SAMPLE)' },
  'trend.removeSample': { en: 'Remove sample data', ar: 'إزالة بيانات العيّنة' },
  'trend.axisLabel': { en: 'Date', ar: 'التاريخ' },

  'drift.title': { en: 'Drift detected: what this means and next steps', ar: 'تم رصد انحراف: ماذا يعني وما الخطوات التالية' },
  'drift.intro': {
    en: 'Your recent readings have moved away from your own earlier pattern. This is guidance, not a diagnosis.',
    ar: 'تحركت قراءاتك الأخيرة بعيداً عن نمطك السابق. هذا توجيه وليس تشخيصاً.',
  },
  'drift.limits': {
    en: 'HELIOS does not measure bone density, immune function or mental health conditions.',
    ar: 'لا يقيس HELIOS كثافة العظام أو وظيفة المناعة أو حالات الصحة النفسية.',
  },
  'drift.none': { en: 'No drift', ar: 'لا يوجد انحراف' },
  'drift.noneNote': {
    en: 'Your recent readings are close to your earlier pattern. Keep logging to keep the baseline current.',
    ar: 'قراءاتك الأخيرة قريبة من نمطك السابق. واصل التسجيل ليبقى خط الأساس محدَّثاً.',
  },
  'drift.notEnough': {
    en: 'Drift needs at least 7 check-ins to compare against your earlier pattern.',
    ar: 'يحتاج رصد الانحراف إلى 7 تسجيلات على الأقل للمقارنة مع نمطك السابق.',
  },
  'drift.hr.up': {
    en: 'Resting heart rate has risen above your earlier pattern. Common causes include poor sleep, dehydration, stress, illness or hard training. Rest, drink to your protocol, and see whether it settles within 2 to 3 days. Report it sooner if it stays high or comes with dizziness or chest pain.',
    ar: 'ارتفع معدل ضربات القلب أثناء الراحة عن نمطك السابق. تشمل الأسباب الشائعة قلة النوم والجفاف والتوتر والمرض والتدريب الشاق. استرح، واشرب وفق بروتوكولك، وراقب هل يعود للمعتاد خلال 2 إلى 3 أيام. أبلغ مبكراً إذا بقي مرتفعاً أو صاحبه دوار أو ألم في الصدر.',
  },
  'drift.hr.down': {
    en: 'Resting heart rate has dropped below your earlier pattern. This is often fitness, but can also follow fatigue or medication. Check how you feel, and report it if it comes with dizziness or fainting.',
    ar: 'انخفض معدل ضربات القلب أثناء الراحة عن نمطك السابق. غالباً ما يكون ذلك لياقة، لكنه قد يأتي بعد الإرهاق أو الدواء. تحقق من إحساسك، وأبلغ إن صاحبه دوار أو إغماء.',
  },
  'drift.sleep.up': {
    en: 'You are sleeping more than your earlier pattern. This is often catch-up sleep after a busy period. If it lasts, mention it at your next review.',
    ar: 'تنام أكثر من نمطك السابق. غالباً ما يكون ذلك تعويضاً للنوم بعد فترة مزدحمة. إن استمر، فاذكره في مراجعتك القادمة.',
  },
  'drift.sleep.down': {
    en: 'You are sleeping less than your earlier pattern. Keep a fixed sleep window, cut screen time before bed, and check lighting and noise where you sleep. Tell the flight surgeon if short sleep lasts more than a week.',
    ar: 'تنام أقل من نمطك السابق. حافظ على موعد نوم ثابت، وقلّل وقت الشاشات قبل النوم، وتحقق من الإضاءة والضوضاء في مكان نومك. أبلغ الطبيب الجرّاح للرحلة إذا استمر قصر النوم أكثر من أسبوع.',
  },
  'drift.mood.up': {
    en: 'Mood ratings are trending higher than your earlier pattern. Keep the routines that help.',
    ar: 'تتجه تقييمات المزاج نحو الارتفاع عن نمطك السابق. حافظ على الروتينات التي تساعدك.',
  },
  'drift.mood.down': {
    en: 'Mood ratings have trended lower. Keep your routines, plan time with crewmates, and talk to crew support or a flight surgeon. HELIOS cannot assess mental health conditions. If you feel unsafe or hopeless, contact emergency support now.',
    ar: 'انخفضت تقييمات المزاج. حافظ على روتينك، وخصص وقتاً مع زملائك، وتحدث مع دعم الطاقم أو الطبيب الجرّاح للرحلة. لا يستطيع HELIOS تقييم حالات الصحة النفسية. إذا شعرت بعدم الأمان أو اليأس، فتواصل مع دعم الطوارئ الآن.',
  },
  'drift.fatigue.up': {
    en: 'Fatigue ratings are rising. Review sleep, workload and nutrition, schedule lighter tasks and rest breaks, and tell the flight surgeon if it keeps rising.',
    ar: 'ترتفع تقييمات الإرهاق. راجع النوم وحجم العمل والتغذية، وخطط لمهام أخف وفترات راحة، وأبلغ الطبيب الجرّاح للرحلة إن استمر الارتفاع.',
  },
  'drift.fatigue.down': {
    en: 'Fatigue is trending lower. Keep the routines that are working.',
    ar: 'ينخفض الإرهاق. حافظ على الروتينات التي تنجح معك.',
  },
  'drift.exercise.up': {
    en: 'Resistance exercise minutes are up. Check recovery and sleep so the extra training does not add to fatigue.',
    ar: 'ارتفعت دقائق تمارين المقاومة. تحقق من التعافي والنوم حتى لا يضيف التدريب الإضافي إلى الإرهاق.',
  },
  'drift.exercise.down': {
    en: 'Resistance exercise minutes have dropped. Plan short sessions of 10 to 20 minutes, and ask the mission team for your target if you are unsure.',
    ar: 'انخفضت دقائق تمارين المقاومة. خطط لجلسات قصيرة من 10 إلى 20 دقيقة، واسأل فريق المهمة عن هدفك إن لم تكن متأكداً.',
  },
  'drift.spo2.up': {
    en: 'Oxygen saturation is trending higher. This is often a sensor or fit change. Recheck sensor placement.',
    ar: 'يتجه تشبع الأكسجين نحو الارتفاع. غالباً ما يكون ذلك بسبب تغيير في المستشعر أو في طريقة تثبيته. أعد ضبط موضع المستشعر.',
  },
  'drift.spo2.down': {
    en: 'Oxygen saturation is trending lower. Check your sensor placement and suit seal, rest, and recheck. If readings stay low or you feel short of breath, contact the flight surgeon now.',
    ar: 'يتجه تشبع الأكسجين نحو الانخفاض. تحقق من موضع المستشعر وإحكام البدلة، واسترح، وأعد القياس. إذا بقيت القراءات منخفضة أو شعرت بضيق في النفس، فتواصل مع الطبيب الجرّاح للرحلة الآن.',
  },
  'drift.temp.up': {
    en: 'Skin temperature is trending higher. Skin temperature follows the environment, fit and activity, and is not core body temperature. Recheck, hydrate, and contact the flight surgeon if you feel unwell or it keeps rising.',
    ar: 'تتجه حرارة الجلد نحو الارتفاع. تتبع حرارة الجلد البيئة والملاءمة والنشاط، وليست حرارة الجسم الداخلية. أعد القياس واشرب الماء، وتواصل مع الطبيب الجرّاح للرحلة إن شعرت بالتعب أو استمر الارتفاع.',
  },
  'drift.temp.down': {
    en: 'Skin temperature is trending lower. This is often the environment or sensor fit. Recheck the reading and keep warm if you feel cold.',
    ar: 'تتجه حرارة الجلد نحو الانخفاض. غالباً ما يكون ذلك بسبب البيئة أو ملاءمة المستشعر. أعد القياس، وابقَ دافئاً إذا شعرت بالبرد.',
  },
};
