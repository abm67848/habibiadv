import React, { useState } from "react";
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
          <li><strong>Telephone:</strong> +34 631 632 341</li>
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
              {open ? "Tap to collapse" : "Tap to read more"}
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
  const [openSections, setOpenSections] = useState(["controller"]);

  const toggleSection = (id) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const openAll = () => setOpenSections(sections.map((s) => s.id));
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
            <p className="text-sm tracking-[0.2em] uppercase">Privacy & Data Protection</p>
            <span className="hidden h-px w-14 origin-left bg-[#e6c877]/70 sm:block" style={{ animation: "grow 1.2s ease .4s both" }} />
          </div>

          <h1 className="mt-8 max-w-3xl text-4xl leading-[1.05] tracking-tight sm:text-6xl" style={display}>
            <span className="block overflow-hidden pb-2">
              <span className="line" style={{ animationDelay: ".45s" }}>
                Privacy Policy
              </span>
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg" style={{ animation: "fadeIn 1.4s ease 1s both" }}>
            Your privacy matters to us. Learn how we collect, use, protect
            and manage your personal information when you interact with
            Habibi Adventure.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-5" style={{ animation: "fadeIn 1.4s ease 1.3s both" }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c9a24b]/40 bg-white/5 px-4 py-2 text-xs font-medium text-[#e6c877] backdrop-blur">
              <LockKeyhole className="h-4 w-4" />
              Personal data & privacy information
            </span>
            <span className="inline-flex items-center gap-2 text-xs text-white/60">
              <FileText className="h-4 w-4 text-[#c9a24b]" />
              Last updated · {new Date().getFullYear()}
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
                How we handle your information
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Information about your privacy and data protection rights.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={openAll}
                className={`rounded-full bg-[#0f3d2e] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#0f3d2e]/20 transition hover:bg-[#1f6b4f] ${focus}`}
              >
                Expand all
              </button>
              <button
                onClick={closeAll}
                className={`rounded-full border border-[#0f3d2e]/15 px-4 py-2.5 text-sm font-medium text-[#0f3d2e] transition hover:bg-[#f3f6f1] ${focus}`}
              >
                Collapse all
              </button>
            </div>
          </div>

          {/* accordion list */}
          <div className="mt-6 space-y-3">
            {sections.map((section) => (
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
              <p className="text-xs uppercase tracking-[0.25em] text-[#e6c877]">Contact us</p>
              <h2 className="mt-3 text-2xl sm:text-3xl" style={display}>
                HABIBI ADVENTURE HAFA S.L.
              </h2>
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#c9a24b] text-[#082a1f]">
              <Flower2 className="h-6 w-6" />
            </span>
          </div>

          <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
            For questions about your personal data, privacy or the exercise
            of your data protection rights, contact our team.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              {
                icon: MapPin,
                label: "Registered address",
                body: (
                  <>
                    Avenida Rosita Ferrer nº 2,
                    <br />
                    04740 Roquetas de Mar,
                    <br />
                    Spain
                  </>
                ),
              },
              {
                icon: Mail,
                label: "Email",
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
                label: "Telephone",
                body: (
                  <a
                    href="tel:+34631632341"
                    className={`text-white/70 transition hover:text-[#e6c877] ${focus}`}
                  >
                    +34 631 632 341
                  </a>
                ),
              },
              {
                icon: FileText,
                label: "Company identification",
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
            Contact our team
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
            This Privacy Policy should be read together with our Cookie
            Policy. The actual processing of personal data depends on the
            services, forms and technologies implemented on this website.
          </p>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#0f3d2e]/10 bg-white px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} HABIBI ADVENTURE HAFA S.L. All rights reserved.
          </p>
          <a
            href="/"
            className={`inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-4 py-2 text-xs font-medium text-[#e6c877] transition hover:bg-[#1f6b4f] ${focus}`}
          >
            Back to home <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}