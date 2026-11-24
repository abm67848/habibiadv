import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ShieldCheck,
  Database,
  Mail,
  Users,
  LockKeyhole,
  Cookie,
  FileText,
  MapPin,
  Phone,
  Scale,
  Clock,
  ArrowUpRight,
  ArrowRight,
  Flower2,
  AlertCircle,
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
    id: "controller",
    title: "1. Data Controller",
    icon: ShieldCheck,
    content: (
      <>
        <p>
          The data controller responsible for processing personal
          data collected through this website is:
        </p>
        <ul>
          <li><strong>Company:</strong> HABIBI ADVENTURE HAFA S.L.</li>
          <li><strong>CIF:</strong> B05593736</li>
          <li>
            <strong>Address:</strong> Avenida Rosita Ferrer nº 2,
            04740 Roquetas de Mar, Spain
          </li>
          <li>
            <strong>Email:</strong> habibiadventure.26@gmail.com
          </li>
          <li><strong>Telephone:</strong> +48 665 208 846 / +212 661-731123</li>
        </ul>
      </>
    ),
  },
  {
    id: "data",
    title: "2. Personal Data We Collect",
    icon: Database,
    content: (
      <>
        <p>
          Depending on how you interact with our website and
          travel services, we may collect the following categories
          of personal data:
        </p>
        <ul>
          <li>
            <strong>Identification data:</strong> Name, surname
            and other information you provide to identify yourself.
          </li>
          <li>
            <strong>Contact data:</strong> Email address,
            telephone number and other contact details.
          </li>
          <li>
            <strong>Booking data:</strong> Travel dates, destinations,
            number of travelers, preferences and booking details.
          </li>
          <li>
            <strong>Communication data:</strong> Messages,
            inquiries, requests and correspondence with our team.
          </li>
          <li>
            <strong>Transaction data:</strong> Payment status,
            transaction references and relevant billing information
            where applicable.
          </li>
          <li>
            <strong>Technical data:</strong> IP address, browser
            type, device information and website usage data,
            where collected.
          </li>
        </ul>
        <p>
          We only seek to collect information that is relevant
          and necessary for the purposes described in this policy.
        </p>
      </>
    ),
  },
  {
    id: "purposes",
    title: "3. Why We Use Your Data",
    icon: FileText,
    content: (
      <>
        <p>We may process personal data for the following purposes:</p>
        <ul>
          <li>
            Responding to inquiries and requests for information.
          </li>
          <li>
            Preparing customized itineraries, offers and quotations.
          </li>
          <li>
            Managing reservations, travel contracts and travel arrangements.
          </li>
          <li>
            Communicating important information about your trip.
          </li>
          <li>
            Managing payments, accounting and administrative obligations.
          </li>
          <li>
            Improving our website, services and customer experience.
          </li>
          <li>
            Protecting the website against fraud, misuse and security threats.
          </li>
          <li>
            Complying with applicable legal and regulatory obligations.
          </li>
          <li>
            Sending promotional communications where legally permitted
            and where the relevant requirements have been met.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "legal",
    title: "4. Legal Basis for Processing",
    icon: Scale,
    content: (
      <>
        <p>
          We process personal data on the legal bases applicable
          under data-protection law, including:
        </p>
        <ul>
          <li>
            <strong>Contractual necessity:</strong> Processing
            necessary to respond to a booking request, take
            pre-contractual steps or perform a travel contract.
          </li>
          <li>
            <strong>Legal obligation:</strong> Processing required
            to comply with tax, accounting or other legal obligations.
          </li>
          <li>
            <strong>Legitimate interests:</strong> Processing
            necessary for legitimate business interests, provided
            those interests do not override your rights and freedoms.
          </li>
          <li>
            <strong>Consent:</strong> Processing based on your
            consent, where consent is required, including certain
            marketing communications and non-essential cookies.
          </li>
        </ul>
        <p>
          Where processing is based on consent, you may withdraw
          your consent at any time. Withdrawal does not affect
          the lawfulness of processing carried out before withdrawal.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "5. Sharing of Personal Data",
    icon: Users,
    content: (
      <>
        <p>
          We may share relevant personal data with third parties
          where necessary to operate our business and provide
          the services requested.
        </p>
        <p>These may include:</p>
        <ul>
          <li>Accommodation providers, hotels and riads.</li>
          <li>Transportation providers, drivers and guides.</li>
          <li>Activity providers and local tour operators.</li>
          <li>Payment service providers and financial institutions.</li>
          <li>Website hosting, technical support and IT providers.</li>
          <li>Professional advisers and authorities where required by law.</li>
        </ul>
        <p>
          Third parties receiving personal data may process it
          according to their own obligations, contractual
          arrangements and applicable laws.
        </p>
        <p>We do not sell personal data to third parties.</p>
      </>
    ),
  },
  {
    id: "international",
    title: "6. International Data Transfers",
    icon: MapPin,
    content: (
      <>
        <p>
          As our travel services may involve destinations and
          service providers outside the European Economic Area,
          certain personal data may need to be transferred
          internationally to facilitate your travel arrangements.
        </p>
        <p>
          Where personal data is transferred outside the EEA,
          we will seek to ensure that the transfer is carried
          out in accordance with applicable data-protection
          requirements and that appropriate safeguards are
          implemented where required.
        </p>
        <p>
          These safeguards may include adequacy decisions,
          contractual safeguards or other legally recognized
          transfer mechanisms.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "7. Data Retention",
    icon: Clock,
    content: (
      <>
        <p>
          Personal data is retained only for as long as necessary
          to fulfill the purposes for which it was collected,
          including managing bookings, responding to inquiries,
          fulfilling legal obligations and resolving disputes.
        </p>
        <p>
          Data may be retained for longer periods where required
          by applicable law, particularly tax, accounting or
          legal requirements.
        </p>
        <p>
          When data is no longer necessary, it will be deleted
          or anonymized in accordance with applicable law and
          our retention practices.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "8. Your Data Protection Rights",
    icon: ShieldCheck,
    content: (
      <>
        <p>Subject to applicable law, you may have the right to:</p>
        <ul>
          <li>
            <strong>Access:</strong> Request access to your personal data.
          </li>
          <li>
            <strong>Rectification:</strong> Request correction
            of inaccurate or incomplete data.
          </li>
          <li>
            <strong>Erasure:</strong> Request deletion of your data
            where legally applicable.
          </li>
          <li>
            <strong>Restriction:</strong> Request restriction
            of certain processing activities.
          </li>
          <li>
            <strong>Portability:</strong> Request a copy of certain
            personal data in a portable format.
          </li>
          <li>
            <strong>Objection:</strong> Object to certain processing
            activities, including processing based on legitimate
            interests or direct marketing, where applicable.
          </li>
          <li>
            <strong>Withdrawal of consent:</strong> Withdraw consent
            where processing is based on consent.
          </li>
        </ul>
        <p>
          To exercise your rights, contact us at{" "}
          <a
            href="mailto:habibiadventure.26@gmail.com"
            className="font-medium text-[#0f3d2e] underline underline-offset-4 hover:text-[#9c7a2b]"
          >
            habibiadventure.26@gmail.com
          </a>
          .
        </p>
        <p>
          You may also lodge a complaint with the competent
          data-protection supervisory authority. In Spain,
          this is the Agencia Española de Protección de Datos
          (AEPD), accessible at www.aepd.es.
        </p>
        <p>
          We may request information necessary to verify your
          identity before processing a rights request.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "9. Cookies & Tracking Technologies",
    icon: Cookie,
    content: (
      <>
        <p>
          Our website may use cookies and similar technologies
          to support functionality, understand website usage
          and improve the user experience.
        </p>
        <p>Cookies may include:</p>
        <ul>
          <li>
            <strong>Strictly necessary cookies:</strong> Required
            for essential website functionality.
          </li>
          <li>
            <strong>Analytics cookies:</strong> Used to understand
            website traffic and usage, where enabled.
          </li>
          <li>
            <strong>Marketing cookies:</strong> Used to measure
            campaigns or provide advertising-related functionality,
            where enabled.
          </li>
        </ul>
        <p>
          Non-essential cookies and tracking technologies will
          be used subject to applicable consent requirements.
        </p>
        <p>
          You may manage your cookie preferences through the
          website's cookie settings, where available.
        </p>
        <p>For more information, please consult our Cookie Policy.</p>
      </>
    ),
  },
  {
    id: "security",
    title: "10. Data Security",
    icon: LockKeyhole,
    content: (
      <>
        <p>
          We seek to implement appropriate technical and
          organizational measures to protect personal data
          against unauthorized access, loss, alteration,
          disclosure or destruction.
        </p>
        <p>
          However, no internet-based transmission or electronic
          storage system can be guaranteed to be completely secure.
        </p>
      </>
    ),
  },
  {
    id: "marketing",
    title: "11. Marketing Communications",
    icon: Mail,
    content: (
      <>
        <p>
          We may send promotional communications where permitted
          by applicable law and where the necessary consent or
          other lawful basis has been established.
        </p>
        <p>
          You may opt out of marketing communications at any
          time using the unsubscribe option included in the
          communication or by contacting us directly.
        </p>
        <p>
          Opting out of promotional communications will not
          affect service-related messages necessary to manage
          your reservation.
        </p>
      </>
    ),
  },
  {
    id: "updates",
    title: "12. Changes to This Privacy Policy",
    icon: FileText,
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time
          to reflect changes in our practices, services,
          technology or legal requirements.
        </p>
        <p>
          Any updated version will be published on this page
          with its revised date.
        </p>
      </>
    ),
  },
];

const polishSections = [
  {
    title: "1. Administrator danych",
    content: (
      <>
        <p>Administratorem danych osobowych zbieranych za pośrednictwem tej strony internetowej jest:</p>
        <ul>
          <li><strong>Firma:</strong> HABIBI ADVENTURE HAFA S.L.</li>
          <li><strong>CIF:</strong> B05593736</li>
          <li><strong>Adres:</strong> Avenida Rosita Ferrer nº 2, 04740 Roquetas de Mar, Hiszpania</li>
          <li><strong>Adres email:</strong> habibiadventure.26@gmail.com</li>
          <li><strong>Telefon:</strong> +48 665 208 846 / +212 661-731123</li>
        </ul>
      </>
    ),
  },
  {
    title: "2. Gromadzone przez nas dane osobowe",
    content: (
      <>
        <p>
          W zależności od sposobu korzystania z naszej strony internetowej
          i usług turystycznych możemy gromadzić następujące kategorie danych
          osobowych:
        </p>
        <ul>
          <li><strong>Dane identyfikacyjne:</strong> Imię, nazwisko i inne przekazane przez Ciebie informacje służące do identyfikacji.</li>
          <li><strong>Dane kontaktowe:</strong> Adres email, numer telefonu i inne dane kontaktowe.</li>
          <li><strong>Dane rezerwacji:</strong> Daty podróży, miejsca docelowe, liczba podróżnych, preferencje i szczegóły rezerwacji.</li>
          <li><strong>Dane dotyczące komunikacji:</strong> Wiadomości, zapytania, prośby i korespondencja z naszym zespołem.</li>
          <li><strong>Dane transakcyjne:</strong> Status płatności, numery referencyjne transakcji oraz, w stosownych przypadkach, odpowiednie informacje rozliczeniowe.</li>
          <li><strong>Dane techniczne:</strong> Adres IP, rodzaj przeglądarki, informacje o urządzeniu i dane dotyczące korzystania ze strony, jeśli są gromadzone.</li>
        </ul>
        <p>
          Staramy się gromadzić wyłącznie informacje istotne i niezbędne
          do celów opisanych w niniejszej polityce.
        </p>
      </>
    ),
  },
  {
    title: "3. Cele wykorzystywania danych",
    content: (
      <>
        <p>Dane osobowe możemy przetwarzać w następujących celach:</p>
        <ul>
          <li>Udzielanie odpowiedzi na zapytania i prośby o informacje.</li>
          <li>Przygotowywanie spersonalizowanych planów podróży, ofert i wycen.</li>
          <li>Obsługa rezerwacji, umów dotyczących podróży i organizacji wyjazdów.</li>
          <li>Przekazywanie ważnych informacji dotyczących podróży.</li>
          <li>Obsługa płatności, księgowości i obowiązków administracyjnych.</li>
          <li>Ulepszanie naszej strony internetowej, usług i obsługi klienta.</li>
          <li>Ochrona strony przed oszustwami, nadużyciami i zagrożeniami dla bezpieczeństwa.</li>
          <li>Wypełnianie obowiązków prawnych i regulacyjnych.</li>
          <li>Wysyłanie informacji promocyjnych, gdy zezwala na to prawo i spełniono odpowiednie wymogi.</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Podstawa prawna przetwarzania",
    content: (
      <>
        <p>
          Przetwarzamy dane osobowe na podstawach prawnych przewidzianych
          przepisami o ochronie danych, w tym:
        </p>
        <ul>
          <li><strong>Niezbędność do wykonania umowy:</strong> Przetwarzanie niezbędne do odpowiedzi na wniosek o rezerwację, podjęcia działań przed zawarciem umowy lub wykonania umowy dotyczącej podróży.</li>
          <li><strong>Obowiązek prawny:</strong> Przetwarzanie wymagane w celu wypełnienia obowiązków podatkowych, księgowych lub innych obowiązków prawnych.</li>
          <li><strong>Prawnie uzasadnione interesy:</strong> Przetwarzanie niezbędne do realizacji uzasadnionych interesów firmy, o ile interesy te nie przeważają nad Twoimi prawami i wolnościami.</li>
          <li><strong>Zgoda:</strong> Przetwarzanie oparte na Twojej zgodzie, gdy jest ona wymagana, w tym w przypadku niektórych komunikatów marketingowych i nieobowiązkowych plików cookie.</li>
        </ul>
        <p>
          Jeżeli przetwarzanie odbywa się na podstawie zgody, możesz ją wycofać
          w dowolnym momencie. Wycofanie zgody nie wpływa na zgodność z prawem
          przetwarzania dokonanego przed jej wycofaniem.
        </p>
      </>
    ),
  },
  {
    title: "5. Udostępnianie danych osobowych",
    content: (
      <>
        <p>
          Możemy udostępniać odpowiednie dane osobowe podmiotom zewnętrznym,
          jeżeli jest to niezbędne do prowadzenia działalności i świadczenia
          zamówionych usług.
        </p>
        <p>Mogą to być między innymi:</p>
        <ul>
          <li>Obiekty noclegowe, hotele i riady.</li>
          <li>Przewoźnicy, kierowcy i przewodnicy.</li>
          <li>Organizatorzy aktywności i lokalni organizatorzy wycieczek.</li>
          <li>Operatorzy płatności i instytucje finansowe.</li>
          <li>Dostawcy hostingu strony, wsparcia technicznego i usług IT.</li>
          <li>Doradcy profesjonalni i organy, gdy wymaga tego prawo.</li>
        </ul>
        <p>
          Podmioty zewnętrzne otrzymujące dane osobowe mogą je przetwarzać
          zgodnie z własnymi obowiązkami, ustaleniami umownymi i obowiązującymi
          przepisami prawa.
        </p>
        <p>Nie sprzedajemy danych osobowych podmiotom zewnętrznym.</p>
      </>
    ),
  },
  {
    title: "6. Międzynarodowe przekazywanie danych",
    content: (
      <>
        <p>
          Ponieważ nasze usługi turystyczne mogą obejmować miejsca docelowe
          i usługodawców spoza Europejskiego Obszaru Gospodarczego, niektóre
          dane osobowe mogą wymagać międzynarodowego przekazania w celu
          organizacji podróży.
        </p>
        <p>
          W przypadku przekazywania danych osobowych poza EOG będziemy dążyć
          do zapewnienia zgodności transferu z obowiązującymi wymogami
          dotyczącymi ochrony danych oraz do wdrożenia wymaganych
          odpowiednich zabezpieczeń.
        </p>
        <p>
          Zabezpieczenia te mogą obejmować decyzje stwierdzające odpowiedni
          stopień ochrony, zabezpieczenia umowne lub inne prawnie uznane
          mechanizmy przekazywania danych.
        </p>
      </>
    ),
  },
  {
    title: "7. Okres przechowywania danych",
    content: (
      <>
        <p>
          Dane osobowe przechowujemy tylko tak długo, jak jest to niezbędne
          do realizacji celów, w których zostały zebrane, w tym obsługi
          rezerwacji, odpowiedzi na zapytania, wypełnienia obowiązków prawnych
          i rozstrzygania sporów.
        </p>
        <p>
          Dane mogą być przechowywane dłużej, jeżeli wymagają tego
          obowiązujące przepisy prawa, w szczególności przepisy podatkowe,
          księgowe lub inne wymogi prawne.
        </p>
        <p>
          Gdy dane przestaną być niezbędne, zostaną usunięte lub
          zanonimizowane zgodnie z obowiązującym prawem i stosowanymi przez
          nas zasadami przechowywania danych.
        </p>
      </>
    ),
  },
  {
    title: "8. Twoje prawa dotyczące ochrony danych",
    content: (
      <>
        <p>Z zastrzeżeniem obowiązujących przepisów prawa możesz mieć prawo do:</p>
        <ul>
          <li><strong>Dostępu:</strong> Uzyskania dostępu do swoich danych osobowych.</li>
          <li><strong>Sprostowania:</strong> Żądania poprawienia nieprawidłowych lub niekompletnych danych.</li>
          <li><strong>Usunięcia:</strong> Żądania usunięcia danych, jeżeli jest to prawnie dopuszczalne.</li>
          <li><strong>Ograniczenia:</strong> Żądania ograniczenia niektórych czynności przetwarzania.</li>
          <li><strong>Przenoszenia:</strong> Uzyskania kopii określonych danych osobowych w przenośnym formacie.</li>
          <li><strong>Sprzeciwu:</strong> Wniesienia sprzeciwu wobec niektórych czynności przetwarzania, w tym opartych na uzasadnionym interesie lub marketingu bezpośrednim, gdy ma to zastosowanie.</li>
          <li><strong>Wycofania zgody:</strong> Wycofania zgody, jeżeli przetwarzanie odbywa się na jej podstawie.</li>
        </ul>
        <p>
          Aby skorzystać ze swoich praw, skontaktuj się z nami pod adresem{" "}
          <a
            href="mailto:habibiadventure.26@gmail.com"
            className="font-medium text-[#0f3d2e] underline underline-offset-4 hover:text-[#9c7a2b]"
          >
            habibiadventure.26@gmail.com
          </a>
          .
        </p>
        <p>
          Możesz również złożyć skargę do właściwego organu nadzorczego
          ds. ochrony danych. W Hiszpanii jest nim Agencia Española de
          Protección de Datos (AEPD), dostępny pod adresem www.aepd.es.
        </p>
        <p>
          Przed rozpatrzeniem wniosku dotyczącego praw możemy poprosić
          o informacje niezbędne do potwierdzenia Twojej tożsamości.
        </p>
      </>
    ),
  },
  {
    title: "9. Pliki cookie i technologie śledzące",
    content: (
      <>
        <p>
          Nasza strona może używać plików cookie i podobnych technologii
          w celu zapewnienia funkcjonalności, analizy korzystania ze strony
          i poprawy komfortu użytkownika.
        </p>
        <p>Pliki cookie mogą obejmować:</p>
        <ul>
          <li><strong>Niezbędne pliki cookie:</strong> Wymagane do podstawowego działania strony internetowej.</li>
          <li><strong>Analityczne pliki cookie:</strong> Służące do analizy ruchu i sposobu korzystania ze strony, jeśli są włączone.</li>
          <li><strong>Marketingowe pliki cookie:</strong> Służące do pomiaru skuteczności kampanii lub zapewnienia funkcji związanych z reklamą, jeśli są włączone.</li>
        </ul>
        <p>
          Nieobowiązkowe pliki cookie i technologie śledzące będą używane
          z uwzględnieniem wymogów dotyczących zgody wynikających
          z obowiązujących przepisów.
        </p>
        <p>
          Możesz zarządzać swoimi preferencjami dotyczącymi plików cookie
          w ustawieniach plików cookie na stronie, jeśli są dostępne.
        </p>
        <p>Więcej informacji znajduje się w naszej Polityce plików cookie.</p>
      </>
    ),
  },
  {
    title: "10. Bezpieczeństwo danych",
    content: (
      <>
        <p>
          Staramy się wdrażać odpowiednie środki techniczne i organizacyjne,
          aby chronić dane osobowe przed nieuprawnionym dostępem, utratą,
          zmianą, ujawnieniem lub zniszczeniem.
        </p>
        <p>
          Nie można jednak zagwarantować pełnego bezpieczeństwa żadnej
          transmisji internetowej ani elektronicznego systemu
          przechowywania danych.
        </p>
      </>
    ),
  },
  {
    title: "11. Komunikaty marketingowe",
    content: (
      <>
        <p>
          Możemy wysyłać komunikaty promocyjne, jeżeli zezwala na to
          obowiązujące prawo i uzyskano wymaganą zgodę lub ustalono inną
          właściwą podstawę prawną.
        </p>
        <p>
          W dowolnym momencie możesz zrezygnować z komunikatów marketingowych,
          korzystając z opcji rezygnacji zawartej w wiadomości lub
          kontaktując się z nami bezpośrednio.
        </p>
        <p>
          Rezygnacja z komunikatów promocyjnych nie wpływa na wiadomości
          związane z obsługą, niezbędne do zarządzania rezerwacją.
        </p>
      </>
    ),
  },
  {
    title: "12. Zmiany niniejszej polityki prywatności",
    content: (
      <>
        <p>
          Możemy od czasu do czasu aktualizować niniejszą Politykę prywatności,
          aby uwzględnić zmiany naszych praktyk, usług, technologii lub
          wymogów prawnych.
        </p>
        <p>
          Każda zaktualizowana wersja zostanie opublikowana na tej stronie
          wraz ze zmienioną datą.
        </p>
      </>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Accordion item — premium card style (matches Terms page)          */
/* ------------------------------------------------------------------ */
function AccordionItem({ section, open, onToggle }) {
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
export default function PrivacyPolicyPage() {
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
  const [openSections, setOpenSections] = useState(["controller"]);

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
            <p className="text-sm tracking-[0.2em] uppercase">{isPolish ? "Prywatność i ochrona danych" : "Privacy & Data Protection"}</p>
            <span className="hidden h-px w-14 origin-left bg-[#e6c877]/70 sm:block" style={{ animation: "grow 1.2s ease .4s both" }} />
          </div>

          <h1 className="mt-8 max-w-3xl text-4xl leading-[1.05] tracking-tight sm:text-6xl" style={display}>
            <span className="block overflow-hidden pb-2">
              <span className="line" style={{ animationDelay: ".45s" }}>
                {isPolish ? "Polityka prywatności" : "Privacy Policy"}
              </span>
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg" style={{ animation: "fadeIn 1.4s ease 1s both" }}>
            {isPolish
              ? "Twoja prywatność jest dla nas ważna. Dowiedz się, jak gromadzimy, wykorzystujemy, chronimy i zarządzamy Twoimi danymi osobowymi podczas korzystania z usług Habibi Adventure."
              : "Your privacy matters to us. Learn how we collect, use, protect and manage your personal information when you interact with Habibi Adventure."}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-5" style={{ animation: "fadeIn 1.4s ease 1.3s both" }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c9a24b]/40 bg-white/5 px-4 py-2 text-xs font-medium text-[#e6c877] backdrop-blur">
              <LockKeyhole className="h-4 w-4" />
              {isPolish ? "Dane osobowe i informacje o prywatności" : "Personal data & privacy information"}
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
                {isPolish ? "Jak postępujemy z Twoimi danymi" : "How we handle your information"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {isPolish ? "Informacje o prywatności i prawach dotyczących ochrony danych." : "Information about your privacy and data protection rights."}
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
            {pageSections.map((section) => (
              <AccordionItem
                key={section.id}
                section={section}
                open={openSections.includes(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </div>
        </div>

        {/* CONTACT — dark zellige card */}
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
              ? "W przypadku pytań dotyczących danych osobowych, prywatności lub korzystania z praw związanych z ochroną danych skontaktuj się z naszym zespołem."
              : "For questions about your personal data, privacy or the exercise of your data protection rights, contact our team."}
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
            {isPolish ? "Skontaktuj się z naszym zespołem" : "Contact our team"}
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
              ? "Niniejszą Politykę prywatności należy czytać łącznie z naszą Polityką plików cookie. Rzeczywiste przetwarzanie danych osobowych zależy od usług, formularzy i technologii wdrożonych na tej stronie internetowej."
              : "This Privacy Policy should be read together with our Cookie Policy. The actual processing of personal data depends on the services, forms and technologies implemented on this website."}
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