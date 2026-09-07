import { translator, type Locale } from "./i18n";
const guides = {
  en: [
    [
      "Start with the records",
      "Create clubs, then player and coach profiles. Link a club when known; leave unknown values empty. Use ISO-style two-letter country codes and three-letter currency codes. Salaries are monthly amounts.",
    ],
    [
      "Compare recorded requirements",
      "Create an opportunity and choose Matching. Review every condition, including unknowns. No currency conversion is performed. Only sourced, dated official appearances count within the selected period.",
    ],
    [
      "Track the next step",
      "Add a player from a matching result to the recruitment pipeline. Edit its stage as discussions progress. Track signed authorizations separately in Mandates; an app record is not a legal document.",
    ],
    [
      "Move your data",
      "Export CSV or JSON from each collection. Imports show a validation preview and commit atomically. Preserve IDs when moving related records: clubs and rule packs first, players and opportunities next, mandates and pipeline last.",
    ],
    [
      "Keep your installation private",
      "This release is designed for one organization per installation. Owners manage users and rule packs. Editors can change records and export data; viewers can only read. Back up the database using the supplied backup script.",
    ],
    [
      "Project status",
      "Version 0.1.0 is an early self-hosted release. Document links are supported; file hosting, email notifications, SSO, PostgreSQL and integrations are on the roadmap. All bundled sample records are fictional.",
    ],
  ],
  fr: [
    [
      "Commencez par les fiches",
      "Créez les clubs, puis les joueurs et entraîneurs. Laissez les informations inconnues vides. Utilisez des codes pays à deux lettres et des devises à trois lettres. Les salaires sont mensuels.",
    ],
    [
      "Comparez les critères saisis",
      "Créez une opportunité puis ouvrez Correspondances. Vérifiez chaque critère, y compris les inconnus. Aucune conversion de devise. Seules les sélections officielles datées et sourcées dans la période comptent.",
    ],
    [
      "Suivez les prochaines étapes",
      "Ajoutez un joueur au suivi depuis une correspondance. Modifiez l’étape au fil des échanges. Suivez les autorisations dans Mandats ; une fiche ne constitue pas un document juridique.",
    ],
    [
      "Transférez vos données",
      "Exportez en CSV ou JSON. L’import comprend une prévisualisation et une sauvegarde atomique. Conservez les identifiants : clubs et règles d’abord, joueurs et opportunités ensuite, mandats et suivi enfin.",
    ],
    [
      "Protégez votre installation",
      "Une organisation par installation. Les administrateurs gèrent les utilisateurs et les règles ; les éditeurs modifient et exportent ; les lecteurs consultent. Sauvegardez la base avec le script fourni.",
    ],
    [
      "État du projet",
      "La version 0.1.0 est une première version auto-hébergée. Les liens de documents sont pris en charge. Hébergement de fichiers, alertes e-mail, SSO, PostgreSQL et intégrations figurent sur la feuille de route. Tous les exemples sont fictifs.",
    ],
  ],
  ar: [
    [
      "ابدأ بالسجلات",
      "أنشئ الأندية ثم ملفات اللاعبين والمدربين. اترك البيانات غير المعروفة فارغة. استخدم رموزاً من حرفين للدول وثلاثة أحرف للعملات. مبالغ الرواتب شهرية.",
    ],
    [
      "قارن المتطلبات المسجلة",
      "أنشئ فرصة ثم افتح المطابقة. راجع جميع الشروط بما فيها البيانات الناقصة. لا يُجرى تحويل للعملات. تُحتسب المشاركات الرسمية المؤرخة والموثّقة ضمن الفترة المحددة فقط.",
    ],
    [
      "تابع الخطوة القادمة",
      "أضف اللاعب إلى مسار التوظيف من نتيجة المطابقة، ثم غيّر المرحلة مع تقدم المفاوضات. سجّل التفويضات في قسمها؛ سجل التطبيق ليس مستنداً قانونياً.",
    ],
    [
      "انقل بياناتك",
      "صدّر بصيغة CSV أو JSON. يتضمن الاستيراد معاينة وحفظاً كاملاً أو إلغاءً كاملاً عند الخطأ. احتفظ بالمعرّفات: الأندية والقواعد أولاً، ثم اللاعبون والفرص، ثم التفويضات والمسار.",
    ],
    [
      "احمِ مساحة العمل",
      "مؤسسة واحدة لكل تثبيت. المدير يدير المستخدمين والقواعد، والمحرّر يعدّل ويصدّر، والقارئ يطّلع فقط. انسخ قاعدة البيانات احتياطياً بالبرنامج المرفق.",
    ],
    [
      "حالة المشروع",
      "الإصدار 0.1.0 نسخة أولية للاستضافة الذاتية. يدعم روابط المستندات. استضافة الملفات والتنبيهات البريدية والدخول الموحد وPostgreSQL والتكاملات ضمن خارطة الطريق. جميع الأمثلة خيالية.",
    ],
  ],
};
export function Guide({ locale }: { locale: Locale }) {
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">v0.1.0</span>
          <h1>{translator(locale)("help")}</h1>
        </div>
      </header>
      <div className="guide-grid">
        {guides[locale].map(([title, body], i) => (
          <section className="panel guide-panel" key={title}>
            <span className="guide-number">{String(i + 1).padStart(2, "0")}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </section>
        ))}
      </div>
    </>
  );
}
