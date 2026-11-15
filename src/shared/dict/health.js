export const HEALTH_DICT = {
  'rule.green.doNow': {
    en: ['No action needed for this reading. Keep your normal routine.'],
    ar: ['لا يلزم اتخاذ إجراء لهذه القراءة. حافظ على روتينك المعتاد.'],
  },
  'rule.green.escalate': { en: 'Not needed for this reading.', ar: 'غير مطلوب لهذه القراءة.' },
  'rule.hr.meaning': {
    en: 'Heart rate shows how hard your heart is working. It rises with activity, heat, stress and suit or cabin conditions.',
    ar: 'يبيّن معدل ضربات القلب مدى جهد قلبك. يرتفع مع النشاط والحرارة والتوتر وظروف البدلة أو المقصورة.',
  },
  'rule.hr.prevent': {
    en: 'Warm up before EVA tasks, pace hard work, and keep to the fluid and rest schedule in your protocol.',
    ar: 'سخّن جسمك قبل مهام الخروج خارج المركبة، ووزّع الجهد الشاق، والتزم بجدول السوائل والراحة في بروتوكولك.',
  },
  'rule.hr.amber.doNow': {
    en: ['Slow or stop the current activity and rest.', 'Check suit fit, cooling and cabin air.', 'Re-check after a few minutes of rest.'],
    ar: ['أوقف النشاط الحالي أو خففه واسترح.', 'تحقق من ملاءمة البدلة والتبريد وهواء المقصورة.', 'أعد القياس بعد بضع دقائق من الراحة.'],
  },
  'rule.hr.amber.escalate': {
    en: 'If it stays out of range after rest, report it at your next flight surgeon contact.',
    ar: 'إذا بقيت القراءة خارج النطاق بعد الراحة، فأبلغ بذلك في أقرب تواصل مع الطبيب الجرّاح للرحلة.',
  },
  'rule.hr.red.doNow': {
    en: ['Stop activity now and rest in a safe position.', 'Tell the crew now.', 'Follow your mission emergency protocol if you feel unwell.'],
    ar: ['أوقف النشاط فوراً واسترح في وضعية آمنة.', 'أبلغ الطاقم الآن.', 'اتبع بروتوكول طوارئ مهمتك إذا شعرت بعدم الارتياح.'],
  },
  'rule.hr.red.escalate': { en: 'Contact the flight surgeon immediately.', ar: 'تواصل مع الطبيب الجرّاح للرحلة فوراً.' },
  'rule.spo2.meaning': {
    en: 'Blood oxygen saturation shows how well your blood carries oxygen. A suit leak, low gas supply or poor sensor contact can lower the reading.',
    ar: 'يبيّن تشبّع الأكسجين في الدم مدى قدرة دمك على حمل الأكسجين. قد يخفض القراءة تسرب في البدلة أو انخفاض إمداد الغاز أو ضعف تلامس المستشعر.',
  },
  'rule.spo2.prevent': {
    en: 'Check your suit seal and gas supply before each EVA, and keep the sensor snug.',
    ar: 'تحقق من إحكام البدلة وإمداد الغاز قبل كل خروج خارج المركبة، وأبقِ المستشعر مشدوداً.',
  },
  'rule.spo2.amber.doNow': {
    en: ['Check the suit seal and oxygen supply now.', 'Rest and breathe slowly.', 'Re-check after 5 minutes and reposition the sensor if needed.'],
    ar: ['تحقق من إحكام البدلة وإمداد الأكسجين الآن.', 'استرح وتنفس ببطء.', 'أعد القياس بعد 5 دقائق، وأعد وضع المستشعر إن لزم.'],
  },
  'rule.spo2.amber.escalate': {
    en: 'Report it at your next flight surgeon contact, sooner if it does not recover.',
    ar: 'أبلغ بذلك في أقرب تواصل مع الطبيب الجرّاح للرحلة، وأسرع إن لم تتحسن القراءة.',
  },
  'rule.spo2.red.doNow': {
    en: ['Check the suit seal and oxygen supply immediately and stop EVA work.', 'Tell the crew now.', 'Follow your mission emergency protocol.'],
    ar: ['تحقق فوراً من إحكام البدلة وإمداد الأكسجين، وأوقف عمل الخروج خارج المركبة.', 'أبلغ الطاقم الآن.', 'اتبع بروتوكول الطوارئ في مهمتك.'],
  },
  'rule.temp.meaning': {
    en: 'Skin temperature reflects heat from your body and the suit cooling. Warm skin can mean overheating; cold skin can mean the suit is too cool.',
    ar: 'تعكس حرارة الجلد الحرارة الصادرة من جسمك وتبريد البدلة. الجلد الدافئ قد يعني ارتفاع الحرارة، والجلد البارد قد يعني أن البدلة شديدة البرودة.',
  },
  'rule.temp.prevent': {
    en: 'Check suit cooling before and during tasks, and drink fluids on schedule.',
    ar: 'تحقق من تبريد البدلة قبل المهام وأثناءها، واشرب السوائل حسب الجدول.',
  },
  'rule.temp.amber.doNow': {
    en: ['Check suit cooling and reduce workload.', 'Drink fluids on your schedule.', 'Move to a cooler area if your protocol allows.'],
    ar: ['تحقق من تبريد البدلة وخفف عبء العمل.', 'اشرب السوائل حسب جدولك.', 'انتقل إلى مكان أبرد إذا سمح بروتوكولك.'],
  },
  'rule.temp.amber.escalate': {
    en: 'Report it at your next flight surgeon contact if it does not return to range.',
    ar: 'أبلغ بذلك في أقرب تواصل مع الطبيب الجرّاح للرحلة إذا لم تعد القراءة إلى النطاق.',
  },
  'rule.temp.red.doNow': {
    en: ['Stop activity and check suit cooling now.', 'Tell the crew now.', 'Follow your mission heat protocol.'],
    ar: ['أوقف النشاط وتحقق من تبريد البدلة الآن.', 'أبلغ الطاقم الآن.', 'اتبع بروتوكول الحرارة في مهمتك.'],
  },
  'rule.sys.meaning': {
    en: 'The top blood pressure number is the pressure when the heart beats. Fluid shifts in space and stress can change it.',
    ar: 'الرقم الأعلى لضغط الدم هو الضغط عند انقباض القلب. قد تغيّره إزاحة السوائل في الفضاء والتوتر.',
  },
  'rule.sys.prevent': {
    en: 'Rest between tasks, keep hydrated, and change position slowly.',
    ar: 'استرح بين المهام، وحافظ على ترطيب جسمك، وغيّر وضعك ببطء.',
  },
  'rule.sys.amber.doNow': {
    en: ['Sit or lie down and rest for 10 minutes.', 'Drink fluids on your schedule.', 'Re-check when you have rested.'],
    ar: ['اجلس أو استلقِ واسترح 10 دقائق.', 'اشرب السوائل حسب جدولك.', 'أعد القياس بعد الراحة.'],
  },
  'rule.sys.amber.escalate': {
    en: 'Report it at your next flight surgeon contact.',
    ar: 'أبلغ بذلك في أقرب تواصل مع الطبيب الجرّاح للرحلة.',
  },
  'rule.sys.red.doNow': {
    en: ['Rest now and avoid exertion.', 'Tell the crew now.', 'Follow your mission medical protocol.'],
    ar: ['استرح الآن وتجنب المجهود.', 'أبلغ الطاقم الآن.', 'اتبع البروتوكول الطبي في مهمتك.'],
  },
  'rule.sys.red.escalate': { en: 'Contact the flight surgeon immediately.', ar: 'تواصل مع الطبيب الجرّاح للرحلة فوراً.' },
  'rule.dia.meaning': {
    en: 'The bottom blood pressure number is the pressure between heartbeats. It is read together with the top number.',
    ar: 'الرقم الأدنى لضغط الدم هو الضغط بين نبضات القلب، ويُقرأ مع الرقم الأعلى.',
  },
  'rule.glucose.meaning': {
    en: 'Blood glucose is blood sugar, the fuel for muscles and the brain. Skipped meals or hard work can move it out of range.',
    ar: 'سكر الدم هو السكر في الدم، وهو وقود العضلات والدماغ. تخطي الوجبات أو العمل الشاق قد يخرجه عن النطاق.',
  },
  'rule.glucose.prevent': {
    en: 'Eat meals on schedule and plan food before demanding tasks.',
    ar: 'تناول الوجبات في مواعيدها، وخطّط للطعام قبل المهام الشاقة.',
  },
  'rule.glucose.amber.doNow': {
    en: ['Follow your mission nutrition protocol for a meal or snack.', 'Rest and re-check per protocol.'],
    ar: ['اتبع بروتوكول التغذية في مهمتك لوجبة أو وجبة خفيفة.', 'استرح وأعد القياس حسب البروتوكول.'],
  },
  'rule.glucose.amber.escalate': {
    en: 'Report it at your next flight surgeon contact.',
    ar: 'أبلغ بذلك في أقرب تواصل مع الطبيب الجرّاح للرحلة.',
  },
  'rule.glucose.red.doNow': {
    en: ['Follow your mission protocol for out-of-range glucose right away. Do not self-treat with medication.', 'Tell the crew now.'],
    ar: ['اتبع فوراً بروتوكول مهمتك لسكر الدم خارج النطاق. لا تعالج نفسك بالأدوية.', 'أبلغ الطاقم الآن.'],
  },
  'rule.sleep.meaning': {
    en: 'Sleep affects alertness, mood and performance. Shifted light and work schedules disrupt sleep in space.',
    ar: 'يؤثر النوم في اليقظة والمزاج والأداء. تغيّر مواعيد الضوء والعمل يعطّل النوم في الفضاء.',
  },
  'rule.sleep.prevent': {
    en: 'Keep a fixed sleep window, dim the lights an hour before bed, and avoid heavy meals late.',
    ar: 'حافظ على نافذة نوم ثابتة، وخفّف الإضاءة قبل النوم بساعة، وتجنب الوجبات الثقيلة متأخراً.',
  },
  'rule.sleep.amber.doNow': {
    en: ['Protect your next sleep window: dim the lights and keep quiet time.', 'Avoid stimulants late in the day, per protocol.'],
    ar: ['احمِ نافذة نومك القادمة: خفّف الإضاءة وحافظ على وقت الهدوء.', 'تجنب المنبهات متأخراً في اليوم حسب البروتوكول.'],
  },
  'rule.sleep.amber.escalate': {
    en: 'Mention it at your next flight surgeon contact if it repeats for three nights.',
    ar: 'اذكر ذلك في أقرب تواصل مع الطبيب الجرّاح للرحلة إذا تكرر لثلاث ليالٍ.',
  },
  'rule.sleep.red.doNow': {
    en: ['Tell the crew you need a protected rest period.', 'Keep tasks light until you have rested.'],
    ar: ['أبلغ الطاقم أنك تحتاج فترة راحة محمية.', 'أبقِ المهام خفيفة حتى تستريح.'],
  },
  'rule.sleep.red.escalate': {
    en: 'Contact the flight surgeon at the next contact, or sooner if you feel unsafe.',
    ar: 'تواصل مع الطبيب الجرّاح للرحلة في أقرب تواصل، أو أسرع إن شعرت بعدم الأمان.',
  },
  'rule.mood.meaning': {
    en: 'Mood reflects stress, isolation and workload. Low mood is common in confinement and is worth sharing early.',
    ar: 'يعكس المزاج التوتر والعزلة وعبء العمل. انخفاض المزاج شائع في الحجر والعزلة، ويستحق مشاركته مبكراً.',
  },
  'rule.mood.prevent': {
    en: 'Keep daily contact with the crew and family, schedule breaks, and use your planned activities.',
    ar: 'حافظ على التواصل اليومي مع الطاقم والعائلة، وخطط للاستراحات، واستفد من أنشطتك المخططة.',
  },
  'rule.mood.amber.doNow': {
    en: ['Talk with a crew member about how you feel.', 'Take a planned break or do an activity you enjoy.'],
    ar: ['تحدث مع أحد أفراد الطاقم عن شعورك.', 'خذ استراحة مخططة أو مارس نشاطاً تحبه.'],
  },
  'rule.mood.amber.escalate': {
    en: 'Share it at your next scheduled behavioral health contact.',
    ar: 'شارك ذلك في جلسة الصحة السلوكية المجدولة القادمة.',
  },
  'rule.mood.red.doNow': {
    en: ['Tell a crew member now. Do not stay alone with the feeling.', 'Follow your mission behavioral health protocol.'],
    ar: ['أبلغ أحد أفراد الطاقم الآن. لا تبقَ وحدك مع هذا الشعور.', 'اتبع بروتوكول الصحة السلوكية في مهمتك.'],
  },
  'rule.mood.red.escalate': {
    en: 'Contact the flight surgeon or behavioral health support now.',
    ar: 'تواصل مع الطبيب الجرّاح للرحلة أو دعم الصحة السلوكية الآن.',
  },
  'combo.fastLow.title': { en: 'Fast pulse with low SpO₂', ar: 'نبض سريع مع تشبّع أكسجين منخفض' },
  'combo.fastLow.steps': {
    en: ['Check your suit seal, gas supply and cabin air first.', 'Stop or slow activity and rest in a safe position.', 'Tell the crew now, and follow your mission emergency protocol if you feel unwell.'],
    ar: ['تحقق أولاً من إحكام البدلة وإمداد الغاز وهواء المقصورة.', 'أوقف النشاط أو خففه، واسترح في وضعية آمنة.', 'أبلغ الطاقم الآن، واتبع بروتوكول الطوارئ في مهمتك إذا شعرت بعدم الارتياح.'],
  },
  'combo.fastLow.escalate': {
    en: 'Contact the flight surgeon immediately if the pattern does not settle.',
    ar: 'تواصل مع الطبيب الجرّاح للرحلة فوراً إذا لم يهدأ هذا النمط.',
  },
  'combo.warmFast.title': { en: 'Warm skin with a fast pulse', ar: 'جلد دافئ مع نبض سريع' },
  'combo.warmFast.steps': {
    en: ['Check suit cooling and reduce workload now.', 'Drink fluids on your protocol schedule.', 'Re-check heart rate and skin temperature after 10 minutes.'],
    ar: ['تحقق من تبريد البدلة وخفف عبء العمل الآن.', 'اشرب السوائل حسب جدول البروتوكول.', 'أعد قياس معدل ضربات القلب وحرارة الجلد بعد 10 دقائق.'],
  },
  'combo.warmFast.escalate': {
    en: 'Contact the flight surgeon if the values do not come back into range.',
    ar: 'تواصل مع الطبيب الجرّاح للرحلة إذا لم تعد القراءات إلى النطاق.',
  },
  'combo.shortSleep.title': { en: 'Short sleep with low mood', ar: 'نوم قصير مع مزاج منخفض' },
  'combo.shortSleep.steps': {
    en: ['Protect your next sleep window: dim the lights and keep your schedule.', 'Use daylight and routines from your circadian plan.', 'Talk with a crew member about how you feel today.'],
    ar: ['احمِ نافذة نومك القادمة: خفّف الإضاءة والتزم بجدولك.', 'استفد من ضوء النهار والروتين من خطتك الإيقاعية.', 'تحدث مع أحد أفراد الطاقم عن شعورك اليوم.'],
  },
  'combo.shortSleep.escalate': {
    en: 'Share this with the flight surgeon at the next scheduled contact.',
    ar: 'شارك ذلك مع الطبيب الجرّاح للرحلة في التواصل المجدول القادم.',
  },
  'ci.moodVeryLow': { en: 'Very low', ar: 'منخفض جداً' },
  'ci.moodLow': { en: 'Low', ar: 'منخفض' },
  'ci.moodOkay': { en: 'Okay', ar: 'مقبول' },
  'ci.moodGood': { en: 'Good', ar: 'جيد' },
  'ci.moodGreat': { en: 'Great', ar: 'ممتاز' },
  'ci.auto': { en: 'Auto (simulated helmet feed)', ar: 'تلقائي (بيانات خوذة محاكاة)' },
  'ci.hr': { en: 'Heart rate (BPM)', ar: 'معدل ضربات القلب (نبضة/دقيقة)' },
  'ci.spo2': { en: 'SpO₂ (%)', ar: 'تشبّع الأكسجين (SpO₂) (%)' },
  'ci.temp': { en: 'Skin temperature (°C)', ar: 'حرارة الجلد (°م)' },
  'ci.newReading': { en: 'Take a new reading', ar: 'خذ قراءة جديدة' },
  'ci.manual': { en: 'Manual entry', ar: 'إدخال يدوي' },
  'ci.sys': { en: 'Top blood pressure number (mmHg)', ar: 'الرقم الأعلى لضغط الدم (mmHg)' },
  'ci.dia': { en: 'Bottom blood pressure number (mmHg)', ar: 'الرقم الأدنى لضغط الدم (mmHg)' },
  'ci.glucose': { en: 'Blood glucose', ar: 'سكر الدم' },
  'ci.glucoseUnit': { en: 'Glucose unit', ar: 'وحدة قياس السكر' },
  'ci.sleep': { en: 'Hours of sleep last night', ar: 'ساعات النوم ليلة أمس' },
  'ci.moodQ': { en: 'How is your mood today?', ar: 'كيف مزاجك اليوم؟' },
  'ci.longTerm': { en: 'Long-term health (optional)', ar: 'الصحة على المدى الطويل (اختياري)' },
  'ci.exercise': { en: 'Resistance exercise today (minutes, 0 to 300)', ar: 'تمارين المقاومة اليوم (دقائق، من 0 إلى 300)' },
  'ci.fatigue': { en: 'Fatigue (1 = fresh, 5 = exhausted)', ar: 'الإرهاق (1 = نشيط، 5 = مرهق تماماً)' },
  'ci.save': { en: 'Save check-in', ar: 'احفظ التسجيل' },
  'ci.clear': { en: 'Clear my data', ar: 'امسح بياناتي' },
  'ci.feedNotLoaded': { en: 'The helmet feed has not loaded yet. Take a new reading.', ar: 'لم تُحمَّل بيانات الخوذة بعد. خذ قراءة جديدة.' },
  'ci.rangeErr': { en: 'Enter a value between {min} and {max}.', ar: 'أدخل قيمة بين {min} و{max}.' },
  'ci.glucoseRangeErr': { en: 'Enter a value between 1.7 and 22.2 mmol/L.', ar: 'أدخل قيمة بين 1.7 و22.2 mmol/L.' },
  'ci.moodErr': { en: 'Choose how your mood feels today.', ar: 'اختر وصف مزاجك اليوم.' },
  'ci.exerciseErr': { en: 'Enter minutes from 0 to 300, or leave blank.', ar: 'أدخل دقائق من 0 إلى 300، أو اتركه فارغاً.' },
  'ci.fatigueErr': { en: 'Enter a number from 1 to 5, or leave blank.', ar: 'أدخل رقماً من 1 إلى 5، أو اتركه فارغاً.' },
  'ci.saved': { en: 'Saved on this device.', ar: 'تم الحفظ على هذا الجهاز.' },
  'ci.storageErr': { en: 'Could not save on this device. Your browser may be blocking storage.', ar: 'تعذّر الحفظ على هذا الجهاز. قد يمنع المتصفح التخزين.' },
  'ci.cleared': { en: 'Your check-in data was deleted from this device.', ar: 'حُذفت بيانات التسجيل من هذا الجهاز.' },
  'ci.confirmClear': { en: 'Delete all check-ins saved on this device?', ar: 'هل تريد حذف كل التسجيلات المحفوظة على هذا الجهاز؟' },
  'ci.empty': { en: 'No check-in saved yet. Save one to see your results and guidance.', ar: 'لم يُحفظ أي تسجيل بعد. احفظ تسجيلاً لترى نتائجك وإرشاداتك.' },
  'ci.results': { en: 'Your results', ar: 'نتائجك' },
  'ci.checked': { en: 'Checked {time}', ar: 'تم الفحص {time}' },
  'ci.flightSurgeon': { en: 'Flight surgeon:', ar: 'الطبيب الجرّاح للرحلة:' },
  'ci.demoValue': { en: 'Demo value, not a NASA limit.', ar: 'قيمة تجريبية، وليست حداً من ناسا.' },
  'ci.doNow': { en: 'What to do now', ar: 'ما الذي تفعله الآن' },
  'ci.prevent': { en: 'How to prevent it:', ar: 'كيف تتجنبه:' },
  'ci.whenContact': { en: 'When to contact the flight surgeon:', ar: 'متى تتواصل مع الطبيب الجرّاح للرحلة:' },
  'ci.delayOneWay': { en: 'One-way signal delay ({env}):', ar: 'تأخير الإشارة في اتجاه واحد ({env}):' },
  'ci.marsNote': {
    en: 'On Mars the crew acts on protocol first and reports when the link allows.',
    ar: 'على المريخ يتصرف الطاقم وفق البروتوكول أولاً، ثم يبلغ عندما تسمح الوصلة.',
  },
  'ci.extraNote': {
    en: 'Long-term readings are tracked for trends. They do not change your readiness score.',
    ar: 'تُتابع القراءات طويلة المدى للاتجاهات، ولا تغيّر درجة جاهزيتك.',
  },
};
