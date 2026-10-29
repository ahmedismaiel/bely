(() => {
  const labels = {
    'BELY': 'بلي', 'Development log': 'سجل التطوير', 'Play the build': 'العب النسخة', 'Language': 'اللغة',
    'Kings of the Hara / Checkpoint 07': 'ملوك الحارة / المرحلة ٠٧',
    'A proper showroom. A more believable cast.': 'استوديو للبلي. وشخصيات أقرب للواقع.',
    'The marble studio now opens over your live match without restarting it. The blog supports Arabic, and the previous stylized characters have been replaced with realistically proportioned, textured avatars.': 'يفتح استوديو البلي فوق المباراة نفسها دون إعادة تشغيلها. يدعم السجل العربية، واستُبدلت الشخصيات الكرتونية السابقة بشخصيات ذات نسب وخامات أقرب للواقع.',
    'Checkpoint 07 / Replacement cast': 'المرحلة ٠٧ / الشخصيات البديلة',
    'Textured clothing and native skeletal animation. Actual browser frame.': 'ملابس بخامات مفصلة وتحريك هيكلي متوافق. لقطة فعلية من المتصفح.',
    'Latest changes': 'آخر التغييرات',
    'The showroom stays inside your session': 'الاستوديو يحافظ على جلستك',
    'Marble Studio / Hero pose': 'استوديو البلي / اللقطة الرئيسية',
    'Hero, low, core, overhead, and profile camera positions.': 'لقطات رئيسية ومنخفضة وداخلية وعلوية وجانبية.',
    'A new cast, not a repaint': 'شخصيات جديدة، وليس مجرد تلوين',
    'Replacement cast / Night final': 'الشخصيات البديلة / النهائي الليلي',
    'Asset provenance': 'مصادر الأصول', 'MIT license': 'ترخيص MIT',
    'Arabic blog and a lighter phone profile': 'سجل عربي وإعدادات أخف للهاتف',
    'Arabic development journal': 'سجل التطوير بالعربية',
    'Phone showroom / Arabic RTL': 'استوديو الهاتف / العربية من اليمين لليسار',
    'Checkpoint 07. The original prototype was committed as': 'المرحلة ٠٧. حُفظ النموذج الأصلي في الالتزام',
    'before expansion. Capture timestamps are in the linked reports.': 'قبل التوسعة. توجد أوقات الالتقاط في التقارير المرتبطة.',
    'First deterministic glass, scanned soil, chalk circle, and a procedural neighborhood.': 'أول زجاج ثابت بصريًا، وأرض ممسوحة، ودائرة طباشير وحارة مولدة.',
    'Scanned plant, chair, and crates; narrower ribbons; ground-level weathering; revised sunlight and static geometry batching.': 'نبات وكرسي وصناديق ممسوحة؛ أشرطة أدق؛ آثار استعمال قرب الأرض؛ شمس معدلة وتجميع للمجسمات الثابتة.',
    'Playable flicks, scoring, seven-shot mode, sound, reset, portrait framing, live orbit recording, and motion-stability checks.': 'رميات قابلة للعب ونقاط ونمط سبع رميات وصوت وإعادة وتأطير للهاتف وتسجيل دوران مباشر واختبارات ثبات الحركة.',
    'Kings of the Hara / Checkpoint 05': 'ملوك الحارة / المرحلة ٠٥',
    'A hundred marbles. A much bigger journey.': 'مئة بلية. ورحلة أكبر بكتير.',
    'Arabic and English, landmark-inspired locations, an animated cast, twelve campaign events, and six experimental mode families. Every photograph is from the running browser build.': 'عربية وإنجليزية، أماكن مستوحاة من معالم مصر، شخصيات متحركة، اثنتا عشرة مرحلة قصصية وستة أنماط تجريبية. كل الصور ملتقطة من النسخة التي تعمل في المتصفح.',
    'Ready for your review': 'جاهزة لمراجعتك', 'Checkpoint 05 / Giza rooftops': 'المرحلة ٠٥ / سطوح الجيزة',
    'Authored landmark approximation. Actual live browser frame.': 'تصميم تقريبي للمعالم. لقطة فعلية من المتصفح.',
    'Collectible marble variants / 10 finishes': 'بليات قابلة للجمع / عشر خامات', 'Generated experimental scenarios': 'تجارب مولدة', 'Authored campaign events': 'مراحل قصصية مصممة', 'Live language switching and RTL': 'تبديل اللغة واتجاه من اليمين لليسار',
    'Play Arabic / all levels open': 'العب بالعربية / كل المراحل مفتوحة', 'Play English / all levels open': 'العب بالإنجليزية / كل المراحل مفتوحة',
    'Your verdict': 'رأيك', 'Approve direction': 'موافق على الاتجاه', 'Needs work': 'يحتاج تعديل', 'Propose another direction': 'اقترح اتجاهًا آخر', 'Not reviewed': 'لم تتم المراجعة',
    '100 marbles': '١٠٠ بلية', 'Play Lab': 'مختبر اللعب', 'Story and Arabic': 'الحكاية والعربية', 'Landmarks': 'المعالم', 'Earlier checkpoints': 'المراحل السابقة', 'What is real': 'ما هو حقيقي', 'Your notes': 'ملاحظاتك',
    'One hundred actual material variants': 'مئة شكل بخامات فعلية', 'Rendered contact sheet / all 100 marbles': 'لوحة الخامات / المئة بلية', 'Each tile is captured from the game shader, not a painted mockup.': 'كل بلية ملتقطة من عرض اللعبة الفعلي، وليست رسمة تصورية.',
    'Six playable experiments, 240 generated courses': 'ستة أنماط قابلة للعب و٢٤٠ مسارًا مولدًا', 'The Play Lab': 'مختبر اللعب', 'All 240 scenario ideas as JSON': 'أفكار التجارب الـ٢٤٠ بصيغة JSON',
    'Odyssey / third-person terrain': 'الرحلة / تضاريس ومنظور ثالث', 'Pulse / kinetic shockwave': 'النبضة / موجة دفع حركية', 'Sky Ribbons / jump and glide': 'شرائط السماء / قفز وتحليق',
    'Someone to meet. A reason to return.': 'ناس نقابلها. وسبب نرجع.', 'Arabic story scene': 'مشهد الحكاية بالعربية', 'Real skeletal animation and camera movement. Skip, advance, or replay.': 'تحريك فعلي للشخصيات والكاميرا. تخطَّ المشهد أو تقدم أو أعده.', 'The same story in English': 'الحكاية نفسها بالإنجليزية', 'The cast is stylized prototype art, not photoreal digital humans.': 'هذه صور الطاقم التجريبي السابق، وليست بشرًا رقميين واقعيين.',
    'Places worth looking up for': 'أماكن تستاهل تبص حواليك', 'Giza rooftop / pyramid plateau': 'سطح في الجيزة / هضبة الأهرامات', 'Citadel terrace / city skyline': 'شرفة القلعة / أفق القاهرة', 'Alexandria / beach and Qaitbay silhouette': 'الإسكندرية / الشاطئ وملامح قايتباي', 'Arabic / 390 x 844 emulation': 'العربية / محاكاة شاشة 390 × 844',
    'ARCHIVE': 'الأرشيف', 'ARCHIVE 03': 'أرشيف ٠٣', 'The original glass, before and after': 'الزجاج الأول: قبل وبعد', '01 / First pass': '٠١ / المحاولة الأولى', '02 / Material pass': '٠٢ / تحسين الخامات', 'First pass': 'المحاولة الأولى', 'Material pass': 'تحسين الخامات', 'Before and after comparison': 'مقارنة قبل وبعد',
    'Current close-up / Checkpoint 03': 'اللقطة المقربة / المرحلة ٠٣', 'Bounded, deterministic reflection and refraction rays. No accumulated samples.': 'أشعة انعكاس وانكسار ثابتة ومحدودة، بلا تراكم عينات.',
    'The original motion benchmark': 'اختبار الحركة الأصلي', 'Identical': 'متطابقة', 'First frame on returning to the same camera': 'أول إطار عند العودة إلى الكاميرا نفسها', 'Accumulated frames required': 'إطارات تراكم مطلوبة', 'Observed during this desktop capture': 'قياس من التقاط الكمبيوتر هذا', '95th percentile frame time in that sample': 'زمن الإطار عند المئين ٩٥ للعينة',
    'Motion checkpoint A': 'لقطة حركة أ', 'Motion checkpoint B': 'لقطة حركة ب', 'Motion checkpoint C': 'لقطة حركة ج',
    'Three moods, one street': 'ثلاثة أجواء لشارع واحد', 'After school': 'بعد المدرسة', 'Soft daylight': 'نهار هادئ', 'Blue hour': 'وقت الغروب', 'Lighting photographs': 'صور الإضاءة',
    'After school / Proposed lead look': 'بعد المدرسة / الجو الرئيسي المقترح', 'Soft daylight / Surface readability': 'نهار هادئ / وضوح الخامات', 'Blue hour / Warm practical lights': 'الغروب / أضواء دافئة',
    'Change lighting in the live build to compare from any angle.': 'غيّر الإضاءة داخل اللعبة للمقارنة من أي زاوية.',
    'Where the game started': 'من هنا بدأت اللعبة', 'Real mouse input / One marble collected': 'رمية فعلية بالفأرة / بلية واحدة', 'Portrait / 390 x 844': 'شاشة طولية / 390 × 844',
    'What is real, and what is approximated': 'ما هو حقيقي وما هو تقريبي', 'Actual ray tracing, without a progressive path tracer': 'تتبع أشعة فعلي دون تراكم تدريجي', 'The street, lighting, and caustic tradeoffs': 'الشارع والإضاءة وتقريبات تركيز الضوء', 'What is not finished': 'ما لم يكتمل بعد', 'Sources, credits, and reproducibility': 'المصادر والحقوق وإعادة الإنتاج',
    'Build journal': 'سجل الإصدارات', 'Pass': 'المرحلة', 'What changed': 'ما تغيّر', 'Evidence': 'الدليل', 'First close-up': 'أول لقطة مقربة', 'Verified report': 'تقرير التحقق',
    'Your next decision': 'قرارك القادم', 'Worth exploring next': 'ما يستحق التجربة لاحقًا', "Push this street's realism further": 'ارفع واقعية المكان أكثر', 'Add a convincing animated finger-flick': 'أضف حركة إصبع مقنعة للرمية', 'Build the Ramadan-night experience': 'طوّر تجربة ليالي رمضان', 'Try an Alexandria lane after rain': 'جرّب شارعًا إسكندرانيًا بعد المطر', 'Use my childhood rules instead': 'استخدم قواعد لعب طفولتي', 'Compare against a native Unreal slice': 'قارن بنسخة أصلية في Unreal',
    'Keep': 'احتفظ بـ', 'Change or reject': 'غيّر أو ارفض', 'Your alternative': 'اقتراحك البديل', 'Export review': 'تصدير المراجعة',
    'What earns a place in the next build?': 'إيه اللي يستحق يفضل في النسخة الجاية؟', 'What breaks the illusion or gets in the way?': 'إيه اللي مش مقنع أو بيعطّل التجربة؟', 'A different place, rule, mood, or experience...': 'مكان أو قاعدة أو جو أو تجربة مختلفة...',
    'Saved locally as you edit': 'تُحفظ محليًا أثناء الكتابة', 'Review saved locally': 'تم حفظ المراجعة محليًا', 'Saved in this browser': 'محفوظة في هذا المتصفح', 'Storage unavailable': 'التخزين غير متاح', 'Export to keep your review': 'صدّر المراجعة للاحتفاظ بها', 'Review restored': 'تمت استعادة المراجعة', 'Return to Bely': 'العودة إلى بلي',
  };
  const groups = {
    '#latest > .prose': [
      'استوديو البلي مشهد عرض خفيف يفتح في نافذة تغطي اللعبة بدل مغادرتها. تتوقف المباراة مؤقتًا ثم تعود بنفس الصفحة والمرحلة وعدد الرميات وحالة القوائم. لا يحتاج إلى رابط آخر أو إعادة التشغيل. يوفر خمس وضعيات كاميرا وعرضًا تلقائيًا وتدويرًا وتحكمًا باللمس وتصفية وتنزيل صور. <a href="./devlog/06-showroom-state-check.json">اختبار الحفاظ على المباراة</a>.',
      'استُبدلت الأجسام السابقة ذات طابع الأبطال الخارقين بثلاث شخصيات من Microsoft Rocketbox بترخيص MIT. تستخدم نسبًا بشرية واقعية وملابس فعلية وشعرًا وخامات جلد وقماش مفصلة، مع حركات وقوف ومشي وحوار متوافقة. حُولت خرائط TGA الكبيرة إلى WebP بحجم 1024 بكسل. هذه شخصيات ألعاب أكثر واقعية، وليست بشرًا رقميين بمستوى الأفلام أو التقاط أداء الوجوه.',
      'يدعم السجل الآن العربية والإنجليزية واتجاهًا من اليمين لليسار ومحتوى تقنيًا وتعليقات مصورة وأدوات مراجعة مترجمة. تبقى الملاحظات أثناء تبديل اللغة. يبدأ الهاتف بخامات أرض 1024 بكسل ونسبة بكسل 1x وظلال وانعكاسات أصغر ودون عمق مجال. المقدمات التلقائية للشخصيات مغلقة على اللمس ويمكن تشغيلها من الإعدادات.',
      'نُشرت اللعبة وسجل التطوير ثنائي اللغة على GitHub Pages تحت الحساب الشخصي <a href="https://github.com/ahmedismaiel/bely">ahmedismaiel</a>. تحقق اختبار مباشر بحجم هاتف من الواجهة العربية وعرض WebGL والاستوديو والعودة إلى المباراة نفسها. اختبارات اللمس والتخطيط محاكاة على متصفح كمبيوتر، وليست شهادة أداء لهاتف فعلي. <a href="./devlog/06-showroom-mobile-checks.json">تقرير الهاتف ومسارات المشروع</a>.',
    ],
    '#collection > .prose': ['زجاج مخطط، وعين القطة، وزجاج غائم، وفقاعات محبوسة، ودوامات مصمتة، وخزف، ومعدن مصقول، ولؤلؤ، وعقيق، وزجاج لامع. لكل عائلة عشر توليفات من اللون والنمط. تدعم المجموعة البحث بالاسم وتصفية الخامات. هي مئة تنويعة عبر عشرة نماذج خامات، وليست مئة مادة فيزيائية مستقلة؛ أوزان بلي اللعب الكلاسيكي متساوية.'],
    '#experiments > .prose': [
      'افتح «مختبر اللعب» لاختيار رحلة البلّية، أو ساحة النبضة، أو شرائط السماء، أو بلّية القمر، أو قبل آخر ضوء، أو العلبة الضائعة. لكل نمط أربعون مسارًا مولدًا عبر خمسة مستويات صعوبة. تتغير التضاريس والبوابات والحواجز والرياح وتوزيع السطح حسب البذرة والمستوى. هذه تنويعات إجرائية، وليست ٢٤٠ فصلًا مؤلفًا يدويًا أو ٢٤٠ آلية مستقلة.',
      'تُحرّك البلّية بمفاتيح WASD أو الأسهم؛ Space للقفز، وE للنبضة، وF لتبديل التحليق. تدعم الأزرار الظاهرة اللمس أيضًا. يفتح زر فقاعة الحوار التقييم والملاحظات في أي وقت. تُحفظ النتائج والمراجعات منفصلة عن تقدم الحكاية. اختُبرت الأنماط الستة من حيث ملامسة التضاريس والحركة والقدرات والتصفية والعودة للحكاية. جميع التوليفات الـ٢٤٠ تُولد بصورة ثابتة، لكن لم يُختبر إكمال كل واحدة منها من البداية للنهاية.',
      '<a href="./devlog/05-mode-checks.json">تقرير اختبار الأنماط في المتصفح</a>. لا تزال مساعدة التصويب المرتد في الحكاية تجريبية: صُلحت اصطدامات الحواف، لكن اختبار فوز الرمية المقترحة ما زال يفشل. اخترت تأجيل ضبطه والتركيز على الصور والأنماط. يظل الفشل ظاهرًا في الاختبارات.',
    ],
    '#story > .prose': [
      'أنت نور. علبة بلي قديمة بتفكرك بالأصحاب اللي ملّوها. قبل ما مريم تسافر للجامعة، بتلف عشان تجمع الدايرة القديمة لآخر نهائي في الحارة. في كل مكان تقابل صاحبًا وحوارًا وتحديًا جديدًا.',
      'توضح صور المرحلة السابقة شخصيات Quaternius بترخيص CC0 وحركات مشي وحوار وتفاعل وركوع. كانت الملابس معالجة في الشيدر فوق المجسم الأساسي. الحوار مترجم؛ والقراءة الاختيارية تستخدم أصوات المتصفح المتاحة، وليست تمثيلًا صوتيًا مسجلًا أو مزامنة شفاه. <a href="./assets/characters/manifest.json">مصدر الشخصيات والحركات</a>.',
      'يبدّل اختيار اللغة بين العربية والإنجليزية دون إعادة المباراة. يفتح وضع المراجعة مراحل الحكاية الاثنتي عشرة دون منح ميداليات أو الكتابة فوق تقدمك المكتسب. <a href="./devlog/05-presentation-checks.json">تقرير العرض وعزل الحفظ</a>.',
    ],
    '#places > .prose': ['الأماكن تصميمات تقريبية يمكن التعرف عليها، وليست إعادة بناء جغرافية دقيقة أو مسحًا للآثار. لا يزال المعز وخان الخليلي يستخدمان جزءًا من مباني الحارة المشتركة، ويحتاجان واجهات وتفاصيل أكثر خصوصية في الجولة الفنية القادمة. أبو الهول مجسم مبسط في الخلفية. توفر Poly Haven مسوحات الأرض والجدران والأغراض والبيئة الضوئية.'],
    '#glass > .prose': ['أثبتت المحاولة الأولى الانعكاس والانكسار المقلوب. ضيّقت الثانية الأشرطة الملونة، واستبدلت الأغراض المؤقتة بمسوحات Poly Haven، وعدّلت الشمس وقلّلت الحصى الفاتح. الصورتان تستخدمان الكاميرا المقربة نفسها.'],
    '#motion > .prose': [
      'دوران كاميرا مدته ٤٫٥ ثانية سُجل مباشرة من لوحة الرسم بسرعة ٣٠ إطارًا في الثانية. تُعرض اللعبة بصورة مستقلة عن معدل التسجيل. ليست هذه سلسلة من الصور الثابتة التي انتُظر حتى تتقارب عيناتها.',
      'قارن الاختبار بصمات إطارات الصورة الخام في وضع الثبات، ثم حرّك الكاميرا عبر تسعة مواضع وأعادها لموضع البداية. تطابق أول إطار بعد العودة مع الإطار اللاحق تمامًا. يوضح ذلك غياب حبيبات أخذ العينات التدريجية في المشهد المختبر، لكنه لا يثبت اختفاء كل أنواع تعرج الحواف والخامات.',
      'الأداء قياس قصير في Playwright وEdge بدقة 1920 × 1080 على RTX 3080 Ti، وليس حدًا أدنى مضمونًا أو قياسًا لهاتف. <a href="./devlog/03-capture.json">اقرأ تقرير الالتقاط الخام</a>.',
    ],
    '#lighting > .prose': ['كان جو «بعد المدرسة» هو الشكل الرئيسي المقترح. النهار الهادئ يجعل قراءة الخامات أسهل. يجمع الغروب الأضواء الدافئة وشارعًا أبرد. هذه دراسات إضاءة، وليست ثلاث مراحل مكتملة.'],
    '#play > .prose': ['في النموذج الأول: اسحب البلّية الزرقاء للخلف ثم اتركها، أو اضبط الزاوية والقوة واضغط «ارمِ». أخرج الأهداف بالكامل من دائرة الطباشير. كان التدريب بلا حد للرميات، وينتهي نمط السبع رميات بعد الرمية السابعة. تعيد الجولة الجديدة ترتيب الملعب.'],
    '.play-pair .prose': [
      'يتولى Cannon-es اصطدامات الأجسام الصلبة بخطوة محاكاة ثابتة تبلغ ٢٤٠ مرة في الثانية. تظل الكاميرا قابلة للاستخدام أثناء التدحرج. أصوات التلامس مولدة، وليست تسجيلات ميدانية.',
      'اسحب الأرض الفارغة للدوران، واستخدم العجلة أو القرص بإصبعين للتقريب. أزرار الكاميرا تعطي مناظر الشارع والتصويب ومن أعلى والمقرب. Space للرمي، وR للإعادة، وH لإخفاء الواجهة. Escape أو النقر المزدوج يعيدانها.',
      'نجحت رميات الفأرة ومحاكاة اللمس في تسجيل النقاط والعودة لدور مستقر. صورة الهاتف محاكاة بدقة 390 × 844 على بطاقة كمبيوتر؛ أداء الهاتف الحقيقي يحتاج تجربة على الجهاز.',
    ],
    '#engineering details:nth-of-type(1) p': [
      'يحسب شيدر البلي تقاطعات الأشعة مع الكرات والأرض، ويفصل مساري الانعكاس والانكسار، ويستخدم أوزان فرينل والامتصاص حسب المسافة. تُحسب الألوان الداخلية بخطوات حجمية ثابتة. ميزانية الأشعة محدودة ولا يوجد أخذ عينات عشوائي لكل إطار أو تراكم زمني.',
      'هذا تتبع أشعة في شيدر GPU عبر WebGL 2، وليس وصولًا مباشرًا لأنوية RTX ولا تتبع مسارات مونت كارلو لكل المشهد.',
    ],
    '#engineering details:nth-of-type(2) p': [
      'يستخدم الشارع Three.js بخامات PBR وبيئة HDR من Poly Haven وخرائط ظل وعمق مجال مكاني ثابت. تلتقط خريطة مكعبة محلية المكان الثابت للانعكاسات والخلفية المنكسرة. تُحدّث عند تغيير الإضاءة؛ المباني البعيدة لا تُتقاطع معها الأشعة مثلثًا بمثلث.',
      'بقع الضوء الصغيرة تحت الزجاج تقريبات تحليلية وليست فوتونات متتبعة. الإضاءة المرتدة منتشرة بتقريب البيئة وأضواء الملء. كانت أرض النموذج الأصلي مسطحة فيزيائيًا مع خرائط تضاريس بصرية؛ أما الأنماط التجريبية الجديدة فتستخدم تضاريس تصادم فعلية.',
    ],
    '#engineering details:nth-of-type(3) p': [
      'هذا نموذج متصفح موسّع وليس إنتاج AAA مكتملًا. يتضمن تقدمًا قصصيًا ومنافسين مبسطين ومقدمات مترجمة وأنماط تضاريس تجريبية. لم تكتمل حركة إصبع عالية الدقة أو تمثيل صوتي مسجل أو التقاط أداء الوجه أو اللعب الجماعي أو حملة كبيرة مؤلفة يدويًا أو تسجيل أجواء شارع مصري. تحتاج مساعدة الرمية المرتدة إلى ضبط، وتحتاج المسارات إلى اختبارات توازن أوسع.',
      'تعتمد انعكاسات العالم على خريطة مكعبة، وبقع التركيز الضوئي تقريبية، وقد تظهر حدود الدقة وتعرج الحواف في التقريب الشديد. للتضاريس التجريبية تصادم وقراءة ارتفاع متطابقان، بينما الملاعب الكلاسيكية مسطحة غالبًا. لا توجد نتيجة قياس شاملة على هواتف فعلية. القواعد مقترحات للمراجعة وليست ادعاءً بأنها قواعد مصر كلها.',
    ],
    '#engineering details:nth-of-type(4) p': [
      'أصول البيئة أدناه مسوحات Poly Haven بترخيص CC0 محفوظة محليًا. يسجل بيان الأصول روابط المصدر والدقة والحجم وبصمات التحقق. الشيدر أصلي؛ ساعدت مشروعات الأشعة المرجعية في اختيار التقنية، ولم يُنسخ كودها.',
      '<a href="https://erichlof.github.io/THREE.js-RayTracing-Renderer/Ray_Tracer_Challenge.html">The Ray Tracer Challenge</a> و<a href="https://erichlof.github.io/THREE.js-PathTracing-Renderer/">THREE.js PathTracing Renderer</a> هما المرجعان اللذان اقترحتهما. يعتمد العرض على Three.js والفيزياء على Cannon-es والأيقونات على Lucide.',
    ],
    '#review > .prose': ['وافق أو ارفض أو وجّه الجولة القادمة. تُحفظ الملاحظات العامة ومراجعات التجارب داخل هذا المتصفح، ويضم التصدير كليهما. ملاحظات المرحلة ٠٣ القديمة محفوظة في مفتاح تخزين منفصل دون تغيير.'],
  };
  const originalElements = new Map();
  const originalTexts = new WeakMap();
  const originalAttributes = new WeakMap();
  let arabic = false;
  const select = document.getElementById('blog-language');
  try { arabic = localStorage.getItem('bely-language') === 'ar'; } catch { arabic = false; }
  const requested = new URLSearchParams(location.search).get('lang');
  if (requested === 'ar' || requested === 'en') arabic = requested === 'ar';

  function translateNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.parentElement?.closest('script,style,textarea,select')) continue;
      const current = node.nodeValue;
      const key = originalTexts.get(node) ?? current.trim();
      if (!(key in labels)) continue;
      if (!originalTexts.has(node)) originalTexts.set(node, key);
      const next = arabic ? labels[key] : key;
      const value = current.replace(current.trim(), next);
      if (node.nodeValue !== value) node.nodeValue = value;
    }
  }

  function apply() {
    document.documentElement.lang = arabic ? 'ar' : 'en';
    document.documentElement.dir = arabic ? 'rtl' : 'ltr';
    document.title = arabic ? 'بلي / سجل التطوير المصور' : 'BELY / Photo Dev Log';
    select.value = arabic ? 'ar' : 'en';
    for (const [selector, translations] of Object.entries(groups)) {
      document.querySelectorAll(selector).forEach((element, index) => {
        if (translations[index] === undefined) return;
        if (!originalElements.has(element)) originalElements.set(element, element.innerHTML);
        element.innerHTML = arabic ? translations[index] : originalElements.get(element);
      });
    }
    translateNodes(document.body);
    document.querySelectorAll('[aria-label],[placeholder]').forEach((element) => {
      const initial = originalAttributes.get(element) ?? {};
      for (const attribute of ['aria-label', 'placeholder']) {
        const key = initial[attribute] ?? element.getAttribute(attribute);
        if (!key) continue;
        initial[attribute] = key;
        if (key in labels) element.setAttribute(attribute, arabic ? labels[key] : key);
      }
      originalAttributes.set(element, initial);
    });
    document.querySelector('header .command.primary').href = `./index.html?scoutTheme=${document.documentElement.dataset.theme}&lang=${arabic ? 'ar' : 'en'}`;
  }
  select.addEventListener('change', () => {
    arabic = select.value === 'ar';
    try { localStorage.setItem('bely-language', arabic ? 'ar' : 'en'); } catch { document.documentElement.dataset.languageStorage = 'unavailable'; }
    const url = new URL(location.href);
    url.searchParams.set('lang', arabic ? 'ar' : 'en');
    history.replaceState(null, '', url);
    apply();
  });
  for (const id of ['save-status', 'notes-status', 'lighting-caption']) {
    const element = document.getElementById(id);
    if (element) new MutationObserver(() => translateNodes(element)).observe(element, { childList: true, characterData: true, subtree: true });
  }
  apply();
})();