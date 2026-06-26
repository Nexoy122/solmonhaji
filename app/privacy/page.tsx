import { LegalLayout } from "@/components/LegalLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — NicheSpy",
  description: "How NicheSpy collects, uses, and protects your information.",
};

const UPDATED = "June 2025";
const SUPPORT_EMAIL = "support@vixo.live";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated={UPDATED}>
      <p>
        This Privacy Policy explains how NicheSpy (&quot;NicheSpy&quot;, &quot;we&quot;, &quot;us&quot;) collects,
        uses, and safeguards your information when you visit our website and join our waitlist. By using
        the site, you agree to the practices described here.
      </p>

      <h2>1. Information we collect</h2>
      <p>We keep data collection to the minimum needed to run the waitlist and improve the product:</p>
      <ul>
        <li><strong>Email address</strong> — when you join the waitlist, so we can notify you about early access and updates.</li>
        <li><strong>Optional details</strong> — such as your niche or how you found us, if you choose to provide them.</li>
        <li><strong>Basic technical data</strong> — referrer and standard request metadata your browser sends, used for security and analytics.</li>
      </ul>
      <p>
        NicheSpy analyzes <strong>publicly available</strong> YouTube channel and video information for its
        competitor-intelligence features. We do not require access to your personal YouTube account to use
        the core tools.
      </p>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To add you to the waitlist and send you a confirmation.</li>
        <li>To email you about early access, launches, and important product updates.</li>
        <li>To understand interest in the product and improve our features.</li>
        <li>To protect the service from abuse and keep it secure.</li>
      </ul>

      <h2>3. Email communications</h2>
      <p>
        We&apos;ll only email you about NicheSpy. Every email includes an unsubscribe link, and you can opt
        out at any time. We never sell or rent your email address.
      </p>

      <h2>4. Sharing your information</h2>
      <p>
        We do not sell your personal data. We share information only with trusted service providers that
        help us operate (for example, our database host and email delivery provider), and only as needed to
        provide the service. We may also disclose information if required by law.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We keep your waitlist information until you ask us to remove it or until it&apos;s no longer needed
        for the purposes above. You can request deletion at any time by emailing us.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, or delete the personal data
        we hold about you, and to object to certain processing. To exercise any of these rights, contact us
        at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>

      <h2>7. Cookies &amp; analytics</h2>
      <p>
        We use only essential cookies and privacy-respecting analytics to understand how the site is used.
        We do not use invasive cross-site tracking.
      </p>

      <h2>8. Children</h2>
      <p>
        NicheSpy is intended for creators and is not directed at children under 13. We do not knowingly
        collect data from children.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. When we do, we&apos;ll revise the &quot;Last updated&quot;
        date above. Significant changes will be communicated to waitlist members.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about privacy? Reach us any time at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
