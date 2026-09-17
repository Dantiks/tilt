import type { SupportedLanguage } from "../services/telegramService";

/**
 * Why a YouTube/TikTok/Instagram link could not be used, in the user's own
 * language. Shared by the Telegram and WhatsApp bots so the two never explain
 * the same failure differently.
 */
const MESSAGES: Record<string, Partial<Record<SupportedLanguage, string>>> = {
  not_available: {
    ky: "❌ Видео жеткиликтүү эмес. Ал жок кылынган, жашырылган же регионго блоктолгон болушу мүмкүн.",
    tg: "❌ Видео дастрас нест. Эҳтимол нест шудааст, пинҳон шудааст ё аз минтақаа манъ шудааст.",
    uz: "❌ Video mavjud emas. Ehtimol o'chirilgan, yashirilgan yoki mintaqaga bloklangan.",
    en: "❌ Video is not available. It may be deleted, private, or region-blocked.",
    ru: "❌ Видео недоступно. Возможно, оно удалено, скрыто или заблокировано в вашем регионе.",
  },
  sign_in_required: {
    ky: "❌ Бул видео аккаунтка кирүүнү талап кылат. Бот мындай видеолорду жүктөй албайт.",
    tg: "❌ Ин видео талаб мекунад, ки ба ҳисоб ворид шавед. Бот чунин видеоҳоро боргирӣ карда наметавонад.",
    uz: "❌ Bu video hisobga kirishni talab qiladi. Bot bunday videolarni yuklab ololmaydi.",
    en: "❌ This video requires signing in. The bot cannot download such videos.",
    ru: "❌ Это видео требует входа в аккаунт. Бот не может скачать такие видео.",
  },
  private: {
    ky: "❌ Бул жеке видео. Бот аны жүктөй албайт.",
    tg: "❌ Ин видеои шахсӣ аст. Бот онро боргирӣ карда наметавонад.",
    uz: "❌ Bu shaxsiy video. Bot uni yuklab ololmaydi.",
    en: "❌ This is a private video. The bot cannot download it.",
    ru: "❌ Это приватное видео. Бот не может его скачать.",
  },
  age_restricted: {
    ky: "❌ Видео жаш чектөөсү бар. Бот аны жүктөй албайт.",
    tg: "❌ Видео дорои маҳдудияти синну сол аст. Бот онро боргирӣ карда наметавонад.",
    uz: "❌ Videoda yosh chegaralashi bor. Bot uni yuklab ololmaydi.",
    en: "❌ The video is age-restricted. The bot cannot download it.",
    ru: "❌ Видео имеет возрастное ограничение. Бот не может его скачать.",
  },
  live_stream: {
    ky: "❌ Тике эфирди транскрипциялоого болбойт. Видео аяктаганда жаңы шилтеме жибериңиз.",
    tg: "❌ Пахши мустақимро транскрипция кардан мумкин нест. Лутфан, пас аз анҷоми видео пайванди нав фиристед.",
    uz: "❌ Jonli efirni transkripsiya qilish mumkin emas. Iltimos, video tugagach yangi havola yuboring.",
    en: "❌ Live streams cannot be transcribed. Please send a new link after the broadcast ends.",
    ru: "❌ Прямые трансляции нельзя расшифровать. Пожалуйста, пришлите новую ссылку после окончания эфира.",
  },
  timeout: {
    ky: "❌ Видеону текшерүү өтө көп убакыт алды. Интернет көйгөйлөрү мүмкүн.",
    tg: "❌ Санҷиши видео хеле тулонӣ шуд. Эҳтимол мушкилоти интернет.",
    uz: "❌ Videoni tekshirish juda uzoq davom etdi. Ehtimol internet muammolari.",
    en: "❌ Video validation took too long. Possible network issues.",
    ru: "❌ Проверка видео заняла слишком много времени. Возможны проблемы с сетью.",
  },
  missing_deps: {
    ky: "❌ Видеону текшерүүчү куралдар табылган жок. Администратор python3 жана requests орнотконун текшерсин.",
    tg: "❌ Воситаҳои санҷиши видео ёфт нашуданд. Администратор python3 ва requests-ро насб кардааст, тафтиш кунад.",
    uz: "❌ Video tekshirish vositalari topilmadi. Administrator python3 va requests o'rnatganini tekshirsin.",
    en: "❌ Video validation tools are missing. Please ask the admin to install python3 and requests.",
    ru: "❌ Не найдены инструменты для проверки видео. Попросите администратора установить python3 и requests.",
  },
  cobalt_auth_required: {
    ky: "❌ Көчүрүү кызматына кирүү үчүн аутентификация талап кылынат. Администраторго жеке Cobalt серверин орнотууну сураныңыз.",
    tg: "❌ Барои дастрасӣ ба хидмати боргирӣ аутентификатсия лозим аст. Администраторро барои насби сервери хусусии Cobalt дастгирӣ кунед.",
    uz: "❌ Yuklab olish xizmatiga kirish uchun autentifikatsiya talab qilinadi. Administratordan shaxsiy Cobalt serverini o'rnatishni so'rang.",
    en: "❌ The download service now requires authentication. Please ask the admin to deploy a private Cobalt server.",
    ru: "❌ Сервис скачивания теперь требует аутентификации. Попросите администратора развернуть приватный сервер Cobalt.",
  },
  unknown: {
    ky: "❌ Видеону текшерүү мүмкүн болгон жок. Шилтеме туура эмес же видео жеткиликтүү эмес.",
    tg: "❌ Санҷиши видео иҷро нашуд. Эҳтимол пайванд нодуруст аст ё видео дастрас нест.",
    uz: "❌ Videoni tekshirish amalga oshmadi. Ehtimol havola noto'g'ri yoki video mavjud emas.",
    en: "❌ Could not validate the video. The link may be invalid or the video unavailable.",
    ru: "❌ Не удалось проверить видео. Возможно, ссылка неверная или видео недоступно.",
  },
};

export function getMediaErrorMessage(reason: string | undefined, lang: SupportedLanguage): string {
  const entry = MESSAGES[reason ?? "unknown"] ?? MESSAGES.unknown;
  return entry[lang] ?? entry["uz"] ?? entry["ru"] ?? "Unknown error";
}
