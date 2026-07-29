/**
 * Site-wide translations. The five languages here mirror the bot's interface
 * languages so a user meets the same wording in the chat and on the web.
 *
 * Usage: mark an element with data-i18n="key" (text), data-i18n-html="key"
 * (trusted markup) or data-i18n-placeholder="key", then call applyI18n().
 */
const SITE_I18N = {
  en: {
    // --- shell ---
    navFeatures: "Features",
    navLanguages: "Languages",
    navHow: "How it works",
    navBots: "Bots",
    navFaq: "FAQ",
    navOpenApp: "Open the app",
    footerTagline: "Speech to text and translation for Central Asian languages.",
    footerProduct: "Product",
    footerResources: "Resources",
    footerApi: "API docs",
    footerWebTool: "Classic web tool",
    footerRights: "All rights reserved.",

    // --- landing hero ---
    heroBadge: "Kyrgyz · Tajik · Uzbek · Russian · English",
    heroTitle: "Turn speech into text — in the languages the big models forget",
    heroSubtitle:
      "Upload audio or video, or paste a YouTube, TikTok or Instagram Reels link. Get an accurate transcript with timecodes, and a translation that keeps the meaning intact.",
    heroCta: "Try it in the browser",
    heroCtaTelegram: "Open in Telegram",
    heroCtaWhatsApp: "Open in WhatsApp",
    heroNote: "No sign-up. Files up to 25 MB.",

    // --- features ---
    featuresTitle: "What it does",
    featuresSubtitle: "Everything the bots can do, available here too.",
    f1Title: "Speech recognition",
    f1Body:
      "Open-source models tuned per language: GigaAM for Kyrgyz, Uzbek and Russian, fine-tuned Whisper for Tajik and English.",
    f2Title: "Runs on our own servers",
    f2Body:
      "Transcription happens locally on our hardware, not on a third-party speech API. Your file leaves the server as text.",
    f3Title: "Media links",
    f3Body: "Paste a YouTube, TikTok or Instagram Reels link and the audio is fetched and transcribed for you.",
    f4Title: "Timecoded segments",
    f4Body: "Every result comes with per-segment timings — export as TXT, SRT or WebVTT for subtitles.",
    f5Title: "Careful translation",
    f5Body:
      "A strict prompt forbids summarising, merging sentences or inventing names, and a second pass reviews the result for leftovers.",
    f6Title: "Five interface languages",
    f6Body: "The web app and both bots speak Kyrgyz, Tajik, Uzbek, Russian and English.",

    // --- languages ---
    langsTitle: "Supported languages",
    langsSubtitle: "Transcription and translation, in any direction between these.",
    langTranscribe: "Transcription",
    langTranslate: "Translation",
    langEngine: "Engine",
    langKy: "Kyrgyz",
    langTg: "Tajik",
    langUz: "Uzbek",
    langRu: "Russian",
    langEn: "English",
    langUzCyrl: "Uzbek (Cyrillic)",
    langTargetOnly: "Translation target only",

    // --- how ---
    howTitle: "How it works",
    how1Title: "Send the audio",
    how1Body: "Upload a file, drop in a media link, or send a voice message to the bot.",
    how2Title: "Pick the languages",
    how2Body: "Choose what language is spoken and, if you want, what language to translate into.",
    how3Title: "Get the text",
    how3Body: "Read it in the browser, copy it, or download it as TXT, SRT or WebVTT.",

    // --- bots ---
    botsTitle: "Prefer a chat?",
    botsSubtitle: "The same engine, in the messenger you already use.",
    botTelegramBody: "Send a voice message, a file or a link. Buttons for languages, results as a file.",
    botWhatsAppBody: "Works the same way on WhatsApp: send media or a link and pick languages from the list.",
    botOpen: "Open",
    botSoon: "Coming soon",

    // --- faq ---
    faqTitle: "Questions",
    faq1Q: "How accurate is it?",
    faq1A:
      "It depends heavily on the language and the recording. Tajik and Uzbek are strong on clear speech; Kyrgyz on real-world audio is still the hardest case and we keep working on it. Always read the result before relying on it.",
    faq2Q: "What happens to my file?",
    faq2A:
      "It is processed on our servers and deleted after the job. The resulting text is stored so you can quote a request number when reporting a problem.",
    faq3Q: "Is there a size or length limit?",
    faq3A: "Uploads are capped at 25 MB. Long recordings are split into chunks automatically, so duration is not the limit — file size is.",
    faq4Q: "Can I edit the transcript?",
    faq4A: "Download it as TXT or SRT and edit it in any editor. In-browser editing is not available yet.",
    faq5Q: "Why does the translation sometimes keep a word untranslated?",
    faq5A:
      "Names, brands and technical terms are deliberately preserved. A review pass flags accidental leftovers, but it errs on the side of not rewriting your text.",

    // --- app page ---
    appTitle: "TilTap",
    appSubtitle: "Transcribe and translate",
    tabUpload: "Upload file",
    tabLink: "Media link",
    tabText: "Translate text",
    sourceLangLabel: "Spoken language",
    targetLangLabel: "Translate into",
    autoDetect: "Auto detect",
    noTranslation: "No translation",
    dropzoneTitle: "Drop audio or video here",
    dropzoneHint: "or click to choose a file — max 25 MB",
    linkLabel: "YouTube, TikTok or Instagram Reels link",
    textLabel: "Text to translate",
    textPlaceholder: "Paste the text you want translated…",
    startBtn: "Start",
    cancelBtn: "Cancel",
    progressStarting: "Starting…",
    resultTranscription: "Transcription",
    resultTranslation: "Translation",
    copyBtn: "Copy",
    copied: "Copied",
    downloadTxt: "TXT",
    downloadSrt: "SRT",
    downloadVtt: "VTT",
    segmentsTitle: "Timed segments",
    segmentsShow: "Show timecodes",
    segmentsHide: "Hide timecodes",
    originalTitle: "Original transcription",
    translateAgain: "Translate into:",
    metaDetected: "Detected",
    metaSegments: "Segments",
    metaRequest: "Request",
    newJobBtn: "Start another",

    // --- feedback ---
    fbTitle: "Was this useful?",
    fbGood: "Good",
    fbBad: "Poor",
    fbReport: "Report a problem",
    fbReason: "What went wrong?",
    fbStt: "Bad transcription",
    fbTranslation: "Bad translation",
    fbDownload: "Download problem",
    fbSpeed: "Too slow",
    fbOther: "Other",
    fbComment: "Add details (optional)",
    fbReportPlaceholder: "What happened, and what did you expect?",
    fbSend: "Send",
    fbThanks: "Thanks — this goes straight to the team.",

    // --- errors ---
    errSelectFile: "Choose a file first.",
    errFileTooLarge: "That file is {size} MB. The limit is 25 MB.",
    errEnterUrl: "Paste a link first.",
    errEnterText: "Enter some text first.",
    errChooseTarget: "Choose a language to translate into.",
    errUnsupportedUrl: "Only YouTube, TikTok and Instagram Reels links are supported.",
    errUpload: "Upload failed. Check your connection and try again.",
    errTimeout: "The request timed out. Try a smaller file.",
    errJobFailed: "The job failed.",
    errTranslation: "Translation failed.",
    errNetwork: "Network error. Please try again.",
  },

  ru: {
    navFeatures: "Возможности",
    navLanguages: "Языки",
    navHow: "Как это работает",
    navBots: "Боты",
    navFaq: "Вопросы",
    navOpenApp: "Открыть приложение",
    footerTagline: "Расшифровка речи и перевод для языков Центральной Азии.",
    footerProduct: "Продукт",
    footerResources: "Ресурсы",
    footerApi: "Документация API",
    footerWebTool: "Классический веб-инструмент",
    footerRights: "Все права защищены.",

    heroBadge: "Кыргызский · Таджикский · Узбекский · Русский · Английский",
    heroTitle: "Речь в текст — на языках, о которых забывают большие модели",
    heroSubtitle:
      "Загрузите аудио или видео либо вставьте ссылку на YouTube, TikTok или Instagram Reels. Получите точную расшифровку с таймкодами и перевод, который сохраняет смысл.",
    heroCta: "Попробовать в браузере",
    heroCtaTelegram: "Открыть в Telegram",
    heroCtaWhatsApp: "Открыть в WhatsApp",
    heroNote: "Без регистрации. Файлы до 25 МБ.",

    featuresTitle: "Что умеет",
    featuresSubtitle: "Всё, что делают боты, доступно и здесь.",
    f1Title: "Распознавание речи",
    f1Body:
      "Открытые модели под каждый язык: GigaAM для кыргызского, узбекского и русского, дообученный Whisper для таджикского и английского.",
    f2Title: "Работает на своих серверах",
    f2Body:
      "Распознавание идёт локально на нашем оборудовании, а не через сторонний речевой API. Файл покидает сервер только в виде текста.",
    f3Title: "Ссылки на видео",
    f3Body: "Вставьте ссылку на YouTube, TikTok или Instagram Reels — звук скачается и расшифруется автоматически.",
    f4Title: "Сегменты с таймкодами",
    f4Body: "К каждому результату прилагаются тайминги по сегментам — экспорт в TXT, SRT или WebVTT для субтитров.",
    f5Title: "Аккуратный перевод",
    f5Body:
      "Строгий промпт запрещает пересказ, склейку предложений и выдумывание имён, а вторая проверка ищет оставшиеся ошибки.",
    f6Title: "Пять языков интерфейса",
    f6Body: "Веб-приложение и оба бота говорят на кыргызском, таджикском, узбекском, русском и английском.",

    langsTitle: "Поддерживаемые языки",
    langsSubtitle: "Расшифровка и перевод в любом направлении между ними.",
    langTranscribe: "Расшифровка",
    langTranslate: "Перевод",
    langEngine: "Движок",
    langKy: "Кыргызский",
    langTg: "Таджикский",
    langUz: "Узбекский",
    langRu: "Русский",
    langEn: "Английский",
    langUzCyrl: "Узбекский (кириллица)",
    langTargetOnly: "Только как язык перевода",

    howTitle: "Как это работает",
    how1Title: "Отправьте звук",
    how1Body: "Загрузите файл, вставьте ссылку или отправьте голосовое сообщение боту.",
    how2Title: "Выберите языки",
    how2Body: "Укажите, на каком языке говорят, и при желании — на какой перевести.",
    how3Title: "Заберите текст",
    how3Body: "Читайте в браузере, копируйте или скачивайте в TXT, SRT или WebVTT.",

    botsTitle: "Удобнее в мессенджере?",
    botsSubtitle: "Тот же движок — там, где вы уже переписываетесь.",
    botTelegramBody: "Отправьте голосовое, файл или ссылку. Кнопки для выбора языков, результат — файлом.",
    botWhatsAppBody: "В WhatsApp всё так же: отправьте медиа или ссылку и выберите языки из списка.",
    botOpen: "Открыть",
    botSoon: "Скоро",

    faqTitle: "Вопросы",
    faq1Q: "Насколько это точно?",
    faq1A:
      "Сильно зависит от языка и качества записи. Таджикский и узбекский хорошо работают на чистой речи; кыргызский на реальных записях пока самый сложный случай, и мы над ним работаем. Всегда перечитывайте результат.",
    faq2Q: "Что происходит с моим файлом?",
    faq2A:
      "Он обрабатывается на наших серверах и удаляется после задачи. Текст сохраняется, чтобы вы могли сослаться на номер запроса при обращении.",
    faq3Q: "Есть ли ограничения по размеру?",
    faq3A: "Загрузка — до 25 МБ. Длинные записи автоматически режутся на части, так что ограничение по размеру, а не по длительности.",
    faq4Q: "Можно ли редактировать расшифровку?",
    faq4A: "Скачайте TXT или SRT и правьте в любом редакторе. Редактирование прямо в браузере пока недоступно.",
    faq5Q: "Почему в переводе иногда остаются непереведённые слова?",
    faq5A:
      "Имена, бренды и технические термины сохраняются намеренно. Проверка отмечает случайные пропуски, но старается не переписывать ваш текст.",

    appTitle: "TilTap",
    appSubtitle: "Расшифровка и перевод",
    tabUpload: "Загрузить файл",
    tabLink: "Ссылка на видео",
    tabText: "Перевести текст",
    sourceLangLabel: "Язык записи",
    targetLangLabel: "Перевести на",
    autoDetect: "Автоопределение",
    noTranslation: "Без перевода",
    dropzoneTitle: "Перетащите аудио или видео",
    dropzoneHint: "или нажмите, чтобы выбрать файл — до 25 МБ",
    linkLabel: "Ссылка на YouTube, TikTok или Instagram Reels",
    textLabel: "Текст для перевода",
    textPlaceholder: "Вставьте текст, который нужно перевести…",
    startBtn: "Начать",
    cancelBtn: "Отмена",
    progressStarting: "Запуск…",
    resultTranscription: "Расшифровка",
    resultTranslation: "Перевод",
    copyBtn: "Копировать",
    copied: "Скопировано",
    downloadTxt: "TXT",
    downloadSrt: "SRT",
    downloadVtt: "VTT",
    segmentsTitle: "Сегменты с таймкодами",
    segmentsShow: "Показать таймкоды",
    segmentsHide: "Скрыть таймкоды",
    originalTitle: "Исходная расшифровка",
    translateAgain: "Перевести на:",
    metaDetected: "Определён",
    metaSegments: "Сегментов",
    metaRequest: "Запрос",
    newJobBtn: "Ещё одна задача",

    fbTitle: "Результат помог?",
    fbGood: "Хорошо",
    fbBad: "Плохо",
    fbReport: "Сообщить о проблеме",
    fbReason: "Что пошло не так?",
    fbStt: "Плохая расшифровка",
    fbTranslation: "Плохой перевод",
    fbDownload: "Проблема со скачиванием",
    fbSpeed: "Слишком медленно",
    fbOther: "Другое",
    fbComment: "Добавьте детали (необязательно)",
    fbReportPlaceholder: "Что произошло и что вы ожидали?",
    fbSend: "Отправить",
    fbThanks: "Спасибо — отзыв уходит команде.",

    errSelectFile: "Сначала выберите файл.",
    errFileTooLarge: "Файл весит {size} МБ. Лимит — 25 МБ.",
    errEnterUrl: "Вставьте ссылку.",
    errEnterText: "Введите текст.",
    errChooseTarget: "Выберите язык перевода.",
    errUnsupportedUrl: "Поддерживаются только ссылки YouTube, TikTok и Instagram Reels.",
    errUpload: "Не удалось загрузить. Проверьте соединение и попробуйте снова.",
    errTimeout: "Время ожидания истекло. Попробуйте файл поменьше.",
    errJobFailed: "Задача завершилась ошибкой.",
    errTranslation: "Не удалось перевести.",
    errNetwork: "Ошибка сети. Попробуйте ещё раз.",
  },

  ky: {
    navFeatures: "Мүмкүнчүлүктөр",
    navLanguages: "Тилдер",
    navHow: "Кантип иштейт",
    navBots: "Боттор",
    navFaq: "Суроолор",
    navOpenApp: "Колдонмону ачуу",
    footerTagline: "Борбор Азия тилдери үчүн кепти текстке айлантуу жана которуу.",
    footerProduct: "Продукт",
    footerResources: "Ресурстар",
    footerApi: "API документациясы",
    footerWebTool: "Классикалык веб-курал",
    footerRights: "Бардык укуктар корголгон.",

    heroBadge: "Кыргызча · Тоҷикӣ · Ўзбекча · Русча · Англисче",
    heroTitle: "Кепти текстке айлантабыз — чоң моделдер унутуп калган тилдерде",
    heroSubtitle:
      "Аудио же видео жүктөңүз же YouTube, TikTok, Instagram Reels шилтемесин коюңуз. Таймкоддору менен так текст жана маанисин сактаган котормо алыңыз.",
    heroCta: "Браузерде байкап көрүү",
    heroCtaTelegram: "Telegram'да ачуу",
    heroCtaWhatsApp: "WhatsApp'та ачуу",
    heroNote: "Каттоосуз. Файлдар 25 МБ чейин.",

    featuresTitle: "Эмне кыла алат",
    featuresSubtitle: "Ботторлдогу бардык мүмкүнчүлүктөр бул жерде да бар.",
    f1Title: "Кепти таануу",
    f1Body:
      "Ар бир тилге ылайыкталган ачык моделдер: кыргыз, өзбек жана орус үчүн GigaAM, тажик жана англис үчүн Whisper.",
    f2Title: "Өз серверлерибизде",
    f2Body:
      "Таануу бөтөн кеп API'си аркылуу эмес, өз жабдыгыбызда жүрөт. Файл серверден текст түрүндө гана чыгат.",
    f3Title: "Видео шилтемелери",
    f3Body: "YouTube, TikTok же Instagram Reels шилтемесин коюңуз — үн автоматтык түрдө алынып, текстке айланат.",
    f4Title: "Таймкоддуу сегменттер",
    f4Body: "Ар бир натыйжада сегменттер боюнча убакыт бар — субтитр үчүн TXT, SRT же WebVTT форматында сактаңыз.",
    f5Title: "Кылдат котормо",
    f5Body:
      "Катуу эрежелер кыскартууга, сүйлөмдөрдү бириктирүүгө жана ат ойлоп чыгарууга тыюу салат, экинчи текшерүү калган каталарды издейт.",
    f6Title: "Беш интерфейс тили",
    f6Body: "Веб-колдонмо жана эки бот тең кыргыз, тажик, өзбек, орус жана англис тилинде сүйлөйт.",

    langsTitle: "Колдоого алынган тилдер",
    langsSubtitle: "Расшифровка жана котормо — булардын ортосунда каалаган багытта.",
    langTranscribe: "Расшифровка",
    langTranslate: "Котормо",
    langEngine: "Модель",
    langKy: "Кыргызча",
    langTg: "Тажикче",
    langUz: "Өзбекче",
    langRu: "Орусча",
    langEn: "Англисче",
    langUzCyrl: "Өзбекче (кирилл)",
    langTargetOnly: "Котормо тили катары гана",

    howTitle: "Кантип иштейт",
    how1Title: "Үндү жибериңиз",
    how1Body: "Файл жүктөңүз, шилтеме коюңуз же ботко үн кат жибериңиз.",
    how2Title: "Тилдерди тандаңыз",
    how2Body: "Кайсы тилде сүйлөшүп жатканын, кааласаңыз кайсы тилге которууну белгилеңиз.",
    how3Title: "Текстти алыңыз",
    how3Body: "Браузерден окуңуз, көчүрүңүз же TXT, SRT, WebVTT форматында жүктөп алыңыз.",

    botsTitle: "Мессенджер ыңгайлуубу?",
    botsSubtitle: "Ошол эле модель — сиз колдонгон мессенджерде.",
    botTelegramBody: "Үн кат, файл же шилтеме жибериңиз. Тилдер кнопкалар менен, натыйжа файл менен.",
    botWhatsAppBody: "WhatsApp'та да ушундай: медиа же шилтеме жиберип, тизмеден тилдерди тандаңыз.",
    botOpen: "Ачуу",
    botSoon: "Жакында",

    faqTitle: "Суроолор",
    faq1Q: "Тактыгы кандай?",
    faq1A:
      "Тилге жана жазуунун сапатына көз каранды. Тажик жана өзбек тилдери таза кепте жакшы иштейт; кыргызча реалдуу жазууларда эң кыйын учур бойдон калууда, биз үстүндө иштеп жатабыз. Натыйжаны дайыма окуп чыгыңыз.",
    faq2Q: "Менин файлым эмне болот?",
    faq2A:
      "Ал биздин серверде иштетилип, тапшырмадан кийин өчүрүлөт. Текст сакталат — көйгөй жөнүндө айтканда сурам номерин көрсөтө аласыз.",
    faq3Q: "Өлчөм чектөөсү барбы?",
    faq3A: "Жүктөө — 25 МБ чейин. Узун жазуулар автоматтык түрдө бөлүнөт, ошондуктан чектөө узактыкта эмес, өлчөмдө.",
    faq4Q: "Текстти оңдой аламбы?",
    faq4A: "TXT же SRT жүктөп алып, каалаган редактордо оңдоңуз. Браузерде оңдоо азырынча жок.",
    faq5Q: "Эмне үчүн котормодо кээде которулбаган сөздөр калат?",
    faq5A:
      "Аттар, бренддер жана техникалык терминдер атайын сакталат. Текшерүү кокус калгандарын белгилейт, бирок текстиңизди кайра жазбоого аракет кылат.",

    appTitle: "TilTap",
    appSubtitle: "Расшифровка жана котормо",
    tabUpload: "Файл жүктөө",
    tabLink: "Видео шилтемеси",
    tabText: "Текст которуу",
    sourceLangLabel: "Жазуунун тили",
    targetLangLabel: "Кайсы тилге",
    autoDetect: "Автоаныктоо",
    noTranslation: "Котормосуз",
    dropzoneTitle: "Аудио же видеону бул жерге таштаңыз",
    dropzoneHint: "же басып файл тандаңыз — 25 МБ чейин",
    linkLabel: "YouTube, TikTok же Instagram Reels шилтемеси",
    textLabel: "Которулуучу текст",
    textPlaceholder: "Которгуңуз келген текстти коюңуз…",
    startBtn: "Баштоо",
    cancelBtn: "Жокко чыгаруу",
    progressStarting: "Башталууда…",
    resultTranscription: "Расшифровка",
    resultTranslation: "Котормо",
    copyBtn: "Көчүрүү",
    copied: "Көчүрүлдү",
    downloadTxt: "TXT",
    downloadSrt: "SRT",
    downloadVtt: "VTT",
    segmentsTitle: "Таймкоддуу сегменттер",
    segmentsShow: "Таймкоддорду көрсөтүү",
    segmentsHide: "Таймкоддорду жашыруу",
    originalTitle: "Баштапкы расшифровка",
    translateAgain: "Которуу:",
    metaDetected: "Аныкталды",
    metaSegments: "Сегменттер",
    metaRequest: "Сурам",
    newJobBtn: "Дагы бирөө",

    fbTitle: "Натыйжа пайдалуу болдубу?",
    fbGood: "Жакшы",
    fbBad: "Начар",
    fbReport: "Көйгөй жөнүндө айтуу",
    fbReason: "Эмне туура болбоду?",
    fbStt: "Начар расшифровка",
    fbTranslation: "Начар котормо",
    fbDownload: "Жүктөө көйгөйү",
    fbSpeed: "Өтө жай",
    fbOther: "Башка",
    fbComment: "Кошумча маалымат (милдеттүү эмес)",
    fbReportPlaceholder: "Эмне болду жана эмнени күттүңүз?",
    fbSend: "Жиберүү",
    fbThanks: "Рахмат — пикириңиз командага жетти.",

    errSelectFile: "Адегенде файл тандаңыз.",
    errFileTooLarge: "Файл {size} МБ. Чеги — 25 МБ.",
    errEnterUrl: "Шилтемени коюңуз.",
    errEnterText: "Текст киргизиңиз.",
    errChooseTarget: "Котормо тилин тандаңыз.",
    errUnsupportedUrl: "YouTube, TikTok жана Instagram Reels шилтемелери гана колдоого алынат.",
    errUpload: "Жүктөө ишке ашкан жок. Байланышты текшерип, кайра аракет кылыңыз.",
    errTimeout: "Убакыт бүттү. Кичирээк файл менен аракет кылыңыз.",
    errJobFailed: "Тапшырма ката менен аяктады.",
    errTranslation: "Которуу ишке ашкан жок.",
    errNetwork: "Тармак катасы. Кайра аракет кылыңыз.",
  },

  tg: {
    navFeatures: "Имкониятҳо",
    navLanguages: "Забонҳо",
    navHow: "Чӣ тавр кор мекунад",
    navBots: "Ботҳо",
    navFaq: "Саволҳо",
    navOpenApp: "Кушодани барнома",
    footerTagline: "Табдили нутқ ба матн ва тарҷума барои забонҳои Осиёи Марказӣ.",
    footerProduct: "Маҳсулот",
    footerResources: "Захираҳо",
    footerApi: "Ҳуҷҷатҳои API",
    footerWebTool: "Абзори классикии веб",
    footerRights: "Ҳамаи ҳуқуқҳо ҳифз шудаанд.",

    heroBadge: "Қирғизӣ · Тоҷикӣ · Ӯзбекӣ · Русӣ · Англисӣ",
    heroTitle: "Нутқро ба матн табдил медиҳем — дар забонҳое, ки моделҳои калон фаромӯш мекунанд",
    heroSubtitle:
      "Аудио ё видео бор кунед ё пайванди YouTube, TikTok, Instagram Reels гузоред. Матни дақиқ бо тамғаи вақт ва тарҷумае, ки маъноро нигоҳ медорад, гиред.",
    heroCta: "Дар браузер санҷед",
    heroCtaTelegram: "Кушодан дар Telegram",
    heroCtaWhatsApp: "Кушодан дар WhatsApp",
    heroNote: "Бе бақайдгирӣ. Файлҳо то 25 МБ.",

    featuresTitle: "Чӣ кор мекунад",
    featuresSubtitle: "Ҳар он чи ботҳо мекунанд, дар ин ҷо низ дастрас аст.",
    f1Title: "Шинохти нутқ",
    f1Body:
      "Моделҳои кушода барои ҳар забон: GigaAM барои қирғизӣ, ӯзбекӣ ва русӣ, Whisper-и такмилёфта барои тоҷикӣ ва англисӣ.",
    f2Title: "Дар серверҳои худамон",
    f2Body:
      "Шинохт дар таҷҳизоти худи мо иҷро мешавад, на тавассути API-и бегона. Файл серверро танҳо ҳамчун матн тарк мекунад.",
    f3Title: "Пайвандҳои видео",
    f3Body: "Пайванди YouTube, TikTok ё Instagram Reels гузоред — садо худкор гирифта ва матн карда мешавад.",
    f4Title: "Порчаҳо бо вақт",
    f4Body: "Ҳар натиҷа бо вақти ҳар порча меояд — содирот ба TXT, SRT ё WebVTT барои зернавис.",
    f5Title: "Тарҷумаи дақиқ",
    f5Body:
      "Дастури қатъӣ хулосакунӣ, якҷоякунии ҷумлаҳо ва ихтироъи номҳоро манъ мекунад, санҷиши дуюм боқимондаҳоро меёбад.",
    f6Title: "Панҷ забони интерфейс",
    f6Body: "Барномаи веб ва ҳар ду бот бо қирғизӣ, тоҷикӣ, ӯзбекӣ, русӣ ва англисӣ гап мезананд.",

    langsTitle: "Забонҳои дастгиришаванда",
    langsSubtitle: "Матнкунӣ ва тарҷума дар ҳар самт байни инҳо.",
    langTranscribe: "Матнкунӣ",
    langTranslate: "Тарҷума",
    langEngine: "Модел",
    langKy: "Қирғизӣ",
    langTg: "Тоҷикӣ",
    langUz: "Ӯзбекӣ",
    langRu: "Русӣ",
    langEn: "Англисӣ",
    langUzCyrl: "Ӯзбекӣ (кирилл)",
    langTargetOnly: "Танҳо ҳамчун забони тарҷума",

    howTitle: "Чӣ тавр кор мекунад",
    how1Title: "Садоро фиристед",
    how1Body: "Файл бор кунед, пайванд гузоред ё ба бот паёми савтӣ фиристед.",
    how2Title: "Забонҳоро интихоб кунед",
    how2Body: "Нишон диҳед бо кадом забон гап мезананд ва, агар хоҳед, ба кадом забон тарҷума кунем.",
    how3Title: "Матнро гиред",
    how3Body: "Дар браузер хонед, нусхабардорӣ кунед ё ҳамчун TXT, SRT, WebVTT боргирӣ кунед.",

    botsTitle: "Дар мессенҷер қулайтар аст?",
    botsSubtitle: "Ҳамон модел — дар ҷое ки шумо аллакай менависед.",
    botTelegramBody: "Паёми савтӣ, файл ё пайванд фиристед. Забонҳо бо тугмаҳо, натиҷа бо файл.",
    botWhatsAppBody: "Дар WhatsApp низ ҳамин тавр: медиа ё пайванд фиристед ва забонҳоро аз рӯйхат интихоб кунед.",
    botOpen: "Кушодан",
    botSoon: "Ба зудӣ",

    faqTitle: "Саволҳо",
    faq1Q: "Дақиқияш чӣ гуна аст?",
    faq1A:
      "Ба забон ва сифати сабт вобаста аст. Тоҷикӣ ва ӯзбекӣ дар нутқи тоза хубанд; қирғизӣ дар сабтҳои воқеӣ то ҳол мушкилтарин ҳолат аст ва мо болои он кор карда истодаем. Натиҷаро ҳамеша бихонед.",
    faq2Q: "Бо файли ман чӣ мешавад?",
    faq2A:
      "Он дар серверҳои мо коркард шуда, пас аз кор нест мешавад. Матн нигоҳ дошта мешавад, то ҳангоми шикоят рақами дархостро нишон диҳед.",
    faq3Q: "Маҳдудияти андоза ҳаст?",
    faq3A: "Боргузорӣ то 25 МБ. Сабтҳои дароз худкор ба пораҳо тақсим мешаванд, пас маҳдудият дар андоза аст, на дар давомнокӣ.",
    faq4Q: "Метавонам матнро таҳрир кунам?",
    faq4A: "TXT ё SRT боргирӣ кунед ва дар ҳар муҳаррир таҳрир кунед. Таҳрир дар браузер ҳанӯз нест.",
    faq5Q: "Чаро дар тарҷума баъзан калимаҳои тарҷуманашуда мемонанд?",
    faq5A:
      "Номҳо, брендҳо ва истилоҳоти техникӣ дидаву дониста нигоҳ дошта мешаванд. Санҷиш боқимондаҳои тасодуфиро қайд мекунад, вале матни шуморо аз нав наменависад.",

    appTitle: "TilTap",
    appSubtitle: "Матнкунӣ ва тарҷума",
    tabUpload: "Боркунии файл",
    tabLink: "Пайванди видео",
    tabText: "Тарҷумаи матн",
    sourceLangLabel: "Забони сабт",
    targetLangLabel: "Тарҷума ба",
    autoDetect: "Худкор муайян",
    noTranslation: "Бе тарҷума",
    dropzoneTitle: "Аудио ё видеоро ин ҷо гузоред",
    dropzoneHint: "ё зер кунед, то файл интихоб кунед — то 25 МБ",
    linkLabel: "Пайванди YouTube, TikTok ё Instagram Reels",
    textLabel: "Матн барои тарҷума",
    textPlaceholder: "Матнеро, ки мехоҳед тарҷума шавад, гузоред…",
    startBtn: "Оғоз",
    cancelBtn: "Бекор",
    progressStarting: "Оғоз…",
    resultTranscription: "Матн",
    resultTranslation: "Тарҷума",
    copyBtn: "Нусха",
    copied: "Нусха гирифта шуд",
    downloadTxt: "TXT",
    downloadSrt: "SRT",
    downloadVtt: "VTT",
    segmentsTitle: "Порчаҳо бо вақт",
    segmentsShow: "Нишон додани вақтҳо",
    segmentsHide: "Пинҳон кардани вақтҳо",
    originalTitle: "Матни аслӣ",
    translateAgain: "Тарҷума ба:",
    metaDetected: "Муайян шуд",
    metaSegments: "Порчаҳо",
    metaRequest: "Дархост",
    newJobBtn: "Боз як кор",

    fbTitle: "Натиҷа фоидаовар буд?",
    fbGood: "Хуб",
    fbBad: "Бад",
    fbReport: "Хабар додан дар бораи мушкил",
    fbReason: "Чӣ нодуруст шуд?",
    fbStt: "Матни бад",
    fbTranslation: "Тарҷумаи бад",
    fbDownload: "Мушкили боргирӣ",
    fbSpeed: "Хеле суст",
    fbOther: "Дигар",
    fbComment: "Тафсилот илова кунед (ихтиёрӣ)",
    fbReportPlaceholder: "Чӣ шуд ва шумо чиро интизор будед?",
    fbSend: "Фиристодан",
    fbThanks: "Ташаккур — фикри шумо ба даста расид.",

    errSelectFile: "Аввал файл интихоб кунед.",
    errFileTooLarge: "Файл {size} МБ аст. Ҳадди ниҳоӣ 25 МБ.",
    errEnterUrl: "Пайвандро гузоред.",
    errEnterText: "Матн ворид кунед.",
    errChooseTarget: "Забони тарҷумаро интихоб кунед.",
    errUnsupportedUrl: "Танҳо пайвандҳои YouTube, TikTok ва Instagram Reels дастгирӣ мешаванд.",
    errUpload: "Боркунӣ иҷро нашуд. Пайвастро санҷед ва боз кӯшиш кунед.",
    errTimeout: "Вақт тамом шуд. Бо файли хурдтар кӯшиш кунед.",
    errJobFailed: "Кор бо хато анҷом ёфт.",
    errTranslation: "Тарҷума иҷро нашуд.",
    errNetwork: "Хатои шабака. Боз кӯшиш кунед.",
  },

  uz: {
    navFeatures: "Imkoniyatlar",
    navLanguages: "Tillar",
    navHow: "Qanday ishlaydi",
    navBots: "Botlar",
    navFaq: "Savollar",
    navOpenApp: "Ilovani ochish",
    footerTagline: "Markaziy Osiyo tillari uchun nutqni matnga aylantirish va tarjima.",
    footerProduct: "Mahsulot",
    footerResources: "Resurslar",
    footerApi: "API hujjatlari",
    footerWebTool: "Klassik veb-vosita",
    footerRights: "Barcha huquqlar himoyalangan.",

    heroBadge: "Qirg'izcha · Tojikcha · O'zbekcha · Ruscha · Inglizcha",
    heroTitle: "Nutqni matnga aylantiramiz — katta modellar unutgan tillarda",
    heroSubtitle:
      "Audio yoki video yuklang yoki YouTube, TikTok, Instagram Reels havolasini qo'ying. Vaqt belgilari bilan aniq matn va ma'noni saqlagan tarjima oling.",
    heroCta: "Brauzerda sinab ko'rish",
    heroCtaTelegram: "Telegram'da ochish",
    heroCtaWhatsApp: "WhatsApp'da ochish",
    heroNote: "Ro'yxatdan o'tmasdan. Fayllar 25 MB gacha.",

    featuresTitle: "Nima qila oladi",
    featuresSubtitle: "Botlar qiladigan hamma narsa shu yerda ham bor.",
    f1Title: "Nutqni tanish",
    f1Body:
      "Har bir tilga moslangan ochiq modellar: qirg'iz, o'zbek va rus uchun GigaAM, tojik va ingliz uchun qayta o'qitilgan Whisper.",
    f2Title: "O'z serverlarimizda",
    f2Body:
      "Tanish begona nutq API'si orqali emas, o'z jihozimizda bajariladi. Fayl serverdan faqat matn sifatida chiqadi.",
    f3Title: "Video havolalar",
    f3Body: "YouTube, TikTok yoki Instagram Reels havolasini qo'ying — ovoz avtomatik olinadi va matnga aylanadi.",
    f4Title: "Vaqt belgili bo'laklar",
    f4Body: "Har bir natijada bo'laklar bo'yicha vaqt bor — subtitr uchun TXT, SRT yoki WebVTT ko'rinishida saqlang.",
    f5Title: "Ehtiyotkor tarjima",
    f5Body:
      "Qat'iy ko'rsatma qisqartirish, gaplarni birlashtirish va ism to'qishni taqiqlaydi, ikkinchi tekshiruv qolgan xatolarni qidiradi.",
    f6Title: "Beshta interfeys tili",
    f6Body: "Veb-ilova va ikkala bot ham qirg'iz, tojik, o'zbek, rus va ingliz tilida gapiradi.",

    langsTitle: "Qo'llab-quvvatlanadigan tillar",
    langsSubtitle: "Matnga aylantirish va tarjima — ular orasida istalgan yo'nalishda.",
    langTranscribe: "Matnga aylantirish",
    langTranslate: "Tarjima",
    langEngine: "Model",
    langKy: "Qirg'izcha",
    langTg: "Tojikcha",
    langUz: "O'zbekcha",
    langRu: "Ruscha",
    langEn: "Inglizcha",
    langUzCyrl: "O'zbekcha (kirill)",
    langTargetOnly: "Faqat tarjima tili sifatida",

    howTitle: "Qanday ishlaydi",
    how1Title: "Ovozni yuboring",
    how1Body: "Fayl yuklang, havola qo'ying yoki botga ovozli xabar yuboring.",
    how2Title: "Tillarni tanlang",
    how2Body: "Qaysi tilda gapirilayotganini, xohlasangiz qaysi tilga tarjima qilishni belgilang.",
    how3Title: "Matnni oling",
    how3Body: "Brauzerda o'qing, nusxalang yoki TXT, SRT, WebVTT sifatida yuklab oling.",

    botsTitle: "Messenjerda qulayroqmi?",
    botsSubtitle: "O'sha model — siz allaqachon yozayotgan joyda.",
    botTelegramBody: "Ovozli xabar, fayl yoki havola yuboring. Tillar tugmalar bilan, natija fayl bilan.",
    botWhatsAppBody: "WhatsApp'da ham xuddi shunday: media yoki havola yuboring va ro'yxatdan tillarni tanlang.",
    botOpen: "Ochish",
    botSoon: "Tez orada",

    faqTitle: "Savollar",
    faq1Q: "Aniqligi qanday?",
    faq1A:
      "Til va yozuv sifatiga juda bog'liq. Tojik va o'zbek toza nutqda yaxshi ishlaydi; qirg'izcha real yozuvlarda hali eng qiyin holat va biz ustida ishlayapmiz. Natijani doim o'qib chiqing.",
    faq2Q: "Faylimga nima bo'ladi?",
    faq2A:
      "U serverlarimizda qayta ishlanadi va vazifadan keyin o'chiriladi. Matn saqlanadi — muammo haqida yozganda so'rov raqamini ko'rsatishingiz mumkin.",
    faq3Q: "Hajm cheklovi bormi?",
    faq3A: "Yuklash — 25 MB gacha. Uzun yozuvlar avtomatik bo'laklarga bo'linadi, shuning uchun cheklov hajmda, davomiylikda emas.",
    faq4Q: "Matnni tahrirlash mumkinmi?",
    faq4A: "TXT yoki SRT yuklab oling va istalgan muharrirda tahrirlang. Brauzerda tahrirlash hozircha yo'q.",
    faq5Q: "Nega tarjimada ba'zan tarjima qilinmagan so'zlar qoladi?",
    faq5A:
      "Ismlar, brendlar va texnik atamalar ataylab saqlanadi. Tekshiruv tasodifiy qolganlarini belgilaydi, lekin matningizni qayta yozmaslikka harakat qiladi.",

    appTitle: "TilTap",
    appSubtitle: "Matnga aylantirish va tarjima",
    tabUpload: "Fayl yuklash",
    tabLink: "Video havola",
    tabText: "Matn tarjimasi",
    sourceLangLabel: "Yozuv tili",
    targetLangLabel: "Tarjima tili",
    autoDetect: "Avto aniqlash",
    noTranslation: "Tarjimasiz",
    dropzoneTitle: "Audio yoki videoni shu yerga tashlang",
    dropzoneHint: "yoki bosib fayl tanlang — 25 MB gacha",
    linkLabel: "YouTube, TikTok yoki Instagram Reels havolasi",
    textLabel: "Tarjima uchun matn",
    textPlaceholder: "Tarjima qilinishi kerak bo'lgan matnni qo'ying…",
    startBtn: "Boshlash",
    cancelBtn: "Bekor qilish",
    progressStarting: "Boshlanmoqda…",
    resultTranscription: "Matn",
    resultTranslation: "Tarjima",
    copyBtn: "Nusxalash",
    copied: "Nusxalandi",
    downloadTxt: "TXT",
    downloadSrt: "SRT",
    downloadVtt: "VTT",
    segmentsTitle: "Vaqt belgili bo'laklar",
    segmentsShow: "Vaqtlarni ko'rsatish",
    segmentsHide: "Vaqtlarni yashirish",
    originalTitle: "Asl matn",
    translateAgain: "Tarjima qilish:",
    metaDetected: "Aniqlandi",
    metaSegments: "Bo'laklar",
    metaRequest: "So'rov",
    newJobBtn: "Yana bitta",

    fbTitle: "Natija foydali bo'ldimi?",
    fbGood: "Yaxshi",
    fbBad: "Yomon",
    fbReport: "Muammo haqida xabar berish",
    fbReason: "Nima noto'g'ri ketdi?",
    fbStt: "Yomon matn",
    fbTranslation: "Yomon tarjima",
    fbDownload: "Yuklash muammosi",
    fbSpeed: "Juda sekin",
    fbOther: "Boshqa",
    fbComment: "Tafsilot qo'shing (ixtiyoriy)",
    fbReportPlaceholder: "Nima bo'ldi va nimani kutgan edingiz?",
    fbSend: "Yuborish",
    fbThanks: "Rahmat — fikringiz jamoaga yetdi.",

    errSelectFile: "Avval fayl tanlang.",
    errFileTooLarge: "Fayl {size} MB. Chegara — 25 MB.",
    errEnterUrl: "Havolani qo'ying.",
    errEnterText: "Matn kiriting.",
    errChooseTarget: "Tarjima tilini tanlang.",
    errUnsupportedUrl: "Faqat YouTube, TikTok va Instagram Reels havolalari qo'llab-quvvatlanadi.",
    errUpload: "Yuklab bo'lmadi. Aloqani tekshirib, qayta urinib ko'ring.",
    errTimeout: "Vaqt tugadi. Kichikroq fayl bilan urinib ko'ring.",
    errJobFailed: "Vazifa xato bilan tugadi.",
    errTranslation: "Tarjima qilinmadi.",
    errNetwork: "Tarmoq xatosi. Qayta urinib ko'ring.",
  },
};

const UI_LANGUAGES = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ru", flag: "🇷🇺", label: "Русский" },
  { code: "ky", flag: "🇰🇬", label: "Кыргызча" },
  { code: "tg", flag: "🇹🇯", label: "Тоҷикӣ" },
  { code: "uz", flag: "🇺🇿", label: "Oʻzbekcha" },
];

const LANGUAGE_META = {
  ky: { flag: "🇰🇬", label: "Кыргызча" },
  tg: { flag: "🇹🇯", label: "Тоҷикӣ" },
  uz: { flag: "🇺🇿", label: "Oʻzbekcha" },
  ru: { flag: "🇷🇺", label: "Русский" },
  en: { flag: "🇬🇧", label: "English" },
  uz_cyrl: { flag: "🇺🇿", label: "Ўзбекча (Кирил)" },
};

let currentLang = "en";

function detectLanguage() {
  const stored = localStorage.getItem("tiltap_ui_lang");
  if (stored && SITE_I18N[stored]) return stored;
  const browser = (navigator.language || "en").slice(0, 2).toLowerCase();
  return SITE_I18N[browser] ? browser : "en";
}

function tr(key, vars) {
  const dict = SITE_I18N[currentLang] || SITE_I18N.en;
  let text = dict[key] ?? SITE_I18N.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, v);
    }
  }
  return text;
}

function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = tr(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = tr(el.dataset.i18nPlaceholder);
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = tr(el.dataset.i18nTitle);
  });
  document.documentElement.lang = currentLang;
}

function setLanguage(code) {
  if (!SITE_I18N[code]) return;
  currentLang = code;
  localStorage.setItem("tiltap_ui_lang", code);
  applyI18n();
  document.dispatchEvent(new CustomEvent("tiltap:language", { detail: { lang: code } }));
}

/** Wire up the header language dropdown present on every page. */
function initLanguageSwitcher() {
  currentLang = detectLanguage();

  const menu = document.getElementById("langMenu");
  if (menu) {
    menu.innerHTML = UI_LANGUAGES.map(
      (l) =>
        `<li><a data-lang="${l.code}"><span class="mr-1">${l.flag}</span>${l.label}</a></li>`
    ).join("");
    menu.querySelectorAll("[data-lang]").forEach((el) => {
      el.addEventListener("click", () => {
        setLanguage(el.dataset.lang);
        renderCurrentLang();
        document.activeElement?.blur();
      });
    });
  }

  renderCurrentLang();
  applyI18n();
  document.addEventListener("tiltap:language", renderCurrentLang);
}

function renderCurrentLang() {
  const meta = UI_LANGUAGES.find((l) => l.code === currentLang) || UI_LANGUAGES[0];
  const flag = document.getElementById("currentLangFlag");
  const label = document.getElementById("currentLangLabel");
  if (flag) flag.textContent = meta.flag;
  if (label) label.textContent = meta.label;
}

/** Fetch the deployment's channel config once and hide what is not configured. */
async function loadSiteConfig() {
  try {
    const res = await fetch("/api/site/config");
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    return { channels: { web: true, telegram: false, whatsapp: false }, links: {} };
  }
}
