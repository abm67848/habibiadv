import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ShieldCheck,
  Compass,
  CreditCard,
  CalendarDays,
  FileText,
  Map,
  Users,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  ArrowUpRight,
  ArrowRight,
  Flower2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Shared design tokens (mirrors Home.jsx)                           */
/* ------------------------------------------------------------------ */
const display = { fontFamily: "'Fraunces', Georgia, serif" };

const ZELLIGE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 64 64'%3E%3Cpath d='M32 4l6 14 14-6-6 14 14 6-14 6 6 14-14-6-6 14-6-14-14 6 6-14-14-6 14-6-6-14 14 6z' fill='none' stroke='%23e6c877' stroke-opacity='.13'/%3E%3C/svg%3E")`,
};

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]";

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */
const sections = [
  {
    id: "booking",
    title: "1. Booking & Confirmation",
    icon: CalendarDays,
    content: (
      <>
        <p>
          Bookings with HABIBI ADVENTURE HAFA S.L. are subject to availability
          and confirmation by the agency. A booking becomes confirmed once the
          required deposit has been received and confirmation has been issued.
        </p>
        <p>
          The traveler is responsible for reviewing the itinerary, dates,
          accommodation details, services included, exclusions and payment
          conditions provided at the time of booking.
        </p>
        <p>
          The specific booking contract and confirmed itinerary form part of
          the agreement between the traveler and the agency.
        </p>
      </>
    ),
  },
  {
    id: "payments",
    title: "2. Payment Conditions",
    icon: CreditCard,
    content: (
      <>
        <p>
          Payment conditions are communicated during the booking process and
          confirmed in the individual travel contract.
        </p>
        <p>
          Where the booking contract specifies the payment arrangement used
          by the agency, the reservation may require a 40% deposit within
          five days of the booking request, with the remaining 60% payable
          in Morocco as stated in the contract.
        </p>
        <p>
          The payment schedule, payment methods and deadlines applicable to
          each trip are those expressly confirmed in the travel contract.
        </p>
        <p>
          Failure to make payment within the agreed deadline may affect the
          reservation, subject to the applicable contract and law.
        </p>
      </>
    ),
  },
  {
    id: "cancellation",
    title: "3. Cancellation & Refunds",
    icon: FileText,
    content: (
      <>
        <p>
          Cancellation requests must be submitted in writing using the
          contact details provided by HABIBI ADVENTURE HAFA S.L.
        </p>
        <p>
          The date on which the agency receives the written cancellation
          notice will be used to determine the applicable cancellation
          conditions.
        </p>
        <p>
          The individual travel contract will specify the applicable
          cancellation policy, refund eligibility, cancellation charges
          and any deadlines.
        </p>
        <p>
          In contracts that expressly contain the cancellation condition
          used in the agency's sample contract, the deposit becomes
          non-refundable after 21 calendar days from payment. This
          condition applies only where it is expressly agreed in the
          applicable contract and remains subject to mandatory law.
        </p>
        <p>
          Cancellation rights, refunds and charges will not exclude
          protections that travelers are entitled to under applicable law.
        </p>
      </>
    ),
  },
  {
    id: "itinerary",
    title: "4. Itinerary & Travel Changes",
    icon: Map,
    content: (
      <>
        <p>
          HABIBI ADVENTURE HAFA S.L. aims to operate trips according to
          the itinerary confirmed with the traveler.
        </p>
        <p>
          Certain changes may be necessary due to weather conditions,
          road closures, transportation disruptions, safety concerns,
          local circumstances or other events outside the agency's
          reasonable control.
        </p>
        <p>
          Where necessary, the agency may adjust the itinerary,
          arrangements, departure times or activities while seeking
          to preserve the overall quality and purpose of the trip.
        </p>
        <p>
          Changes will be communicated to travelers as reasonably
          practicable. Travelers retain any rights available to them
          under applicable law.
        </p>
      </>
    ),
  },
  {
    id: "accommodation",
    title: "5. Accommodation",
    icon: Compass,
    content: (
      <>
        <p>
          Accommodation arrangements are described in the itinerary
          and booking confirmation.
        </p>
        <p>
          Where accommodation must be replaced due to circumstances
          beyond the agency's reasonable control, HABIBI ADVENTURE
          HAFA S.L. will seek to arrange alternative accommodation
          of comparable category and standard, subject to availability
          and applicable legal requirements.
        </p>
        <p>
          Room types, occupancy, meal arrangements and any special
          accommodation conditions will be specified in the individual
          booking.
        </p>
      </>
    ),
  },
  {
    id: "services",
    title: "6. Services Included & Excluded",
    icon: FileText,
    content: (
      <>
        <p>
          The services included in a trip are those specifically
          listed in its itinerary and booking confirmation.
        </p>
        <p>Depending on the trip, included services may comprise:</p>
        <ul>
          <li>Transportation specified in the itinerary.</li>
          <li>Airport or accommodation transfers where specified.</li>
          <li>Accommodation and meals expressly listed.</li>
          <li>Guiding services where expressly listed.</li>
          <li>Activities specifically included in the package.</li>
        </ul>
        <p>
          Unless expressly stated as included, the following may
          remain the traveler's responsibility:
        </p>
        <ul>
          <li>Drinks and meals not included in the itinerary.</li>
          <li>Monument, museum and attraction entrance fees.</li>
          <li>Personal expenses and purchases.</li>
          <li>Optional activities and additional services.</li>
          <li>Any services not expressly listed as included.</li>
        </ul>
        <p>
          The exact inclusions and exclusions are determined by the
          individual travel package.
        </p>
      </>
    ),
  },
  {
    id: "responsibilities",
    title: "7. Traveler Responsibilities",
    icon: Users,
    content: (
      <>
        <p>Travelers are responsible for:</p>
        <ul>
          <li>Providing accurate booking and personal information.</li>
          <li>Obtaining valid travel documents and complying with entry requirements.</li>
          <li>Arriving at agreed departure points and times.</li>
          <li>Following reasonable instructions from guides and trip coordinators.</li>
          <li>Respecting accommodation rules, local customs and other travelers.</li>
          <li>Paying outstanding amounts under the confirmed booking.</li>
          <li>Acting responsibly during excursions and activities.</li>
        </ul>
        <p>
          Conduct that compromises the safety of the traveler,
          the group or others may result in measures being taken
          in accordance with the applicable contract and law.
        </p>
      </>
    ),
  },
  {
    id: "insurance",
    title: "8. Insurance & Liability",
    icon: ShieldCheck,
    content: (
      <>
        <p>
          HABIBI ADVENTURE HAFA S.L. maintains professional civil
          liability insurance in accordance with its insurance
          contract and applicable requirements.
        </p>
        <p>
          The agency's professional liability insurance is not,
          by itself, personal travel insurance for individual
          travelers.
        </p>
        <p>
          Travelers are encouraged to obtain appropriate travel
          insurance covering medical expenses, assistance,
          cancellation, personal accidents, baggage and other
          risks relevant to their trip.
        </p>
        <p>
          The scope of any insurance coverage depends on the
          policy terms, conditions, exclusions and insurer.
        </p>
        <p>
          Nothing in these terms excludes or limits liability
          where such exclusion or limitation is prohibited
          by applicable law.
        </p>
      </>
    ),
  },
  {
    id: "force",
    title: "9. Force Majeure",
    icon: AlertCircle,
    content: (
      <>
        <p>
          Force majeure or exceptional circumstances may include
          events such as severe weather, storms, flooding,
          earthquakes, pandemics, road closures, serious
          transportation disruptions or other circumstances
          beyond reasonable control.
        </p>
        <p>
          Where such events affect the trip, the agency may
          need to alter arrangements, activities, routes or
          schedules.
        </p>
        <p>
          The agency will take reasonable steps to communicate
          affected arrangements and provide appropriate
          assistance, subject to the booking contract and
          applicable law.
        </p>
      </>
    ),
  },
  {
    id: "complaints",
    title: "10. Complaints & Customer Support",
    icon: Mail,
    content: (
      <>
        <p>
          Travelers are encouraged to report any service issue
          during the trip so the agency has a reasonable
          opportunity to address it.
        </p>
        <p>
          Formal complaints may be submitted in writing to
          HABIBI ADVENTURE HAFA S.L. using the contact details
          below.
        </p>
        <p>
          The agency will review complaints and respond within
          the applicable legal timeframe.
        </p>
      </>
    ),
  },
];

const polishSections = [
  {
    title: "1. Rezerwacja i potwierdzenie",
    content: (
      <>
        <p>
          Rezerwacje w HABIBI ADVENTURE HAFA S.L. są uzależnione od dostępności
          i potwierdzenia przez agencję. Rezerwacja zostaje potwierdzona po
          otrzymaniu wymaganej zaliczki i wystawieniu potwierdzenia.
        </p>
        <p>
          Podróżny odpowiada za sprawdzenie planu podróży, terminów, szczegółów
          zakwaterowania, usług wliczonych w cenę, usług niewliczonych oraz
          warunków płatności przekazanych w chwili rezerwacji.
        </p>
        <p>
          Szczegółowa umowa dotycząca podróży oraz potwierdzony plan podróży
          stanowią część porozumienia między podróżnym a agencją.
        </p>
      </>
    ),
  },
  {
    title: "2. Warunki płatności",
    content: (
      <>
        <p>
          Warunki płatności są przekazywane w trakcie rezerwacji i potwierdzane
          w indywidualnej umowie dotyczącej podróży.
        </p>
        <p>
          Jeżeli umowa rezerwacyjna określa stosowany przez agencję sposób
          płatności, rezerwacja może wymagać wpłaty zaliczki w wysokości 40%
          w ciągu pięciu dni od złożenia wniosku o rezerwację, a pozostałe 60%
          należy wpłacić w Maroku zgodnie z umową.
        </p>
        <p>
          Harmonogram płatności, metody płatności i terminy właściwe dla każdej
          podróży są określone w umowie dotyczącej podróży.
        </p>
        <p>
          Brak płatności w uzgodnionym terminie może wpłynąć na rezerwację,
          z zastrzeżeniem postanowień właściwej umowy i obowiązującego prawa.
        </p>
      </>
    ),
  },
  {
    title: "3. Anulowanie i zwroty",
    content: (
      <>
        <p>
          Wnioski o anulowanie należy składać na piśmie, korzystając z danych
          kontaktowych HABIBI ADVENTURE HAFA S.L.
        </p>
        <p>
          Przy ustalaniu właściwych warunków anulowania uwzględnia się datę
          otrzymania przez agencję pisemnego zawiadomienia o anulowaniu.
        </p>
        <p>
          Indywidualna umowa dotycząca podróży określa właściwe zasady
          anulowania, uprawnienia do zwrotu, opłaty za anulowanie oraz
          obowiązujące terminy.
        </p>
        <p>
          W umowach, które wyraźnie zawierają warunek anulowania stosowany
          we wzorze umowy agencji, zaliczka staje się bezzwrotna po upływie
          21 dni kalendarzowych od jej wpłaty. Warunek ten obowiązuje wyłącznie
          wtedy, gdy został wyraźnie uzgodniony w danej umowie, i z zastrzeżeniem
          bezwzględnie obowiązujących przepisów prawa.
        </p>
        <p>
          Prawa do anulowania, zwrotów i opłat nie ograniczają ochrony
          przysługującej podróżnym na mocy obowiązującego prawa.
        </p>
      </>
    ),
  },
  {
    title: "4. Plan podróży i zmiany",
    content: (
      <>
        <p>
          HABIBI ADVENTURE HAFA S.L. dokłada starań, aby realizować wycieczki
          zgodnie z planem podróży potwierdzonym z podróżnym.
        </p>
        <p>
          Niektóre zmiany mogą być konieczne z powodu warunków pogodowych,
          zamknięcia dróg, zakłóceń w transporcie, względów bezpieczeństwa,
          lokalnych okoliczności lub innych zdarzeń pozostających poza
          uzasadnioną kontrolą agencji.
        </p>
        <p>
          W razie potrzeby agencja może zmienić plan podróży, ustalenia,
          godziny wyjazdu lub aktywności, starając się zachować ogólną jakość
          i charakter wycieczki.
        </p>
        <p>
          Zmiany będą przekazywane podróżnym tak szybko, jak będzie to
          rozsądnie możliwe. Podróżnym nadal przysługują prawa wynikające
          z obowiązującego prawa.
        </p>
      </>
    ),
  },
  {
    title: "5. Zakwaterowanie",
    content: (
      <>
        <p>
          Informacje o zakwaterowaniu są podane w planie podróży i potwierdzeniu
          rezerwacji.
        </p>
        <p>
          Jeżeli z przyczyn pozostających poza uzasadnioną kontrolą agencji
          konieczna będzie zmiana zakwaterowania, HABIBI ADVENTURE HAFA S.L.
          postara się zapewnić zakwaterowanie zastępcze o porównywalnej
          kategorii i standardzie, zależnie od dostępności i obowiązujących
          wymogów prawnych.
        </p>
        <p>
          Rodzaj pokoju, liczba osób, wyżywienie i wszelkie szczególne warunki
          zakwaterowania zostaną określone w indywidualnej rezerwacji.
        </p>
      </>
    ),
  },
  {
    title: "6. Usługi wliczone w cenę i niewliczone",
    content: (
      <>
        <p>
          Usługi wliczone w cenę wycieczki to te, które zostały wymienione
          w jej planie podróży i potwierdzeniu rezerwacji.
        </p>
        <p>W zależności od wycieczki usługi wliczone w cenę mogą obejmować:</p>
        <ul>
          <li>Transport wskazany w planie podróży.</li>
          <li>Transfery lotniskowe lub do miejsca zakwaterowania, jeśli zostały wskazane.</li>
          <li>Zakwaterowanie i posiłki wyraźnie wymienione w ofercie.</li>
          <li>Usługi przewodnickie, jeśli zostały wyraźnie wymienione.</li>
          <li>Aktywności wyraźnie uwzględnione w pakiecie.</li>
        </ul>
        <p>O ile wyraźnie nie wskazano, że są wliczone w cenę, podróżny może odpowiadać za:</p>
        <ul>
          <li>Napoje i posiłki niewymienione w planie podróży.</li>
          <li>Opłaty za wstęp do zabytków, muzeów i atrakcji.</li>
          <li>Wydatki osobiste i zakupy.</li>
          <li>Aktywności fakultatywne i usługi dodatkowe.</li>
          <li>Wszelkie usługi, które nie zostały wyraźnie wymienione jako wliczone w cenę.</li>
        </ul>
        <p>
          Dokładny zakres usług wliczonych w cenę i wyłączonych z niej określa
          indywidualny pakiet podróżny.
        </p>
      </>
    ),
  },
  {
    title: "7. Obowiązki podróżnych",
    content: (
      <>
        <p>Podróżni odpowiadają za:</p>
        <ul>
          <li>Podanie prawidłowych danych rezerwacyjnych i osobowych.</li>
          <li>Uzyskanie ważnych dokumentów podróży i spełnienie wymogów wjazdowych.</li>
          <li>Przybycie w uzgodnione miejsce i godzinę odjazdu.</li>
          <li>Stosowanie się do uzasadnionych poleceń przewodników i koordynatorów wycieczki.</li>
          <li>Przestrzeganie zasad zakwaterowania, lokalnych zwyczajów i praw innych podróżnych.</li>
          <li>Uregulowanie pozostałych należności wynikających z potwierdzonej rezerwacji.</li>
          <li>Odpowiedzialne zachowanie podczas wycieczek i aktywności.</li>
        </ul>
        <p>
          Zachowanie zagrażające bezpieczeństwu podróżnego, grupy lub innych
          osób może skutkować podjęciem działań zgodnie z właściwą umową
          i obowiązującym prawem.
        </p>
      </>
    ),
  },
  {
    title: "8. Ubezpieczenie i odpowiedzialność",
    content: (
      <>
        <p>
          HABIBI ADVENTURE HAFA S.L. posiada ubezpieczenie odpowiedzialności
          cywilnej zawodowej zgodnie z umową ubezpieczenia i obowiązującymi
          wymogami.
        </p>
        <p>
          Ubezpieczenie odpowiedzialności zawodowej agencji samo w sobie nie
          stanowi indywidualnego ubezpieczenia podróżnego dla podróżnych.
        </p>
        <p>
          Zaleca się, aby podróżni wykupili odpowiednie ubezpieczenie podróżne
          obejmujące koszty leczenia, pomoc, anulowanie, wypadki osobowe,
          bagaż i inne ryzyka związane z podróżą.
        </p>
        <p>
          Zakres ochrony ubezpieczeniowej zależy od warunków polisy, wyłączeń
          i ubezpieczyciela.
        </p>
        <p>
          Żadne postanowienie niniejszych warunków nie wyłącza ani nie
          ogranicza odpowiedzialności, jeżeli takie wyłączenie lub
          ograniczenie jest zabronione przez obowiązujące prawo.
        </p>
      </>
    ),
  },
  {
    title: "9. Siła wyższa",
    content: (
      <>
        <p>
          Siła wyższa lub wyjątkowe okoliczności mogą obejmować między innymi
          trudne warunki pogodowe, burze, powodzie, trzęsienia ziemi, pandemie,
          zamknięcia dróg, poważne zakłócenia w transporcie lub inne
          okoliczności pozostające poza uzasadnioną kontrolą.
        </p>
        <p>
          Jeżeli takie zdarzenia wpłyną na wycieczkę, agencja może być zmuszona
          do zmiany ustaleń, aktywności, tras lub harmonogramów.
        </p>
        <p>
          Agencja podejmie uzasadnione działania, aby poinformować o zmianach
          i zapewnić odpowiednią pomoc, z zastrzeżeniem umowy rezerwacyjnej
          i obowiązującego prawa.
        </p>
      </>
    ),
  },
  {
    title: "10. Reklamacje i obsługa klienta",
    content: (
      <>
        <p>
          Zachęcamy podróżnych do zgłaszania wszelkich problemów z usługami
          w trakcie podróży, aby agencja miała możliwość ich rozwiązania.
        </p>
        <p>
          Formalne reklamacje można składać na piśmie do HABIBI ADVENTURE HAFA
          S.L., korzystając z poniższych danych kontaktowych.
        </p>
        <p>
          Agencja rozpatrzy reklamację i odpowie w terminie określonym
          obowiązującymi przepisami prawa.
        </p>
      </>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Accordion item — premium card style                               */
/* ------------------------------------------------------------------ */
function AccordionItem({ section, open, onToggle, index }) {
  const Icon = section.icon;

  return (
    <div
      id={section.id}
      className={`group overflow-hidden rounded-[1.5rem] border transition-all duration-500 ${
        open
          ? "border-[#c9a24b]/40 bg-white shadow-xl shadow-[#0f3d2e]/10"
          : "border-[#0f3d2e]/10 bg-white/60 hover:border-[#c9a24b]/30 hover:bg-white"
      }`}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition sm:px-6 ${focus}`}
      >
        <div className="flex items-center gap-4">
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition duration-500 ${
              open
                ? "bg-[#0f3d2e] text-[#e6c877] shadow-md shadow-[#0f3d2e]/30"
                : "bg-[#0f3d2e]/5 text-[#9c7a2b] group-hover:bg-[#0f3d2e]/10"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </span>

          <span>
            <span
              className={`block text-base font-semibold sm:text-lg ${
                open ? "text-[#0a2a20]" : "text-[#0f3d2e]"
              }`}
              style={display}
            >
              {section.title}
            </span>
            <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">
              {open ? (section.isPolish ? "Kliknij, aby zwinąć" : "Tap to collapse") : (section.isPolish ? "Kliknij, aby przeczytać więcej" : "Tap to read more")}
            </span>
          </span>
        </div>

        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition duration-300 ${
            open
              ? "rotate-180 bg-[#c9a24b] text-[#082a1f]"
              : "bg-[#f3f6f1] text-[#0f3d2e] group-hover:bg-[#c9a24b]/20"
          }`}
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.7,0,.2,1)] ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="ml-[4.5rem] mr-5 border-l-2 border-[#c9a24b]/25 pb-6 pl-5 text-sm leading-7 text-slate-600 sm:mr-6">
            <div className="space-y-3 [&_li]:relative [&_li]:pl-4 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.65em] [&_li]:before:h-1.5 [&_li]:before:w-1.5 [&_li]:before:rounded-full [&_li]:before:bg-[#c9a24b] [&_ul]:space-y-1.5">
              {section.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function TermsPage() {
  const { i18n } = useTranslation();
  const isPolish = i18n.language?.toLowerCase().startsWith("pl");
  const pageSections = isPolish
    ? sections.map((section, index) => ({
        ...section,
        title: polishSections[index].title,
        content: polishSections[index].content,
        isPolish: true,
      }))
    : sections;
  const [openSections, setOpenSections] = useState(["booking"]);

  const toggleSection = (id) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const openAll = () => setOpenSections(pageSections.map((s) => s.id));
  const closeAll = () => setOpenSections([]);

  return (
    <div
      className="min-h-screen bg-[#f3f6f1] text-slate-700 antialiased"
      style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Manrope:wght@400;500;600;700&display=swap');
        @keyframes drift{from{transform:scale(1.02)}to{transform:scale(1.1)}}
        @keyframes rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
        @keyframes lineUp{from{transform:translateY(112%)}to{transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        .line{display:block;animation:lineUp 1.2s cubic-bezier(.2,.8,.2,1) both}
        .rise{opacity:0;animation:rise .8s cubic-bezier(.2,.7,.2,1) forwards}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.rise{opacity:1}}
      `}</style>

      {/* HERO — mirrored from Home */}
      <section className="relative isolate overflow-hidden bg-[#082a1f] px-5 pb-32 pt-28 text-white sm:pb-40 sm:pt-36">
        {/* ambient gradient + texture */}
        <div className="absolute inset-0 -z-20">
          <div className="absolute inset-0 bg-gradient-to-br from-[#082a1f] via-[#1f6b4f] to-[#c9a24b]" />
          <div className="absolute inset-0 opacity-40" style={ZELLIGE} />
        </div>
        <div className="absolute -right-40 -top-40 -z-10 h-[32rem] w-[32rem] rounded-full bg-[#c9a24b]/15 blur-3xl" />
        <div className="absolute -bottom-52 -left-24 -z-10 h-[28rem] w-[28rem] rounded-full bg-white/5 blur-3xl" />

        {/* heritage double frame */}
        <div className="pointer-events-none absolute inset-4 border border-[#e6c877]/40 sm:inset-8" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-6 border border-[#e6c877]/15 sm:inset-11" aria-hidden="true" />

        <div className="relative mx-auto max-w-5xl">
          <div className="flex items-center gap-4 text-[#e6c877]" style={{ animation: "fadeIn 1.2s ease .2s both" }}>
            <span className="hidden h-px w-14 origin-right bg-[#e6c877]/70 sm:block" style={{ animation: "grow 1.2s ease .4s both" }} />
            <svg viewBox="0 0 64 64" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M32 4l6 14 14-6-6 14 14 6-14 6 6 14-14-6-6 14-6-14-14 6 6-14-14-6 14-6-6-14 14 6z" />
            </svg>
            <p className="text-sm tracking-[0.2em] uppercase">{isPolish ? "Informacje o podróży i rezerwacji" : "Travel & Booking Information"}</p>
            <span className="hidden h-px w-14 origin-left bg-[#e6c877]/70 sm:block" style={{ animation: "grow 1.2s ease .4s both" }} />
          </div>

          <h1 className="mt-8 max-w-3xl text-4xl leading-[1.05] tracking-tight sm:text-6xl" style={display}>
            <span className="block overflow-hidden pb-2">
              <span className="line" style={{ animationDelay: ".45s" }}>
                {isPolish ? "Warunki korzystania z usług" : "Terms & Conditions"}
              </span>
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg" style={{ animation: "fadeIn 1.4s ease 1s both" }}>
            {isPolish
              ? "Wszystko, co należy wiedzieć o rezerwacji, płatnościach, organizacji podróży i wyjeździe z Habibi Adventure."
              : "Everything you need to know about booking, payments, travel arrangements and your journey with Habibi Adventure."}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-5" style={{ animation: "fadeIn 1.4s ease 1.3s both" }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c9a24b]/40 bg-white/5 px-4 py-2 text-xs font-medium text-[#e6c877] backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              {isPolish ? "Zasady rezerwacji i informacje dla podróżnych" : "Booking policies & traveler information"}
            </span>
            <span className="inline-flex items-center gap-2 text-xs text-white/60">
              <FileText className="h-4 w-4 text-[#c9a24b]" />
              {isPolish ? "Ostatnia aktualizacja ·" : "Last updated ·"} {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <main className="relative mx-auto -mt-20 max-w-5xl px-5 pb-24 sm:-mt-24">
        <div className="rounded-[2rem] bg-white p-6 shadow-2xl shadow-[#082a1f]/10 ring-1 ring-[#0f3d2e]/5 sm:p-10">
          {/* header bar */}
          <div className="flex flex-col justify-between gap-5 border-b border-dashed border-[#0f3d2e]/15 pb-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl text-[#0a2a20] sm:text-3xl" style={display}>
                {isPolish ? "Ogólne warunki podróży" : "General travel terms"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {isPolish ? "Przed potwierdzeniem rezerwacji prosimy o uważne zapoznanie się z tymi warunkami." : "Please read these conditions carefully before confirming your booking."}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={openAll}
                className={`rounded-full bg-[#0f3d2e] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#0f3d2e]/20 transition hover:bg-[#1f6b4f] ${focus}`}
              >
                {isPolish ? "Rozwiń wszystkie" : "Expand all"}
              </button>
              <button
                onClick={closeAll}
                className={`rounded-full border border-[#0f3d2e]/15 px-4 py-2.5 text-sm font-medium text-[#0f3d2e] transition hover:bg-[#f3f6f1] ${focus}`}
              >
                {isPolish ? "Zwiń wszystkie" : "Collapse all"}
              </button>
            </div>
          </div>

          {/* accordion list */}
          <div className="mt-6 space-y-3">
            {pageSections.map((section, i) => (
              <AccordionItem
                key={section.id}
                section={section}
                index={i}
                open={openSections.includes(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </div>
        </div>

        {/* COMPANY DETAILS — dark zellige card */}
        <section className="relative mt-10 isolate overflow-hidden rounded-[2rem] bg-[#0f3d2e] p-8 text-white shadow-2xl shadow-[#082a1f]/20 sm:p-12">
          <div className="absolute inset-0 -z-10" style={ZELLIGE} />
          <div className="absolute -right-24 -top-24 -z-10 h-64 w-64 rounded-full bg-[#c9a24b]/15 blur-3xl" />

          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#e6c877]">{isPolish ? "Skontaktuj się z nami" : "Contact us"}</p>
              <h2 className="mt-3 text-2xl sm:text-3xl" style={display}>
                HABIBI ADVENTURE HAFA S.L.
              </h2>
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#c9a24b] text-[#082a1f]">
              <Flower2 className="h-6 w-6" />
            </span>
          </div>

          <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
            {isPolish
              ? "W przypadku pytań dotyczących niniejszych warunków, rezerwacji lub naszych usług turystycznych prosimy o kontakt z naszym zespołem."
              : "If you have questions regarding these terms, your booking or any of our travel services, please contact our team."}
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              {
                icon: MapPin,
                label: isPolish ? "Adres siedziby" : "Registered address",
                body: (
                  <>
                    Avenida Rosita Ferrer nº 2,
                    <br />
                    04740 Roquetas de Mar,
                    <br />
                    {isPolish ? "Hiszpania" : "Spain"}
                  </>
                ),
              },
              {
                icon: Mail,
                label: isPolish ? "Adres email" : "Email",
                body: (
                  <a
                    href="mailto:habibiadventure.26@gmail.com"
                    className={`text-white/70 transition hover:text-[#e6c877] ${focus}`}
                  >
                    habibiadventure.26@gmail.com
                  </a>
                ),
              },
              {
                icon: Phone,
                label: isPolish ? "Telefon" : "Telephone",
                body: (
                  <a
                    href="tel:+48665208846"
                    className={`text-white/70 transition hover:text-[#e6c877] ${focus}`}
                  >
                    +48 665 208 846 / +212 661-731123
                  </a>
                ),
              },
              {
                icon: FileText,
                label: isPolish ? "Dane identyfikacyjne firmy" : "Company identification",
                body: <>CIF: B05593736</>,
              },
            ].map(({ icon: Icon, label, body }) => (
              <div
                key={label}
                className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-[#c9a24b]/40 hover:bg-white/10"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#c9a24b]/15 text-[#e6c877]">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-white/50">{label}</p>
                  <p className="mt-1.5 text-sm leading-6 text-white/80">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <a
            href="mailto:habibiadventure.26@gmail.com"
            className={`group mt-8 inline-flex items-center gap-2 rounded-full bg-[#c9a24b] py-3 pl-6 pr-3 text-sm font-semibold text-[#082a1f] transition hover:bg-[#e6c877] ${focus}`}
          >
            {isPolish ? "Wyślij nam wiadomość" : "Send us a message"}
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#082a1f] text-[#e6c877] transition group-hover:rotate-45">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </a>
        </section>

        {/* NOTICE */}
        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-[#c9a24b]/30 bg-[#c9a24b]/5 p-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#c9a24b]/20 text-[#9c7a2b]">
            <AlertCircle className="h-4 w-4" />
          </span>
          <p className="text-xs leading-6 text-slate-600">
            {isPolish
              ? "Niniejsze warunki mają na celu przekazanie ogólnych informacji dotyczących rezerwacji. Każda rezerwacja podlega szczegółowej umowie dotyczącej podróży, informacjom o pakiecie oraz bezwzględnie obowiązującym przepisom prawa. Warunki te nie ograniczają bezwzględnie obowiązujących praw podróżnych."
              : "These terms are intended to provide general booking information. The specific travel contract, package details and mandatory applicable law govern each reservation. These terms do not limit mandatory traveler rights."}
          </p>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#0f3d2e]/10 bg-white px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} HABIBI ADVENTURE HAFA S.L. {isPolish ? "Wszelkie prawa zastrzeżone." : "All rights reserved."}
          </p>
          <a
            href="/"
            className={`inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-4 py-2 text-xs font-medium text-[#e6c877] transition hover:bg-[#1f6b4f] ${focus}`}
          >
            {isPolish ? "Powrót do strony głównej" : "Back to home"} <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}